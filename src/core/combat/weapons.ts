import { WEAPONS, type WeaponSpec } from '../../config/weapons';
import { BALANCE } from '../../config/balance';
import { canAct, isPressed, type RobotEntity } from '../entities/robot';
import type { SimContext } from '../match/context';
import { getVel, setVel } from '../physics/world';
import { hitSide } from './damage';
import { inReach, knockback, targetsInReach } from './reach';

const COAST_RATE = 0.35; // rpm lost per second when a spinner is not powered
const DISABLED_COAST_RATE = 0.9;
const MIN_HIT_RPM = 0.25;
const IGNITION_DECAY = 3;
const HAMMER_STUN = 0.15;
const GRAB_DISTANCE_SLACK = 40;
const HOLD_FOLLOW = 12;

const weaponLevel = (r: RobotEntity): number => r.build.weapon.level;
const cooldownOf = (r: RobotEntity): number =>
  r.stats.cooldown * (r.weaponHealth < 1 ? BALANCE.damage.weaponDamagedCooldownMul : 1);
const damageOf = (r: RobotEntity): number => r.stats.damage * r.weaponHealth;

function sideFrom(attacker: RobotEntity, target: RobotEntity, top = false) {
  if (top) return 'top' as const;
  const tb = target.body;
  return hitSide(
    { angle: tb.angle, x: tb.position.x, y: tb.position.y },
    attacker.body.position.x,
    attacker.body.position.y,
  );
}

function hit(
  ctx: SimContext,
  r: RobotEntity,
  t: RobotEntity,
  amount: number,
  force: number,
  opts: { top?: boolean; silent?: boolean } = {},
) {
  const p = t.body.position;
  const a = r.body.position;
  return ctx.damage({
    target: t,
    amount,
    side: sideFrom(r, t, opts.top),
    source: r.stats.weaponType,
    sourceId: r.id,
    x: (p.x + a.x) / 2,
    y: (p.y + a.y) / 2,
    force,
    silent: opts.silent,
  });
}

export function updateWeapon(ctx: SimContext, r: RobotEntity): void {
  const spec = WEAPONS[r.stats.weaponType];
  r.weapon.cooldown = Math.max(0, r.weapon.cooldown - ctx.dt);
  if (spec.mode === 'press') updatePress(ctx, r, spec);
  else updateHold(ctx, r, spec);
  r.energy = Math.max(0, r.energy);
}

function updatePress(ctx: SimContext, r: RobotEntity, spec: WeaponSpec): void {
  const w = r.weapon;
  const able = canAct(r);
  switch (w.phase) {
    case 'idle':
      if (able && isPressed(r, 'weapon') && w.cooldown <= 0 && r.energy >= r.stats.energyCost) {
        r.energy -= r.stats.energyCost;
        w.phase = 'windup';
        w.timer = spec.windup;
        ctx.events.emit('weaponWindup', { robotId: r.id, weapon: spec.type, duration: spec.windup });
      }
      break;
    case 'windup':
      w.timer -= ctx.dt;
      if (!able) {
        w.phase = 'idle';
        w.cooldown = cooldownOf(r) * 0.5;
      } else if (w.timer <= 0) {
        const grabbed = strike(ctx, r, spec);
        w.phase = grabbed ? 'holding' : 'strike';
        w.timer = grabbed ? (spec.holdMax ?? 0) : spec.strike;
      }
      break;
    case 'strike':
      w.timer -= ctx.dt;
      if (spec.type === 'wedge' && able) {
        // Dash: hold forward speed for the strike window.
        const f = r.stats.topSpeed * (spec.dash ?? 1) * r.driveHealth;
        const v = getVel(r.body);
        const fx = Math.cos(r.body.angle);
        const fy = Math.sin(r.body.angle);
        const vf = v.x * fx + v.y * fy;
        if (vf < f) setVel(r.body, v.x + (f - vf) * fx * 0.5, v.y + (f - vf) * fy * 0.5);
      }
      if (w.timer <= 0) {
        w.phase = 'idle';
        w.cooldown = cooldownOf(r);
      }
      break;
    case 'holding':
      updateHolding(ctx, r, able);
      break;
  }
}

