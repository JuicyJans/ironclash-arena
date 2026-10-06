import type { AiProfile, Difficulty } from './types';

/** AI personalities. Difficulty scales behaviour, never stats (see DIFFICULTY). */
export const AI_PROFILES: Record<string, AiProfile> = {
  rookie: {
    id: 'rookie',
    aggression: 0.45,
    caution: 0.2,
    precision: 0.35,
    reactionMs: 520,
    hazardUse: 0.0,
    flanking: 0.05,
    mistakeRate: 0.35,
  },
  pusher: {
    id: 'pusher',
    aggression: 0.75,
    caution: 0.3,
    precision: 0.5,
    reactionMs: 380,
    hazardUse: 0.8,
    flanking: 0.2,
    mistakeRate: 0.2,
  },
  berserker: {
    id: 'berserker',
    aggression: 0.95,
    caution: 0.1,
    precision: 0.5,
    reactionMs: 320,
    hazardUse: 0.2,
    flanking: 0.3,
    mistakeRate: 0.2,
  },
  bruiser: {
    id: 'bruiser',
    aggression: 0.7,
    caution: 0.35,
    precision: 0.6,
    reactionMs: 330,
    hazardUse: 0.4,
    flanking: 0.35,
    mistakeRate: 0.14,
  },
  patient: {
    id: 'patient',
    aggression: 0.45,
    caution: 0.6,
    precision: 0.7,
    reactionMs: 300,
    hazardUse: 0.5,
    flanking: 0.4,
    mistakeRate: 0.12,
  },
  spinner: {
    id: 'spinner',
    aggression: 0.8,
    caution: 0.4,
    precision: 0.6,
    reactionMs: 300,
    hazardUse: 0.3,
    flanking: 0.25,
    mistakeRate: 0.12,
  },
  swarm: {
    id: 'swarm',
    aggression: 0.8,
    caution: 0.25,
    precision: 0.55,
    reactionMs: 330,
    hazardUse: 0.35,
    flanking: 0.6,
    mistakeRate: 0.15,
  },
  tactician: {
    id: 'tactician',
    aggression: 0.6,
    caution: 0.5,
    precision: 0.75,
    reactionMs: 260,
    hazardUse: 0.6,
    flanking: 0.6,
    mistakeRate: 0.08,
  },
  controller: {
    id: 'controller',
    aggression: 0.65,
    caution: 0.45,
    precision: 0.7,
    reactionMs: 260,
    hazardUse: 0.85,
    flanking: 0.5,
    mistakeRate: 0.08,
  },
  speedster: {
    id: 'speedster',
    aggression: 0.85,
    caution: 0.3,
    precision: 0.7,
    reactionMs: 220,
    hazardUse: 0.4,
    flanking: 0.7,
    mistakeRate: 0.08,
  },
  mimic: {
    id: 'mimic',
    aggression: 0.65,
    caution: 0.45,
    precision: 0.72,
    reactionMs: 240,
    hazardUse: 0.55,
    flanking: 0.55,
    mistakeRate: 0.08,
    adaptive: true,
  },
  adaptive: {
    id: 'adaptive',
    aggression: 0.7,
    caution: 0.5,
    precision: 0.8,
    reactionMs: 210,
    hazardUse: 0.7,
    flanking: 0.65,
    mistakeRate: 0.06,
    adaptive: true,
  },
  champion: {
    id: 'champion',
    aggression: 0.75,
    caution: 0.5,
    precision: 0.85,
    reactionMs: 190,
    hazardUse: 0.8,
    flanking: 0.75,
    mistakeRate: 0.04,
    adaptive: true,
  },
  /** Balanced profile used by the balance simulator for fair AI-vs-AI comparisons. */
  standard: {
    id: 'standard',
    aggression: 0.7,
    caution: 0.4,
    precision: 0.65,
    reactionMs: 280,
    hazardUse: 0.5,
    flanking: 0.45,
    mistakeRate: 0.1,
  },
};

export interface DifficultyMods {
  reactionMul: number;
  precisionAdd: number;
  aggressionMul: number;
  hazardUseMul: number;
  mistakeMul: number;
  /** Tiny HP bonus — only used on the highest difficulties (behaviour matters more). */
  hpMul: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyMods> = {
  easy: {
    reactionMul: 1.7,
    precisionAdd: -0.25,
    aggressionMul: 0.75,
    hazardUseMul: 0.3,
    mistakeMul: 2.0,
    hpMul: 1,
  },
  normal: { reactionMul: 1.0, precisionAdd: 0, aggressionMul: 1, hazardUseMul: 1, mistakeMul: 1, hpMul: 1 },
  hard: {
    reactionMul: 0.7,
    precisionAdd: 0.12,
    aggressionMul: 1.1,
    hazardUseMul: 1.2,
    mistakeMul: 0.55,
    hpMul: 1,
  },
  mechanic: {
    reactionMul: 0.5,
    precisionAdd: 0.2,
    aggressionMul: 1.15,
    hazardUseMul: 1.4,
    mistakeMul: 0.3,
    hpMul: 1.1,
  },
};

export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'mechanic'];

export function getProfile(id: string | undefined): AiProfile {
  return AI_PROFILES[id ?? 'standard'] ?? (AI_PROFILES.standard as AiProfile);
}

/** Applies difficulty modifiers to a profile (pure). */
export function scaledProfile(profile: AiProfile, difficulty: Difficulty): AiProfile {
  const d = DIFFICULTY[difficulty];
  const c01 = (v: number) => Math.min(1, Math.max(0, v));
  return {
    ...profile,
    reactionMs: profile.reactionMs * d.reactionMul,
    precision: c01(profile.precision + d.precisionAdd),
    aggression: c01(profile.aggression * d.aggressionMul),
    hazardUse: c01(profile.hazardUse * d.hazardUseMul),
    mistakeRate: c01(profile.mistakeRate * d.mistakeMul),
  };
}
