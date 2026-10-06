import { approach } from '../../utils/math';

export interface KinematicState {
  vx: number; // units/s
  vy: number;
  angle: number;
  angVel: number; // rad/s
}

export interface DriveParams {
  topSpeed: number;
  accel: number;
  turnRate: number;
  grip: number; // 0..1
  /** Multiplies speed and acceleration (component damage, slows, boosts, inverted...). */
  speedMul: number;
  turnMul: number;
  /** 0..1 traction (ice, wedged up). 0 = no control at all. */
  traction: number;
}

export interface DriveInput {
  throttle: number;
  steer: number;
}

const TURN_RESPONSE = 9; // how many turnRates per second the angular velocity can change
const BRAKE_MUL = 1.6;

/**
 * Pure tank-drive model. Returns new velocities after one step of `dt` seconds.
 * Shared by the authoritative simulation and by client-side prediction.
 */
export function stepDrive(s: KinematicState, input: DriveInput, p: DriveParams, dt: number): KinematicState {
  const fx = Math.cos(s.angle);
  const fy = Math.sin(s.angle);
  let vf = s.vx * fx + s.vy * fy; // forward component
  let vl = -s.vx * fy + s.vy * fx; // lateral component

  const traction = Math.max(0, Math.min(1, p.traction));
  const top = p.topSpeed * p.speedMul;
  const target = input.throttle * top;
  const braking = vf !== 0 && (Math.sign(target) !== Math.sign(vf) || Math.abs(target) < Math.abs(vf));
  const accel = p.accel * p.speedMul * (braking ? BRAKE_MUL : 1) * traction;
  vf = approach(vf, target, accel * dt);

  // Grip kills sideways sliding; low traction (ice) lets the robot drift.
  const gripPerStep = 1 - Math.pow(1 - p.grip * traction, dt * 60);
  vl -= vl * gripPerStep;

  const targetTurn = input.steer * p.turnRate * p.turnMul * Math.max(traction, 0.15);
  const angVel = approach(s.angVel, targetTurn, p.turnRate * TURN_RESPONSE * dt * Math.max(traction, 0.2));

  return {
    vx: vf * fx - vl * fy,
    vy: vf * fy + vl * fx,
    angle: s.angle,
    angVel,
  };
}

/** Integrates position for prediction (no collisions). */
export function integrate(
  pos: { x: number; y: number; angle: number },
  s: KinematicState,
  dt: number,
): { x: number; y: number; angle: number } {
  return { x: pos.x + s.vx * dt, y: pos.y + s.vy * dt, angle: pos.angle + s.angVel * dt };
}
