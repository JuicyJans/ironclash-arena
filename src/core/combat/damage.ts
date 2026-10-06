import { BALANCE } from '../../config/balance';
import type { ArmorSide } from '../../config/types';
import { angleDiff } from '../../utils/math';
import type { DamageSource, EventBus } from '../events';
import type { RobotEntity } from '../entities/robot';
import type { Rng } from '../rng';

const D = BALANCE.damage;

/** Which side of `target` is facing the point (x, y). */
export function hitSide(target: { angle: number; x: number; y: number }, x: number, y: number): ArmorSide {
  const toHit = Math.atan2(y - target.y, x - target.x);
  const rel = Math.abs(angleDiff(target.angle, toHit));
  if (rel <= D.frontArc) return 'front';
  if (rel >= Math.PI - D.rearArc) return 'rear';
  return 'side';
}

export function armorFor(r: RobotEntity, side: ArmorSide): number {
  switch (side) {
    case 'front':
      return r.stats.armorFront;
    case 'side':
      return r.stats.armorSide;
    case 'rear':
      return r.stats.armorRear;
    case 'top':
      return r.stats.armorTop;
  }
}

/** Pure damage formula: raw damage after side multiplier and armor. */
export function computeDamage(raw: number, side: ArmorSide, armor: number, shielded: boolean): number {
  const armorClamped = Math.min(Math.max(armor, 0), D.armorCap);
  const shield = shielded ? 1 - BALANCE.support.shieldDamageReduction : 1;
  return Math.max(0, raw * D.globalMul * D.sideMultiplier[side] * (1 - armorClamped) * shield);
}

export interface DamageContext {
  events: EventBus;
  rng: Rng;
  tick: number;
  robots: RobotEntity[];
  /** Called when a robot is destroyed. */
  onKo: (robot: RobotEntity, reason: 'destroyed', byId: number) => void;
  infiniteHp: (robot: RobotEntity) => boolean;
}

export interface DamageHit {
  target: RobotEntity;
  amount: number; // raw damage before armor
  side: ArmorSide;
  source: DamageSource;
  sourceId: number;
  x: number;
  y: number;
  force: number;
  /** Continuous damage is accumulated and not emitted as separate events. */
  silent?: boolean;
}

/** Applies a hit: armor, shields, score bookkeeping, component damage and KO. Returns final damage. */
export function applyDamage(ctx: DamageContext, hit: DamageHit): number {
  const t = hit.target;
  if (!t.alive || hit.amount <= 0) return 0;
  const attacker = hit.sourceId >= 0 ? ctx.robots.find((r) => r.id === hit.sourceId) : undefined;
  const bonus = attacker ? attacker.stats.damageBonus : 1;
  const final = computeDamage(hit.amount * bonus, hit.side, armorFor(t, hit.side), t.status.shield > 0);
  if (final <= 0) return 0;

  if (!ctx.infiniteHp(t)) t.hp -= final;
  t.score.damageTaken += final;
  if (attacker && attacker.team !== t.team) {
    attacker.score.damageDealt += final;
    t.lastAttacker = attacker.id;
    t.lastAttackerTick = ctx.tick;
  }

  checkComponentDamage(ctx, t);

  if (!hit.silent) {
    ctx.events.emit('damage', {
      targetId: t.id,
      sourceId: hit.sourceId,
      amount: final,
      x: hit.x,
      y: hit.y,
      side: hit.side,
      source: hit.source,
      force: hit.force,
    });
  }

  if (t.hp <= 0) {
    t.hp = 0;
    ctx.onKo(t, 'destroyed', hit.sourceId);
  }
  return final;
}

/** At HP thresholds the drive or the weapon may become damaged (seeded chance). */
export function checkComponentDamage(ctx: DamageContext, r: RobotEntity): void {
  const frac = r.hp / r.maxHp;
  while (r.thresholdsPassed < D.componentThresholds.length) {
    const threshold = D.componentThresholds[r.thresholdsPassed] ?? 0;
    if (frac > threshold) break;
    r.thresholdsPassed++;
    if (!ctx.rng.chance(D.componentChance)) continue;
    const component = ctx.rng.chance(0.5) ? 'drive' : 'weapon';
    if (component === 'drive') r.driveHealth *= D.driveDamagedMul;
    else r.weaponHealth *= D.weaponDamagedMul;
    ctx.events.emit('componentDamaged', { robotId: r.id, component });
  }
}
