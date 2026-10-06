import { BALANCE, DT } from '../config/balance';
import type { RobotStats } from '../config/types';
import { EventBus, type EventName } from '../core/events';
import { NO_INPUT, type InputFrame } from '../core/entities/robot';
import { MatchSim } from '../core/match/matchSim';
import type { MatchConfig, MatchResult } from '../core/match/types';
import { captureState, type WorldState } from '../core/match/worldState';
import type { Keymap } from '../core/save/schema';
import { readPlayerInput } from '../game/input/playerInput';
import type { MatchController } from '../game/match/localController';
import type { NetLobby } from './lobby';
import { BTN, EVENT_NAMES, Msg, type NetEvent } from './protocol';

const SNAPSHOT_EVERY = Math.round(BALANCE.tickRate / BALANCE.snapshotRate);
export const DISCONNECT_GRACE_SEC = 15;
const MAX_STEPS = 5;

/** Host side: runs the authoritative simulation and streams snapshots to the guest. */
export class HostController implements MatchController {
  readonly sim: MatchSim;
  readonly events: EventBus;
  readonly stats: RobotStats[];
  readonly pausable = false;
  prev: WorldState;
  curr: WorldState;
  alpha = 1;
  private acc = 0;
  private guestInput: InputFrame = NO_INPUT;
  private guestSeq = 0;
  private outbox: NetEvent[] = [];
  private offs: (() => void)[] = [];
  private disconnectedFor = -1;
  private resultSent = false;
  private hostId: number;
  private guestId: number;

  constructor(
    readonly config: MatchConfig,
    private lobby: NetLobby,
    private keymap: Keymap,
  ) {
    this.sim = new MatchSim(config);
    this.events = this.sim.events;
    this.stats = this.sim.robots.map((r) => r.stats);
    this.hostId = this.sim.robots.findIndex((r) => r.controller === 'human');
    this.guestId = this.sim.robots.findIndex((r) => r.controller === 'remote');
    this.curr = captureState(this.sim);
    this.prev = this.curr;
    const names = new Set<EventName>(EVENT_NAMES);
    this.offs.push(
      this.sim.events.onAny((name, payload) => {
        if (names.has(name)) this.outbox.push({ name, payload } as NetEvent);
      }),
      lobby.matchMessages.on((m) => {
        if (m.type === Msg.Input && m.seq > this.guestSeq) {
          this.guestSeq = m.seq;
          this.guestInput = {
            throttle: m.throttle,
            steer: m.steer,
            weapon: (m.buttons & BTN.weapon) !== 0,
            special: (m.buttons & BTN.special) !== 0,
            boost: (m.buttons & BTN.boost) !== 0,
          };
        }
      }),
      lobby.transportChanged.on((t) => {
        this.disconnectedFor = t ? -1 : 0;
        if (!t) this.guestInput = NO_INPUT;
      }),
    );
  }

  get ended(): boolean {
    return this.sim.ended;
  }

  get result(): MatchResult | null {
    return this.sim.result;
  }

  step(): void {
    /* driven by frame() */
  }

  frame(dt: number): void {
    if (this.disconnectedFor >= 0 && !this.sim.ended) {
      this.disconnectedFor += dt;
      if (this.disconnectedFor >= DISCONNECT_GRACE_SEC)
        this.sim.forfeit(this.sim.robots[this.guestId]?.team ?? 1);
      this.prev = this.curr = captureState(this.sim);
      return;
    }
    this.acc += dt;
    let steps = 0;
    while (this.acc >= DT && steps < MAX_STEPS) {
      this.tick();
      this.acc -= DT;
      steps++;
    }
    if (steps === MAX_STEPS) this.acc = 0;
    this.alpha = Math.min(1, this.acc / DT);
  }

  private tick(): void {
    const inputs: Record<number, InputFrame> = {
      [this.hostId]: readPlayerInput(0, 1, this.keymap),
      [this.guestId]: this.guestInput,
    };
    this.sim.step(inputs);
    this.prev = this.curr;
    this.curr = captureState(this.sim);
    if (this.sim.tick % SNAPSHOT_EVERY === 0 || this.sim.ended) {
      this.lobby.send({ type: Msg.Snapshot, ackSeq: this.guestSeq, state: this.curr, events: this.outbox });
      this.outbox = [];
    }
    if (this.sim.ended && !this.resultSent && this.sim.result) {
      this.resultSent = true;
      this.lobby.send({ type: Msg.Result, result: JSON.stringify(this.sim.result) });
    }
  }

  hudExtras() {
    const ping = this.lobby.state.get().ping;
    if (this.disconnectedFor >= 0) {
      return {
        ping,
        net: 'disconnected' as const,
        disconnectLeft: Math.max(0, DISCONNECT_GRACE_SEC - this.disconnectedFor),
      };
    }
    return { ping, net: 'ok' as const };
  }

  destroy(): void {
    for (const o of this.offs) o();
    this.sim.destroy();
  }
}
