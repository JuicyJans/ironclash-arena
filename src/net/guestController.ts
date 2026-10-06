import { DT } from '../config/balance';
import type { RobotStats } from '../config/types';
import { EventBus } from '../core/events';
import type { MatchConfig, MatchResult } from '../core/match/types';
import { initialState, type RobotView, type WorldState } from '../core/match/worldState';
import { getArena } from '../config/arenas';
import { computeRobotStats } from '../core/robot/computeStats';
import type { Keymap } from '../core/save/schema';
import { lerp, lerpAngle } from '../utils/math';
import { readPlayerInput } from '../game/input/playerInput';
import type { MatchController } from '../game/match/localController';
import { DISCONNECT_GRACE_SEC } from './hostController';
import type { NetLobby } from './lobby';
import { reconcile, type PendingInput, type PredictState } from './prediction';
import { BTN, Msg, type NetEvent } from './protocol';

const INTERP_DELAY_TICKS = 6; // ~100 ms behind the newest snapshot
const MAX_BUFFER = 40;
const SNAP_ERROR = 90;
const SMOOTH = 0.35;
const REJOIN_EVERY_SEC = 2.5;

/** Guest side: sends inputs, predicts its own robot and interpolates everything else. */
export class GuestController implements MatchController {
  readonly events = new EventBus();
  readonly stats: RobotStats[];
  readonly pausable = false;
  prev: WorldState;
  curr: WorldState;
  alpha = 0;
  result: MatchResult | null = null;
  private buffer: WorldState[] = [];
  private queued: { tick: number; e: NetEvent }[] = [];
  private renderTick = -1;
  private seq = 0;
  private pending: PendingInput[] = [];
  private predicted: PredictState | null = null;
  private smoothed: PredictState | null = null;
  private inputAcc = 0;
  private offs: (() => void)[] = [];
  private disconnectedFor = -1;
  private rejoinTimer = 0;
  private myId: number;

  constructor(
    readonly config: MatchConfig,
    private lobby: NetLobby,
    private keymap: Keymap,
  ) {
    this.stats = config.robots.map((r) => computeRobotStats(r.build));
    this.myId = config.robots.findIndex((r) => r.controller === 'remote');
    const empty = initialState(config, getArena(config.arenaId), this.stats);
    this.prev = empty;
    this.curr = empty;
    this.offs.push(
      lobby.matchMessages.on((m) => {
        if (m.type === Msg.Snapshot) this.onSnapshot(m.state, m.ackSeq, m.events);
        if (m.type === Msg.Result) this.result = JSON.parse(m.result) as MatchResult;
      }),
      lobby.transportChanged.on((t) => (this.disconnectedFor = t ? -1 : 0)),
    );
  }

  get ended(): boolean {
    return this.result !== null;
  }

  /** True once the first snapshot arrived (the scene waits for it). */
  get ready(): boolean {
    return this.buffer.length >= 2;
  }

  step(): void {
    /* driven by frame() */
  }

  private onSnapshot(state: WorldState, ackSeq: number, events: NetEvent[]): void {
    const last = this.buffer[this.buffer.length - 1];
    if (last && state.tick <= last.tick) return;
    this.buffer.push(state);
    if (this.buffer.length > MAX_BUFFER) this.buffer.shift();
    for (const e of events) this.queued.push({ tick: state.tick, e });
    this.pending = this.pending.filter((p) => p.seq > ackSeq);
    const me = state.robots[this.myId];
    if (me) {
      const auth = { x: me.x, y: me.y, angle: me.angle, vx: me.vx, vy: me.vy, av: me.av };
      this.predicted = reconcile(auth, this.pending, ackSeq, this.stats[this.myId]!, me.driveHealth, DT);
    }
    if (this.renderTick < 0) this.renderTick = state.tick - INTERP_DELAY_TICKS;
  }

  frame(dt: number): void {
    this.handleDisconnect(dt);
    this.sendInputs(dt);
    if (this.buffer.length < 2) return;

    const newest = this.buffer[this.buffer.length - 1]!.tick;
    this.renderTick += dt / DT;
    const target = newest - INTERP_DELAY_TICKS;
    // Drift correction keeps us ~100 ms behind the host without stutter.
    this.renderTick += (target - this.renderTick) * 0.05;
    this.renderTick = Math.min(this.renderTick, newest);

    let i = this.buffer.length - 2;
    while (i > 0 && this.buffer[i]!.tick > this.renderTick) i--;
    const a = this.buffer[i]!;
    const b = this.buffer[i + 1] ?? a;
    this.alpha =
      b.tick === a.tick ? 1 : Math.min(1, Math.max(0, (this.renderTick - a.tick) / (b.tick - a.tick)));

    while (this.queued.length && this.queued[0]!.tick <= this.renderTick) {
      const { e } = this.queued.shift()!;
      this.events.emit(e.name, e.payload as never);
    }

    const selfView = this.ownRobot(b);
    this.prev = selfView ? withRobot(a, this.myId, selfView) : a;
    this.curr = selfView ? withRobot(b, this.myId, selfView) : b;
  }

