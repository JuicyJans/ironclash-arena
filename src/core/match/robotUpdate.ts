import { BALANCE } from '../../config/balance';
import { WEAPONS } from '../../config/weapons';
import { angleDiff, clamp, inRect } from '../../utils/math';
import { stepDrive } from '../combat/drive';
import { rightingTime } from '../combat/support';
import { releaseGrab } from '../combat/weapons';
import { canAct, NO_INPUT, type RobotEntity } from '../entities/robot';
import { getAngVel, getVel, setAngVel, setSolid, setVel } from '../physics/world';
import type { SimContext } from './context';

const P = BALANCE.physics;
const IM = BALANCE.immobile;
const RECENT_ATTACK_TICKS = BALANCE.tickRate * 5;
const LIMP_BIAS = 0.25;
const SPIN_TURN_RPM = 0.3;
const HOLDING_TURN_MUL = 0.7;

export function updateRobot(ctx: SimContext, r: RobotEntity): void {
  const st = r.status;
  if (!r.alive) {
    if (st.falling > 0) st.falling += ctx.dt;
    const v = getVel(r.body);
    setVel(r.body, v.x * 0.9, v.y * 0.9);
    return;
  }
  tickStatus(ctx, r);
  updateAir(ctx, r);
  updateRighting(ctx, r);
  updateDrive(ctx, r);
  updateEnergy(ctx, r);
  checkPits(ctx, r);
  updateImmobile(ctx, r);
}

function tickStatus(ctx: SimContext, r: RobotEntity): void {
  const st = r.status;
  const dt = ctx.dt;
  st.stun = Math.max(0, st.stun - dt);
  st.lifted = Math.max(0, st.lifted - dt);
  st.shield = Math.max(0, st.shield - dt);
  st.smoke = Math.max(0, st.smoke - dt);
  st.slow = Math.max(0, st.slow - dt);
  if (st.slow <= 0) st.slowMul = 1;
  if (st.burn > 0) {
    st.burn = Math.max(0, st.burn - dt);
    const recent = ctx.tick - r.lastAttackerTick < RECENT_ATTACK_TICKS;
    ctx.damage({
      target: r,
      amount: BALANCE.damage.burnDps * dt,
      side: 'top',
      source: 'burn',
      sourceId: recent ? r.lastAttacker : -1,
      x: r.body.position.x,
      y: r.body.position.y,
      force: 0,
      silent: true,
    });
  }
}

export function launchRobot(ctx: SimContext, r: RobotEntity, power: number, byId: number): void {
  if (!r.alive || r.status.falling > 0 || power <= 0) return;
  if (r.status.heldBy >= 0) {
    const holder = ctx.robot(r.status.heldBy);
    if (holder) releaseGrab(ctx, holder);
  }
  if (r.weapon.phase === 'holding') releaseGrab(ctx, r);
  const vz = power * P.launchHeightFactor;
  if (r.z > 0) {
    r.vz = Math.max(r.vz, vz * 0.6);
    return;
  }
  r.willFlip = power >= P.flipLaunchThreshold && !ctx.rng.chance(r.stats.flipResist);
  r.vz = vz;
  r.z = 0.01;
  r.airTime = 0;
  r.launchPower = power;
  r.launchedBy = byId;
  setSolid(r.body, false);
  ctx.events.emit('launched', { robotId: r.id, byId, power });
}

function updateAir(ctx: SimContext, r: RobotEntity): void {
  if (r.z <= 0 && r.vz <= 0) return;
  r.airTime += ctx.dt;
  r.vz -= P.gravity * ctx.dt;
  r.z += r.vz * ctx.dt;
  const total = (2 * r.launchPower * P.launchHeightFactor) / P.gravity;
  r.flipAngle = r.willFlip ? Math.PI * clamp(r.airTime / Math.max(total, 0.05), 0, 1) : 0;
  if (r.z > 0 && r.airTime < P.maxAirTime) return;

  r.z = 0;
  r.vz = 0;
  r.flipAngle = 0;
  setSolid(r.body, true);
  if (r.willFlip) {
    r.inverted = !r.inverted;
    const attacker = ctx.robot(r.launchedBy);
    if (r.inverted && attacker && attacker.team !== r.team) {
      attacker.score.flips++;
      attacker.score.control += BALANCE.judges.flipControlPoints;
    }
  }
  r.willFlip = false;
  const pos = r.body.position;
  const dmg = r.launchPower * P.landingDamagePerPower;
  if (dmg > 0) {
    ctx.damage({
      target: r,
      amount: dmg,
      side: 'top',
      source: 'wall',
      sourceId: r.launchedBy,
      x: pos.x,
      y: pos.y,
      force: r.launchPower,
    });
  }
  ctx.events.emit('landed', {
    robotId: r.id,
    inverted: r.inverted,
    x: pos.x,
    y: pos.y,
    power: r.launchPower,
  });
}

