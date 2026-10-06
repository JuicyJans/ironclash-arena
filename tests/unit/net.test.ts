import { describe, expect, it } from 'vitest';
import { PRESETS } from '../../src/config/presets';
import { computeRobotStats } from '../../src/core/robot/computeStats';
import { NetLobby, parseBuild } from '../../src/net/lobby';
import { loopbackPair, loopbackProvider } from '../../src/net/loopback';
import { predictStep, reconcile } from '../../src/net/prediction';
import { encode, Msg, PROTOCOL_VERSION } from '../../src/net/protocol';
import { isValidRoomCode, randomRoomCode } from '../../src/net/transport';

const tick = () => new Promise((r) => setTimeout(r, 5));

describe('room codes', () => {
  it('generates valid 6-character codes', () => {
    for (let i = 0; i < 50; i++) expect(isValidRoomCode(randomRoomCode())).toBe(true);
    expect(isValidRoomCode('ABC12O')).toBe(false); // no O or 1/0 ambiguity
    expect(isValidRoomCode('abc123')).toBe(false);
  });
});

describe('loopback transport', () => {
  it('delivers messages and close events', async () => {
    const [a, b] = loopbackPair();
    const got: number[] = [];
    b.onMessage((d) => got.push(d[0]!));
    let closed = 0;
    a.onClose(() => closed++);
    a.send(new Uint8Array([7]));
    await tick();
    expect(got).toEqual([7]);
    b.close();
    expect(a.open).toBe(false);
    expect(closed).toBe(1);
  });
});

describe('lobby flow', () => {
  it('host and guest handshake, select robots, ready up and start', async () => {
    const provider = loopbackProvider();
    const host = new NetLobby(provider);
    const guest = new NetLobby(provider);
    const started: string[] = [];
    host.onStart = (_c, role) => started.push(role);
    guest.onStart = (_c, role) => started.push(role);
    await host.create('Host', PRESETS[0]!, 'ABCDEF');
    expect(host.state.get().phase).toBe('hosting');
    await guest.join('ABCDEF', 'Guest', PRESETS[1]!);
    await tick();
    await tick();
    expect(host.state.get().phase).toBe('connected');
    expect(guest.state.get().phase).toBe('connected');
    expect(host.state.get().guestName).toBe('Guest');
    expect(host.state.get().guestBuild?.name).toBe(PRESETS[1]!.name);
    host.setArena('foundry');
    host.setReady(true);
    guest.setReady(true);
    await tick();
    expect(guest.state.get().arenaId).toBe('foundry');
    expect(host.state.get().guestReady).toBe(true);
    host.start({
      arenaId: 'foundry',
      seed: 1,
      durationSec: 150,
      hazards: true,
      houseRobots: true,
      mode: 'online',
      robots: [],
    });
    await tick();
    expect(started).toEqual(['host', 'guest']);
    expect(guest.state.get().phase).toBe('inMatch');
    host.leave();
    guest.leave();
  });

  it('rejects clients with a different protocol version', async () => {
    const provider = loopbackProvider();
    const host = new NetLobby(provider);
    await host.create('Host', PRESETS[0]!, 'VERSN2');
    const t = await provider.join('VERSN2');
    const replies: number[] = [];
    t.onMessage((d) => replies.push(d[0]!, d[1]!));
    t.send(encode({ type: Msg.Hello, protocol: PROTOCOL_VERSION + 1, game: 'x', name: 'old' }));
    await tick();
    expect(replies[0]).toBe(Msg.Welcome);
    expect(replies[1]).toBe(0);
    host.leave();
  });

  it('reports unknown rooms', async () => {
    const guest = new NetLobby(loopbackProvider());
    await guest.join('ZZZZZZ', 'x', PRESETS[0]!);
    expect(guest.state.get().phase).toBe('error');
    expect(guest.state.get().error).toBe('notFound');
  });

  it('never trusts builds from the network', () => {
    expect(parseBuild('nonsense')).toBeNull();
    expect(
      parseBuild(
        JSON.stringify({
          ...PRESETS[0],
          chassis: 'light',
          armor: { id: 'armor_balanced', level: 5 },
          drive: { id: 'drive_shuffler', level: 5 },
        }),
      ),
    ).toBeNull();
    expect(parseBuild(JSON.stringify(PRESETS[2]))?.name).toBe(PRESETS[2]!.name);
  });
});

describe('client-side prediction', () => {
  const stats = computeRobotStats(PRESETS[2]!);
  it('replays only unacknowledged inputs', () => {
    const auth = { x: 100, y: 100, angle: 0, vx: 0, vy: 0, av: 0 };
    const inputs = [1, 2, 3, 4, 5].map((seq) => ({ seq, throttle: 1, steer: 0, boost: false }));
    const all = reconcile(auth, inputs, 0, stats, 1, 1 / 60);
    const some = reconcile(auth, inputs, 3, stats, 1, 1 / 60);
    expect(all.x).toBeGreaterThan(some.x);
    expect(some.x).toBeGreaterThan(auth.x);
    expect(reconcile(auth, inputs, 5, stats, 1, 1 / 60)).toEqual(auth);
  });

  it('predictStep turns and boosts', () => {
    const s = predictStep(
      { x: 0, y: 0, angle: 0, vx: 0, vy: 0, av: 0 },
      { seq: 1, throttle: 0, steer: 1, boost: false },
      stats,
      1,
      1 / 60,
    );
    expect(s.av).toBeGreaterThan(0);
    let a = { x: 0, y: 0, angle: 0, vx: 0, vy: 0, av: 0 };
    let b = { ...a };
    for (let i = 0; i < 90; i++) {
      a = predictStep(a, { seq: i, throttle: 1, steer: 0, boost: false }, stats, 1, 1 / 60);
      b = predictStep(b, { seq: i, throttle: 1, steer: 0, boost: true }, stats, 1, 1 / 60);
    }
    expect(b.x).toBeGreaterThan(a.x);
  });
});