/** Executes a press-weapon strike. Returns true if the crusher grabbed a target. */
function strike(ctx: SimContext, r: RobotEntity, spec: WeaponSpec): boolean {
  const targets = targetsInReach(r, ctx.robots, r.stats.range, spec.arc);
  const lvl = weaponLevel(r);
  const pos = r.body.position;
  let grabbed = false;
  for (const t of targets) {
    switch (spec.type) {
      case 'flipper':
        hit(ctx, r, t, damageOf(r), spec.launch);
        ctx.launch(t, spec.launch * (0.92 + 0.05 * lvl), r.id);
        knockback(t, pos.x, pos.y, spec.knockback);
        break;
      case 'hammer':
        hit(ctx, r, t, damageOf(r), 60, { top: true });
        t.status.stun = Math.max(t.status.stun, HAMMER_STUN);
        knockback(t, pos.x, pos.y, spec.knockback);
        break;
      case 'lance':
        hit(ctx, r, t, damageOf(r), spec.knockback);
        knockback(t, pos.x, pos.y, spec.knockback);
        break;
      case 'crusher':
        if (grabbed || t.status.heldBy >= 0) break;
        grabbed = true;
        r.weapon.heldTarget = t.id;
        t.status.heldBy = r.id;
        hit(ctx, r, t, damageOf(r) * 0.6, 30);
        ctx.events.emit('grab', { robotId: r.id, targetId: t.id, released: false });
        break;
      case 'wedge':
        hit(ctx, r, t, damageOf(r), spec.knockback);
        knockback(t, pos.x, pos.y, spec.knockback);
        break;
      default:
        break;
    }
    r.score.hits++;
  }
  ctx.events.emit('weaponFire', {
    robotId: r.id,
    weapon: spec.type,
    x: pos.x,
    y: pos.y,
    angle: r.body.angle,
    hit: targets.length > 0,
  });
  return grabbed;
}

function release(ctx: SimContext, r: RobotEntity): void {
  const t = ctx.robot(r.weapon.heldTarget);
  if (t && t.status.heldBy === r.id) t.status.heldBy = -1;
  if (r.weapon.heldTarget >= 0) {
    ctx.events.emit('grab', { robotId: r.id, targetId: r.weapon.heldTarget, released: true });
  }
  r.weapon.heldTarget = -1;
  r.weapon.phase = 'idle';
  r.weapon.cooldown = cooldownOf(r);
}

function updateHolding(ctx: SimContext, r: RobotEntity, able: boolean): void {
  const w = r.weapon;
  const t = ctx.robot(w.heldTarget);
  w.timer -= ctx.dt;
  const tooFar = t ? inReachLoose(r, t) === false : true;
  if (!t || !t.alive || !able || w.timer <= 0 || r.energy <= 0 || tooFar || isPressed(r, 'weapon')) {
    release(ctx, r);
    return;
  }
  r.energy -= r.stats.energyCost * ctx.dt;
  hit(ctx, r, t, damageOf(r) * ctx.dt, 0, { silent: true });
  // Drag the target along in front of the jaws.
  const fx = Math.cos(r.body.angle);
  const fy = Math.sin(r.body.angle);
  const reach = r.stats.size.w / 2 + t.radius * 0.8;
  const gx = r.body.position.x + fx * reach;
  const gy = r.body.position.y + fy * reach;
  const v = getVel(r.body);
  setVel(t.body, v.x + (gx - t.body.position.x) * HOLD_FOLLOW, v.y + (gy - t.body.position.y) * HOLD_FOLLOW);
}

