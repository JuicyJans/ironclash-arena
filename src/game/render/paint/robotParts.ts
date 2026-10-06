import type { DriveType } from '../../../config/types';
import { bolt, chamferPath, roundRectPath } from './colors';

export const DRIVE_FRAMES = 4;

/** Paints one animation frame of the drive train (wheels / tracks / legs), centred on the origin. */
export function paintDrive(
  ctx: CanvasRenderingContext2D,
  type: DriveType,
  L: number,
  W: number,
  frame: number,
  tier: number,
): void {
  const phase = frame / DRIVE_FRAMES;
  if (type === 'tracks') {
    for (const side of [-1, 1]) {
      const tw = W * 0.24;
      const y = side * (W / 2 - tw / 2);
      roundRectPath(ctx, -L * 0.52, y - tw / 2, L * 1.04, tw, tw * 0.45);
      ctx.fillStyle = '#1c1e22';
      ctx.fill();
      ctx.save();
      ctx.clip();
      const seg = 5;
      ctx.fillStyle = '#3a3f47';
      for (let x = -L * 0.6 + phase * seg; x < L * 0.6; x += seg) ctx.fillRect(x, y - tw / 2, 2, tw);
      ctx.restore();
      ctx.fillStyle = '#5b626c';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * L * 0.32, y, tw * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }
  if (type === 'shuffler') {
    for (const side of [-1, 1]) {
      for (const pair of [-1, 1]) {
        const off = Math.sin((phase + (pair > 0 ? 0.5 : 0)) * Math.PI * 2) * L * 0.06;
        const x = pair * L * 0.24 + off;
        const y = side * (W / 2 - W * 0.1);
        chamferPath(ctx, x - L * 0.14, y - W * 0.1, L * 0.28, W * 0.2, 3);
        ctx.fillStyle = '#2a2d33';
        ctx.fill();
        ctx.fillStyle = '#6b7380';
        ctx.fillRect(x - L * 0.12, y - 1, L * 0.24, 2);
        bolt(ctx, x, y, 1.6);
      }
    }
    return;
  }
  // Wheels: four tyres with moving tread grooves and a coloured hub stripe on higher tiers.
  const wl = L * 0.3;
  const ww = W * 0.2;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const cx = sx * L * 0.28;
      const cy = sy * (W / 2 - ww / 2);
      roundRectPath(ctx, cx - wl / 2, cy - ww / 2, wl, ww, 3);
      ctx.fillStyle = '#16181b';
      ctx.fill();
      ctx.save();
      ctx.clip();
      const groove = wl / 6;
      ctx.fillStyle = '#34383f';
      for (let x = cx - wl + phase * groove; x < cx + wl; x += groove)
        ctx.fillRect(x, cy - ww / 2, groove * 0.4, ww);
      ctx.restore();
      ctx.fillStyle = tier >= 3 ? '#c9a227' : '#6d7480';
      ctx.fillRect(cx - wl * 0.08, cy - ww * 0.18, wl * 0.16, ww * 0.36);
    }
  }
}

export { paintWeapon, type WeaponArt, type WeaponPart } from './weaponArt';
