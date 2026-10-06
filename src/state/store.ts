import type { RewardSummary } from '../core/economy/rewards';
import type { MatchConfig, MatchResult } from '../core/match/types';
import { defaultSave, defaultSettings } from '../core/save/defaults';
import type { SaveData, Settings } from '../core/save/schema';
import type { LoadStatus } from '../core/save/storage';
import { createStore } from '../utils/store';

export type Screen =
  | 'splash'
  | 'menu'
  | 'campaign'
  | 'garage'
  | 'quick'
  | 'local'
  | 'online'
  | 'practice'
  | 'settings'
  | 'credits'
  | 'vs'
  | 'match'
  | 'results';

export type SessionKind = 'campaign' | 'quick' | 'local' | 'online' | 'practice';

export interface MatchSession {
  kind: SessionKind;
  config: MatchConfig;
  levelId?: string;
  loadoutIndex?: number;
  /** Number of local human players (keyboard/gamepad). */
  humans: number;
  netRole?: 'host' | 'guest';
  /** Team whose perspective the HUD uses. */
  localTeam: number;
  /** Seconds before the bell (VS + countdown). */
  attempt: number;
}

export interface HudRobot {
  name: string;
  team: number;
  hp: number;
  maxHp: number;
  energy: number;
  energyMax: number;
  cooldown: number;
  cooldownMax: number;
  rpm: number;
  specialCd: number;
  immobile: number;
  inverted: boolean;
  righting: number;
  alive: boolean;
  weapon: string;
  driveDamaged: boolean;
  weaponDamaged: boolean;
  human: boolean;
  playerIndex: number;
}

export interface HudState {
  timeLeft: number;
  robots: HudRobot[];
  scores: number[];
  arena: { w: number; h: number };
  positions: { x: number; y: number; angle: number; team: number; alive: boolean }[];
  hazards: { x: number; y: number; w: number; h: number; phase: number; kind: string }[];
  pits: { x: number; y: number; w: number; h: number; open: boolean }[];
  countdown: number | null;
  banner: string | null;
  showOpponentCooldown: boolean;
  ping?: number;
  net?: 'ok' | 'waiting' | 'disconnected';
  disconnectLeft?: number;
  tutorial?: { step: string; progress: number } | null;
  aiDebug?: string[];
}

export interface ResultsState {
  session: MatchSession;
  result: MatchResult;
  winnerName: string;
  won: boolean | null; // null = no local perspective (e.g. 2-player)
  rewards: RewardSummary | null;
  unlocks: string[];
  repairCost: number;
}

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
}

export interface AppState {
  screen: Screen;
  settings: Settings;
  save: SaveData;
  saveStatus: LoadStatus;
  saveError?: string;
  session: MatchSession | null;
  hud: HudState | null;
  results: ResultsState | null;
  paused: boolean;
  cutscene: { key: string; speaker: string } | null;
  toast: Toast | null;
  fatal: { message: string; log: string } | null;
  debugAi: boolean;
  fps: number;
  installPrompt: boolean;
}

export const store = createStore<AppState>({
  screen: 'splash',
  settings: defaultSettings(),
  save: defaultSave(),
  saveStatus: 'new',
  session: null,
  hud: null,
  results: null,
  paused: false,
  cutscene: null,
  toast: null,
  fatal: null,
  debugAi: false,
  fps: 0,
  installPrompt: false,
});
