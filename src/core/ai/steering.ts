import { angleDiff, clamp } from '../../utils/math';

export interface SteerOutput {
  throttle: number;
  steer: number;
}

export interface SteerOpts {
  /** Distance at which to start slowing down (0 = full speed into the goal, e.g. ramming). */
  arrive?: number;
  /** Allow reversing towards goals behind the robot. */
  reverse?: boolean;
  /** Heading to face once at the goal (radians); otherwise faces the goal. */
  face?: number;
}

const STEER_GAIN = 2.4;

/** Tank-steering towards a point. Pure. */
export function steerTo(
  pos: { x: number; y: number },
  heading: number,
  goal: { x: number; y: number },
  opts: SteerOpts = {},
): SteerOutput {
  const dx = goal.x - pos.x;
  const dy = goal.y - pos.y;
  const d = Math.hypot(dx, dy);
  const arrive = opts.arrive ?? 0;
  if (arrive > 0 && d < arrive * 0.25 && opts.face !== undefined) {
    return { throttle: 0, steer: clamp(angleDiff(heading, opts.face) * STEER_GAIN, -1, 1) };
  }
  const desired = Math.atan2(dy, dx);
  let err = angleDiff(heading, desired);
  let dir = 1;
  if (opts.reverse && Math.abs(err) > 2.3 && d < 220) {
    err = angleDiff(heading + Math.PI, desired);
    dir = -1;
  }
  const steer = clamp(err * STEER_GAIN, -1, 1);
  const align = Math.cos(err);
  let throttle = align > 0 ? align * align : -0.15;
  if (arrive > 0) throttle *= clamp(d / arrive, 0.15, 1);
  return { throttle: clamp(throttle * dir, -1, 1), steer };
}

/** Linear prediction of where a moving target will be after `t` seconds. */
export function predict(p: { x: number; y: number; vx: number; vy: number }, t: number) {
  return { x: p.x + p.vx * t, y: p.y + p.vy * t };
}
