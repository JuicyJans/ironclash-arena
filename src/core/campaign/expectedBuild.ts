import { EXPECTED_PROGRESS } from '../../config/campaign';
import { DEFAULT_COSMETICS, makeBuild } from '../../config/presets';
import type { RobotBuild } from '../../config/types';
import { validateBuild } from '../robot/computeStats';

/** The build a progressing player is expected to have at `levelId` (for balance checks). */
export function expectedPlayerBuild(levelId: string): RobotBuild {
  const row = EXPECTED_PROGRESS[levelId];
  if (!row) throw new Error(`No expected progress for ${levelId}`);
  const [chassis, armor, drive, driveLv, weapon, weaponLv, powerLv, support] = row;
  for (let a = armor; a >= 1; a--) {
    const build = makeBuild({
      name: 'Player',
      chassis: chassis as 'light' | 'medium' | 'heavy',
      armor: ['balanced', a],
      drive: [drive, driveLv],
      weapon: [weapon, weaponLv],
      power: ['capacity', powerLv],
      support,
      cosmetics: DEFAULT_COSMETICS,
    });
    if (validateBuild(build).ok) return build;
  }
  throw new Error(`Expected build for ${levelId} is overweight`);
}
