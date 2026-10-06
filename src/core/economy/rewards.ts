import { STAR_DAMAGE_THRESHOLD } from '../../config/campaign';
import { ECONOMY } from '../../config/economy';
import type { CampaignLevel, Difficulty } from '../../config/types';
import type { MatchResult } from '../match/types';

const R = ECONOMY.reward;

export interface RewardLine {
  key: string; // i18n key under results.reward.*
  credits: number;
  scrap: number;
}

export interface RewardSummary {
  won: boolean;
  stars: number;
  credits: number;
  scrap: number;
  lines: RewardLine[];
}

export interface RewardInput {
  result: MatchResult;
  playerTeam: number;
  playerRobotId: number;
  difficulty: Difficulty;
  level?: CampaignLevel;
  levelIndex?: number;
  firstWin: boolean;
  quickMatch: boolean;
}

/** Stars: 1 = win, 2 = win within par time, 3 = also took little damage. */
export function computeStars(
  won: boolean,
  durationSec: number,
  parTime: number,
  damageTakenFraction: number,
): number {
  if (!won) return 0;
  let stars = 1;
  if (durationSec <= parTime) stars++;
  if (stars === 2 && damageTakenFraction <= STAR_DAMAGE_THRESHOLD) stars++;
  return stars;
}

/** Pure reward calculation for a finished match. */
export function computeRewards(input: RewardInput): RewardSummary {
  const { result, playerTeam } = input;
  const me = result.robots.find((r) => r.id === input.playerRobotId);
  const won = result.winnerTeam === playerTeam;
  const lines: RewardLine[] = [];
  const add = (key: string, credits: number, scrap = 0) => {
    if (credits > 0 || scrap > 0) lines.push({ key, credits: Math.round(credits), scrap });
  };
  const idx = input.levelIndex ?? 0;
  const diff = R.difficultyMul[input.difficulty];

  if (won) add('win', (R.winBase + R.winPerLevel * idx + (input.level?.rewardBase ?? 0)) * diff);
  else add('loss', R.lossBase * diff);

  if (won && me) {
    const flips = Math.min(me.flips, R.maxFlipBonuses);
    add('flips', flips * R.flipBonus);
    if (me.pits > 0) add('pit', R.pitBonus);
    else if (result.reason === 'ko') add('ko', R.koBonus);
    const takenFraction = 1 - me.hpFraction;
    if (takenFraction <= R.perfectDamageFraction) add('perfect', R.perfectBonus);
    if (result.durationSec <= R.quickWinSec && result.reason !== 'judges') add('quick', R.quickWinBonus);
  }

  let credits = lines.reduce((s, l) => s + l.credits, 0);
  if (won && input.firstWin && input.level) {
    add('firstWin', credits * R.firstWinMul, input.level.scrapReward);
    credits *= 1 + R.firstWinMul;
  }
  if (input.quickMatch) {
    for (const l of lines) l.credits = Math.round(l.credits * R.quickMatchMul);
  }

  const stars = input.level
    ? computeStars(won, result.durationSec, input.level.parTime, me ? 1 - me.hpFraction : 1)
    : 0;
  if (stars === 3 && input.level) add('stars', 0, R.starScrap[3] ?? 0);

  return {
    won,
    stars,
    credits: lines.reduce((s, l) => s + l.credits, 0),
    scrap: lines.reduce((s, l) => s + l.scrap, 0),
    lines,
  };
}
