import type { ArenaDef } from '../../config/types';
import type { HazardRuntime } from '../entities/hazardSystem';
import type { RobotEntity } from '../entities/robot';

/** Read-only view of a match that AI brains may use. Satisfied structurally by MatchSim. */
export interface AiWorldView {
  readonly arena: ArenaDef;
  readonly robots: readonly RobotEntity[];
  readonly hazards: { readonly items: readonly HazardRuntime[] };
  readonly pitOpen: readonly boolean[];
  readonly tick: number;
  readonly time: number;
}

export type AiAction =
  'attack' | 'flank' | 'avoidHazard' | 'lureHazard' | 'retreat' | 'selfRight' | 'avoidWall' | 'useSpecial';

export const AI_ACTIONS: AiAction[] = [
  'attack',
  'flank',
  'avoidHazard',
  'lureHazard',
  'retreat',
  'selfRight',
  'avoidWall',
  'useSpecial',
];

export interface AiDebugInfo {
  action: AiAction;
  scores: Record<AiAction, number>;
  goal: { x: number; y: number };
  targetId: number;
  perceived: { x: number; y: number };
}

/** What the AI "saw" of a robot at some past tick. */
export interface Seen {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  alive: boolean;
  inverted: boolean;
  windingUp: boolean;
  z: number;
  radius: number;
}
