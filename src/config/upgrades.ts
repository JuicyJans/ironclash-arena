import { levelPrice, levelScrap } from './economy';
import type { PartCategory, PartDef, StatBlock, StatMods, Visual } from './types';
import { WEAPON_PARTS } from './weapons';

/** Builds five levels from per-level stat rows. Each row is the *total* contribution at that level. */
function levels(
  basePrice: number,
  rows: Partial<StatBlock>[],
  opts: {
    freeFirst?: boolean;
    baseScrap?: number;
    mul?: (i: number) => Partial<StatBlock>;
    visual?: (i: number) => Visual;
  } = {},
): PartDef['levels'] {
  return rows.map((add, i) => {
    const mods: StatMods = { add };
    const mul = opts.mul?.(i);
    if (mul) mods.mul = mul;
    return {
      price: opts.freeFirst && i === 0 ? 0 : levelPrice(basePrice, i + 1),
      scrap: levelScrap(opts.baseScrap ?? 0, i + 1),
      mods,
      visual: { tier: i + 1, plates: i + 1, ...opts.visual?.(i) },
    };
  });
}

const part = (
  category: PartCategory,
  kind: string,
  lv: PartDef['levels'],
  unlockAfter?: string,
): PartDef => ({
  id: `${category}_${kind}`,
  category,
  kind,
  nameKey: `parts.${category}.${kind}.name`,
  descKey: `parts.${category}.${kind}.desc`,
  unlockAfter,
  levels: lv,
});

// ---------------------------------------------------------------- 1. Armor & chassis plating
// Tiers: mild steel → aluminium → hardened steel → titanium → composite ceramic.
const ARMOR_TIERS = [
  { hp: 30, weight: 18, armor: 0.08 },
  { hp: 55, weight: 15, armor: 0.13 },
  { hp: 90, weight: 22, armor: 0.19 },
  { hp: 125, weight: 19, armor: 0.25 },
  { hp: 165, weight: 21, armor: 0.31 },
];

const armorBalanced = ARMOR_TIERS.map((t) => ({
  hp: t.hp,
  weight: t.weight,
  armorFront: t.armor,
  armorSide: t.armor,
  armorRear: t.armor,
  armorTop: t.armor,
}));

const armorFrontHeavy = ARMOR_TIERS.map((t) => ({
  hp: Math.round(t.hp * 0.75),
  weight: t.weight,
  armorFront: t.armor * 1.45,
  armorSide: t.armor * 0.85,
  armorRear: t.armor * 0.3,
  armorTop: t.armor * 0.8,
  pushForce: 0.06,
}));

// ---------------------------------------------------------------- 2. Drive train
const DRIVE = {
  wheels: {
    speed: [300, 325, 350, 375, 400],
    accel: [950, 1050, 1150, 1250, 1350],
    turn: 4.4,
    grip: 0.3,
    push: 0,
    weight: 12,
  },
  tracks: {
    speed: [240, 258, 276, 294, 312],
    accel: [780, 850, 920, 990, 1060],
    turn: 3.4,
    grip: 0.47,
    push: 0.12,
    weight: 22,
  },
  shuffler: {
    speed: [215, 230, 245, 260, 275],
    accel: [700, 760, 820, 880, 940],
    turn: 3.2,
    grip: 0.85,
    push: 0.55,
    weight: 28,
  },
} as const;

const driveRows = (d: (typeof DRIVE)[keyof typeof DRIVE]) =>
  d.speed.map((topSpeed, i) => ({
    topSpeed,
    accel: d.accel[i] ?? 0,
    turnRate: d.turn + i * 0.12,
    grip: d.grip,
    pushForce: d.push + i * 0.05,
    weight: d.weight + i * 1.5,
  }));

// ---------------------------------------------------------------- 4. Power & electronics
const powerCapacity = [0, 1, 2, 3, 4].map((i) => ({
  energyMax: 100 + i * 30,
  energyRegen: 13 + i * 2,
  boostPower: 1.3 + i * 0.03,
  weight: 9 + i * 1.5,
}));
const powerRegen = [0, 1, 2, 3, 4].map((i) => ({
  energyMax: 75 + i * 15,
  energyRegen: 20 + i * 4.5,
  boostPower: 1.35 + i * 0.04,
  weight: 9 + i,
}));

