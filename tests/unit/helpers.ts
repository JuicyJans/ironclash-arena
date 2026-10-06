import { makeBuild } from '../../src/config/presets';
import type { RobotBuild, WeaponType } from '../../src/config/types';
import { MatchSim } from '../../src/core/match/matchSim';
import type { MatchConfig, MatchRobotConfig } from '../../src/core/match/types';

export const cos = { primary: '#888888', secondary: '#222222', led: '#22D3EE', decal: 'none' as const };

export function build(
  weapon: WeaponType = 'wedge',
  chassis: 'light' | 'medium' | 'heavy' = 'medium',
  level = 2,
): RobotBuild {
  return makeBuild({
    name: `T-${weapon}`,
    chassis,
    armor: ['balanced', 1],
    drive: ['wheels', level],
    weapon: [weapon, level],
    power: ['capacity', level],
    cosmetics: cos,
  });
}

export function sim(robots: Partial<MatchRobotConfig>[], patch: Partial<MatchConfig> = {}): MatchSim {
  return new MatchSim({
    arenaId: 'workshop',
    seed: 42,
    durationSec: 150,
    hazards: false,
    houseRobots: false,
    mode: 'sim',
    robots: robots.map(
      (r, i) => ({ build: build(), team: i, controller: 'human', ...r }) as MatchRobotConfig,
    ),
    ...patch,
  });
}

export function run(s: MatchSim, ticks: number, inputs: Parameters<MatchSim['step']>[0] = {}): void {
  for (let i = 0; i < ticks; i++) s.step(inputs);
}

/** Moves a robot body to a position/angle (test setup). */
export async function place(s: MatchSim, id: number, x: number, y: number, angle = 0): Promise<void> {
  const Matter = (await import('matter-js')).default;
  const r = s.robots[id]!;
  Matter.Body.setPosition(r.body, { x, y });
  Matter.Body.setAngle(r.body, angle);
  Matter.Body.setVelocity(r.body, { x: 0, y: 0 });
  r.mobility = { x, y, angle, t: 0 };
}
