import type { ArenaDef } from '../types';

export const ICEFACTORY: ArenaDef = {
  id: 'icefactory',
  nameKey: 'arenas.icefactory.name',
  descKey: 'arenas.icefactory.desc',
  size: { w: 1300, h: 900 },
  theme: {
    floor: '#2a3540',
    floorAlt: '#223038',
    wall: '#3c5a6e',
    accent: '#22D3EE',
    light: '#a8e8ff',
    ambient: 0.5,
    mood: 'ice',
  },
  grip: 1,
  unlockAfter: 'c08',
  pits: [
    { rect: { x: 140, y: 650, w: 130, h: 130 }, opensAt: 50, button: { x: 1210, y: 810, w: 60, h: 60 } },
  ],
  houseRobots: [
    {
      id: 'frostbite',
      nameKey: 'house.frostbite',
      zone: { x: 1120, y: 0, w: 180, h: 180 },
      attack: 'lifter',
      damage: 10,
      speed: 160,
      attackCooldown: 1.8,
      grace: 1.0,
      color: '#7fd4f5',
    },
  ],
  hazards: [
    { kind: 'ice', id: 'ice1', rect: { x: 300, y: 80, w: 420, h: 260 }, gripMul: 0.18 },
    { kind: 'ice', id: 'ice2', rect: { x: 640, y: 560, w: 460, h: 240 }, gripMul: 0.18 },
    { kind: 'turntable', id: 'tt', circle: { x: 650, y: 450, r: 140 }, angularSpeed: 0.9 },
    {
      kind: 'press',
      id: 'press',
      rect: { x: 930, y: 170, w: 140, h: 140 },
      damage: 42,
      stun: 1.0,
      period: 8,
      telegraph: 1.5,
      active: 0.6,
      randomPhase: true,
    },
  ],
  spawns: [
    { x: 230, y: 450, angle: 0 },
    { x: 1070, y: 450, angle: Math.PI },
    { x: 1070, y: 620, angle: Math.PI },
  ],
};
