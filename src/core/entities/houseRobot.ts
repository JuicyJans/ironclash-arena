import type Matter from 'matter-js';
import { BALANCE } from '../../config/balance';
import type { HouseRobotDef } from '../../config/types';
import { angleDiff, clamp, inRect, rectCenter } from '../../utils/math';
import { knockback } from '../combat/reach';
import type { SimContext } from '../match/context';
import { CAT, createBody, getVel, setAngVel, setVel, type PhysicsWorld } from '../physics/world';
import type { RobotEntity } from './robot';

const SIZE = 74;
const MASS = 260;
const ZONE_MARGIN = 60;
const TURN_RATE = 3.2;
const STEER_GAIN = 6;
const LIFTER_LAUNCH = 700;
const FLAME_BURN = 2.5;
const HAMMER_STUN = 0.3;
const PATROL_RADIUS = 30;
const PATROL_SPEED = 0.6;

/** A Corner Patrol Zone guardian. Punishes robots that linger in its zone. */
export class HouseRobot {
  readonly body: Matter.Body;
  readonly intrusion = new Map<number, number>();
  cooldown = 0;
  targetId = -1;
  /** 0..1 attack animation progress (1 = just struck). */
  attackAnim = 0;

  constructor(
    readonly def: HouseRobotDef,
    world: PhysicsWorld,
  ) {
    const c = rectCenter(def.zone);
    this.body = createBody(world, {
      x: c.x,
      y: c.y,
      angle: Math.PI / 4,
      w: SIZE,
      h: SIZE,
      mass: MASS,
      label: `house:${def.id}`,
      category: CAT.house,
      chamfer: 10,
    });
  }

  update(ctx: SimContext): void {
    const dt = ctx.dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt * 3);
    const zone = this.def.zone;

    let target: RobotEntity | undefined;
    let longest = this.def.grace;
    for (const r of ctx.robots) {
      const inside = r.alive && r.z <= 0 && r.status.falling <= 0 && inRect(r.body.position, zone);
      const t = inside
        ? (this.intrusion.get(r.id) ?? 0) + dt
        : Math.max(0, (this.intrusion.get(r.id) ?? 0) - dt * 2);
      this.intrusion.set(r.id, t);
      if (t > longest) {
        longest = t;
        target = r;
      }
    }
    this.targetId = target?.id ?? -1;

    const pos = this.body.position;
    let goal = rectCenter(zone);
    let speed = this.def.speed * BALANCE.house.retreatSpeedMul;
    if (target) {
      goal = target.body.position;
      speed = this.def.speed;
    } else {
      const a = ctx.time * PATROL_SPEED;
      goal = { x: goal.x + Math.cos(a) * PATROL_RADIUS, y: goal.y + Math.sin(a) * PATROL_RADIUS };
    }
    // Never leave the zone (plus a small margin).
    goal = {
      x: clamp(goal.x, zone.x - ZONE_MARGIN, zone.x + zone.w + ZONE_MARGIN),
      y: clamp(goal.y, zone.y - ZONE_MARGIN, zone.y + zone.h + ZONE_MARGIN),
    };
    this.steer(goal, speed, !!target);

    if (target && this.cooldown <= 0) {
      const d = Math.hypot(target.body.position.x - pos.x, target.body.position.y - pos.y);
      if (d - SIZE / 2 - target.radius <= BALANCE.house.attackReach) this.attack(ctx, target);
    }
  }

  private steer(goal: { x: number; y: number }, speed: number, chasing: boolean): void {
    const pos = this.body.position;
    const dx = goal.x - pos.x;
    const dy = goal.y - pos.y;
    const d = Math.hypot(dx, dy);
    const desired = Math.atan2(dy, dx);
    setAngVel(this.body, clamp(angleDiff(this.body.angle, desired) * STEER_GAIN, -TURN_RATE, TURN_RATE));
    const s = d < 8 ? 0 : Math.min(speed, d * 3) * (chasing ? 1 : 0.8);
    const v = getVel(this.body);
    setVel(this.body, v.x + ((dx / (d || 1)) * s - v.x) * 0.2, v.y + ((dy / (d || 1)) * s - v.y) * 0.2);
  }

  private attack(ctx: SimContext, r: RobotEntity): void {
    const pos = this.body.position;
    const p = r.body.position;
    const hit = (amount: number, side: 'top' | 'side') =>
      ctx.damage({
        target: r,
        amount,
        side,
        source: 'house',
        sourceId: -1,
        x: p.x,
        y: p.y,
        force: amount * 10,
      });
    switch (this.def.attack) {
      case 'hammer':
        hit(this.def.damage, 'top');
        r.status.stun = Math.max(r.status.stun, HAMMER_STUN);
        break;
      case 'lifter':
        hit(this.def.damage, 'side');
        ctx.launch(r, LIFTER_LAUNCH, -1);
        break;
      case 'flame':
        hit(this.def.damage, 'top');
        r.status.burn = Math.max(r.status.burn, FLAME_BURN);
        break;
      case 'saw':
        hit(this.def.damage, 'side');
        break;
    }
    // Push the intruder back out of the corner, towards the arena centre.
    const cx = ctx.arena.size.w / 2;
    const cy = ctx.arena.size.h / 2;
    knockback(r, p.x + (p.x - cx), p.y + (p.y - cy), 320);
    knockback(r, pos.x, pos.y, 120);
    this.cooldown = this.def.attackCooldown;
    this.attackAnim = 1;
    ctx.events.emit('houseAttack', { houseId: this.def.id, targetId: r.id, x: p.x, y: p.y });
  }
}
