import type { ArenaDef } from './types';
import { WORKSHOP } from './arenas/workshop';
import { FOUNDRY } from './arenas/foundry';
import { ICEFACTORY } from './arenas/icefactory';
import { COLOSSEUM } from './arenas/colosseum';
import { SCRAPYARD } from './arenas/scrapyard';

/** All arenas (one file each in ./arenas). Coordinates are world units, (0,0) = top-left of the floor. */
export const ARENAS: Record<string, ArenaDef> = {
  workshop: WORKSHOP,
  foundry: FOUNDRY,
  icefactory: ICEFACTORY,
  colosseum: COLOSSEUM,
  scrapyard: SCRAPYARD,
};

export const ARENA_IDS = Object.keys(ARENAS);

export function getArena(id: string): ArenaDef {
  const a = ARENAS[id];
  if (!a) throw new Error(`Unknown arena: ${id}`);
  return a;
}
