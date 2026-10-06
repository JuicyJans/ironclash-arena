import type { HazardDef, HazardTiming } from '../../config/types';
import { distToRect, inCircle, rotate, type Rect } from '../../utils/math';
import { Rng, hashSeed } from '../rng';

export type HazardPhase = 'off' | 'idle' | 'telegraph' | 'active';

export interface PhaseInfo {
  phase: HazardPhase;
  /** 0..1 progress through the current phase. */
  progress: number;
  /** Seconds until the next active phase starts (0 while active, Infinity when off for good). */
  untilActive: number;
}

const isTimed = (def: HazardDef): def is HazardDef & HazardTiming => 'period' in def;

/** Deterministic per-hazard offset derived from the match seed. */
export function hazardOffset(def: HazardDef, seed: number): number {
  if (!isTimed(def)) return 0;
  const extra = def.randomPhase ? new Rng(hashSeed(seed, def.id)).next() * def.period : 0;
  return (def.phase ?? 0) + extra;
}

/** Pure: phase of a hazard at match time `t` seconds. Same inputs → same output on every client. */
export function hazardPhase(def: HazardDef, t: number, offset: number): PhaseInfo {
  const from = def.kind === 'ice' || def.kind === 'turntable' ? 0 : (def.from ?? 0);
  const until = def.kind === 'ice' || def.kind === 'turntable' ? Infinity : (def.until ?? Infinity);
  if (t < from) return { phase: 'off', progress: 0, untilActive: from - t };
  if (t > until) return { phase: 'off', progress: 0, untilActive: Infinity };
  if (!isTimed(def)) return { phase: 'active', progress: 0, untilActive: 0 };

  const idle = Math.max(def.period - def.telegraph - def.active, 0);
  const off = ((offset % def.period) + def.period) % def.period;
  const sinceStart = t - from;
  // Before the first cycle begins the hazard idles, so it never fires at the opening bell
  // and always shows its full telegraph before becoming active.
  if (sinceStart < off) {
    return { phase: 'idle', progress: 0, untilActive: off - sinceStart + idle + def.telegraph };
  }
  const local = (sinceStart - off) % def.period;
  if (local < idle)
    return {
      phase: 'idle',
      progress: local / Math.max(idle, 1e-6),
      untilActive: idle - local + def.telegraph,
    };
  if (local < idle + def.telegraph) {
    const p = local - idle;
    return { phase: 'telegraph', progress: p / def.telegraph, untilActive: def.telegraph - p };
  }
  return {
    phase: 'active',
    progress: (local - idle - def.telegraph) / Math.max(def.active, 1e-6),
    untilActive: 0,
  };
}

/** Bounding rect of any hazard (used by AI danger maps and rendering). */
export function hazardBounds(def: HazardDef): Rect {
  if ('rect' in def) return def.rect;
  const c = def.circle;
  return { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 };
}

/** True if a point (with a radius margin) touches the hazard area. */
export function hazardContains(def: HazardDef, p: { x: number; y: number }, margin = 0): boolean {
  if ('rect' in def) return distToRect(p, def.rect) <= margin;
  return inCircle(p, { ...def.circle, r: def.circle.r + margin });
}

/** Rotates a point around a turntable centre by `angle`. */
export function rotateAround(p: { x: number; y: number }, c: { x: number; y: number }, angle: number) {
  const r = rotate(p.x - c.x, p.y - c.y, angle);
  return { x: c.x + r.x, y: c.y + r.y };
}

/** Hazards that hurt (used by AI to avoid / lure). Ice and turntables are not "damaging". */
export const isDamaging = (def: HazardDef): boolean => def.kind !== 'ice' && def.kind !== 'turntable';
