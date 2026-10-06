import { PRESETS } from '../config/presets';
import { loadoutToBuild } from '../core/economy/shop';
import { computeRobotStats, validateBuild } from '../core/robot/computeStats';
import type { Profile } from '../core/save/schema';
import { t } from '../i18n';
import type { RobotOption } from './components/Pickers';

const describe = (b: import('../config/types').RobotBuild) => {
  const s = computeRobotStats(b);
  return `${t(`parts.chassis.${b.chassis}`)} · ${t(`parts.weapon.${s.weaponType}.name`)}`;
};

/** The player's three loadouts (if legal) followed by all ready-made robots. */
export function robotOptions(profile: Profile | null, includePresets = true): RobotOption[] {
  const own: RobotOption[] = profile
    ? profile.loadouts
        .map((l, i) => ({ id: `own${i}`, build: loadoutToBuild(profile, l), label: `★ ${l.name}`, sub: '' }))
        .filter((o) => validateBuild(o.build).ok)
        .map((o) => ({ ...o, sub: describe(o.build) }))
    : [];
  const presets = includePresets
    ? PRESETS.map((b, i) => ({ id: `preset${i}`, build: b, label: b.name, sub: describe(b) }))
    : [];
  return [...own, ...presets];
}
