import { ECONOMY } from '../../config/economy';
import { DEFAULT_COSMETICS } from '../../config/presets';
import { STARTER_PARTS } from '../../config/upgrades';
import {
  SAVE_VERSION,
  SETTINGS_VERSION,
  type Keymap,
  type Loadout,
  type Profile,
  type SaveData,
  type Settings,
} from './schema';

export const DEFAULT_KEYMAPS: { p1: Keymap; p2: Keymap } = {
  p1: {
    up: 'KeyW',
    down: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    weapon: 'Space',
    special: 'ShiftLeft',
    boost: 'KeyE',
  },
  p2: {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    weapon: 'Enter',
    special: 'ControlRight',
    boost: 'ShiftRight',
  },
};

export function starterLoadout(name: string, cosmetics = DEFAULT_COSMETICS): Loadout {
  return {
    name,
    chassis: 'light',
    armor: 'armor_balanced',
    drive: 'drive_wheels',
    weapon: 'weapon_wedge',
    power: 'power_capacity',
    support: [],
    cosmetics: { ...cosmetics },
  };
}

export function defaultProfile(): Profile {
  return {
    credits: ECONOMY.startingCredits,
    scrap: ECONOMY.startingScrap,
    inventory: { ...STARTER_PARTS },
    chassis: ['light'],
    loadouts: [
      starterLoadout('Rookie'),
      starterLoadout('Rookie B', {
        primary: '#c05621',
        secondary: '#1a202c',
        led: '#FFC21A',
        decal: 'flames',
      }),
      starterLoadout('Rookie C', { primary: '#2f855a', secondary: '#1a202c', led: '#9ae6b4', decal: 'bolt' }),
    ],
    activeLoadout: 0,
    damage: [0, 0, 0],
    campaign: { levels: {} },
    difficulty: 'normal',
    tutorialDone: false,
    stats: { matches: 0, wins: 0, kos: 0, flips: 0, pits: 0, damageDealt: 0 },
  };
}

export function defaultSave(now = Date.now()): SaveData {
  return { version: SAVE_VERSION, createdAt: now, updatedAt: now, profile: defaultProfile() };
}

export function defaultSettings(lang: 'no' | 'en' = 'no'): Settings {
  return {
    version: SETTINGS_VERSION,
    lang,
    volume: { master: 0.8, music: 0.55, sfx: 0.8, ui: 0.6 },
    graphics: 'high',
    screenShake: 1,
    damageNumbers: true,
    fpsCounter: false,
    reduceMotion: false,
    colorBlind: 'off',
    textScale: 1,
    keymaps: structuredClone(DEFAULT_KEYMAPS),
    repairCosts: false,
    touchControls: 'auto',
  };
}