// ---------------------------------------------------------------- 5. Support systems
const SUPPORT_ROWS: Record<string, Partial<StatBlock>[]> = {
  selfRight: [0, 1, 2, 3, 4].map((i) => ({ selfRight: 2.2 - i * 0.35, weight: 7 })),
  shieldPulse: [0, 1, 2, 3, 4].map((i) => ({ weight: 6 + i * 0.5, hp: 5 * i })),
  smokeScreen: [0, 1, 2, 3, 4].map(() => ({ weight: 4 })),
  magnetAnchor: [0, 1, 2, 3, 4].map((i) => ({
    flipResist: 0.35 + i * 0.1,
    pushForce: 0.04 + i * 0.03,
    weight: 8 + i,
  })),
  sensor: [0, 1, 2, 3, 4].map((i) => ({ damageBonus: 0.03 + i * 0.02, weight: 3 })),
};

/** Seconds of cooldown per level for active support modules. */
export const SUPPORT_COOLDOWNS: Record<string, number[]> = {
  selfRight: [0, 0, 0, 0, 0],
  shieldPulse: [9, 8, 7, 6, 5],
  smokeScreen: [12, 11, 10, 9, 8],
  magnetAnchor: [0, 0, 0, 0, 0],
  sensor: [0, 0, 0, 0, 0],
};
export const SUPPORT_ENERGY: Record<string, number> = {
  selfRight: 15,
  shieldPulse: 25,
  smokeScreen: 20,
  magnetAnchor: 0,
  sensor: 0,
};
export const SUPPORT_STRENGTH = [1, 1.15, 1.3, 1.45, 1.6];

export const PARTS: PartDef[] = [
  part('armor', 'balanced', levels(500, armorBalanced, { freeFirst: true })),
  part('armor', 'frontHeavy', levels(560, armorFrontHeavy), 'c01'),
  part(
    'drive',
    'wheels',
    levels(450, driveRows(DRIVE.wheels), { freeFirst: true, visual: () => ({ wheelStyle: 'spoke' }) }),
  ),
  part(
    'drive',
    'tracks',
    levels(800, driveRows(DRIVE.tracks), { visual: () => ({ wheelStyle: 'track' }) }),
    'c02',
  ),
  part(
    'drive',
    'shuffler',
    levels(1100, driveRows(DRIVE.shuffler), { visual: () => ({ wheelStyle: 'leg' }) }),
    'c06',
  ),
  ...WEAPON_PARTS,
  part('power', 'capacity', levels(400, powerCapacity, { freeFirst: true })),
  part('power', 'regen', levels(450, powerRegen), 'c01'),
  part('support', 'selfRight', levels(500, SUPPORT_ROWS.selfRight ?? [])),
  part('support', 'shieldPulse', levels(700, SUPPORT_ROWS.shieldPulse ?? []), 'c03'),
  part('support', 'smokeScreen', levels(550, SUPPORT_ROWS.smokeScreen ?? []), 'c05'),
  part('support', 'magnetAnchor', levels(650, SUPPORT_ROWS.magnetAnchor ?? []), 'c04'),
  part('support', 'sensor', levels(600, SUPPORT_ROWS.sensor ?? []), 'c07'),
];

export const PART_BY_ID: Record<string, PartDef> = Object.fromEntries(PARTS.map((p) => [p.id, p]));

export const CATEGORIES: PartCategory[] = ['armor', 'drive', 'weapon', 'power', 'support'];
export const MAX_SUPPORT_SLOTS = 2;

export function getPart(id: string): PartDef {
  const p = PART_BY_ID[id];
  if (!p) throw new Error(`Unknown part: ${id}`);
  return p;
}

/** Parts owned at level 1 when a new profile is created. */
export const STARTER_PARTS: Record<string, number> = {
  armor_balanced: 1,
  drive_wheels: 1,
  weapon_wedge: 1,
  power_capacity: 1,
};
