import { TUTORIAL } from '../../config/tutorial';
import type { MatchSim } from '../../core/match/matchSim';
import { angleDiff } from '../../utils/math';

/** Walks a new player through the controls while the opponent and the clock are frozen. */
export class TutorialDirector {
  private index = 0;
  private progress = 0;
  private last: { x: number; y: number; a: number };
  private offs: (() => void)[] = [];
  done = false;

  constructor(
    private sim: MatchSim,
    private playerId: number,
  ) {
    sim.warmup = true;
    const r = sim.robots[playerId]!;
    this.last = { x: r.body.position.x, y: r.body.position.y, a: r.body.angle };
    this.offs.push(sim.events.on('damage', (e) => e.sourceId === playerId && this.bump('ram', e.amount)));
  }

  get step(): { step: string; progress: number } | null {
    if (this.done) return null;
    const s = TUTORIAL[this.index]!;
    return { step: s.id, progress: Math.min(1, this.progress / s.goal) };
  }

  private bump(id: string, amount: number): void {
    if (TUTORIAL[this.index]?.id === id) this.progress += amount;
  }

  /** Call once per simulation tick. */
  update(dt: number): void {
    if (this.done) return;
    const r = this.sim.robots[this.playerId]!;
    const p = r.body.position;
    const step = TUTORIAL[this.index]!;
    if (step.id === 'drive') this.progress += Math.hypot(p.x - this.last.x, p.y - this.last.y);
    if (step.id === 'turn') this.progress += Math.abs(angleDiff(this.last.a, r.body.angle));
    if (step.id === 'rules') this.progress += dt;
    if (step.id === 'weapon' && r.input.weapon && !r.prevInput.weapon) this.progress += 1;
    if (step.id === 'boost' && r.status.boosting) this.progress += dt;
    this.last = { x: p.x, y: p.y, a: r.body.angle };
    if (this.progress >= step.goal) {
      this.index++;
      this.progress = 0;
      if (this.index >= TUTORIAL.length) this.finish();
    }
  }

  skip(): void {
    this.finish();
  }

  private finish(): void {
    this.done = true;
    this.sim.warmup = false;
    for (const o of this.offs) o();
    // Fresh start for the real fight: full HP for the opponent after practice hits.
    for (const r of this.sim.robots) {
      if (r.id !== this.playerId) r.hp = r.maxHp;
      r.score.damageDealt = 0;
      r.score.damageTaken = 0;
    }
  }
}
