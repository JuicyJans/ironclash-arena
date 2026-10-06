import { BALANCE } from '../../config/balance';
import { CHASSIS } from '../../config/chassis';
import type {
  DriveType,
  PartDef,
  RobotBuild,
  RobotStats,
  StatBlock,
  SupportModule,
  WeaponType,
} from '../../config/types';
import { getPart, MAX_SUPPORT_SLOTS } from '../../config/upgrades';

const ARMOR_KEYS = ['armorFront', 'armorSide', 'armorRear', 'armorTop'] as const;

function levelOf(part: PartDef, level: number) {
  const lv = part.levels[Math.min(Math.max(level, 1), part.levels.length) - 1];
  if (!lv) throw new Error(`Part ${part.id} has no level ${level}`);
  return lv;
}

/** All part refs of a build in a fixed order (support capped at MAX_SUPPORT_SLOTS). */
export function buildParts(build: RobotBuild) {
  return [build.armor, build.drive, build.weapon, build.power, ...build.support.slice(0, MAX_SUPPORT_SLOTS)];
}

/**
 * Pure function: chassis + parts → final stats.
 * Additive mods are summed first, then multiplicative mods are applied.
 * Weight is never scaled. A loaded robot loses up to 12% top speed.
 */
export function computeRobotStats(build: RobotBuild): RobotStats {
  const chassis = CHASSIS[build.chassis];
  if (!chassis) throw new Error(`Unknown chassis: ${build.chassis}`);
  const stats: StatBlock = { ...chassis.base };
  const muls: Partial<Record<keyof StatBlock, number>> = {};

  for (const ref of buildParts(build)) {
    const lv = levelOf(getPart(ref.id), ref.level);
    for (const [k, v] of Object.entries(lv.mods.add ?? {}) as [keyof StatBlock, number][]) stats[k] += v;
    for (const [k, v] of Object.entries(lv.mods.mul ?? {}) as [keyof StatBlock, number][]) {
      muls[k] = (muls[k] ?? 1) * v;
    }
  }
  for (const [k, v] of Object.entries(muls) as [keyof StatBlock, number][]) {
    if (k !== 'weight') stats[k] *= v;
  }

  for (const k of ARMOR_KEYS) stats[k] = Math.min(Math.max(stats[k], 0), BALANCE.damage.armorCap);
  stats.grip = Math.min(Math.max(stats.grip, 0.05), 0.98);
  stats.flipResist = Math.min(Math.max(stats.flipResist, 0), 0.85);
  stats.cooldown = Math.max(stats.cooldown, 0);
  stats.energyCost = Math.max(stats.energyCost, 0);
  stats.selfRight = Math.max(stats.selfRight, 0);

  const loadRatio = Math.min(stats.weight / chassis.weightLimit, 1.2);
  stats.topSpeed *= 1 - 0.12 * loadRatio;

  const weaponPart = getPart(build.weapon.id);
  const drivePart = getPart(build.drive.id);
  const support = build.support.slice(0, MAX_SUPPORT_SLOTS).map((ref) => ({
    module: getPart(ref.id).kind as SupportModule,
    level: ref.level,
  }));

  return {
    ...stats,
    weightLimit: chassis.weightLimit,
    size: { ...chassis.size },
    weaponType: weaponPart.kind as WeaponType,
    driveType: drivePart.kind as DriveType,
    support,
  };
}

export interface BuildValidation {
  ok: boolean;
  overweight: number;
  errors: ('overweight' | 'wrongCategory' | 'duplicateSupport' | 'tooManySupport')[];
}

export function validateBuild(build: RobotBuild): BuildValidation {
  const errors: BuildValidation['errors'] = [];
  const stats = computeRobotStats(build);
  const overweight = Math.max(0, stats.weight - stats.weightLimit);
  if (overweight > 0) errors.push('overweight');
  const slots: [keyof RobotBuild, string][] = [
    ['armor', 'armor'],
    ['drive', 'drive'],
    ['weapon', 'weapon'],
    ['power', 'power'],
  ];
  for (const [slot, cat] of slots) {
    const ref = build[slot] as { id: string };
    if (getPart(ref.id).category !== cat) errors.push('wrongCategory');
  }
  if (build.support.some((s) => getPart(s.id).category !== 'support')) errors.push('wrongCategory');
  if (new Set(build.support.map((s) => s.id)).size !== build.support.length) errors.push('duplicateSupport');
  if (build.support.length > MAX_SUPPORT_SLOTS) errors.push('tooManySupport');
  return { ok: errors.length === 0, overweight, errors };
}

/** Total credit value of the parts in a build (used for repair costs and fair-mode budgets). */
export function buildValue(build: RobotBuild): number {
  let total = CHASSIS[build.chassis]?.price ?? 0;
  for (const ref of buildParts(build)) {
    const part = getPart(ref.id);
    for (let l = 1; l <= ref.level; l++) total += part.levels[l - 1]?.price ?? 0;
  }
  return total;
}
