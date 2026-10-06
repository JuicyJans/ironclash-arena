import { defaultProfile, starterLoadout } from './defaults';
import { SAVE_VERSION } from './schema';

type Raw = Record<string, unknown>;
type Migration = (data: Raw) => Raw;

/**
 * Migrations keyed by the version they upgrade *from*.
 * v1 (prototype) stored a single robot and `money` instead of credits/scrap/loadouts.
 */
export const MIGRATIONS: Record<number, Migration> = {
  1: (old) => {
    const base = defaultProfile();
    const robot = (old.robot as Raw | undefined) ?? undefined;
    const loadout = robot ? { ...starterLoadout('Rookie'), ...(robot as object) } : starterLoadout('Rookie');
    const now = Date.now();
    return {
      version: 2,
      createdAt: typeof old.createdAt === 'number' ? old.createdAt : now,
      updatedAt: now,
      profile: {
        ...base,
        credits: Math.max(0, Math.floor(Number(old.money ?? base.credits))),
        inventory: { ...base.inventory, ...((old.parts as Record<string, number> | undefined) ?? {}) },
        loadouts: [loadout, base.loadouts[1], base.loadouts[2]],
        campaign: { levels: (old.levels as Raw | undefined) ?? {} },
      },
    };
  },
};

export class MigrationError extends Error {}

/** Runs all migrations from the data's version up to SAVE_VERSION. */
export function migrate(data: unknown): { data: Raw; migrated: boolean } {
  if (typeof data !== 'object' || data === null) throw new MigrationError('Save is not an object');
  let current = data as Raw;
  let version = typeof current.version === 'number' ? current.version : 1;
  if (version > SAVE_VERSION) throw new MigrationError(`Save version ${version} is newer than this game`);
  const migrated = version < SAVE_VERSION;
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new MigrationError(`No migration from version ${version}`);
    current = step(current);
    version = current.version as number;
  }
  return { data: current, migrated };
}
