import { levelPrice, levelScrap } from './economy';
import type { PartDef, StatBlock, WeaponType } from './types';

/**
 * Behaviour parameters per weapon type. The combat code reads these; per-level
 * stats (damage, cooldown, range, energy) live on the part levels below.
 */
export interface WeaponSpec {
  type: WeaponType;
  /** press = single activation, hold = active while held, toggle = spin up/down. */
  mode: 'press' | 'hold';
  /** Telegraph / wind-up time before the strike (seconds). */
  windup: number;
  /** Active strike window after wind-up (seconds). */
  strike: number;
  /** Half angle of the hit arc in front of the robot (rad). PI = all around. */
  arc: number;
  knockback: number;
  launch: number;
  /** Spinners: seconds from 0 to full rpm and rpm lost per hit (0..1). */
  spinUp?: number;
  rpmLossPerHit?: number;
  /** Fraction of the knockback that also hits the attacker (recoil). */
  recoil?: number;
  /** Turn rate multiplier while active (gyro effect). */
  turnMul?: number;
  /** Crusher: max seconds a hold lasts. Flamethrower: burn seconds applied. */
  holdMax?: number;
  burn?: number;
  /** Magnet: pull speed and drive slow multiplier applied to the target. */
  pull?: number;
  slow?: number;
  /** Wedge: chance to get under the opponent on a frontal impact and dash speed. */
  underChance?: number;
  dash?: number;
  /** Which armor the strike hits (hammer hits the top armor). */
  hitsTop?: boolean;
  weight: number;
  basePrice: number;
  baseScrap: number;
  base: Partial<StatBlock>;
  /** Per level growth (added per level above 1). */
  growth: Partial<StatBlock>;
  unlockAfter?: string;
}

