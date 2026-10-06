import { PRESETS } from '../config/presets';
import type { RobotBuild } from '../config/types';
import { validateBuild } from '../core/robot/computeStats';
import type { MatchConfig } from '../core/match/types';
import { createStore } from '../utils/store';
import { decode, encode, Msg, PROTOCOL_VERSION, type NetMessage } from './protocol';
import { Emitter, randomRoomCode, type NetProvider, type NetTransport, type RoomHost } from './transport';

export const GAME_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
const PING_INTERVAL_MS = 1000;

export type LobbyPhase = 'idle' | 'connecting' | 'hosting' | 'connected' | 'inMatch' | 'error';

export interface LobbyState {
  phase: LobbyPhase;
  role: 'host' | 'guest' | null;
  code: string;
  /** i18n key under online.errors.* */
  error: string | null;
  arenaId: string;
  hostBuild: RobotBuild | null;
  guestBuild: RobotBuild | null;
  hostReady: boolean;
  guestReady: boolean;
  hostName: string;
  guestName: string;
  ping: number;
  peerPresent: boolean;
}

const initial: LobbyState = {
  phase: 'idle',
  role: null,
  code: '',
  error: null,
  arenaId: 'workshop',
  hostBuild: null,
  guestBuild: null,
  hostReady: false,
  guestReady: false,
  hostName: '',
  guestName: '',
  ping: 0,
  peerPresent: false,
};

/** Parses and validates a build received from the other player (never trust the network). */
export function parseBuild(json: string): RobotBuild | null {
  try {
    const b = JSON.parse(json) as RobotBuild;
    return validateBuild(b).ok ? b : null;
  } catch {
    return null;
  }
}

