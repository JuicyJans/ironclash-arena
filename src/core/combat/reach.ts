import { BALANCE } from '../../config/balance';
import { angleDiff, clamp, len } from '../../utils/math';
import type { RobotEntity } from '../entities/robot';
import { addVel } from '../physics/world';

/** Max height at which an airborne robot can still be hit by floor-level weapons. */
const HITTABLE_Z = 18;

export interface ReachInfo {
  /** Gap between the attacker's weapon edge and the target's hull (<= 0 means touching). */
  gap: number;
  /** Angle of the target relative to the attacker's heading. */
  bearing: number;
  dist: number;
}

/** Geometry of `target` relative to `attacker`. All-around weapons (arc >= PI) measure from the hull radius. */
export function reachInfo(attacker: RobotEntity, target: RobotEntity, arc: number): ReachInfo {
  const a = attacker.body.position;
  const b = target.body.position;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = len(dx, dy);
  const bearing = angleDiff(attacker.body.angle, Math.atan2(dy, dx));
  const own = arc >= Math.PI - 1e-3 ? attacker.radius : attacker.stats.size.w / 2;
  const gap = dist - own - target.radius * 0.85;
  return { gap, bearing, dist };
}

export function inReach(attacker: RobotEntity, target: RobotEntity, range: number, arc: number): boolean {
  if (!target.alive || target.team === attacker.team || target.status.falling > 0) return false;
  if (target.z > HITTABLE_Z) return false;
  const info = reachInfo(attacker, target, arc);
  return info.gap <= range && Math.abs(info.bearing) <= arc;
}

export function targetsInReach(
  attacker: RobotEntity,
  robots: RobotEntity[],
  range: number,
  arc: number,
): RobotEntity[] {
  return robots.filter((t) => t !== attacker && inReach(attacker, t, range, arc));
}

/** Pushes `target` away from (fromX, fromY) by `speed` units/s. Heavier robots are moved less. */
export function knockback(
  target: RobotEntity,
  fromX: number,
  fromY: number,
  speed: number,
  refMass = 60,
): void {
  const p = target.body.position;
  let dx = p.x - fromX;
  let dy = p.y - fromY;
  const d = len(dx, dy) || 1;
  dx /= d;
  dy /= d;
  const massFactor = clamp(refMass / Math.max(target.stats.weight, 1), 0.35, 1.6);
  const s = Math.min(speed * massFactor, BALANCE.physics.maxKnockback);
  addVel(target.body, dx * s, dy * s);
}

/** World position of the attacker's weapon tip. */
export function weaponTip(r: RobotEntity, extra = 0): { x: number; y: number } {
  const reach = r.stats.size.w / 2 + extra;
  return {
    x: r.body.position.x + Math.cos(r.body.angle) * reach,
    y: r.body.position.y + Math.sin(r.body.angle) * reach,
  };
}