export const WEAPONS: Record<WeaponType, WeaponSpec> = {
  wedge: {
    type: 'wedge',
    mode: 'press',
    windup: 0.15,
    strike: 0.35,
    arc: 0.7,
    knockback: 260,
    launch: 0,
    underChance: 0.35,
    dash: 1.7,
    weight: 10,
    basePrice: 0,
    baseScrap: 0,
    base: { damage: 6, cooldown: 2.4, range: 10, energyCost: 18, pushForce: 0.45 },
    growth: { damage: 1.5, cooldown: -0.15, pushForce: 0.12 },
  },
  flipper: {
    type: 'flipper',
    mode: 'press',
    windup: 0.22,
    strike: 0.12,
    arc: 0.6,
    knockback: 180,
    launch: 760,
    weight: 22,
    basePrice: 700,
    baseScrap: 0,
    unlockAfter: 'c02',
    base: { damage: 10, cooldown: 2.4, range: 34, energyCost: 30 },
    growth: { damage: 2, cooldown: -0.16, range: 3, energyCost: -1.5 },
  },
  hSpinner: {
    type: 'hSpinner',
    mode: 'hold',
    windup: 0,
    strike: 0,
    arc: Math.PI,
    knockback: 520,
    launch: 0,
    spinUp: 1.5,
    rpmLossPerHit: 0.55,
    recoil: 0.55,
    turnMul: 0.85,
    weight: 28,
    basePrice: 1100,
    baseScrap: 0,
    unlockAfter: 'c04',
    base: { damage: 30, cooldown: 0.45, range: 20, energyCost: 9 },
    growth: { damage: 4.5, range: 2, energyCost: -0.4 },
  },
  drum: {
    type: 'drum',
    mode: 'hold',
    windup: 0,
    strike: 0,
    arc: 0.55,
    knockback: 380,
    launch: 420,
    spinUp: 1.0,
    rpmLossPerHit: 0.45,
    recoil: 0.3,
    turnMul: 0.7,
    weight: 24,
    basePrice: 1200,
    baseScrap: 0,
    unlockAfter: 'c06',
    base: { damage: 26, cooldown: 0.4, range: 14, energyCost: 8 },
    growth: { damage: 4, range: 1.5, energyCost: -0.3 },
  },
  hammer: {
    type: 'hammer',
    mode: 'press',
    windup: 0.36,
    strike: 0.1,
    arc: 0.45,
    knockback: 120,
    launch: 0,
    hitsTop: true,
    weight: 22,
    basePrice: 800,
    baseScrap: 0,
    unlockAfter: 'c03',
    base: { damage: 34, cooldown: 1.45, range: 50, energyCost: 16 },
    growth: { damage: 5.5, cooldown: -0.09, range: 3 },
  },
  crusher: {
    type: 'crusher',
    mode: 'press',
    windup: 0.22,
    strike: 0.1,
    arc: 0.5,
    knockback: 0,
    launch: 0,
    holdMax: 2.6,
    weight: 26,
    basePrice: 1300,
    baseScrap: 1,
    unlockAfter: 'c08',
    base: { damage: 15, cooldown: 2.2, range: 24, energyCost: 12 },
    growth: { damage: 2.5, cooldown: -0.12, energyCost: -0.6 },
  },
  saw: {
    type: 'saw',
    mode: 'hold',
    windup: 0.3,
    strike: 0,
    arc: 0.45,
    knockback: 40,
    launch: 0,
    weight: 15,
    basePrice: 450,
    baseScrap: 0,
    base: { damage: 26, cooldown: 0, range: 18, energyCost: 7 },
    growth: { damage: 4, range: 1.5, energyCost: -0.3 },
  },
  lance: {
    type: 'lance',
    mode: 'press',
    windup: 0.26,
    strike: 0.12,
    arc: 0.3,
    knockback: 300,
    launch: 0,
    weight: 14,
    basePrice: 900,
    baseScrap: 0,
    unlockAfter: 'c05',
    base: { damage: 26, cooldown: 1.1, range: 62, energyCost: 13 },
    growth: { damage: 4, cooldown: -0.06, range: 4 },
  },
  flamethrower: {
    type: 'flamethrower',
    mode: 'hold',
    windup: 0.35,
    strike: 0,
    arc: 0.35,
    knockback: 0,
    launch: 0,
    burn: 2.2,
    weight: 16,
    basePrice: 1000,
    baseScrap: 0,
    unlockAfter: 'c07',
    base: { damage: 11, cooldown: 0, range: 95, energyCost: 15 },
    growth: { damage: 2, range: 6, energyCost: -0.6 },
  },
  magnet: {
    type: 'magnet',
    mode: 'hold',
    windup: 0.3,
    strike: 0,
    arc: 0.6,
    knockback: 0,
    launch: 0,
    pull: 170,
    slow: 0.45,
    weight: 22,
    basePrice: 1500,
    baseScrap: 2,
    unlockAfter: 'c12',
    base: { damage: 5, cooldown: 0, range: 135, energyCost: 13 },
    growth: { damage: 1.2, range: 8, energyCost: -0.5 },
  },
};

export const WEAPON_TYPES = Object.keys(WEAPONS) as WeaponType[];

const LEVELS = 5;

function weaponLevels(spec: WeaponSpec): PartDef['levels'] {
  return Array.from({ length: LEVELS }, (_, i) => {
    const add: Partial<StatBlock> = { weight: spec.weight + i * 1.5 };
    for (const [k, v] of Object.entries(spec.base) as [keyof StatBlock, number][]) add[k] = v;
    for (const [k, g] of Object.entries(spec.growth) as [keyof StatBlock, number][]) {
      add[k] = (add[k] ?? 0) + g * i;
    }
    return {
      price: spec.basePrice === 0 && i === 0 ? 0 : levelPrice(Math.max(spec.basePrice, 400), i + 1),
      scrap: levelScrap(spec.baseScrap, i + 1),
      mods: { add },
      visual: { tier: i + 1 },
    };
  });
}

export const WEAPON_PARTS: PartDef[] = WEAPON_TYPES.map((type) => {
  const spec = WEAPONS[type];
  return {
    id: `weapon_${type}`,
    category: 'weapon',
    kind: type,
    nameKey: `parts.weapon.${type}.name`,
    descKey: `parts.weapon.${type}.desc`,
    unlockAfter: spec.unlockAfter,
    levels: weaponLevels(spec),
  };
});
