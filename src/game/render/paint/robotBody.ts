import type { Cosmetics } from '../../../config/types';
import { bolt, chamferPath, hazardStripes, paintRng, shade, withAlpha } from './colors';

export interface BodyInfo {
  L: number; // length (world units, along heading)
  W: number; // width
  cosmetics: Cosmetics;
  armorTier: number; // 1..5
  frontHeavy: boolean;
  wedge: boolean;
  tracks: boolean;
  name: string;
}

/** Armor tier tints: mild steel, aluminium, hardened steel, titanium, composite ceramic. */
const ARMOR_TINT = ['#7d848c', '#c9ced6', '#5d6670', '#a9b3c4', '#e8e1d2'];

/** Paints the chassis + armor + paint job facing +x, centred on the origin. */
export function paintBody(ctx: CanvasRenderingContext2D, b: BodyInfo): void {
  const { L, W, cosmetics: c } = b;
  const hw = W * (b.tracks ? 0.33 : 0.38);
  const x0 = -L / 2;
  const tint = ARMOR_TINT[Math.min(Math.max(b.armorTier, 1), 5) - 1] ?? '#7d848c';
  const rand = paintRng(b.name + c.primary);

  if (b.wedge) paintWedge(ctx, L, W);

  // Hull walls (seen as the darker rim around the deck).
  chamferPath(ctx, x0, -hw, L, hw * 2, 7);
  ctx.fillStyle = shade(c.secondary, -0.2);
  ctx.fill();

  // Armor skirts on the sides and front/rear plates.
  const plate = 2 + b.armorTier * 0.9;
  ctx.fillStyle = shade(tint, -0.15);
  chamferPath(ctx, x0 + 2, -hw - 1, L - 4, plate, 3);
  ctx.fill();
  chamferPath(ctx, x0 + 2, hw + 1 - plate, L - 4, plate, 3);
  ctx.fill();
  const front = b.frontHeavy ? plate * 2.4 : plate * 1.2;
  const grad = ctx.createLinearGradient(L / 2 - front, 0, L / 2, 0);
  grad.addColorStop(0, shade(tint, -0.3));
  grad.addColorStop(1, shade(tint, 0.25));
  ctx.fillStyle = grad;
  chamferPath(ctx, L / 2 - front, -hw, front, hw * 2, 4);
  ctx.fill();
  ctx.fillStyle = shade(tint, -0.35);
  chamferPath(ctx, x0, -hw, plate * (b.frontHeavy ? 0.6 : 1.1), hw * 2, 4);
  ctx.fill();

  // Top deck with paint gradient (light from the top-left).
  const inset = plate + 2;
  const dx0 = x0 + inset;
  const dw = L - inset - front - 2;
  const dh = hw * 2 - inset * 2;
  const deck = ctx.createLinearGradient(dx0, -hw, dx0 + dw * 0.6, hw);
  deck.addColorStop(0, shade(c.primary, 0.28));
  deck.addColorStop(0.55, c.primary);
  deck.addColorStop(1, shade(c.primary, -0.35));
  chamferPath(ctx, dx0, -hw + inset, dw, dh, 5);
  ctx.fillStyle = deck;
  ctx.fill();

  paintDecal(ctx, c, dx0, -hw + inset, dw, dh);

  // Panel seams.
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.8;
  const seams = 1 + Math.min(2, Math.floor(b.armorTier / 2));
  for (let i = 1; i <= seams; i++) {
    const sx = dx0 + (dw * i) / (seams + 1);
    ctx.beginPath();
    ctx.moveTo(sx, -hw + inset + 2);
    ctx.lineTo(sx, hw - inset - 2);
    ctx.stroke();
  }

  // Rear vents and battery box.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  for (let i = 0; i < 4; i++) ctx.fillRect(dx0 + 3, -hw * 0.45 + i * hw * 0.28, L * 0.08, 1.6);
  ctx.fillStyle = shade(c.secondary, 0.1);
  chamferPath(ctx, dx0 + L * 0.14, -hw * 0.28, L * 0.14, hw * 0.56, 2);
  ctx.fill();
  hazardStripes(ctx, dx0 + L * 0.14, -hw * 0.28, L * 0.14, 2.2, 1.6);

  // Bolts (more on higher armor tiers).
  const boltsPerSide = 2 + b.armorTier;
  for (let i = 0; i < boltsPerSide; i++) {
    const bx = x0 + 6 + ((L - 12) * i) / Math.max(1, boltsPerSide - 1);
    bolt(ctx, bx, -hw + plate / 2, 1.2);
    bolt(ctx, bx, hw - plate / 2, 1.2);
  }
  bolt(ctx, L / 2 - front / 2, -hw * 0.6, 1.4);
  bolt(ctx, L / 2 - front / 2, hw * 0.6, 1.4);

  // Wear: scratches and chipped paint.
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 9; i++) {
    const sx = x0 + rand() * L;
    const sy = -hw + rand() * hw * 2;
    const len = 3 + rand() * 7;
    const a = rand() * Math.PI;
    ctx.strokeStyle = rand() > 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len);
    ctx.stroke();
  }

  // Rim light (top-left) and core shadow (bottom-right).
  chamferPath(ctx, x0 + 0.5, -hw + 0.5, L - 1, hw * 2 - 1, 7);
  const rim = ctx.createLinearGradient(x0, -hw, x0 + L, hw);
  rim.addColorStop(0, 'rgba(255,255,255,0.55)');
  rim.addColorStop(0.45, 'rgba(255,255,255,0.05)');
  rim.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function paintWedge(ctx: CanvasRenderingContext2D, L: number, W: number): void {
  const x = L / 2 - 4;
  const len = 16;
  const g = ctx.createLinearGradient(x, 0, x + len, 0);
  g.addColorStop(0, '#5a616b');
  g.addColorStop(0.6, '#c8ced6');
  g.addColorStop(1, '#f4f6f8');
  ctx.beginPath();
  ctx.moveTo(x, -W * 0.48);
  ctx.lineTo(x + len, -W * 0.44);
  ctx.lineTo(x + len, W * 0.44);
  ctx.lineTo(x, W * 0.48);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  hazardStripes(ctx, x + len - 2.5, -W * 0.44, 2.5, W * 0.88, 2);
}