/** Room lifecycle: create/join, version check, lobby sync, ready-up and match start. */
export class NetLobby {
  readonly state = createStore<LobbyState>({ ...initial });
  /** Messages for the running match controller (inputs, snapshots, results). */
  readonly matchMessages = new Emitter<[NetMessage]>();
  readonly transportChanged = new Emitter<[NetTransport | null]>();
  onStart: ((config: MatchConfig, role: 'host' | 'guest') => void) | null = null;
  onBackToLobby: (() => void) | null = null;
  private transport: NetTransport | null = null;
  private room: RoomHost | null = null;
  private offs: (() => void)[] = [];
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private provider: NetProvider) {}

  get connection(): NetTransport | null {
    return this.transport;
  }

  send(m: NetMessage): void {
    this.transport?.send(encode(m));
  }

  async create(name: string, build: RobotBuild, code = randomRoomCode()): Promise<void> {
    this.reset();
    this.state.set({ ...initial, phase: 'connecting', role: 'host', code, hostName: name, hostBuild: build });
    try {
      this.room = await this.provider.host(code);
      this.state.set({ phase: 'hosting' });
      this.room.onGuest((t) => this.acceptGuest(t));
    } catch (e) {
      this.fail(e instanceof Error && e.message === 'unavailable-id' ? 'codeTaken' : 'network');
    }
  }

  async join(code: string, name: string, build: RobotBuild): Promise<void> {
    this.reset();
    this.state.set({
      ...initial,
      phase: 'connecting',
      role: 'guest',
      code,
      guestName: name,
      guestBuild: build,
    });
    try {
      const t = await this.provider.join(code);
      this.attach(t);
      this.send({ type: Msg.Hello, protocol: PROTOCOL_VERSION, game: GAME_VERSION, name });
    } catch (e) {
      this.fail(e instanceof Error && e.message === 'room-not-found' ? 'notFound' : 'network');
    }
  }

  /** Guest: reconnect to the same room after a drop (used mid-match). */
  async rejoin(): Promise<boolean> {
    const s = this.state.get();
    if (s.role !== 'guest') return false;
    try {
      const t = await this.provider.join(s.code);
      this.attach(t);
      this.send({ type: Msg.Hello, protocol: PROTOCOL_VERSION, game: GAME_VERSION, name: s.guestName });
      return true;
    } catch {
      return false;
    }
  }

  private acceptGuest(t: NetTransport): void {
    const s = this.state.get();
    if (this.transport?.open && s.phase !== 'inMatch') {
      t.send(encode({ type: Msg.Welcome, ok: false, reason: 'full' }));
      setTimeout(() => t.close(), 200);
      return;
    }
    this.attach(t);
  }

  private attach(t: NetTransport): void {
    for (const off of this.offs) off();
    this.transport = t;
    this.offs = [t.onMessage((d) => this.handle(d)), t.onClose(() => this.onClosed())];
    this.transportChanged.emit(t);
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => this.send({ type: Msg.Ping, t: performance.now() }), PING_INTERVAL_MS);
  }

  private onClosed(): void {
    this.transport = null;
    this.transportChanged.emit(null);
    const s = this.state.get();
    if (s.phase === 'inMatch') return; // the match controller handles reconnection
    if (s.role === 'host')
      this.state.set({
        phase: 'hosting',
        peerPresent: false,
        guestBuild: null,
        guestReady: false,
        guestName: '',
      });
    else if (s.phase !== 'error') this.fail('closed');
  }

  private handle(data: Uint8Array): void {
    let m: NetMessage;
    try {
      m = decode(data);
    } catch {
      return;
    }
    const s = this.state.get();
    switch (m.type) {
      case Msg.Hello: {
        if (s.role !== 'host') return;
        const ok = m.protocol === PROTOCOL_VERSION && m.game === GAME_VERSION;
        this.send({ type: Msg.Welcome, ok, reason: ok ? '' : 'version' });
        if (!ok) {
          setTimeout(() => this.transport?.close(), 300);
          return;
        }
        if (s.phase !== 'inMatch')
          this.state.set({ phase: 'connected', peerPresent: true, guestName: m.name.slice(0, 20) });
        this.broadcast();
        break;
      }
      case Msg.Welcome:
        if (!m.ok) this.fail(m.reason === 'version' ? 'version' : 'full');
        else if (s.phase !== 'inMatch') {
          this.state.set({ phase: 'connected', peerPresent: true });
          if (s.guestBuild) this.send({ type: Msg.SelectBuild, build: JSON.stringify(s.guestBuild) });
        }
        break;
      case Msg.Lobby:
        if (s.role !== 'guest') return;
        this.state.set({
          arenaId: m.arenaId,
          hostBuild: parseBuild(m.hostBuild),
          hostReady: m.hostReady,
          guestReady: m.guestReady,
          hostName: m.hostName,
        });
        break;
      case Msg.SelectBuild:
        if (s.role === 'host') {
          this.state.set({ guestBuild: parseBuild(m.build) ?? PRESETS[0]!, guestReady: false });
          this.broadcast();
        }
        break;
      case Msg.Ready:
        if (s.role === 'host') {
          this.state.set({ guestReady: m.ready });
          this.broadcast();
        }
        break;
      case Msg.Start:
        if (s.role === 'guest') {
          const config = JSON.parse(m.config) as MatchConfig;
          this.state.set({ phase: 'inMatch' });
          this.onStart?.(config, 'guest');
        }
        break;
      case Msg.BackToLobby:
        this.state.set({ phase: 'connected', hostReady: false, guestReady: false });
        this.onBackToLobby?.();
        break;
      case Msg.Ping:
        this.send({ type: Msg.Pong, t: m.t });
        break;
      case Msg.Pong:
        this.state.set({ ping: Math.round(performance.now() - m.t) });
        break;
      default:
        this.matchMessages.emit(m);
    }
  }

  private broadcast(): void {
    const s = this.state.get();
    if (s.role !== 'host') return;
    this.send({
      type: Msg.Lobby,
      arenaId: s.arenaId,
      hostBuild: JSON.stringify(s.hostBuild),
      guestBuild: JSON.stringify(s.guestBuild),
      hostReady: s.hostReady,
      guestReady: s.guestReady,
      hostName: s.hostName,
      guestName: s.guestName,
    });
  }

  selectBuild(build: RobotBuild): void {
    const s = this.state.get();
    if (s.role === 'host') {
      this.state.set({ hostBuild: build, hostReady: false });
      this.broadcast();
    } else {
      this.state.set({ guestBuild: build, guestReady: false });
      this.send({ type: Msg.SelectBuild, build: JSON.stringify(build) });
    }
  }

  setArena(arenaId: string): void {
    if (this.state.get().role !== 'host') return;
    this.state.set({ arenaId, hostReady: false, guestReady: false });
    this.broadcast();
  }

  setReady(ready: boolean): void {
    const s = this.state.get();
    if (s.role === 'host') {
      this.state.set({ hostReady: ready });
      this.broadcast();
    } else {
      this.state.set({ guestReady: ready });
      this.send({ type: Msg.Ready, ready });
    }
  }

  /** Host: start when both are ready. */
  start(config: MatchConfig): void {
    const s = this.state.get();
    if (s.role !== 'host' || !s.hostReady || !s.guestReady || !this.transport) return;
    this.state.set({ phase: 'inMatch' });
    this.send({ type: Msg.Start, config: JSON.stringify(config) });
    this.onStart?.(config, 'host');
  }

  backToLobby(): void {
    this.state.set({
      phase: this.transport ? 'connected' : this.state.get().role === 'host' ? 'hosting' : 'error',
      hostReady: false,
      guestReady: false,
    });
    this.send({ type: Msg.BackToLobby });
    this.broadcast();
  }

  private fail(error: string): void {
    this.state.set({ phase: 'error', error });
  }

  private reset(): void {
    for (const off of this.offs) off();
    this.offs = [];
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
    this.transport?.close();
    this.transport = null;
    this.room?.close();
    this.room = null;
  }

  leave(): void {
    this.send({ type: Msg.Leave });
    this.reset();
    this.state.set({ ...initial });
  }
}
