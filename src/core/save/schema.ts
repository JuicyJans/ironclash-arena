import { z } from 'zod';

export const SAVE_VERSION = 2;
export const SETTINGS_VERSION = 1;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const CosmeticsSchema = z.object({
  primary: hex,
  secondary: hex,
  led: hex,
  decal: z.enum(['none', 'stripes', 'flames', 'skull', 'bolt', 'checker', 'number']),
});

/** A loadout references parts by id; levels come from the inventory. */
export const LoadoutSchema = z.object({
  name: z.string().min(1).max(20),
  chassis: z.string(),
  armor: z.string(),
  drive: z.string(),
  weapon: z.string(),
  power: z.string(),
  support: z.array(z.string()).max(2),
  cosmetics: CosmeticsSchema,
});

export const LevelRecordSchema = z.object({
  stars: z.number().int().min(0).max(3),
  bestTime: z.number().nullable(),
  wins: z.number().int().min(0),
});

export const ProfileSchema = z.object({
  credits: z.number().int().min(0),
  scrap: z.number().int().min(0),
  inventory: z.record(z.string(), z.number().int().min(0).max(5)),
  chassis: z.array(z.string()),
  loadouts: z.array(LoadoutSchema).length(3),
  activeLoadout: z.number().int().min(0).max(2),
  /** Fraction of HP lost per loadout, carried between campaign matches when repairs cost money. */
  damage: z.array(z.number().min(0).max(1)).length(3),
  campaign: z.object({ levels: z.record(z.string(), LevelRecordSchema) }),
  difficulty: z.enum(['easy', 'normal', 'hard', 'mechanic']),
  tutorialDone: z.boolean(),
  stats: z.object({
    matches: z.number().int().min(0),
    wins: z.number().int().min(0),
    kos: z.number().int().min(0),
    flips: z.number().int().min(0),
    pits: z.number().int().min(0),
    damageDealt: z.number().min(0),
  }),
});

export const SaveSchema = z.object({
  version: z.literal(SAVE_VERSION),
  createdAt: z.number(),
  updatedAt: z.number(),
  profile: ProfileSchema,
});

const KeymapSchema = z.object({
  up: z.string(),
  down: z.string(),
  left: z.string(),
  right: z.string(),
  weapon: z.string(),
  special: z.string(),
  boost: z.string(),
});

export const SettingsSchema = z.object({
  version: z.literal(SETTINGS_VERSION),
  lang: z.enum(['no', 'en']),
  volume: z.object({
    master: z.number().min(0).max(1),
    music: z.number().min(0).max(1),
    sfx: z.number().min(0).max(1),
    ui: z.number().min(0).max(1),
  }),
  graphics: z.enum(['low', 'medium', 'high']),
  screenShake: z.number().min(0).max(1),
  damageNumbers: z.boolean(),
  fpsCounter: z.boolean(),
  reduceMotion: z.boolean(),
  colorBlind: z.enum(['off', 'deuteranopia', 'protanopia', 'tritanopia']),
  textScale: z.number().min(0.8).max(1.5),
  keymaps: z.object({ p1: KeymapSchema, p2: KeymapSchema }),
  repairCosts: z.boolean(),
  touchControls: z.enum(['auto', 'on', 'off']),
});

export type Loadout = z.infer<typeof LoadoutSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type SaveData = z.infer<typeof SaveSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type Keymap = z.infer<typeof KeymapSchema>;
export type LevelRecord = z.infer<typeof LevelRecordSchema>;
