import type { ChassisDef, StatBlock } from './types';

/** Neutral stat block; chassis and parts build on top of it. */
export const ZERO_STATS: StatBlock = {
  hp: 0,
  weight: 0,
  topSpeed: 0,
  accel: 0,
  turnRate: 0,
  energyMax: 0,
  energyRegen: 0,
  armorFront: 0,
  armorSide: 0,
  armorRear: 0,
  armorTop: 0,
  damage: 0,
  cooldown: 0,
  range: 0,
  energyCost: 0,
  selfRight: 0,
  pushForce: 1,
  grip: 0,
  flipResist: 0,
  boostPower: 1.35,
  damageBonus: 1,
};

const base = (patch: Partial<StatBlock>): StatBlock => ({ ...ZERO_STATS, ...patch });

export const CHASSIS: Record<string, ChassisDef> = {
  light: {
    id: 'light',
    nameKey: 'parts.chassis.light',
    weightLimit: 100,
    size: { w: 58, h: 50 },
    price: 0,
    scrap: 0,
    base: base({ hp: 210, weight: 24, turnRate: 0.35, pushForce: 0.95 }),
  },
  medium: {
    id: 'medium',
    nameKey: 'parts.chassis.medium',
    weightLimit: 140,
    size: { w: 68, h: 58 },
    price: 1800,
    scrap: 0,
    unlockAfter: 'c02',
    base: base({ hp: 290, weight: 36, turnRate: 0.15, pushForce: 1.05 }),
  },
  heavy: {
    id: 'heavy',
    nameKey: 'parts.chassis.heavy',
    weightLimit: 185,
    size: { w: 80, h: 68 },
    price: 4200,
    scrap: 2,
    unlockAfter: 'c05',
    base: base({ hp: 380, weight: 52, turnRate: -0.1, pushForce: 1.15 }),
  },
};

export const CHASSIS_IDS = Object.keys(CHASSIS);