  /** Predicted, smoothed own robot (or null when prediction is not trustworthy). */
  private ownRobot(latest: WorldState): RobotView | null {
    const auth = this.buffer[this.buffer.length - 1]?.robots[this.myId];
    const base = latest.robots[this.myId];
    if (!auth || !base || !this.predicted) return null;
    const free =
      auth.alive &&
      !auth.inverted &&
      auth.z <= 0 &&
      !auth.held &&
      !auth.lifted &&
      auth.falling <= 0 &&
      !this.touching(auth);
    if (!free) {
      this.smoothed = null;
      return null;
    }
    const p = this.predicted;
    const s = this.smoothed;
    if (!s || Math.hypot(s.x - p.x, s.y - p.y) > SNAP_ERROR) this.smoothed = { ...p };
    else
      this.smoothed = {
        ...p,
        x: lerp(s.x, p.x, SMOOTH),
        y: lerp(s.y, p.y, SMOOTH),
        angle: lerpAngle(s.angle, p.angle, SMOOTH),
      };
    return {
      ...auth,
      x: this.smoothed.x,
      y: this.smoothed.y,
      angle: this.smoothed.angle,
      speed: Math.hypot(p.vx, p.vy),
    };
  }

  private touching(me: RobotView): boolean {
    const latest = this.buffer[this.buffer.length - 1]!;
    const myR = (this.stats[this.myId]!.size.w + this.stats[this.myId]!.size.h) / 4;
    return latest.robots.some((o, j) => {
      if (j === this.myId || !o.alive) return false;
      const r = (this.stats[j]!.size.w + this.stats[j]!.size.h) / 4;
      return Math.hypot(o.x - me.x, o.y - me.y) < myR + r + 14;
    });
  }

  private sendInputs(dt: number): void {
    this.inputAcc += dt;
    while (this.inputAcc >= DT) {
      this.inputAcc -= DT;
      const f = readPlayerInput(0, 1, this.keymap);
      const input: PendingInput = { seq: ++this.seq, throttle: f.throttle, steer: f.steer, boost: f.boost };
      this.pending.push(input);
      if (this.pending.length > 120) this.pending.shift();
      const buttons = (f.weapon ? BTN.weapon : 0) | (f.special ? BTN.special : 0) | (f.boost ? BTN.boost : 0);
      this.lobby.send({ type: Msg.Input, seq: input.seq, throttle: f.throttle, steer: f.steer, buttons });
      const me = this.buffer[this.buffer.length - 1]?.robots[this.myId];
      if (this.predicted && me) {
        this.predicted = reconcile(
          this.predicted,
          [input],
          input.seq - 1,
          this.stats[this.myId]!,
          me.driveHealth,
          DT,
        );
      }
    }
  }

  private handleDisconnect(dt: number): void {
    if (this.disconnectedFor < 0 || this.result) return;
    this.disconnectedFor += dt;
    this.rejoinTimer -= dt;
    if (this.rejoinTimer <= 0) {
      this.rejoinTimer = REJOIN_EVERY_SEC;
      void this.lobby.rejoin();
    }
    if (this.disconnectedFor >= DISCONNECT_GRACE_SEC) {
      const last = this.buffer[this.buffer.length - 1];
      const myTeam = this.config.robots[this.myId]?.team ?? 1;
      this.result = {
        winnerTeam: myTeam,
        reason: 'walkover',
        durationSec: last?.time ?? 0,
        judgeScores: last?.scores ?? [],
        robots: this.config.robots.map((r, i) => ({
          id: i,
          team: r.team,
          hpFraction: (last?.robots[i]?.hp ?? 0) / Math.max(1, this.stats[i]!.hp),
          damageDealt: 0,
          damageTaken: 0,
          flips: 0,
          pits: 0,
        })),
      };
    }
  }

  hudExtras() {
    const ping = this.lobby.state.get().ping;
    if (this.disconnectedFor >= 0 && !this.result) {
      return {
        ping,
        net: 'disconnected' as const,
        disconnectLeft: Math.max(0, DISCONNECT_GRACE_SEC - this.disconnectedFor),
      };
    }
    return { ping, net: this.buffer.length < 2 ? ('waiting' as const) : ('ok' as const) };
  }

  destroy(): void {
    for (const o of this.offs) o();
  }
}

function withRobot(s: WorldState, id: number, r: RobotView): WorldState {
  const robots = s.robots.slice();
  robots[id] = r;
  return { ...s, robots };
}
