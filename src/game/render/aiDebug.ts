import Phaser from 'phaser';
import type { MatchSim } from '../../core/match/matchSim';

/** `?debug=ai`: draws each AI's goal and target, and lists its utility scores. */
export class AiDebugOverlay {
  private g: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private sim: MatchSim,
  ) {
    this.g = scene.add.graphics().setDepth(2000);
  }

  update(): void {
    this.g.clear();
    for (const [id, brain] of this.sim.ais) {
      const r = this.sim.robots[id];
      if (!r) continue;
      const d = brain.debug;
      this.g
        .lineStyle(2, 0xffc21a, 0.9)
        .lineBetween(r.body.position.x, r.body.position.y, d.goal.x, d.goal.y);
      this.g.fillStyle(0xffc21a, 1).fillCircle(d.goal.x, d.goal.y, 6);
      this.g.lineStyle(1, 0xff3b3b, 0.8).strokeCircle(d.perceived.x, d.perceived.y, 14);
    }
  }

  lines(): string[] {
    const out: string[] = [];
    for (const [id, brain] of this.sim.ais) {
      const d = brain.debug;
      const top = Object.entries(d.scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([k, v]) => `${k}:${v.toFixed(2)}`)
        .join(' ');
      out.push(`#${id} ${this.sim.robots[id]?.name} → ${d.action.toUpperCase()} | ${top}`);
    }
    return out;
  }

  destroy(): void {
    this.g.destroy();
  }
}
