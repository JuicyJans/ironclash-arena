import type { WeaponType } from '../../../config/types';
import { bolt, chamferPath, hazardStripes, roundRectPath, shade } from './colors';

export interface WeaponPart {
  canvas: HTMLCanvasElement;
  /** Pivot inside the canvas (pixels at paint scale). */
  pivotX: number;
  pivotY: number;
  /** Pivot position in the robot's local frame (world units). */
  localX: number;
  localY: number;
}

export interface WeaponArt {
  base?: WeaponPart;
  moving?: WeaponPart;
  blur?: WeaponPart;
}

type Painter = (ctx: CanvasRenderingContext2D) => void;
type PartFactory = (
  w: number,
  h: number,
  pivotX: number,
  pivotY: number,
  localX: number,
  localY: number,
  paint: Painter,
) => WeaponPart;

/** Paints the weapon parts. `part` creates a scaled canvas for a sub-image. */
export function paintWeapon(
  type: WeaponType,
  L: number,
  W: number,
  tier: number,
  accent: string,
  part: PartFactory,
): WeaponArt {
  const steel = (ctx: CanvasRenderingContext2D, x0: number, x1: number) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#59606a');
    g.addColorStop(0.5, '#d4d9e0');
    g.addColorStop(1, '#7c838e');
    return g;
  };
  const glow = tier >= 4 ? accent : '#d0d6de';
  switch (type) {
    case 'wedge':
      return {};
    case 'flipper': {
      const fl = L * 0.55;
      const fw = W * 0.7;
      return {
        base: part(10, fw, 5, fw / 2, -L * 0.05, 0, (c) => {
          c.fillStyle = '#2e3238';
          c.fillRect(0, 0, 10, fw);
          bolt(c, 5, 4, 1.5);
          bolt(c, 5, fw - 4, 1.5);
        }),
        moving: part(fl, fw, 0, fw / 2, -L * 0.05, 0, (c) => {
          chamferPath(c, 0, 0, fl, fw, 4);
          c.fillStyle = steel(c, 0, fl);
          c.fill();
          hazardStripes(c, fl - 5, 2, 4, fw - 4, 3);
          c.strokeStyle = 'rgba(0,0,0,0.45)';
          c.lineWidth = 1;
          c.stroke();
          c.fillStyle = glow;
          c.fillRect(fl * 0.25, fw * 0.45, fl * 0.4, fw * 0.1);
        }),
      };
    }
    case 'hSpinner': {
      const len = W * 1.35;
      const bw = 9 + tier;
      const r = len / 2 + 2;
      return {
        base: part(16, 16, 8, 8, L * 0.32, 0, (c) => {
          c.fillStyle = '#25282d';
          c.beginPath();
          c.arc(8, 8, 7, 0, Math.PI * 2);
          c.fill();
          bolt(c, 8, 8, 3);
        }),
        moving: part(bw, len, bw / 2, len / 2, L * 0.32, 0, (c) => {
          chamferPath(c, 0, 0, bw, len, 3);
          c.fillStyle = steel(c, 0, bw);
          c.fill();
          c.fillStyle = shade(accent, -0.1);
          c.fillRect(0, 0, bw, 5);
          c.fillRect(0, len - 5, bw, 5);
          bolt(c, bw / 2, len / 2, 2.5);
        }),
        blur: part(r * 2, r * 2, r, r, L * 0.32, 0, (c) => {
          const g = c.createRadialGradient(r, r, r * 0.2, r, r, r);
          g.addColorStop(0, 'rgba(220,226,235,0.0)');
          g.addColorStop(0.75, 'rgba(220,226,235,0.18)');
          g.addColorStop(0.95, 'rgba(255,255,255,0.45)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g;
          c.beginPath();
          c.arc(r, r, r, 0, Math.PI * 2);
          c.fill();
        }),
      };
    }
    case 'drum': {
      const dl = 14 + tier;
      const dw = W * 0.82;
      return {
        moving: part(dl, dw, dl / 2, dw / 2, L / 2 + 2, 0, (c) => {
          roundRectPath(c, 0, 0, dl, dw, 4);
          c.fillStyle = steel(c, 0, dl);
          c.fill();
          c.fillStyle = '#2b2f35';
          for (let y = 3; y < dw - 3; y += 7) c.fillRect(dl * 0.15, y, dl * 0.7, 2.5);
          c.fillStyle = accent;
          c.fillRect(0, dw / 2 - 2, dl, 4);
        }),
        blur: part(dl + 8, dw, (dl + 8) / 2, dw / 2, L / 2 + 2, 0, (c) => {
          c.fillStyle = 'rgba(230,235,240,0.35)';
          roundRectPath(c, 0, 0, dl + 8, dw, 5);
          c.fill();
        }),
      };
    }
    case 'hammer': {
      const arm = L * 0.62;
      const head = 12 + tier * 1.5;
      return {
        base: part(14, 18, 7, 9, -L * 0.15, 0, (c) => {
          c.fillStyle = '#24272c';
          chamferPath(c, 0, 0, 14, 18, 3);
          c.fill();
          bolt(c, 7, 9, 3);
        }),
        moving: part(arm + head, head * 1.6, 0, head * 0.8, -L * 0.15, 0, (c) => {
          c.fillStyle = '#3c4249';
          c.fillRect(0, head * 0.8 - 2.5, arm, 5);
          chamferPath(c, arm - 2, 0, head, head * 1.6, 3);
          c.fillStyle = steel(c, arm, arm + head);
          c.fill();
          c.fillStyle = accent;
          c.fillRect(arm + head * 0.3, head * 0.2, head * 0.4, head * 1.2);
          c.strokeStyle = 'rgba(0,0,0,0.5)';
          c.stroke();
        }),
      };
    }
    case 'crusher': {
      const jl = L * 0.5;
      const jw = W * 0.75;
      return {
        base: part(12, jw * 0.6, 6, jw * 0.3, L * 0.18, 0, (c) => {
          c.fillStyle = '#2a2e34';
          c.fillRect(0, 0, 12, jw * 0.6);
          bolt(c, 6, 5, 2);
          bolt(c, 6, jw * 0.6 - 5, 2);
        }),
        moving: part(jl, jw, 0, jw / 2, L * 0.18, 0, (c) => {
          c.beginPath();
          c.moveTo(0, jw * 0.35);
          c.quadraticCurveTo(jl * 0.7, 0, jl, jw * 0.42);
          c.lineTo(jl * 0.85, jw * 0.5);
          c.lineTo(jl, jw * 0.58);
          c.quadraticCurveTo(jl * 0.7, jw, 0, jw * 0.65);
          c.closePath();
          c.fillStyle = steel(c, 0, jl);
          c.fill();
          c.strokeStyle = shade(accent, -0.2);
          c.lineWidth = 2;
          c.stroke();
          c.fillStyle = '#f2f2f2';
          for (let i = 0; i < 4; i++) c.fillRect(jl * (0.45 + i * 0.12), jw * 0.47, 2, 3);
        }),
      };
    }
    case 'saw': {
      const r = 11 + tier * 1.5;
      return {
        base: part(L * 0.4, 7, 0, 3.5, L * 0.15, 0, (c) => {
          c.fillStyle = '#383d44';
          c.fillRect(0, 0, L * 0.4, 7);
        }),
        moving: part(r * 2 + 4, r * 2 + 4, r + 2, r + 2, L / 2 + r * 0.45, 0, (c) => {
          c.translate(r + 2, r + 2);
          c.beginPath();
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            const rr = i % 2 === 0 ? r : r * 0.86;
            c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          c.closePath();
          c.fillStyle = steel(c, -r, r);
          c.fill();
          c.fillStyle = '#2d3137';
          c.beginPath();
          c.arc(0, 0, r * 0.3, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = accent;
          c.fillRect(-r * 0.7, -1, r * 0.4, 2);
        }),
        blur: part(r * 2 + 4, r * 2 + 4, r + 2, r + 2, L / 2 + r * 0.45, 0, (c) => {
          c.strokeStyle = 'rgba(255,255,255,0.35)';
          c.lineWidth = 3;
          c.beginPath();
          c.arc(r + 2, r + 2, r * 0.9, 0, Math.PI * 2);
          c.stroke();
        }),
      };
    }
    case 'lance': {
      const len = L * 0.55 + tier * 3;
      return {
        base: part(L * 0.3, 10, 0, 5, -L * 0.05, 0, (c) => {
          c.fillStyle = '#2f343a';
          chamferPath(c, 0, 0, L * 0.3, 10, 2);
          c.fill();
        }),
        moving: part(len, 8, 0, 4, L * 0.15, 0, (c) => {
          c.fillStyle = steel(c, 0, len);
          c.fillRect(0, 2, len - 8, 4);
          c.beginPath();
          c.moveTo(len - 9, 0);
          c.lineTo(len, 4);
          c.lineTo(len - 9, 8);
          c.closePath();
          c.fillStyle = '#eef1f4';
          c.fill();
          c.fillStyle = accent;
          c.fillRect(len * 0.2, 2, 3, 4);
        }),
      };
    }
    case 'flamethrower':
      return {
        base: part(L * 0.45, 14, 0, 7, L * 0.1, 0, (c) => {
          roundRectPath(c, 0, 1, L * 0.22, 12, 5);
          c.fillStyle = '#b8321f';
          c.fill();
          c.fillStyle = '#3a3f46';
          c.fillRect(L * 0.2, 4, L * 0.25, 6);
          c.fillStyle = '#1b1d21';
          c.fillRect(L * 0.42, 3, 4, 8);
          hazardStripes(c, 2, 2, L * 0.18, 3, 2);
        }),
      };
    case 'magnet': {
      const mw = W * 0.7;
      return {
        base: part(12, mw, 0, mw / 2, L / 2 - 4, 0, (c) => {
          chamferPath(c, 0, 0, 12, mw, 3);
          c.fillStyle = '#b03a3a';
          c.fill();
          c.fillStyle = '#c3cad3';
          c.fillRect(8, 0, 4, mw);
          c.strokeStyle = '#d9a43b';
          c.lineWidth = 1;
          for (let y = 4; y < mw - 2; y += 3) {
            c.beginPath();
            c.moveTo(1, y);
            c.lineTo(7, y);
            c.stroke();
          }
        }),
      };
    }
  }
}
