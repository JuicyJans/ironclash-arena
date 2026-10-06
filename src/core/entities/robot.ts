import type Matter from 'matter-js';
import type { Difficulty, RobotBuild, RobotStats, SupportModule } from '../../config/types';
import type { KoReason } from '../events';

export interface InputFrame {
  throttle: number; // -1..1
  steer: number; // -1..1 (positive = clockwise / right)
  weapon: boolean;
  special: boolean;
  boost: boolean;
}

export const NO_INPUT: InputFrame = Object.freeze({
  throttle: 0,
  steer: 0,
  weapon: false,
  special: false,
  boost: false,
});

export type Controller = 'human' | 'ai' | 'remote' | 'dummy';

export interface WeaponState {
  phase: 'idle' | 'windup' | 'strike' | 'holding';
  timer: number;
  cooldown: number;
  /** Spinners: 0..1 rotor speed. Hold weapons: 0..1 spin-up/ignition progress. */
  rpm: number;
  heldTarget: number; // robot id or -1
  /** Accumulated continuous damage not yet emitted as an event. */
  pendingDamage: number;
  pendingTimer: number;
  active: boolean;
}

export interface SupportState {
  module: SupportModule;
  level: number;
  cooldown: number;
}

export interface RobotStatus {
  burn: number; // seconds remaining
  stun: number;
  heldBy: number; // robot id or -1
  lifted: number; // seconds remaining (wedged up — no traction)
  shield: number;
  smoke: number;
  slow: number; // seconds remaining of a drive slow
  slowMul: number;
  boosting: boolean;
  falling: number; // seconds into a pit fall (0 = not falling)
  gripMul: number; // set per tick by floor hazards
  hazardDot: number; // continuous hazard damage accumulator
}

export interface RobotScore {
  damageDealt: number;
  damageTaken: number;
  aggression: number;
  control: number;
  flips: number;
  pits: number;
  hits: number;
}

export interface RobotEntity {
  id: number;
  team: number;
  name: string;
  build: RobotBuild;
  stats: RobotStats;
  controller: Controller;
  aiProfile?: string;
  difficulty?: Difficulty;
  playerIndex: number; // 0/1 for local humans, -1 otherwise
  body: Matter.Body;
  radius: number;

  hp: number;
  maxHp: number;
  energy: number;
  /** Height above the floor and vertical velocity while airborne. */
  z: number;
  vz: number;
  airTime: number;
  launchPower: number;
  /** Decided (seeded) at launch: whether this flight ends upside-down/upright-flipped. */
  willFlip: boolean;
  launchedBy: number;
  /** Visual flip rotation (0..PI) – purely cosmetic, but deterministic. */
  flipAngle: number;
  inverted: boolean;
  rightTimer: number;

  weapon: WeaponState;
  support: SupportState[];
  driveHealth: number; // multiplier, 1 = intact
  weaponHealth: number;
  thresholdsPassed: number;

  status: RobotStatus;
  immobileTimer: number;
  mobility: { x: number; y: number; angle: number; t: number };
  alive: boolean;
  koReason?: KoReason;
  score: RobotScore;
  input: InputFrame;
  prevInput: InputFrame;
  lastAttacker: number;
  lastAttackerTick: number;
  /** Ids of robots touched this tick (filled by the collision pass). */
  contacts: number[];
  /** Forward speed in units/s (for audio/visuals). */
  speed: number;
}

export function createWeaponState(): WeaponState {
  return {
    phase: 'idle',
    timer: 0,
    cooldown: 0,
    rpm: 0,
    heldTarget: -1,
    pendingDamage: 0,
    pendingTimer: 0,
    active: false,
  };
}

export function createStatus(): RobotStatus {
  return {
    burn: 0,
    stun: 0,
    heldBy: -1,
    lifted: 0,
    shield: 0,
    smoke: 0,
    slow: 0,
    slowMul: 1,
    boosting: false,
    falling: 0,
    gripMul: 1,
    hazardDot: 0,
  };
}

export function createScore(): RobotScore {
  return { damageDealt: 0, damageTaken: 0, aggression: 0, control: 0, flips: 0, pits: 0, hits: 0 };
}

export const isPressed = (r: RobotEntity, key: 'weapon' | 'special'): boolean =>
  r.input[key] && !r.prevInput[key];

/** True when the robot can drive and fight normally. */
export const canAct = (r: RobotEntity): boolean =>
  r.alive && r.z <= 0 && !r.inverted && r.status.stun <= 0 && r.status.heldBy < 0 && r.status.falling <= 0;
