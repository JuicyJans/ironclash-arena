import type { ArenaDef } from '../../config/types';
import { distToRect, inRect, type Rect } from '../../utils/math';
import { hazardBounds, isDamaging } from '../entities/hazards';
import type { AiWorldView } from './types';

export const CELL = 40;
export const BLOCKED = 1e6;

const COST = {
  base: 1,
  nearWall: 1.5,
  wallMargin: 70,
  pitOpen: BLOCKED,
  pitSoon: 6,
  pitSoonSec: 8,
  hazardImminent: 14,
  hazardLatent: 1.5,
  imminentSec: 1.6,
  lava: 18,
  cpz: 6,
} as const;

export interface DangerGrid {
  cols: number;
  rows: number;
  cell: number;
  cost: Float32Array;
}

export function createGrid(arena: ArenaDef): DangerGrid {
  const cols = Math.ceil(arena.size.w / CELL);
  const rows = Math.ceil(arena.size.h / CELL);
  return { cols, rows, cell: CELL, cost: new Float32Array(cols * rows).fill(COST.base) };
}

function addRect(g: DangerGrid, r: Rect, value: number, margin = 0): void {
  const x0 = Math.max(0, Math.floor((r.x - margin) / g.cell));
  const y0 = Math.max(0, Math.floor((r.y - margin) / g.cell));
  const x1 = Math.min(g.cols - 1, Math.floor((r.x + r.w + margin) / g.cell));
  const y1 = Math.min(g.rows - 1, Math.floor((r.y + r.h + margin) / g.cell));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * g.cols + x;
      g.cost[i] = Math.min(BLOCKED, (g.cost[i] ?? 0) + value);
    }
  }
}

/** Rebuilds the danger grid for the current moment. `margin` ≈ the robot's radius. */
export function updateDangerGrid(g: DangerGrid, view: AiWorldView, margin: number): void {
  const { arena } = view;
  g.cost.fill(COST.base);
  for (let y = 0; y < g.rows; y++) {
    for (let x = 0; x < g.cols; x++) {
      const cx = (x + 0.5) * g.cell;
      const cy = (y + 0.5) * g.cell;
      const edge = Math.min(cx, cy, arena.size.w - cx, arena.size.h - cy);
      if (edge < COST.wallMargin) g.cost[y * g.cols + x] = (g.cost[y * g.cols + x] ?? 0) + COST.nearWall;
    }
  }
  arena.pits.forEach((pit, i) => {
    if (view.pitOpen[i]) addRect(g, pit.rect, COST.pitOpen, margin * 0.6);
    else if (pit.opensAt - view.time < COST.pitSoonSec) addRect(g, pit.rect, COST.pitSoon, margin);
  });
  for (const h of view.hazards.items) {
    if (!isDamaging(h.def) || h.phase === 'off') continue;
    const bounds = hazardBounds(h.def);
    if (h.def.kind === 'lava') addRect(g, bounds, COST.lava, margin * 0.5);
    else if (h.phase === 'active' || h.untilActive < COST.imminentSec)
      addRect(g, bounds, COST.hazardImminent, margin);
    else addRect(g, bounds, COST.hazardLatent, margin * 0.5);
  }
  for (const house of arena.houseRobots) addRect(g, house.zone, COST.cpz, margin * 0.3);
}

export function cellIndex(g: DangerGrid, x: number, y: number): number {
  const cx = Math.min(g.cols - 1, Math.max(0, Math.floor(x / g.cell)));
  const cy = Math.min(g.rows - 1, Math.max(0, Math.floor(y / g.cell)));
  return cy * g.cols + cx;
}

export function dangerAt(g: DangerGrid, x: number, y: number): number {
  return g.cost[cellIndex(g, x, y)] ?? COST.base;
}

/** 0..1 normalised danger (0 = safe floor). */
export function dangerLevel(g: DangerGrid, x: number, y: number): number {
  return Math.min(1, Math.max(0, (dangerAt(g, x, y) - COST.base - COST.nearWall) / COST.hazardImminent));
}

/** Closeness 0..1 of a point to the nearest open pit or imminent damaging hazard. */
export function hazardProximity(
  view: AiWorldView,
  p: { x: number; y: number },
  range = 220,
): { value: number; x: number; y: number } {
  let best = { value: 0, x: p.x, y: p.y };
  const consider = (r: Rect) => {
    const d = distToRect(p, r);
    const v = Math.max(0, 1 - d / range);
    if (v > best.value) best = { value: v, x: r.x + r.w / 2, y: r.y + r.h / 2 };
  };
  view.arena.pits.forEach((pit, i) => view.pitOpen[i] && consider(pit.rect));
  for (const h of view.hazards.items) {
    if (
      isDamaging(h.def) &&
      h.phase !== 'off' &&
      (h.phase === 'active' || h.untilActive < 2.5 || h.def.kind === 'lava')
    ) {
      consider(hazardBounds(h.def));
    }
  }
  return best;
}

export const insideAnyPit = (arena: ArenaDef, p: { x: number; y: number }) =>
  arena.pits.some((pit) => inRect(p, pit.rect));
