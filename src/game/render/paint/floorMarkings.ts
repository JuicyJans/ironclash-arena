import type { HazardDef } from '../../../config/types';
import type { Rect } from '../../../utils/math';
import { chamferPath, hazardStripes, withAlpha } from './colors';

export function paintStripedBorder(ctx: CanvasRenderingContext2D, r: Rect, size: number) {
  hazardStripes(ctx, r.x - size, r.y - size, r.w + size * 2, size, 6);
  hazardStripes(ctx, r.x - size, r.y + r.h, r.w + size * 2, size, 6);
  hazardStripes(ctx, r.x - size, r.y, size, r.h, 6);
  hazardStripes(ctx, r.x + r.w, r.y, size, r.h, 6);
}

export function paintCpz(ctx: CanvasRenderingContext2D, r: Rect, color: string) {
  ctx.fillStyle = withAlpha(color, 0.08);
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.save();
  ctx.setLineDash([14, 10]);
  ctx.strokeStyle = withAlpha('#FFC21A', 0.75);
  ctx.lineWidth = 4;
  ctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
  ctx.restore();
  ctx.fillStyle = withAlpha('#FFC21A', 0.5);
  ctx.font = 'bold 22px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CPZ', r.x + r.w / 2, r.y + r.h / 2 + 8);
}

export function paintButton(ctx: CanvasRenderingContext2D, r: Rect) {
  paintStripedBorder(ctx, r, 5);
  ctx.fillStyle = '#3a0d0d';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  const g = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, 2, r.x + r.w / 2, r.y + r.h / 2, r.w / 2);
  g.addColorStop(0, '#ff6b6b');
  g.addColorStop(1, '#8b1a1a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(r.x + r.w / 2, r.y + r.h / 2, r.w * 0.36, 0, Math.PI * 2);
  ctx.fill();
}

function paintGrate(ctx: CanvasRenderingContext2D, r: Rect, holes: 'round' | 'slot') {
  chamferPath(ctx, r.x, r.y, r.w, r.h, 6);
  ctx.fillStyle = '#1d1f23';
  ctx.fill();
  ctx.fillStyle = '#060607';
  const step = 12;
  for (let y = r.y + 8; y < r.y + r.h - 4; y += step) {
    for (let x = r.x + 8; x < r.x + r.w - 4; x += step) {
      ctx.beginPath();
      if (holes === 'round') ctx.arc(x, y, 3, 0, Math.PI * 2);
      else ctx.rect(x - 4, y - 1.5, 8, 3);
      ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function paintHazardFloor(
  ctx: CanvasRenderingContext2D,
  hz: HazardDef,
  accent: string,
  rand: () => number,
) {
  switch (hz.kind) {
    case 'spikes':
      paintStripedBorder(ctx, hz.rect, 6);
      paintGrate(ctx, hz.rect, 'round');
      break;
    case 'flameJet': {
      const { x, y, r } = hz.circle;
      ctx.fillStyle = '#16120f';
      ctx.beginPath();
      ctx.arc(x, y, r + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3b2b20';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(x, y, r * (0.3 + i * 0.22), 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        ctx.stroke();
      }
      break;
    }
    case 'press':
      paintStripedBorder(ctx, hz.rect, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(hz.rect.x, hz.rect.y, hz.rect.w, hz.rect.h);
      break;
    case 'floorFlipper':
      paintStripedBorder(ctx, hz.rect, 5);
      chamferPath(ctx, hz.rect.x, hz.rect.y, hz.rect.w, hz.rect.h, 4);
      ctx.fillStyle = '#4a4f57';
      ctx.fill();
      break;
    case 'wallSaw':
      ctx.fillStyle = '#050506';
      ctx.fillRect(hz.rect.x, hz.rect.y, hz.rect.w, hz.rect.h);
      paintStripedBorder(ctx, { x: hz.rect.x, y: hz.rect.y, w: hz.rect.w, h: hz.rect.h }, 4);
      break;
    case 'lava':
      ctx.fillStyle = '#1a0a05';
      ctx.fillRect(hz.rect.x, hz.rect.y, hz.rect.w, hz.rect.h);
      break;
    case 'ice': {
      const r = hz.rect;
      const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
      g.addColorStop(0, 'rgba(190,235,255,0.32)');
      g.addColorStop(0.5, 'rgba(140,200,240,0.22)');
      g.addColorStop(1, 'rgba(200,240,255,0.3)');
      ctx.fillStyle = g;
      chamferPath(ctx, r.x, r.y, r.w, r.h, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(230,250,255,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 26; i++) {
        const x = r.x + rand() * r.w;
        const y = r.y + rand() * r.h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - 0.5) * 50, y + (rand() - 0.5) * 30);
        ctx.stroke();
      }
      break;
    }
    case 'turntable': {
      const { x, y, r } = hz.circle;
      ctx.fillStyle = '#0b0c0e';
      ctx.beginPath();
      ctx.arc(x, y, r + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha(accent, 0.5);
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    }
  }
}
