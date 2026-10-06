import type { ArenaDef } from '../types';

export const SCRAPYARD: ArenaDef = {
  id: 'scrapyard',
  nameKey: 'arenas.scrapyard.name',
  descKey: 'arenas.scrapyard.desc',
  size: { w: 1300, h: 850 },
  theme: {
    floor: '#38342b',
    floorAlt: '#2c2922',
    wall: '#5a4f3a',
    accent: '#9ccc3c',
    light: '#f3e7c0',
    ambient: 0.5,
    mood: 'scrapyard',
  },
  grip: 0.95,
  unlockAfter: 'c09',
  pits: [{ rect: { x: 585, y: 360, w: 130, h: 130 }, opensAt: 70 }],
  houseRobots: [
    {
      id: 'magpie',
      nameKey: 'house.magpie',
      zone: { x: 1110, y: 660, w: 190, h: 190 },
      attack: 'lifter',
      damage: 12,
      speed: 150,
      attackCooldown: 1.6,
      grace: 1.2,
      color: '#9ccc3c',
    },
  ],
  hazards: [
    {
      kind: 'spikes',
      id: 'ysp1',
      rect: { x: 330, y: 140, w: 90, h: 90 },
      damage: 12,
      launch: 260,
      period: 6,
      telegraph: 1.0,
      active: 0.8,
      randomPhase: true,
    },
  ],
  props: [
    { x: 420, y: 520, w: 70, h: 70, mass: 30, hp: 60 },
    { x: 880, y: 300, w: 70, h: 70, mass: 30, hp: 60 },
    { x: 650, y: 680, w: 110, h: 40, mass: 45, hp: 90 },
    { x: 650, y: 170, w: 110, h: 40, mass: 45, hp: 90 },
    { x: 960, y: 590, w: 50, h: 50, mass: 18, hp: 40 },
    { x: 340, y: 330, w: 50, h: 50, mass: 18, hp: 40 },
  ],
  spawns: [
    { x: 200, y: 425, angle: 0 },
    { x: 1100, y: 425, angle: Math.PI },
    { x: 1100, y: 250, angle: Math.PI },
  ],
};
