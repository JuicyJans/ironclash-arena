import type { RobotBuild } from '../../config/types';
import { getPart } from '../../config/upgrades';
import { computeRobotStats } from '../../core/robot/computeStats';
import { makeCanvas, roundRectPath } from './paint/colors';
import { paintBody, paintLeds, paintUnderside } from './paint/robotBody';
import { DRIVE_FRAMES, paintDrive, paintWeapon, type WeaponArt, type WeaponPart } from './paint/robotParts';

/** Texture pixels per world unit (crisp on high-DPI and when the camera zooms in). */
export const PAINT_SCALE = 2;
export const PAD = 22;

export interface RobotArt {
  key: string;
  L: number;
  W: number;
  body: HTMLCanvasElement;
  glow: HTMLCanvasElement;
  underside: HTMLCanvasElement;
  silhouette: HTMLCanvasElement;
  drive: HTMLCanvasElement[];
  weapon: WeaponArt;
}

const cache = new Map<string, RobotArt>();

export function artKey(build: RobotBuild): string {
  return JSON.stringify([build.chassis, build.armor, build.drive, build.weapon, build.cosmetics, build.name]);
}

function centered(L: number, W: number, paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const [c, ctx] = makeCanvas((L + PAD * 2) * PAINT_SCALE, (W + PAD * 2) * PAINT_SCALE);
  ctx.scale(PAINT_SCALE, PAINT_SCALE);
  ctx.translate(L / 2 + PAD, W / 2 + PAD);
  paint(ctx);
  return c;
}

const makePart = (
  w: number,
  h: number,
  pivotX: number,
  pivotY: number,
  localX: number,
  localY: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): WeaponPart => {
  const [canvas, ctx] = makeCanvas(w * PAINT_SCALE, h * PAINT_SCALE);
  ctx.scale(PAINT_SCALE, PAINT_SCALE);
  paint(ctx);
  return { canvas, pivotX: pivotX * PAINT_SCALE, pivotY: pivotY * PAINT_SCALE, localX, localY };
};

/** Paints (and caches) every layer needed to draw a robot. */
export function paintRobot(build: RobotBuild): RobotArt {
  const key = artKey(build);
  const hit = cache.get(key);
  if (hit) return hit;

  const stats = computeRobotStats(build);
  const L = stats.size.w;
  const W = stats.size.h;
  const armor = getPart(build.armor.id);
  const tier = build.armor.level;
  const c = build.cosmetics;

  const body = centered(L, W, (ctx) =>
    paintBody(ctx, {
      L,
      W,
      cosmetics: c,
      armorTier: tier,
      frontHeavy: armor.kind === 'frontHeavy',
      wedge: stats.weaponType === 'wedge',
      tracks: stats.driveType === 'tracks',
      name: build.name,
    }),
  );
  const glow = centered(L, W, (ctx) => paintLeds(ctx, L, W, c.led));
  const underside = centered(L, W, (ctx) => paintUnderside(ctx, L, W, c.secondary));
  const silhouette = centered(L, W, (ctx) => {
    roundRectPath(ctx, -L / 2 - 1, -W / 2 - 1, L + 2, W + 2, 8);
    ctx.fillStyle = '#000';
    ctx.fill();
  });
  const drive = Array.from({ length: DRIVE_FRAMES }, (_, f) =>
    centered(L, W, (ctx) => paintDrive(ctx, stats.driveType, L, W, f, build.drive.level)),
  );
  const weapon = paintWeapon(stats.weaponType, L, W, build.weapon.level, c.led, makePart);

  const art: RobotArt = { key, L, W, body, glow, underside, silhouette, drive, weapon };
  cache.set(key, art);
  if (cache.size > 64) cache.delete(cache.keys().next().value as string);
  return art;
}
