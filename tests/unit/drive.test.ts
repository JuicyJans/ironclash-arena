import { describe, expect, it } from 'vitest';
import { integrate, stepDrive, type DriveParams } from '../../src/core/combat/drive';

const P: DriveParams = {
  topSpeed: 300,
  accel: 900,
  turnRate: 4,
  grip: 0.5,
  speedMul: 1,
  turnMul: 1,
  traction: 1,
};
const dt = 1 / 60;

describe('stepDrive', () => {
  it('accelerates towards top speed and stops at it', () => {
    let s = { vx: 0, vy: 0, angle: 0, angVel: 0 };
    for (let i = 0; i < 120; i++) s = stepDrive(s, { throttle: 1, steer: 0 }, P, dt);
    expect(s.vx).toBeCloseTo(300, 0);
    expect(Math.abs(s.vy)).toBeLessThan(1e-6);
  });

  it('reverses and brakes faster than it accelerates', () => {
    const a = stepDrive({ vx: 0, vy: 0, angle: 0, angVel: 0 }, { throttle: 1, steer: 0 }, P, dt);
    const b = stepDrive({ vx: 200, vy: 0, angle: 0, angVel: 0 }, { throttle: -1, steer: 0 }, P, dt);
    expect(200 - b.vx).toBeGreaterThan(a.vx);
  });

  it('grip kills sideways sliding; ice keeps it', () => {
    const grippy = stepDrive({ vx: 0, vy: 200, angle: 0, angVel: 0 }, { throttle: 0, steer: 0 }, P, dt);
    const icy = stepDrive(
      { vx: 0, vy: 200, angle: 0, angVel: 0 },
      { throttle: 0, steer: 0 },
      { ...P, traction: 0.15 },
      dt,
    );
    expect(grippy.vy).toBeLessThan(icy.vy);
  });

  it('turns and speed multipliers apply', () => {
    let s = { vx: 0, vy: 0, angle: 0, angVel: 0 };
    for (let i = 0; i < 30; i++) s = stepDrive(s, { throttle: 0, steer: 1 }, P, dt);
    expect(s.angVel).toBeCloseTo(4, 1);
    let slow = { vx: 0, vy: 0, angle: 0, angVel: 0 };
    for (let i = 0; i < 120; i++)
      slow = stepDrive(slow, { throttle: 1, steer: 0 }, { ...P, speedMul: 0.5 }, dt);
    expect(slow.vx).toBeCloseTo(150, 0);
  });

  it('integrate moves the position', () => {
    const p = integrate({ x: 0, y: 0, angle: 0 }, { vx: 60, vy: -30, angle: 0, angVel: 1 }, 0.5);
    expect(p).toEqual({ x: 30, y: -15, angle: 0.5 });
  });
});
