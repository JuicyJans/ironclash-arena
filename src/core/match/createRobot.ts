import { computeRobotStats } from '../robot/computeStats';
import { createScore, createStatus, createWeaponState, NO_INPUT, type RobotEntity } from '../entities/robot';
import { CAT, createBody, type PhysicsWorld } from '../physics/world';
import type { MatchRobotConfig } from './types';

/** Instantiates a robot entity and its physics body from a build. */
export function createRobot(
  id: number,
  cfg: MatchRobotConfig,
  spawn: { x: number; y: number; angle: number },
  world: PhysicsWorld,
): RobotEntity {
  const stats = computeRobotStats(cfg.build);
  const maxHp = Math.round(stats.hp * (cfg.hpMul ?? 1));
  const body = createBody(world, {
    x: spawn.x,
    y: spawn.y,
    angle: spawn.angle,
    w: stats.size.w,
    h: stats.size.h,
    mass: stats.weight,
    label: `robot:${id}`,
    category: CAT.robot,
  });
  return {
    id,
    team: cfg.team,
    name: cfg.build.name,
    build: cfg.build,
    stats,
    controller: cfg.controller,
    aiProfile: cfg.ai,
    difficulty: cfg.difficulty,
    playerIndex: cfg.playerIndex ?? -1,
    body,
    radius: (stats.size.w + stats.size.h) / 4,
    hp: Math.max(1, Math.round(maxHp * (cfg.hpFraction ?? 1))),
    maxHp,
    energy: stats.energyMax,
    z: 0,
    vz: 0,
    airTime: 0,
    launchPower: 0,
    willFlip: false,
    launchedBy: -1,
    flipAngle: 0,
    inverted: false,
    rightTimer: 0,
    weapon: createWeaponState(),
    support: stats.support.map((s) => ({ module: s.module, level: s.level, cooldown: 0 })),
    driveHealth: 1,
    weaponHealth: 1,
    thresholdsPassed: 0,
    status: createStatus(),
    immobileTimer: 0,
    mobility: { x: spawn.x, y: spawn.y, angle: spawn.angle, t: 0 },
    alive: true,
    score: createScore(),
    input: { ...NO_INPUT },
    prevInput: { ...NO_INPUT },
    lastAttacker: -1,
    lastAttackerTick: -1e9,
    contacts: [],
    speed: 0,
  };
}
