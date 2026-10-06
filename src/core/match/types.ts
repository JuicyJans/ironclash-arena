import type { Difficulty, RobotBuild } from '../../config/types';
import type { Controller } from '../entities/robot';

export type MatchMode = 'campaign' | 'quick' | 'local' | 'online' | 'practice' | 'sim';

export interface MatchRobotConfig {
  build: RobotBuild;
  team: number;
  controller: Controller;
  ai?: string;
  difficulty?: Difficulty;
  hpMul?: number;
  /** Local player index (0 or 1) for human robots. */
  playerIndex?: number;
  /** Starting HP fraction (carried damage in the campaign). */
  hpFraction?: number;
}

export interface MatchConfig {
  arenaId: string;
  seed: number;
  robots: MatchRobotConfig[];
  durationSec: number;
  hazards: boolean;
  houseRobots: boolean;
  mode: MatchMode;
  /** Campaign level id (for tutorials and rewards). */
  levelId?: string;
}

export type WinReason = 'ko' | 'pit' | 'judges' | 'walkover' | 'draw';

export interface MatchResult {
  winnerTeam: number; // -1 = draw
  reason: WinReason;
  durationSec: number;
  judgeScores: number[]; // per team
  robots: {
    id: number;
    team: number;
    hpFraction: number;
    damageDealt: number;
    damageTaken: number;
    flips: number;
    pits: number;
    koReason?: string;
  }[];
}
