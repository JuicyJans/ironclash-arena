import Matter from 'matter-js';
import type { HazardDef } from '../../config/types';
import { inRect, rectCenter } from '../../utils/math';
import type { SimContext } from '../match/context';
import type { RobotEntity } from './robot';
import { hazardContains, hazardOffset, hazardPhase, rotateAround, type HazardPhase } from './hazards';

export interface HazardRuntime {
  def: HazardDef;
  offset: number;
  phase: HazardPhase;
  progress: number;
  untilActive: number;
  /** Robots already hit during the current activation (one-shot hazards). */
  hit: Set<number>;
}

const centerOf = (def: HazardDef) =>
  'rect' in def ? rectCenter(def.rect) : { x: def.circle.x, y: def.circle.y };
const grounded = (r: RobotEntity) => r.alive && r.z <= 0 && r.status.falling <= 0;

export class HazardSystem {
  readonly items: HazardRuntime[];

  constructor(
    defs: HazardDef[],
    seed: number,
    private enabled: boolean,
  ) {
    this.items = defs.map((def) => ({
      def,
      offset: hazardOffset(def, seed),
      phase: 'off',
      progress: 0,
      untilActive: Infinity,
      hit: new Set(),
    }));
  }

  /** Ground grip multiplier at a point (lowest ice patch wins). */
  gripAt(x: number, y: number): number {
    if (!this.enabled) return 1;
    let g = 1;
    for (const h of this.items) {
      if (h.def.kind === 'ice' && inRect({ x, y }, h.def.rect)) g = Math.min(g, h.def.gripMul);
    }
    return g;
  }

  update(ctx: SimContext): void {
    if (!this.enabled) return;
    for (const h of this.items) {
      const info = hazardPhase(h.def, ctx.time, h.offset);
      const prev = h.phase;
      h.phase = info.phase;
      h.progress = info.progress;
      h.untilActive = info.untilActive;
      const c = centerOf(h.def);
      if (prev !== h.phase) {
        if (h.phase === 'telegraph')
          ctx.events.emit('hazardTelegraph', { hazardId: h.def.id, kind: h.def.kind, ...c });
        if (h.phase === 'active' && 'period' in h.def) {
          h.hit.clear();
          ctx.events.emit('hazardTriggered', { hazardId: h.def.id, kind: h.def.kind, ...c });
        }
      }
      if (h.phase !== 'active') continue;
      for (const r of ctx.robots) {
        if (!grounded(r)) continue;
        const margin = h.def.kind === 'wallSaw' ? r.radius * 0.8 : r.radius * 0.35;
        if (!hazardContains(h.def, r.body.position, margin)) continue;
        this.apply(ctx, h, r);
      }
    }
  }

  private apply(ctx: SimContext, h: HazardRuntime, r: RobotEntity): void {
    const def = h.def;
    const pos = r.body.position;
    const hitOnce = () => {
      if (h.hit.has(r.id)) return false;
      h.hit.add(r.id);
      ctx.events.emit('hazardHit', { hazardId: def.id, kind: def.kind, robotId: r.id });
      return true;
    };
    const dmg = (amount: number, silent: boolean, force = 0) =>
      ctx.damage({
        target: r,
        amount,
        side: 'top',
        source: 'hazard',
        sourceId: -1,
        x: pos.x,
        y: pos.y,
        force,
        silent,
      });

    switch (def.kind) {
      case 'spikes':
        if (hitOnce()) {
          dmg(def.damage, false, def.launch);
          ctx.launch(r, def.launch, -1);
        }
        break;
      case 'floorFlipper':
        if (hitOnce()) {
          dmg(def.damage, false, def.launch);
          ctx.launch(r, def.launch, r.lastAttacker);
        }
        break;
      case 'press':
        if (hitOnce()) {
          dmg(def.damage, false, def.damage * 10);
          r.status.stun = Math.max(r.status.stun, def.stun);
        }
        break;
      case 'flameJet':
        dmg(def.dps * ctx.dt, true);
        r.status.burn = Math.max(r.status.burn, def.burn);
        break;
      case 'wallSaw':
      case 'lava':
        dmg(def.dps * ctx.dt, true);
        break;
      case 'turntable': {
        const a = def.angularSpeed * ctx.dt;
        const p = rotateAround(pos, def.circle, a);
        Matter.Body.setPosition(r.body, p);
        Matter.Body.setAngle(r.body, r.body.angle + a);
        break;
      }
      case 'ice':
        break;
    }
  }
}
