import type { HouseRobotDef } from '../../../config/types';
import { bolt, chamferPath, hazardStripes, makeCanvas, shade, withAlpha } from './colors';

/** Small reusable textures for hazards, house robots and particles. All return canvases. */

export function paintSpikes(w: number, h: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(w, h);
  for (let y = 10; y < h - 4; y += 14) {
    for (let x = 10; x < w - 4; x += 14) {
      const g = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, 7);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.4, '#b5bcc6');
      g.addColorStop(1, '#30343a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x + 6, y + 5);
      ctx.lineTo(x - 6, y + 5);
      ctx.closePath();
      ctx.fill();
    }
  }
  return c;
}

export function paintPressPlate(w: number, h: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(w + 12, h + 12);
  ctx.translate(6, 6);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#9aa3ae');
  g.addColorStop(1, '#3b4047');
  chamferPath(ctx, 0, 0, w, h, 10);
  ctx.fillStyle = g;
  ctx.fill();
  hazardStripes(ctx, 6, 6, w - 12, 10, 8);
  hazardStripes(ctx, 6, h - 16, w - 12, 10, 8);
  for (const [x, y] of [
    [16, 28],
    [w - 16, 28],
    [16, h - 28],
    [w - 16, h - 28],
  ] as const)
    bolt(ctx, x, y, 4);
  return c;
}

export function paintSawBlade(r: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(r * 2 + 4, r * 2 + 4);
  ctx.translate(r + 2, r + 2);
  ctx.beginPath();
  const teeth = 28;
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.85;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
  g.addColorStop(0, '#f6f7f9');
  g.addColorStop(1, '#5b626c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = '#26292e';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function paintTurntable(r: number, accent: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(r * 2 + 4, r * 2 + 4);
  ctx.translate(r + 2, r + 2);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, '#4b5561');
  g.addColorStop(1, '#2a3038');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.7);
  ctx.lineWidth = 6;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
    ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    bolt(ctx, Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, 3);
  }
  return c;
}

export function paintPitHole(w: number, h: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, '#000000');
  g.addColorStop(0.7, '#0a0b0d');
  g.addColorStop(1, '#2b2e33');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,90,31,0.4)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) ctx.strokeRect(i * 8, i * 8, w - i * 16, h - i * 16);
  return c;
}

export function paintPitDoor(w: number, h: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(w, h);
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#5a616b');
  g.addColorStop(1, '#3a4048');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  for (let y = 10; y < h; y += 14) {
    ctx.beginPath();
    ctx.moveTo(4, y);
    ctx.lineTo(w - 4, y);
    ctx.stroke();
  }
  bolt(ctx, 8, 8, 3);
  bolt(ctx, 8, h - 8, 3);
  return c;
}