function paintDecal(
  ctx: CanvasRenderingContext2D,
  c: Cosmetics,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  chamferPath(ctx, x, y, w, h, 5);
  ctx.clip();
  const sec = withAlpha(c.secondary, 0.85);
  const cx = x + w / 2;
  const cy = y + h / 2;
  switch (c.decal) {
    case 'stripes':
      ctx.fillStyle = sec;
      ctx.fillRect(x, cy - h * 0.12, w, h * 0.08);
      ctx.fillRect(x, cy + h * 0.04, w, h * 0.08);
      break;
    case 'checker': {
      const s = h / 6;
      ctx.fillStyle = sec;
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 2; j++)
          if ((i + j) % 2 === 0) ctx.fillRect(x + w - s * (j + 1) - 2, y + i * s, s, s);
      break;
    }
    case 'flames':
      ctx.fillStyle = withAlpha('#ff8a1f', 0.85);
      for (let i = 0; i < 3; i++) {
        const fy = y + h * (0.25 + i * 0.25);
        ctx.beginPath();
        ctx.moveTo(x + w, fy - 3);
        ctx.quadraticCurveTo(x + w * 0.55, fy - 6, x + w * 0.2, fy);
        ctx.quadraticCurveTo(x + w * 0.55, fy + 4, x + w, fy + 3);
        ctx.fill();
      }
      break;
    case 'skull':
      ctx.fillStyle = withAlpha('#f5f5f0', 0.85);
      ctx.beginPath();
      ctx.arc(cx, cy - 1, h * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - h * 0.1, cy + h * 0.1, h * 0.2, h * 0.12);
      ctx.fillStyle = shade(c.primary, -0.5);
      ctx.beginPath();
      ctx.arc(cx - h * 0.08, cy - 2, h * 0.055, 0, Math.PI * 2);
      ctx.arc(cx + h * 0.08, cy - 2, h * 0.055, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bolt':
      ctx.fillStyle = withAlpha('#ffe14d', 0.95);
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.22, cy - h * 0.1);
      ctx.lineTo(cx + w * 0.02, cy - h * 0.3);
      ctx.lineTo(cx - w * 0.02, cy - h * 0.02);
      ctx.lineTo(cx + w * 0.22, cy + h * 0.1);
      ctx.lineTo(cx - w * 0.02, cy + h * 0.3);
      ctx.lineTo(cx + w * 0.02, cy + h * 0.02);
      ctx.closePath();
      ctx.fill();
      break;
    case 'number':
      ctx.fillStyle = sec;
      ctx.beginPath();
      ctx.arc(cx, cy, h * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${h * 0.32}px Rajdhani, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 2);
      ctx.fillText(String((c.primary.charCodeAt(2) % 9) + 1), 0, 1);
      ctx.restore();
      break;
    case 'none':
      break;
  }
  ctx.restore();
}

/** LED lights (drawn into a separate additive glow layer). */
export function paintLeds(ctx: CanvasRenderingContext2D, L: number, W: number, led: string): void {
  ctx.save();
  ctx.shadowColor = led;
  ctx.shadowBlur = 6;
  ctx.fillStyle = led;
  const hw = W * 0.36;
  ctx.fillRect(-L / 2 + 2, -hw + 2, 2, 5);
  ctx.fillRect(-L / 2 + 2, hw - 7, 2, 5);
  ctx.fillRect(L * 0.18, -hw * 0.5, 3, 2);
  ctx.fillRect(L * 0.18, hw * 0.5 - 2, 3, 2);
  ctx.restore();
}

/** Dark underside shown when the robot is upside down. */
export function paintUnderside(ctx: CanvasRenderingContext2D, L: number, W: number, secondary: string): void {
  const hw = W * 0.38;
  chamferPath(ctx, -L / 2, -hw, L, hw * 2, 7);
  ctx.fillStyle = shade(secondary, -0.45);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-L / 2 + 6, -hw + 6);
  ctx.lineTo(L / 2 - 6, hw - 6);
  ctx.moveTo(-L / 2 + 6, hw - 6);
  ctx.lineTo(L / 2 - 6, -hw + 6);
  ctx.stroke();
  ctx.fillStyle = '#2b2f36';
  ctx.fillRect(-L * 0.15, -hw * 0.4, L * 0.3, hw * 0.8);
  for (const [x, y] of [
    [-L / 2 + 5, -hw + 5],
    [L / 2 - 5, -hw + 5],
    [-L / 2 + 5, hw - 5],
    [L / 2 - 5, hw - 5],
  ] as const) {
    bolt(ctx, x, y, 1.5);
  }
}
