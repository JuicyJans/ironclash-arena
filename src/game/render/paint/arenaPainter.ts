import type { ArenaDef } from '../../../config/types';
import type { Rect } from '../../../utils/math';
import { bolt, hazardStripes, makeCanvas, paintRng, shade, withAlpha } from './colors';
import { paintButton, paintCpz, paintHazardFloor, paintStripedBorder } from './floorMarkings';

import { ARENA_MARGIN } from './arenaLayout';

export { ARENA_MARGIN };
const WALL = 26;

/** Paints the static floor, walls, crowd area and floor markings. */
export function paintArenaFloor(arena: ArenaDef, quality: 'low' | 'medium' | 'high'): HTMLCanvasElement {
  const { w, h } = arena.size;
  const M = ARENA_MARGIN;
  const [canvas, ctx] = makeCanvas(w + M * 2, h + M * 2);
  const t = arena.theme;
  const rand = paintRng(arena.id);

  // Crowd / outer area.
  ctx.fillStyle = '#08090b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  paintCrowd(ctx, canvas.width, canvas.height, M, rand, quality);

  ctx.save();
  ctx.translate(M, M);

  // Floor plates.
  const tile = 100;
  for (let y = 0; y < h; y += tile) {
    for (let x = 0; x < w; x += tile) {
      const v = (rand() - 0.5) * 0.08;
      ctx.fillStyle = shade((x / tile + y / tile) % 2 === 0 ? t.floor : t.floorAlt, v);
      ctx.fillRect(x, y, tile, tile);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, tile - 2, tile - 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 3, y + 3, tile - 6, tile - 6);
      if (quality !== 'low') {
        bolt(ctx, x + 6, y + 6, 1.6);
        bolt(ctx, x + tile - 6, y + tile - 6, 1.6);
      }
    }
  }
  // Grain / speckle.
  const specks = quality === 'high' ? (w * h) / 220 : quality === 'medium' ? (w * h) / 500 : 0;
  for (let i = 0; i < specks; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
  }
  // Old burn marks, oil stains and skid marks.
  for (let i = 0; i < 14; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 20 + rand() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const col = rand() > 0.5 ? '0,0,0' : '40,25,10';
    g.addColorStop(0, `rgba(${col},${0.25 + rand() * 0.2})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  for (let i = 0; i < 10; i++) {
    ctx.lineWidth = 6 + rand() * 6;
    ctx.beginPath();
    const x = rand() * w;
    const y = rand() * h;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + (rand() - 0.5) * 300,
      y + (rand() - 0.5) * 300,
      x + (rand() - 0.5) * 400,
      y + (rand() - 0.5) * 300,
    );
    ctx.stroke();
  }

  // Centre logo ring.
  ctx.strokeStyle = withAlpha(t.accent, 0.25);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.18 - 12, 0, Math.PI * 2);
  ctx.stroke();

  for (const hz of arena.hazards) paintHazardFloor(ctx, hz, t.accent, rand);
  for (const house of arena.houseRobots) paintCpz(ctx, house.zone, house.color);
  for (const pit of arena.pits) {
    paintStripedBorder(ctx, pit.rect, 10);
    if (pit.button) paintButton(ctx, pit.button);
  }
  ctx.restore();

  paintWalls(ctx, w, h, M, t.wall, t.accent);
  return canvas;
}

function paintCrowd(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  M: number,
  rand: () => number,
  q: string,
) {
  const g = ctx.createLinearGradient(0, 0, 0, ch);
  g.addColorStop(0, '#0d0f13');
  g.addColorStop(0.5, '#14171c');
  g.addColorStop(1, '#0d0f13');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);
  if (q === 'low') return;
  // Silhouettes of spectators behind the barrier.
  const count = q === 'high' ? 900 : 400;
  for (let i = 0; i < count; i++) {
    const side = Math.floor(rand() * 4);
    const along = rand();
    const depth = 30 + rand() * (M - 90);
    let x = 0;
    let y = 0;
    if (side === 0) [x, y] = [along * cw, depth];
    else if (side === 1) [x, y] = [along * cw, ch - depth];
    else if (side === 2) [x, y] = [depth, along * ch];
    else [x, y] = [cw - depth, along * ch];
    const shadeV = 20 + rand() * 30;
    ctx.fillStyle = `rgb(${shadeV},${shadeV + 3},${shadeV + 8})`;
    ctx.beginPath();
    ctx.arc(x, y, 5 + rand() * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 6, y + 4, 12, 9);
  }
}

function paintWalls(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  M: number,
  wall: string,
  accent: string,
) {
  ctx.save();
  ctx.translate(M, M);
  const sides: Rect[] = [
    { x: -WALL, y: -WALL, w: w + WALL * 2, h: WALL },
    { x: -WALL, y: h, w: w + WALL * 2, h: WALL },
    { x: -WALL, y: 0, w: WALL, h },
    { x: w, y: 0, w: WALL, h },
  ];
  for (const s of sides) {
    const g = ctx.createLinearGradient(s.x, s.y, s.x + (s.w > s.h ? 0 : s.w), s.y + (s.w > s.h ? s.h : 0));
    g.addColorStop(0, shade(wall, 0.25));
    g.addColorStop(1, shade(wall, -0.45));
    ctx.fillStyle = g;
    ctx.fillRect(s.x, s.y, s.w, s.h);
  }
  // Hazard stripe along the inner lip of the wall.
  hazardStripes(ctx, 0, -6, w, 6, 8);
  hazardStripes(ctx, 0, h, w, 6, 8);
  hazardStripes(ctx, -6, 0, 6, h, 8);
  hazardStripes(ctx, w, 0, 6, h, 8);
  for (let x = 30; x < w; x += 80) {
    bolt(ctx, x, -WALL / 2 - 3, 2.4);
    bolt(ctx, x, h + WALL / 2 + 3, 2.4);
  }
  for (let y = 30; y < h; y += 80) {
    bolt(ctx, -WALL / 2 - 3, y, 2.4);
    bolt(ctx, w + WALL / 2 + 3, y, 2.4);
  }
  // Polycarbonate barrier glint.
  ctx.strokeStyle = withAlpha(accent, 0.25);
  ctx.lineWidth = 2;
  ctx.strokeRect(-WALL - 6, -WALL - 6, w + WALL * 2 + 12, h + WALL * 2 + 12);
  ctx.restore();
}

export { paintLightMask, paintLightPools } from './lighting';
