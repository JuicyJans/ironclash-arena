import { describe, expect, it } from 'vitest';
import { PRESETS } from '../../src/config/presets';
import { MatchSim } from '../../src/core/match/matchSim';
import { captureState } from '../../src/core/match/worldState';
import { ByteReader, ByteWriter } from '../../src/net/codec';
import { decode, encode, EVENT_NAMES, Msg, type NetEvent, type NetMessage } from '../../src/net/protocol';

describe('codec', () => {
  it('writes and reads every primitive (and grows its buffer)', () => {
    const w = new ByteWriter(4);
    w.u8(300).i8(-200).u16(70000).i16(-40000).u32(123456).f32(1.5).f64(Math.PI).str('æøå 🤖');
    const r = new ByteReader(w.bytes());
    expect(r.u8()).toBe(255);
    expect(r.i8()).toBe(-128);
    expect(r.u16()).toBe(65535);
    expect(r.i16()).toBe(-32768);
    expect(r.u32()).toBe(123456);
    expect(r.f32()).toBe(1.5);
    expect(r.f64()).toBe(Math.PI);
    expect(r.str()).toBe('æøå 🤖');
    expect(r.remaining).toBe(0);
    expect(() => r.u8()).toThrow(RangeError);
  });
});

describe('protocol', () => {
  const simple: NetMessage[] = [
    { type: Msg.Hello, protocol: 3, game: '1.0.0', name: 'Oskar' },
    { type: Msg.Welcome, ok: false, reason: 'version' },
    {
      type: Msg.Lobby,
      arenaId: 'foundry',
      hostBuild: '{}',
      guestBuild: 'null',
      hostReady: true,
      guestReady: false,
      hostName: 'A',
      guestName: 'B',
    },
    { type: Msg.SelectBuild, build: JSON.stringify(PRESETS[0]) },
    { type: Msg.Ready, ready: true },
    { type: Msg.Start, config: '{"arenaId":"workshop"}' },
    { type: Msg.Ping, t: 1234.5 },
    { type: Msg.Pong, t: 99.25 },
    { type: Msg.Leave },
    { type: Msg.BackToLobby },
    { type: Msg.Result, result: '{"winnerTeam":0}' },
  ];

  it('round-trips simple messages exactly', () => {
    for (const m of simple) expect(decode(encode(m))).toEqual(m);
  });

  it('quantises inputs to compact bytes', () => {
    const m = decode(encode({ type: Msg.Input, seq: 77, throttle: 0.5, steer: -1, buttons: 5 }));
    expect(m).toMatchObject({ type: Msg.Input, seq: 77, buttons: 5 });
    if (m.type !== Msg.Input) return;
    expect(m.throttle).toBeCloseTo(0.5, 1);
    expect(m.steer).toBeCloseTo(-1, 2);
    expect(
      encode({ type: Msg.Input, seq: 1, throttle: 1, steer: 1, buttons: 0 }).byteLength,
    ).toBeLessThanOrEqual(8);
  });

  it('round-trips world snapshots within quantisation error', () => {
    const sim = new MatchSim({
      arenaId: 'colosseum',
      seed: 3,
      durationSec: 150,
      hazards: true,
      houseRobots: true,
      mode: 'sim',
      robots: [
        { build: PRESETS[0]!, team: 0, controller: 'ai', ai: 'standard' },
        { build: PRESETS[2]!, team: 1, controller: 'ai', ai: 'standard' },
      ],
    });
    for (let i = 0; i < 600; i++) sim.step();
    const state = captureState(sim);
    const events: NetEvent[] = [
      {
        name: 'damage',
        payload: {
          targetId: 1,
          sourceId: 0,
          amount: 12.5,
          x: 10,
          y: 20,
          side: 'rear',
          source: 'hammer',
          force: 30,
        },
      },
      { name: 'hazardTriggered', payload: { hazardId: 'ff1', kind: 'floorFlipper', x: 1, y: 2 } },
      { name: 'ko', payload: { robotId: 1, reason: 'pit', byId: 0 } },
      { name: 'matchEnd', payload: { winnerTeam: 0, reason: 'judges' } },
    ];
    const bytes = encode({ type: Msg.Snapshot, ackSeq: 41, state, events });
    expect(bytes.byteLength).toBeLessThan(400);
    const m = decode(bytes);
    if (m.type !== Msg.Snapshot) throw new Error('wrong type');
    expect(m.ackSeq).toBe(41);
    expect(m.state.tick).toBe(state.tick);
    expect(m.state.robots.length).toBe(2);
    m.state.robots.forEach((r, i) => {
      const o = state.robots[i]!;
      expect(r.x).toBeCloseTo(o.x, 0);
      expect(r.y).toBeCloseTo(o.y, 0);
      expect(Math.cos(r.angle)).toBeCloseTo(Math.cos(o.angle), 2);
      expect(r.hp).toBeCloseTo(o.hp, 0);
      expect(r.alive).toBe(o.alive);
      expect(r.inverted).toBe(o.inverted);
      expect(r.vx).toBeCloseTo(o.vx, 0);
    });
    expect(m.state.hazards.map((h) => h.phase)).toEqual(state.hazards.map((h) => h.phase));
    expect(m.state.pits).toEqual(state.pits);
    expect(m.state.houses.length).toBe(state.houses.length);
    expect(m.events.length).toBe(4);
    expect(m.events[0]).toMatchObject({
      name: 'damage',
      payload: { side: 'rear', source: 'hammer', targetId: 1 },
    });
    expect(m.events[2]).toEqual(events[2]);
    expect(m.events[3]).toEqual(events[3]);
  });

  it('covers every event type', () => {
    expect(EVENT_NAMES.length).toBeGreaterThanOrEqual(18);
  });

  it('rejects unknown message types', () => {
    expect(() => decode(new Uint8Array([200]))).toThrow();
  });
});
