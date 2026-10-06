import { BALANCE } from '../../config/balance';
import { lerp, lerpAngle } from '../../utils/math';
import type { HazardPhase } from '../entities/hazards';
import type { MatchSim } from './matchSim';

/** Weapon phases as small integers for compact snapshots. */
export const WEAPON_PHASES = ['idle', 'windup', 'strike', 'holding'] as const;
export const HAZARD_PHASES: HazardPhase[] = ['off', 'idle', 'telegraph', 'active'];

/** Render- and network-friendly view of one robot. */
export interface RobotView {
  x: number;
  y: number;
  angle: number;
  /** Velocity (units/s, rad/s) – used by network prediction. */
  vx: number;
  vy: number;
  av: number;
  z: number;
  flipAngle: number;
  inverted: boolean;
  alive: boolean;
  hp: number;
  energy: number;
  falling: number;
  weaponPhase: number;
  weaponTimer: number;
  rpm: number;
  weaponActive: boolean;
  cooldown: number;
  held: boolean;
  burning: boolean;
  smoke: boolean;
  shield: boolean;
  boosting: boolean;
  lifted: boolean;
  immobile: number;
  righting: number;
  speed: number;
  driveHealth: number;
  weaponHealth: number;
  specialCooldown: number;
}

export interface HouseView {
  x: number;
  y: number;
  angle: number;
  attackAnim: number;
  targetId: number;
}

export interface WorldState {
  tick: number;
  time: number;
  timeLeft: number;
  robots: RobotView[];
  houses: HouseView[];
  hazards: { phase: number; progress: number }[];
  pits: boolean[];
  props: { x: number; y: number; angle: number; alive: boolean }[];
  ended: boolean;
  winnerTeam: number;
  /** Judges' running totals per team (shown in the HUD near the end). */
  scores: number[];
}

/** Captures the current simulation state into a plain object. */
export function captureState(sim: MatchSim): WorldState {
  return {
    tick: sim.tick,
    time: sim.time,
    timeLeft: sim.timeLeft,
    robots: sim.robots.map((r) => ({
      x: r.body.position.x,
      y: r.body.position.y,
      angle: r.body.angle,
      vx: r.body.velocity.x * BALANCE.tickRate,
      vy: r.body.velocity.y * BALANCE.tickRate,
      av: r.body.angularVelocity * BALANCE.tickRate,
      z: r.z,
      flipAngle: r.flipAngle,
      inverted: r.inverted,
      alive: r.alive,
      hp: r.hp,
      energy: r.energy,
      falling: r.status.falling,
      weaponPhase: WEAPON_PHASES.indexOf(r.weapon.phase),
      weaponTimer: r.weapon.timer,
      rpm: r.weapon.rpm,
      weaponActive: r.weapon.active,
      cooldown: r.weapon.cooldown,
      held: r.status.heldBy >= 0,
      burning: r.status.burn > 0,
      smoke: r.status.smoke > 0,
      shield: r.status.shield > 0,
      boosting: r.status.boosting,
      lifted: r.status.lifted > 0,
      immobile: r.immobileTimer,
      righting: r.rightTimer,
      speed: r.speed,
      driveHealth: r.driveHealth,
      weaponHealth: r.weaponHealth,
      specialCooldown: r.support.reduce((m, s) => Math.max(m, s.cooldown), 0),
    })),
    houses: sim.houses.map((h) => ({
      x: h.body.position.x,
      y: h.body.position.y,
      angle: h.body.angle,
      attackAnim: h.attackAnim,
      targetId: h.targetId,
    })),
    hazards: sim.hazards.items.map((h) => ({ phase: HAZARD_PHASES.indexOf(h.phase), progress: h.progress })),
    pits: [...sim.pitOpen],
    props: sim.props.map((p) => ({
      x: p.body.position.x,
      y: p.body.position.y,
      angle: p.body.angle,
      alive: p.alive,
    })),
    ended: sim.ended,
    winnerTeam: sim.result?.winnerTeam ?? -1,
    scores: sim.teamScores(),
  };
}

/** Interpolates positional fields between two states (for smooth rendering). */
export function interpolateRobot(a: RobotView, b: RobotView, t: number): RobotView {
  return {
    ...b,
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    angle: lerpAngle(a.angle, b.angle, t),
    z: lerp(a.z, b.z, t),
  };
}

export function interpolateHouse(a: HouseView, b: HouseView, t: number): HouseView {
  return { ...b, x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), angle: lerpAngle(a.angle, b.angle, t) };
}

/** Initial state before the first network snapshot: robots on their spawn points, full health. */
export function initialState(
  config: { durationSec: number; robots: { team: number; hpMul?: number }[] },
  arena: { spawns: { x: number; y: number; angle: number }[]; pits: unknown[]; hazards: unknown[] },
  stats: { hp: number; energyMax: number }[],
): WorldState {
  const perTeam = new Map<number, number>();
  const robots: RobotView[] = config.robots.map((cfg, i) => {
    const idx = perTeam.get(cfg.team) ?? 0;
    perTeam.set(cfg.team, idx + 1);
    const spawnIdx = idx === 0 ? Math.min(cfg.team, 1) : Math.min(1 + idx, arena.spawns.length - 1);
    const sp = arena.spawns[spawnIdx] ?? { x: 0, y: 0, angle: 0 };
    const s = stats[i]!;
    return {
      x: sp.x,
      y: sp.y,
      angle: sp.angle,
      vx: 0,
      vy: 0,
      av: 0,
      z: 0,
      flipAngle: 0,
      inverted: false,
      alive: true,
      hp: Math.round(s.hp * (cfg.hpMul ?? 1)),
      energy: s.energyMax,
      falling: 0,
      weaponPhase: 0,
      weaponTimer: 0,
      rpm: 0,
      weaponActive: false,
      cooldown: 0,
      held: false,
      burning: false,
      smoke: false,
      shield: false,
      boosting: false,
      lifted: false,
      immobile: 0,
      righting: 0,
      speed: 0,
      driveHealth: 1,
      weaponHealth: 1,
      specialCooldown: 0,
    };
  });
  return {
    tick: 0,
    time: 0,
    timeLeft: config.durationSec,
    robots,
    houses: [],
    hazards: arena.hazards.map(() => ({ phase: 1, progress: 0 })),
    pits: arena.pits.map(() => false),
    props: [],
    ended: false,
    winnerTeam: -1,
    scores: [0, 0],
  };
}
