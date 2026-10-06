/** Shared types for all data-driven game content. */
import type { Circle, Rect } from '../utils/math';

export type WeaponType =
  | 'wedge'
  | 'flipper'
  | 'hSpinner'
  | 'drum'
  | 'hammer'
  | 'crusher'
  | 'saw'
  | 'lance'
  | 'flamethrower'
  | 'magnet';

export type DriveType = 'wheels' | 'tracks' | 'shuffler';
export type SupportModule = 'selfRight' | 'shieldPulse' | 'smokeScreen' | 'magnetAnchor' | 'sensor';
export type PartCategory = 'armor' | 'drive' | 'weapon' | 'power' | 'support';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'mechanic';
export type ArmorSide = 'front' | 'side' | 'rear' | 'top';

/** Every numeric stat a robot can have. Parts modify these additively and/or multiplicatively. */
export interface StatBlock {
  hp: number;
  weight: number;
  topSpeed: number; // world units per second
  accel: number; // world units per second^2
  turnRate: number; // radians per second
  energyMax: number;
  energyRegen: number; // per second
  armorFront: number; // damage reduction fraction 0..1
  armorSide: number;
  armorRear: number;
  armorTop: number;
  damage: number; // base weapon damage per hit (or per second for continuous weapons)
  cooldown: number; // seconds
  range: number; // weapon reach in world units beyond the chassis front
  energyCost: number; // per activation (or per second for continuous weapons)
  selfRight: number; // seconds needed to self-right (0 = cannot)
  pushForce: number; // max drive force multiplier (pushing contests)
  grip: number; // 0..1 how quickly sideways velocity is killed
  flipResist: number; // 0..1 chance to resist being flipped
  boostPower: number; // speed multiplier while boosting
  damageBonus: number; // multiplier bonus applied to all outgoing damage
}

export type StatMods = { add?: Partial<StatBlock>; mul?: Partial<StatBlock> };

export interface Visual {
  /** Free-form hints for the procedural renderer (plate thickness, LED colour, wheel style...). */
  plates?: number;
  led?: string;
  wheelStyle?: 'spoke' | 'solid' | 'track' | 'leg';
  tier?: number;
}

export interface PartLevel {
  price: number;
  scrap: number;
  mods: StatMods;
  visual?: Visual;
}

export interface PartDef {
  id: string;
  category: PartCategory;
  /** Sub type: weapon type, drive type, support module or armor/power variant id. */
  kind: string;
  nameKey: string;
  descKey: string;
  /** Campaign level id that must be won to unlock purchase; undefined = always available. */
  unlockAfter?: string;
  levels: PartLevel[];
}

export interface ChassisDef {
  id: string;
  nameKey: string;
  weightLimit: number;
  size: { w: number; h: number };
  price: number;
  scrap: number;
  unlockAfter?: string;
  base: StatBlock;
}

export interface Cosmetics {
  primary: string;
  secondary: string;
  led: string;
  decal: 'none' | 'stripes' | 'flames' | 'skull' | 'bolt' | 'checker' | 'number';
}

/** A complete robot configuration. Part levels come from the owner's inventory (or are fixed for AI). */
export interface RobotBuild {
  name: string;
  chassis: string;
  armor: PartRef;
  drive: PartRef;
  weapon: PartRef;
  power: PartRef;
  support: PartRef[];
  cosmetics: Cosmetics;
}

export interface PartRef {
  id: string;
  level: number; // 1-based
}

export interface RobotStats extends StatBlock {
  weightLimit: number;
  size: { w: number; h: number };
  weaponType: WeaponType;
  driveType: DriveType;
  support: { module: SupportModule; level: number }[];
}

// ---------------------------------------------------------------- Arenas & hazards

export interface HazardTiming {
  period: number; // seconds per cycle
  telegraph: number; // seconds of warning (>= 0.75)
  active: number; // seconds active
  /** Seconds offset; when `randomPhase` the seeded RNG adds a deterministic extra offset. */
  phase?: number;
  randomPhase?: boolean;
  /** Only runs within this window of the match (seconds). */
  from?: number;
  until?: number;
}

export type HazardDef =
  | ({ kind: 'spikes'; id: string; rect: Rect; damage: number; launch: number } & HazardTiming)
  | ({ kind: 'flameJet'; id: string; circle: Circle; dps: number; burn: number } & HazardTiming)
  | ({ kind: 'press'; id: string; rect: Rect; damage: number; stun: number } & HazardTiming)
  | ({ kind: 'floorFlipper'; id: string; rect: Rect; launch: number; damage: number } & HazardTiming)
  | ({ kind: 'wallSaw'; id: string; rect: Rect; dps: number } & HazardTiming)
  | { kind: 'lava'; id: string; rect: Rect; dps: number; from?: number; until?: number }
  | { kind: 'ice'; id: string; rect: Rect; gripMul: number }
  | { kind: 'turntable'; id: string; circle: Circle; angularSpeed: number };

export type HazardKind = HazardDef['kind'];

export interface PitDef {
  rect: Rect;
  opensAt: number; // seconds after match start (Infinity = only via button)
  button?: Rect;
}

export interface HouseRobotDef {
  id: string;
  nameKey: string;
  zone: Rect;
  attack: 'hammer' | 'lifter' | 'flame' | 'saw';
  damage: number;
  speed: number;
  attackCooldown: number;
  /** Seconds a robot may stay in the zone before the house robot attacks. */
  grace: number;
  color: string;
}

export interface ArenaTheme {
  floor: string;
  floorAlt: string;
  wall: string;
  accent: string;
  light: string;
  ambient: number; // 0..1 darkness of the vignette
  mood: 'workshop' | 'foundry' | 'ice' | 'colosseum' | 'scrapyard';
}

export interface ArenaDef {
  id: string;
  nameKey: string;
  descKey: string;
  size: { w: number; h: number };
  theme: ArenaTheme;
  /** Floor grip multiplier for the whole arena. */
  grip: number;
  pits: PitDef[];
  houseRobots: HouseRobotDef[];
  hazards: HazardDef[];
  spawns: { x: number; y: number; angle: number }[];
  /** Movable physics props (bonus scrapyard arena). */
  props?: { x: number; y: number; w: number; h: number; mass: number; hp: number }[];
  unlockAfter?: string;
}

// ---------------------------------------------------------------- AI

export interface AiProfile {
  id: string;
  aggression: number; // 0..1
  caution: number; // 0..1
  precision: number; // 0..1 aim accuracy
  reactionMs: number;
  hazardUse: number; // 0..1 probability to lure into hazards
  flanking: number; // 0..1 skill at circling to the rear
  mistakeRate: number; // 0..1 occasional misjudgements
  /** Optional: copies the opponent's build (Mirror) or adapts its tactics mid-match. */
  adaptive?: boolean;
}

// ---------------------------------------------------------------- Campaign

export interface OpponentDef {
  build: RobotBuild;
  ai: string;
  /** Small HP multiplier, only used sparingly for bosses on the highest tiers. */
  hpMul?: number;
  mirror?: boolean;
}

export interface CampaignLevel {
  id: string;
  league: 'bronze' | 'silver' | 'gold' | 'master';
  arena: string;
  nameKey: string;
  opponents: OpponentDef[];
  boss: boolean;
  tutorial?: boolean;
  /** Seconds — two-star threshold for winning quickly. */
  parTime: number;
  rewardBase: number;
  scrapReward: number;
  introKey?: string;
  outroKey?: string;
  hazardsOverride?: 'all';
}
