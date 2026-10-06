import { integrate, stepDrive, type DriveParams } from '../core/combat/drive';
import type { RobotStats } from '../config/types';

export interface PredictState {
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  av: number;
}

export interface PendingInput {
  seq: number;
  throttle: number;
  steer: number;
  boost: boolean;
}

export function driveParams(stats: RobotStats, driveHealth: number, boost: boolean): DriveParams {
  return {
    topSpeed: stats.topSpeed,
    accel: stats.accel,
    turnRate: stats.turnRate,
    grip: stats.grip,
    speedMul: driveHealth * (boost ? stats.boostPower : 1),
    turnMul: 1,
    traction: 1,
  };
}

/** Advances a predicted robot by one tick of input (collision-free kinematics, same model as the host). */
export function predictStep(
  s: PredictState,
  input: PendingInput,
  stats: RobotStats,
  driveHealth: number,
  dt: number,
): PredictState {
  const k = stepDrive(
    { vx: s.vx, vy: s.vy, angle: s.angle, angVel: s.av },
    input,
    driveParams(stats, driveHealth, input.boost),
    dt,
  );
  const p = integrate(s, k, dt);
  return { x: p.x, y: p.y, angle: p.angle, vx: k.vx, vy: k.vy, av: k.angVel };
}

/**
 * Client-side reconciliation: start from the authoritative state the host sent
 * (which already includes inputs up to `ackSeq`) and replay the newer local inputs.
 */
export function reconcile(
  auth: PredictState,
  pending: PendingInput[],
  ackSeq: number,
  stats: RobotStats,
  driveHealth: number,
  dt: number,
): PredictState {
  let s = auth;
  for (const input of pending) if (input.seq > ackSeq) s = predictStep(s, input, stats, driveHealth, dt);
  return s;
}
