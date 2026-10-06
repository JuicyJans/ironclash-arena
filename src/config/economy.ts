import type { Difficulty } from './types';

/** All economy numbers. Documented in docs/BALANCE.md. */
export const ECONOMY = {
  startingCredits: 900,
  startingScrap: 0,
  /** Price multiplier per part level (index = level - 1). */
  levelPriceCurve: [1, 1.2, 1.8, 2.6, 3.6],
  /** Scrap required per part level (index = level - 1). */
  levelScrapCurve: [0, 0, 0, 1, 2],
  sellRatio: 0.6,

  reward: {
    winBase: 380,
    winPerLevel: 70,
    lossBase: 110,
    firstWinMul: 1.0,
    quickMatchMul: 0.35,
    difficultyMul: { easy: 0.8, normal: 1, hard: 1.3, mechanic: 1.6 } satisfies Record<Difficulty, number>,
    flipBonus: 40,
    maxFlipBonuses: 3,
    pitBonus: 180,
    koBonus: 120,
    perfectBonus: 260,
    perfectDamageFraction: 0.05,
    quickWinBonus: 180,
    quickWinSec: 60,
    starScrap: [0, 0, 0, 1],
  },

  repair: {
    /** Credits per HP fraction lost, scaled by the build's total part value. */
    perFractionOfValue: 0.22,
    minimum: 20,
  },
} as const;

export function levelPrice(basePrice: number, level: number): number {
  const mul = ECONOMY.levelPriceCurve[level - 1] ?? 0;
  return Math.round((basePrice * mul) / 10) * 10;
}

export function levelScrap(baseScrap: number, level: number): number {
  return baseScrap + (ECONOMY.levelScrapCurve[level - 1] ?? 0);
}