export function paintLava(w: number, h: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ff7a1a');
  g.addColorStop(0.5, '#e8410c');
  g.addColorStop(1, '#ff9a2e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    const x = (i * 37) % w;
    const y = (i * 53) % h;
    const r = 6 + (i % 5) * 4;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(255,240,160,0.8)');
    rg.addColorStop(1, 'rgba(255,240,160,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = 'rgba(60,10,0,0.35)';
    ctx.fillRect((x + 15) % w, (y + 9) % h, r * 1.5, 3);
  }
  return c;
}

export function paintHouseRobot(def: HouseRobotDef, size: number): HTMLCanvasElement {
  const s = 2;
  const [c, ctx] = makeCanvas((size + 40) * s, (size + 40) * s);
  ctx.scale(s, s);
  ctx.translate(size / 2 + 20, size / 2 + 20);
  // Tracks.
  ctx.fillStyle = '#16181b';
  ctx.fillRect(-size / 2, -size / 2, size, 14);
  ctx.fillRect(-size / 2, size / 2 - 14, size, 14);
  ctx.fillStyle = '#3a3f47';
  for (let x = -size / 2; x < size / 2; x += 6) {
    ctx.fillRect(x, -size / 2, 2, 14);
    ctx.fillRect(x, size / 2 - 14, 2, 14);
  }
  // Body.
  chamferPath(ctx, -size / 2 + 4, -size / 2 + 12, size - 8, size - 24, 10);
  const g = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
  g.addColorStop(0, shade(def.color, 0.3));
  g.addColorStop(1, shade(def.color, -0.45));
  ctx.fillStyle = g;
  ctx.fill();
  hazardStripes(ctx, -size / 2 + 8, -size / 2 + 16, size - 16, 7, 5);
  hazardStripes(ctx, -size / 2 + 8, size / 2 - 23, size - 16, 7, 5);
  ctx.fillStyle = '#1b1d21';
  chamferPath(ctx, -size * 0.2, -size * 0.18, size * 0.4, size * 0.36, 5);
  ctx.fill();
  ctx.fillStyle = '#ff3b3b';
  ctx.shadowColor = '#ff3b3b';
  ctx.shadowBlur = 8;
  ctx.fillRect(size * 0.08, -size * 0.12, 5, 5);
  ctx.fillRect(size * 0.08, size * 0.08, 5, 5);
  ctx.shadowBlur = 0;
  for (const [x, y] of [
    [-size / 2 + 12, -size / 2 + 30],
    [size / 2 - 12, -size / 2 + 30],
    [-size / 2 + 12, size / 2 - 30],
    [size / 2 - 12, size / 2 - 30],
  ] as const)
    bolt(ctx, x, y, 3);
  return c;
}

/** House robot weapon (drawn separately so it can animate). */
export function paintHouseWeapon(kind: HouseRobotDef['attack'], size: number): HTMLCanvasElement {
  const s = 2;
  const len = size * 0.75;
  const [c, ctx] = makeCanvas((len + 30) * s, 40 * s);
  ctx.scale(s, s);
  ctx.translate(0, 20);
  ctx.fillStyle = '#2d3137';
  ctx.fillRect(0, -4, len, 8);
  if (kind === 'hammer') {
    chamferPath(ctx, len - 6, -16, 26, 32, 4);
    ctx.fillStyle = '#c9ced6';
    ctx.fill();
  } else if (kind === 'lifter') {
    ctx.fillStyle = '#d6dbe2';
    ctx.fillRect(len - 10, -14, 34, 28);
    hazardStripes(ctx, len + 16, -14, 6, 28, 4);
  } else if (kind === 'flame') {
    ctx.fillStyle = '#b8321f';
    ctx.fillRect(len - 8, -9, 22, 18);
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(len + 12, -4, 6, 8);
  } else {
    ctx.fillStyle = '#e0e4ea';
    ctx.beginPath();
    ctx.arc(len + 8, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2d3137';
    ctx.beginPath();
    ctx.arc(len + 8, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

/** Scrapyard props: steel crates (rectangles) and oil drums (small squares). */
export function paintProp(w: number, h: number, seed: number): HTMLCanvasElement {
  const s = 2;
  const [c, ctx] = makeCanvas((w + 8) * s, (h + 8) * s);
  ctx.scale(s, s);
  ctx.translate(4, 4);
  if (Math.abs(w - h) < 4 && w <= 56) {
    const r = w / 2;
    const g = ctx.createRadialGradient(r * 0.7, r * 0.7, 2, r, r, r);
    const hue = seed % 2 === 0 ? '#b5452b' : '#2f6f8f';
    g.addColorStop(0, shade(hue, 0.35));
    g.addColorStop(1, shade(hue, -0.45));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    for (const k of [0.62, 0.86]) {
      ctx.beginPath();
      ctx.arc(r, r, r * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(r * 1.35, r * 0.75, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    hazardStripes(ctx, r * 0.55, r * 0.9, r * 0.9, r * 0.22, 3);
    return c;
  }
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#7d7461');
  g.addColorStop(1, '#3f3a2f');
  chamferPath(ctx, 0, 0, w, h, 4);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#2a261f';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.beginPath();
  ctx.moveTo(6, 6);
  ctx.lineTo(w - 6, h - 6);
  ctx.moveTo(w - 6, 6);
  ctx.lineTo(6, h - 6);
  ctx.stroke();
  for (const [x, y] of [
    [6, 6],
    [w - 6, 6],
    [6, h - 6],
    [w - 6, h - 6],
  ] as const)
    bolt(ctx, x, y, 2);
  return c;
}
