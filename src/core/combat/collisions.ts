import type Matter from 'matter-js';
import { BALANCE } from '../../config/balance';
import { WEAPONS } from '../../config/weapons';
import type { RobotEntity } from '../entities/robot';
import type { SimContext } from '../match/context';
import { activePairs, contactPoint, startedPairs } from '../physics/world';
import { hitSide } from './damage';

const P = BALANCE.physics;
const WEDGE_LIFT_SEC = 1.0;
const DASH_RAM_MUL = 2.4;
/** Wedges are built for ramming: frontal impacts hurt more even without a dash. */
const WEDGE_RAM_MUL = 1.9;

export type BodyOwner =
  | { kind: 'robot'; robot: RobotEntity }
  | { kind: 'wall' }
  | { kind: 'house'; id: string }
  | { kind: 'prop'; index: number };

export interface CollisionHooks {
  owner(body: Matter.Body): BodyOwner | undefined;
  /** Velocities (units/s) of every body before the physics step, keyed by body id. */
  preVelocity: Map<number, { x: number; y: number }>;
  damageProp(index: number, amount: number, x: number, y: number): void;
}

const sideOf = (r: RobotEntity, x: number, y: number) =>
  hitSide({ angle: r.body.angle, x: r.body.position.x, y: r.body.position.y }, x, y);

/** Ram/wall damage, wedge lifts and contact bookkeeping after a physics step. */
export function processCollisions(ctx: SimContext, hooks: CollisionHooks): void {
  for (const r of ctx.robots) r.contacts.length = 0;
  for (const pair of activePairs(ctx.physics)) {
    const a = hooks.owner(pair.bodyA);
    const b = hooks.owner(pair.bodyB);
    if (a?.kind === 'robot' && b?.kind === 'robot') {
      a.robot.contacts.push(b.robot.id);
      b.robot.contacts.push(a.robot.id);
    }
  }

  for (const pair of startedPairs(ctx.physics)) {
    const a = hooks.owner(pair.bodyA);
    const b = hooks.owner(pair.bodyB);
    if (!a || !b) continue;
    const va = hooks.preVelocity.get(pair.bodyA.id) ?? { x: 0, y: 0 };
    const vb = hooks.preVelocity.get(pair.bodyB.id) ?? { x: 0, y: 0 };
    const n = pair.collision.normal;
    const speed = Math.abs((va.x - vb.x) * n.x + (va.y - vb.y) * n.y);
    const c = contactPoint(pair);

    if (a.kind === 'robot' && b.kind === 'robot') {
      ctx.events.emit('collision', { aId: a.robot.id, bId: b.robot.id, x: c.x, y: c.y, speed, wall: false });
      ram(ctx, a.robot, b.robot, speed, c);
      ram(ctx, b.robot, a.robot, speed, c);
      wedgeLift(ctx, a.robot, b.robot, c);
      wedgeLift(ctx, b.robot, a.robot, c);
    } else if (a.kind === 'robot' || b.kind === 'robot') {
      const r = a.kind === 'robot' ? a.robot : (b as { robot: RobotEntity }).robot;
      const other = a.kind === 'robot' ? b : a;
      if (other.kind === 'prop') {
        hooks.damageProp(
          other.index,
          Math.max(0, speed - P.ramThreshold) * P.ramDamagePerSpeed * 2,
          c.x,
          c.y,
        );
        continue;
      }
      ctx.events.emit('collision', {
        aId: r.id,
        bId: -1,
        x: c.x,
        y: c.y,
        speed,
        wall: other.kind === 'wall',
      });
      if (speed > P.ramThreshold) {
        ctx.damage({
          target: r,
          amount: (speed - P.ramThreshold) * P.wallDamagePerSpeed,
          side: sideOf(r, c.x, c.y),
          source: 'wall',
          sourceId: -1,
          x: c.x,
          y: c.y,
          force: speed,
        });
      }
    }
  }
}

function ram(
  ctx: SimContext,
  attacker: RobotEntity,
  target: RobotEntity,
  speed: number,
  c: { x: number; y: number },
) {
  if (speed <= P.ramThreshold || attacker.team === target.team) return;
  const mA = attacker.stats.weight;
  const mB = target.stats.weight;
  const dashing = attacker.stats.weaponType === 'wedge' && attacker.weapon.phase === 'strike';
  // Only the robot whose front made the contact deals ram damage.
  if (sideOf(attacker, c.x, c.y) !== 'front' && !dashing) return;
  const amount =
    (speed - P.ramThreshold) *
    P.ramDamagePerSpeed *
    ((2 * mA) / (mA + mB)) *
    (dashing ? DASH_RAM_MUL : attacker.stats.weaponType === 'wedge' ? WEDGE_RAM_MUL : 1);
  ctx.damage({
    target,
    amount,
    side: sideOf(target, c.x, c.y),
    source: 'ram',
    sourceId: attacker.id,
    x: c.x,
    y: c.y,
    force: speed,
  });
}

/** A wedge hitting with its front may slide under the opponent, removing its traction briefly. */
function wedgeLift(ctx: SimContext, attacker: RobotEntity, target: RobotEntity, c: { x: number; y: number }) {
  if (attacker.stats.weaponType !== 'wedge' || attacker.team === target.team) return;
  if (sideOf(attacker, c.x, c.y) !== 'front') return;
  // Head-on wedge vs wedge: neither gets under.
  if (target.stats.weaponType === 'wedge' && sideOf(target, c.x, c.y) === 'front') return;
  const chance = (WEAPONS.wedge.underChance ?? 0) + (attacker.build.weapon.level - 1) * 0.05;
  if (ctx.rng.chance(chance)) target.status.lifted = Math.max(target.status.lifted, WEDGE_LIFT_SEC);
}
