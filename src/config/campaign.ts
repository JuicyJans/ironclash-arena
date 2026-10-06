import type { CampaignLevel } from './types';
import { BRONZE } from './campaign/bronze';
import { SILVER } from './campaign/silver';
import { GOLD } from './campaign/gold';
import { MASTER } from './campaign/master';

/**
 * The tournament ladder: 4 leagues (one per arena), a boss at the end of each,
 * and a master gauntlet. Opponent stats come from their builds — AI difficulty
 * changes behaviour, not stats (bosses get at most a small HP bonus).
 */
export const CAMPAIGN: CampaignLevel[] = [...BRONZE, ...SILVER, ...GOLD, ...MASTER];

export const LEVEL_BY_ID: Record<string, CampaignLevel> = Object.fromEntries(CAMPAIGN.map((l) => [l.id, l]));
export const LEAGUES = ['bronze', 'silver', 'gold', 'master'] as const;

export function getLevel(id: string): CampaignLevel {
  const l = LEVEL_BY_ID[id];
  if (!l) throw new Error(`Unknown level: ${id}`);
  return l;
}

/** Star thresholds: 1 = win, 2 = win within par time, 3 = also take less than this HP fraction of damage. */
export const STAR_DAMAGE_THRESHOLD = 0.35;

export { EXPECTED_PROGRESS } from './campaignProgress';