function updateRighting(ctx: SimContext, r: RobotEntity): void {
  if (!r.inverted || r.z > 0) {
    r.rightTimer = 0;
    return;
  }
  const wants = r.input.weapon || r.input.special;
  if (!wants || r.status.heldBy >= 0) {
    r.rightTimer = Math.max(0, r.rightTimer - ctx.dt);
    return;
  }
  if (r.rightTimer === 0) {
    if (r.energy < BALANCE.righting.energyCost) return;
    r.energy -= BALANCE.righting.energyCost;
  }
  r.rightTimer += ctx.dt;
  if (r.rightTimer >= rightingTime(r)) {
    r.inverted = false;
    r.rightTimer = 0;
    r.immobileTimer = 0;
    ctx.events.emit('righted', { robotId: r.id });
  }
}

function updateDrive(ctx: SimContext, r: RobotEntity): void {
  const st = r.status;
  if (r.z > 0 || st.falling > 0 || st.heldBy >= 0) return;
  const able = canAct(r);
  const input = able ? r.input : NO_INPUT;
  const wasBoosting = st.boosting;
  st.boosting = able && r.input.boost && r.energy > 1 && Math.abs(r.input.throttle) > 0.1;
  if (st.boosting) {
    r.energy -= BALANCE.energy.boostCostPerSec * ctx.dt;
    if (!wasBoosting) ctx.events.emit('boost', { robotId: r.id });
  }

  const spec = WEAPONS[r.stats.weaponType];
  let turnMul = 1;
  if (spec.turnMul && r.weapon.rpm > SPIN_TURN_RPM) turnMul *= spec.turnMul;
  if (r.weapon.phase === 'holding') turnMul *= HOLDING_TURN_MUL;

  const pos = r.body.position;
  st.gripMul = ctx.gripAt(pos.x, pos.y);
  const touching = r.contacts.length > 0;
  const push = touching ? r.stats.pushForce * (P.pushBase + r.stats.grip * P.pushGripShare) : 1;
  const traction = ctx.arena.grip * st.gripMul * (st.lifted > 0 ? P.liftedTraction : 1);

  let steer = input.steer;
  if (r.driveHealth < 1 && Math.abs(input.throttle) > 0.1) {
    steer = clamp(steer + (1 - r.driveHealth) * LIMP_BIAS * (r.id % 2 === 0 ? 1 : -1), -1, 1);
  }
  const v = getVel(r.body);
  const next = stepDrive(
    { vx: v.x, vy: v.y, angle: r.body.angle, angVel: getAngVel(r.body) },
    { throttle: input.throttle, steer },
    {
      topSpeed: r.stats.topSpeed,
      accel: r.stats.accel * push,
      turnRate: r.stats.turnRate,
      grip: able ? r.stats.grip : Math.max(r.stats.grip, 0.5),
      speedMul: r.driveHealth * (st.slow > 0 ? st.slowMul : 1) * (st.boosting ? r.stats.boostPower : 1),
      turnMul,
      traction,
    },
    ctx.dt,
  );
  setVel(r.body, next.vx, next.vy);
  setAngVel(r.body, next.angVel);
  r.speed = next.vx * Math.cos(r.body.angle) + next.vy * Math.sin(r.body.angle);
}

function updateEnergy(ctx: SimContext, r: RobotEntity): void {
  const busy = r.status.boosting || r.weapon.active || r.weapon.phase === 'holding';
  if (!busy) r.energy = Math.min(r.stats.energyMax, r.energy + r.stats.energyRegen * ctx.dt);
}

function checkPits(ctx: SimContext, r: RobotEntity): void {
  if (r.z > 0) return;
  const pos = r.body.position;
  ctx.arena.pits.forEach((pit, i) => {
    if (!ctx.pitOpen[i] || !r.alive || !inRect(pos, pit.rect)) return;
    r.status.falling = ctx.dt;
    setSolid(r.body, false);
    if (r.weapon.phase === 'holding') releaseGrab(ctx, r);
    const recent = ctx.tick - r.lastAttackerTick < RECENT_ATTACK_TICKS;
    const by = recent ? r.lastAttacker : -1;
    const attacker = ctx.robot(by);
    if (attacker) attacker.score.pits++;
    ctx.ko(r, 'pit', by);
  });
}

function updateImmobile(ctx: SimContext, r: RobotEntity): void {
  if (!r.alive) return;
  const pos = r.body.position;
  const m = r.mobility;
  const moved =
    Math.hypot(pos.x - m.x, pos.y - m.y) > IM.mobilityDistance ||
    Math.abs(angleDiff(m.angle, r.body.angle)) > 0.8;
  const stuck = r.inverted || r.status.heldBy >= 0 || r.status.stun > 0;
  const pushing = r.contacts.length > 0 && Math.abs(r.input.throttle) > 0.3 && !r.inverted;
  if (moved || r.z > 0) {
    m.x = pos.x;
    m.y = pos.y;
    m.angle = r.body.angle;
    m.t = 0;
  } else {
    m.t += ctx.dt;
  }
  if (stuck) r.immobileTimer += ctx.dt;
  else if (moved || pushing || r.z > 0) r.immobileTimer = 0;
  else if (m.t >= IM.mobilityWindowSec) r.immobileTimer += ctx.dt;

  if (r.immobileTimer >= IM.countdownSec) {
    const recent = ctx.tick - r.lastAttackerTick < RECENT_ATTACK_TICKS;
    ctx.ko(r, 'immobile', recent ? r.lastAttacker : -1);
  }
}
