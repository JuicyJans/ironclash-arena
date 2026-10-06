import { CAMPAIGN } from '../../config/campaign';
import { DIFFICULTY } from '../../config/aiProfiles';
import type { CampaignLevel, Difficulty, RobotBuild } from '../../config/types';
import type { MatchConfig, MatchRobotConfig } from '../match/types';
import { hashSeed } from '../rng';
import type { Profile } from '../save/schema';

export function levelIndex(id: string): number {
  return CAMPAIGN.findIndex((l) => l.id === id);
}

/** A level is playable when it is the first or the previous one has been won. */
export function isLevelUnlocked(p: Profile, id: string): boolean {
  const i = levelIndex(id);
  if (i <= 0) return i === 0;
  const prev = CAMPAIGN[i - 1];
  return !!prev && (p.campaign.levels[prev.id]?.wins ?? 0) > 0;
}

export function totalStars(p: Profile): number {
  return Object.values(p.campaign.levels).reduce((s, l) => s + l.stars, 0);
}

/** Next level the player has not yet won (or the last one). */
export function nextLevel(p: Profile): CampaignLevel {
  return CAMPAIGN.find((l) => (p.campaign.levels[l.id]?.wins ?? 0) === 0) ?? CAMPAIGN[CAMPAIGN.length - 1]!;
}

export function recordLevelResult(
  p: Profile,
  levelId: string,
  won: boolean,
  stars: number,
  time: number,
): Profile {
  const prev = p.campaign.levels[levelId] ?? { stars: 0, bestTime: null, wins: 0 };
  const rec = {
    stars: Math.max(prev.stars, stars),
    bestTime: won ? Math.min(prev.bestTime ?? Infinity, time) : prev.bestTime,
    wins: prev.wins + (won ? 1 : 0),
  };
  return { ...p, campaign: { levels: { ...p.campaign.levels, [levelId]: rec } } };
}

/** Builds the match configuration for a campaign level. */
export function campaignMatchConfig(
  level: CampaignLevel,
  player: RobotBuild,
  difficulty: Difficulty,
  hpFraction: number,
  seed: number,
): MatchConfig {
  const diff = DIFFICULTY[difficulty];
  const opponents: MatchRobotConfig[] = level.opponents.map((o) => ({
    build: o.mirror ? { ...player, name: o.build.name, cosmetics: o.build.cosmetics } : o.build,
    team: 1,
    controller: 'ai',
    ai: o.ai,
    difficulty,
    // Only bosses on the top difficulties get a little extra HP – behaviour does the rest.
    hpMul: (o.hpMul ?? 1) * (level.boss ? diff.hpMul : 1),
  }));
  return {
    arenaId: level.arena,
    seed: hashSeed(level.id, seed),
    durationSec: 150,
    hazards: true,
    houseRobots: true,
    mode: 'campaign',
    levelId: level.id,
    robots: [{ build: player, team: 0, controller: 'human', playerIndex: 0, hpFraction }, ...opponents],
  };
}