function inReachLoose(r: RobotEntity, t: RobotEntity): boolean {
  const dx = t.body.position.x - r.body.position.x;
  const dy = t.body.position.y - r.body.position.y;
  return Math.hypot(dx, dy) < r.stats.size.w / 2 + t.radius + GRAB_DISTANCE_SLACK;
}

function updateHold(ctx: SimContext, r: RobotEntity, spec: WeaponSpec): void {
  const w = r.weapon;
  const able = canAct(r);
  const wants = able && r.input.weapon && r.energy > 0;
  if (able && isPressed(r, 'weapon')) {
    ctx.events.emit('weaponWindup', {
      robotId: r.id,
      weapon: spec.type,
      duration: spec.spinUp ?? spec.windup,
    });
  }

  if (spec.spinUp !== undefined) {
    if (wants) {
      w.rpm = Math.min(1, w.rpm + ctx.dt / spec.spinUp);
      r.energy -= r.stats.energyCost * ctx.dt;
    } else {
      w.rpm = Math.max(0, w.rpm - ctx.dt * (able ? COAST_RATE : DISABLED_COAST_RATE));
    }
    w.active = w.rpm > 0.2;
    if (!able || w.rpm < MIN_HIT_RPM || w.cooldown > 0) return;
    const t = ctx.robots.find((o) => o !== r && inReach(r, o, r.stats.range, spec.arc));
    if (!t) return;
    const pos = r.body.position;
    const power = Math.pow(w.rpm, 1.2);
    hit(ctx, r, t, damageOf(r) * power, spec.knockback * w.rpm);
    knockback(t, pos.x, pos.y, spec.knockback * w.rpm, r.stats.weight);
    knockback(
      r,
      t.body.position.x,
      t.body.position.y,
      spec.knockback * w.rpm * (spec.recoil ?? 0),
      t.stats.weight,
    );
    if (spec.launch > 0 && w.rpm > 0.5) ctx.launch(t, spec.launch * w.rpm, r.id);
    w.rpm = Math.max(0, w.rpm - (spec.rpmLossPerHit ?? 0.5));
    w.cooldown = cooldownOf(r);
    r.score.hits++;
    ctx.events.emit('weaponFire', {
      robotId: r.id,
      weapon: spec.type,
      x: pos.x,
      y: pos.y,
      angle: r.body.angle,
      hit: true,
    });
    return;
  }

  // Ignition-style continuous weapons: saw, flamethrower, magnet.
  if (wants) {
    w.rpm = Math.min(1, w.rpm + ctx.dt / Math.max(spec.windup, 0.01));
    r.energy -= r.stats.energyCost * ctx.dt;
  } else {
    w.rpm = Math.max(0, w.rpm - ctx.dt * IGNITION_DECAY);
  }
  w.active = wants && w.rpm >= 1;
  if (!w.active) return;
  for (const t of targetsInReach(r, ctx.robots, r.stats.range, spec.arc)) {
    hit(ctx, r, t, damageOf(r) * ctx.dt, 0, { silent: true });
    if (spec.type === 'flamethrower') t.status.burn = Math.max(t.status.burn, spec.burn ?? 0);
    if (spec.type === 'saw') knockback(t, r.body.position.x, r.body.position.y, spec.knockback * ctx.dt * 10);
    if (spec.type === 'magnet') {
      const dx = r.body.position.x - t.body.position.x;
      const dy = r.body.position.y - t.body.position.y;
      const d = Math.hypot(dx, dy) || 1;
      const v = getVel(t.body);
      const pull = (spec.pull ?? 0) * ctx.dt * 6;
      setVel(t.body, v.x + (dx / d) * pull, v.y + (dy / d) * pull);
      t.status.slow = 0.2;
      t.status.slowMul = spec.slow ?? 1;
    }
  }
}

export function releaseGrab(ctx: SimContext, r: RobotEntity): void {
  if (r.weapon.phase === 'holding') release(ctx, r);
}
