export interface Vec2 {
  x: number;
  y: number;
}

export const TAU = Math.PI * 2;

export const clamp = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const len = (x: number, y: number): number => Math.sqrt(x * x + y * y);
export const dist = (a: Vec2, b: Vec2): number => len(a.x - b.x, a.y - b.y);
export const dist2 = (a: Vec2, b: Vec2): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/** Wraps an angle into [-PI, PI). */
export function wrapAngle(a: number): number {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

/** Signed shortest difference b - a in [-PI, PI). */
export const angleDiff = (a: number, b: number): number => wrapAngle(b - a);

export const lerpAngle = (a: number, b: number, t: number): number => a + angleDiff(a, b) * t;

export const approach = (v: number, target: number, maxDelta: number): number =>
  v < target ? Math.min(v + maxDelta, target) : Math.max(v - maxDelta, target);

export const rotate = (x: number, y: number, a: number): Vec2 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: x * c - y * s, y: x * s + y * c };
};

/** Converts a world point into the local frame of a body at (bx, by) with heading `angle`. */
export const toLocal = (px: number, py: number, bx: number, by: number, angle: number): Vec2 =>
  rotate(px - bx, py - by, -angle);

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export const inRect = (p: Vec2, r: Rect): boolean =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
export const inCircle = (p: Vec2, c: Circle): boolean => dist2(p, c) <= c.r * c.r;
export const rectCenter = (r: Rect): Vec2 => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Distance from point to the closest point of a rectangle (0 when inside). */
export function distToRect(p: Vec2, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return len(dx, dy);
}

export const round = (v: number, step: number): number => Math.round(v / step) * step;
