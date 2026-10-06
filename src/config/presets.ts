import type { Cosmetics, RobotBuild } from './types';

interface PresetSpec {
  name: string;
  chassis: 'light' | 'medium' | 'heavy';
  armor: [string, number];
  drive: [string, number];
  weapon: [string, number];
  power: [string, number];
  support?: [string, number][];
  cosmetics: Cosmetics;
}

/** Compact builder for data-defined robots. */
export function makeBuild(p: PresetSpec): RobotBuild {
  return {
    name: p.name,
    chassis: p.chassis,
    armor: { id: `armor_${p.armor[0]}`, level: p.armor[1] },
    drive: { id: `drive_${p.drive[0]}`, level: p.drive[1] },
    weapon: { id: `weapon_${p.weapon[0]}`, level: p.weapon[1] },
    power: { id: `power_${p.power[0]}`, level: p.power[1] },
    support: (p.support ?? []).map(([id, level]) => ({ id: `support_${id}`, level })),
    cosmetics: p.cosmetics,
  };
}

const c = (
  primary: string,
  secondary: string,
  led: string,
  decal: Cosmetics['decal'] = 'none',
): Cosmetics => ({
  primary,
  secondary,
  led,
  decal,
});

export const DEFAULT_COSMETICS: Cosmetics = c('#2b6cb0', '#1a202c', '#22D3EE', 'stripes');

/** The player's very first robot. */
export const STARTER_BUILD: RobotBuild = makeBuild({
  name: 'Rookie',
  chassis: 'light',
  armor: ['balanced', 1],
  drive: ['wheels', 1],
  weapon: ['wedge', 1],
  power: ['capacity', 1],
  cosmetics: DEFAULT_COSMETICS,
});

/** Ready-made robots for quick match, local multiplayer and online play. */
export const PRESETS: RobotBuild[] = [
  makeBuild({
    name: 'Bulldozer',
    chassis: 'heavy',
    armor: ['frontHeavy', 3],
    drive: ['tracks', 3],
    weapon: ['wedge', 3],
    power: ['capacity', 3],
    support: [['magnetAnchor', 2]],
    cosmetics: c('#d69e2e', '#2d3748', '#FFC21A', 'stripes'),
  }),
  makeBuild({
    name: 'Catapult',
    chassis: 'medium',
    armor: ['balanced', 3],
    drive: ['wheels', 3],
    weapon: ['flipper', 3],
    power: ['regen', 3],
    support: [['selfRight', 2]],
    cosmetics: c('#e53e3e', '#1a202c', '#ff8a8a', 'bolt'),
  }),
  makeBuild({
    name: 'Whirlwind',
    chassis: 'medium',
    armor: ['balanced', 3],
    drive: ['wheels', 3],
    weapon: ['hSpinner', 3],
    power: ['capacity', 3],
    cosmetics: c('#805ad5', '#1a202c', '#d6bcfa', 'checker'),
  }),
  makeBuild({
    name: 'Thumper',
    chassis: 'medium',
    armor: ['balanced', 3],
    drive: ['tracks', 2],
    weapon: ['hammer', 3],
    power: ['capacity', 3],
    support: [['selfRight', 1]],
    cosmetics: c('#38a169', '#1a202c', '#9ae6b4', 'number'),
  }),
  makeBuild({
    name: 'Grinder',
    chassis: 'light',
    armor: ['balanced', 3],
    drive: ['wheels', 4],
    weapon: ['saw', 4],
    power: ['regen', 3],
    cosmetics: c('#dd6b20', '#1a202c', '#fbd38d', 'flames'),
  }),
  makeBuild({
    name: 'Jaws',
    chassis: 'heavy',
    armor: ['frontHeavy', 3],
    drive: ['tracks', 3],
    weapon: ['crusher', 3],
    power: ['capacity', 3],
    support: [['shieldPulse', 2]],
    cosmetics: c('#2c7a7b', '#1a202c', '#81e6d9', 'skull'),
  }),
  makeBuild({
    name: 'Rumbler',
    chassis: 'medium',
    armor: ['balanced', 3],
    drive: ['wheels', 3],
    weapon: ['drum', 3],
    power: ['capacity', 3],
    cosmetics: c('#b83280', '#1a202c', '#fbb6ce', 'stripes'),
  }),
  makeBuild({
    name: 'Skewer',
    chassis: 'light',
    armor: ['balanced', 3],
    drive: ['wheels', 4],
    weapon: ['lance', 3],
    power: ['regen', 3],
    support: [['sensor', 2]],
    cosmetics: c('#3182ce', '#1a202c', '#90cdf4', 'bolt'),
  }),
  makeBuild({
    name: 'Scorcher',
    chassis: 'medium',
    armor: ['balanced', 3],
    drive: ['tracks', 2],
    weapon: ['flamethrower', 3],
    power: ['capacity', 3],
    support: [['smokeScreen', 1]],
    cosmetics: c('#c05621', '#1a202c', '#ffb86b', 'flames'),
  }),
  makeBuild({
    name: 'Lodestone',
    chassis: 'heavy',
    armor: ['balanced', 3],
    drive: ['tracks', 3],
    weapon: ['magnet', 3],
    power: ['capacity', 3],
    support: [['magnetAnchor', 2]],
    cosmetics: c('#4a5568', '#1a202c', '#63b3ed', 'checker'),
  }),
];
