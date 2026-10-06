import type { RobotStats } from '../../config/types';
import { EventBus } from '../../core/events';
import type { InputFrame } from '../../core/entities/robot';
import { MatchSim } from '../../core/match/matchSim';
import type { MatchConfig, MatchResult } from '../../core/match/types';
import { captureState, type WorldState } from '../../core/match/worldState';
import { computeRobotStats } from '../../core/robot/computeStats';
import type { Keymap } from '../../core/save/schema';
import { readPlayerInput } from '../input/playerInput';
import { TutorialDirector } from './tutorial';

/** Common interface for local and networked matches, consumed by ArenaScene. */
export interface MatchController {
  readonly config: MatchConfig;
  readonly events: EventBus;
  readonly stats: RobotStats[];
  prev: WorldState;
  curr: WorldState;
  readonly ended: boolean;
  readonly result: MatchResult | null;
  /** Local controllers can pause; online ones cannot. */
  readonly pausable: boolean;
  /** Whether this controller wants a fixed-tick step this frame (guests are driven by the network). */
  step(): void;
  /** Frame hook for controllers that don't run on the fixed tick (network guest). */
  frame?(dtSec: number): void;
  /** Interpolation factor for frame-driven controllers. */
  alpha?: number;
  sim?: MatchSim;
  tutorial?: TutorialDirector;
  hudExtras?(): { ping?: number; net?: 'ok' | 'waiting' | 'disconnected'; disconnectLeft?: number };
  destroy(): void;
}

/** Runs the authoritative simulation locally (campaign, quick match, local 2P, practice). */
export class LocalController implements MatchController {
  readonly sim: MatchSim;
  readonly events: EventBus;
  readonly stats: RobotStats[];
  readonly pausable = true;
  tutorial?: TutorialDirector;
  prev: WorldState;
  curr: WorldState;
  private humans: { id: number; player: number }[];

  constructor(
    readonly config: MatchConfig,
    private keymaps: { p1: Keymap; p2: Keymap },
    tutorial: boolean,
  ) {
    this.sim = new MatchSim(config);
    this.events = this.sim.events;
    this.stats = this.sim.robots.map((r) => r.stats);
    this.humans = this.sim.robots
      .filter((r) => r.controller === 'human')
      .map((r) => ({ id: r.id, player: r.playerIndex }));
    if (tutorial && this.humans[0]) this.tutorial = new TutorialDirector(this.sim, this.humans[0].id);
    this.curr = captureState(this.sim);
    this.prev = this.curr;
  }

  get ended(): boolean {
    return this.sim.ended;
  }

  get result(): MatchResult | null {
    return this.sim.result;
  }

  step(): void {
    const inputs: Record<number, InputFrame> = {};
    const count = this.humans.length;
    for (const h of this.humans) {
      inputs[h.id] = readPlayerInput(h.player, count, h.player === 1 ? this.keymaps.p2 : this.keymaps.p1);
    }
    this.sim.step(inputs);
    this.tutorial?.update(this.sim.dt);
    this.prev = this.curr;
    this.curr = captureState(this.sim);
  }

  destroy(): void {
    this.sim.destroy();
  }
}

export const statsFor = (config: MatchConfig): RobotStats[] =>
  config.robots.map((r) => computeRobotStats(r.build));
