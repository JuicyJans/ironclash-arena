import type { ArenaDef } from '../../../config/types';
import { makeCanvas, withAlpha } from './colors';
import { ARENA_MARGIN } from './arenaLayout';

/** Darkness mask with spotlights carved out (drawn over the scene). */
export function paintLightMask(arena: ArenaDef): HTMLCanvasElement {
  const { w, h } = arena.size;
  const M = ARENA_MARGIN;
  const scale = 0.5;
  const [canvas, ctx] = makeCanvas((w + M * 2) * scale, (h + M * 2) * scale);
  ctx.scale(scale, scale);
  ctx.fillStyle = `rgba(0,0,0,${0.35 + arena.theme.ambient * 0.5})`;
  ctx.fillRect(0, 0, w + M * 2, h + M * 2);
  ctx.globalCompositeOperation = 'destination-out';
  const spots = [
    [0.25, 0.3],
    [0.75, 0.3],
    [0.25, 0.72],
    [0.75, 0.72],
    [0.5, 0.5],
  ];
  for (const [sx, sy] of spots) {
    const x = M + w * (sx ?? 0.5);
    const y = M + h * (sy ?? 0.5);
    const r = Math.max(w, h) * 0.42;
    const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,0.85)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

/** Warm/cold additive light pools tinted with the arena's light colour. */
export function paintLightPools(arena: ArenaDef): HTMLCanvasElement {
  const { w, h } = arena.size;
  const M = ARENA_MARGIN;
  const scale = 0.5;
  const [canvas, ctx] = makeCanvas((w + M * 2) * scale, (h + M * 2) * scale);
  ctx.scale(scale, scale);
  for (const [sx, sy] of [
    [0.3, 0.35],
    [0.7, 0.35],
    [0.5, 0.7],
  ]) {
    const x = M + w * (sx ?? 0.5);
    const y = M + h * (sy ?? 0.5);
    const r = Math.max(w, h) * 0.35;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, withAlpha(arena.theme.light, 0.16));
    g.addColorStop(1, withAlpha(arena.theme.light, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return canvas;
}
