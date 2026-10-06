import { CHASSIS } from '../../config/chassis';
import { ECONOMY } from '../../config/economy';
import type { PartCategory, RobotBuild } from '../../config/types';
import { getPart, MAX_SUPPORT_SLOTS, PART_BY_ID } from '../../config/upgrades';
import { buildValue, validateBuild } from '../robot/computeStats';
import type { Loadout, Profile } from '../save/schema';

export type ShopError =
  'locked' | 'maxed' | 'credits' | 'scrap' | 'equipped' | 'notOwned' | 'overweight' | 'slots';

export type ShopResult = { ok: true; profile: Profile } | { ok: false; error: ShopError };

/** A campaign level counts as cleared once it has been won at least once. */
export const isCleared = (p: Profile, levelId: string): boolean =>
  (p.campaign.levels[levelId]?.wins ?? 0) > 0;

export function isUnlocked(p: Profile, unlockAfter: string | undefined): boolean {
  return !unlockAfter || isCleared(p, unlockAfter);
}

export const ownedLevel = (p: Profile, partId: string): number => p.inventory[partId] ?? 0;

export function nextLevelCost(p: Profile, partId: string): { price: number; scrap: number } | null {
  const part = getPart(partId);
  const lv = part.levels[ownedLevel(p, partId)];
  return lv ? { price: lv.price, scrap: lv.scrap } : null;
}

export function canBuyNext(p: Profile, partId: string): ShopError | null {
  const part = getPart(partId);
  if (!isUnlocked(p, part.unlockAfter)) return 'locked';
  const cost = nextLevelCost(p, partId);
  if (!cost) return 'maxed';
  if (p.credits < cost.price) return 'credits';
  if (p.scrap < cost.scrap) return 'scrap';
  return null;
}

export function buyNext(p: Profile, partId: string): ShopResult {
  const err = canBuyNext(p, partId);
  if (err) return { ok: false, error: err };
  const cost = nextLevelCost(p, partId)!;
  return {
    ok: true,
    profile: {
      ...p,
      credits: p.credits - cost.price,
      scrap: p.scrap - cost.scrap,
      inventory: { ...p.inventory, [partId]: ownedLevel(p, partId) + 1 },
    },
  };
}

export function canBuyChassis(p: Profile, id: string): ShopError | null {
  const c = CHASSIS[id];
  if (!c) return 'locked';
  if (p.chassis.includes(id)) return 'maxed';
  if (!isUnlocked(p, c.unlockAfter)) return 'locked';
  if (p.credits < c.price) return 'credits';
  if (p.scrap < c.scrap) return 'scrap';
  return null;
}

export function buyChassis(p: Profile, id: string): ShopResult {
  const err = canBuyChassis(p, id);
  if (err) return { ok: false, error: err };
  const c = CHASSIS[id]!;
  return {
    ok: true,
    profile: { ...p, credits: p.credits - c.price, scrap: p.scrap - c.scrap, chassis: [...p.chassis, id] },
  };
}

/** Credits spent on all owned levels of a part. */
export function spentOn(p: Profile, partId: string): number {
  const part = getPart(partId);
  let total = 0;
  for (let l = 0; l < ownedLevel(p, partId); l++) total += part.levels[l]?.price ?? 0;
  return total;
}

export const sellValue = (p: Profile, partId: string): number =>
  Math.floor(spentOn(p, partId) * ECONOMY.sellRatio);

const usesPart = (l: Loadout, partId: string) =>
  l.armor === partId ||
  l.drive === partId ||
  l.weapon === partId ||
  l.power === partId ||
  l.support.includes(partId);

/** Sells a part entirely for 60 % of what was paid. Equipped parts cannot be sold. */
export function sellPart(p: Profile, partId: string): ShopResult {
  if (ownedLevel(p, partId) === 0) return { ok: false, error: 'notOwned' };
  if (p.loadouts.some((l) => usesPart(l, partId))) return { ok: false, error: 'equipped' };
  const inventory = { ...p.inventory };
  delete inventory[partId];
  return { ok: true, profile: { ...p, credits: p.credits + sellValue(p, partId), inventory } };
}

/** Builds a playable robot from a loadout using the owned part levels. */
export function loadoutToBuild(p: Profile, l: Loadout): RobotBuild {
  const ref = (id: string) => ({ id, level: Math.max(1, ownedLevel(p, id)) });
  return {
    name: l.name,
    chassis: l.chassis,
    armor: ref(l.armor),
    drive: ref(l.drive),
    weapon: ref(l.weapon),
    power: ref(l.power),
    support: l.support.filter((id) => ownedLevel(p, id) > 0).map(ref),
    cosmetics: l.cosmetics,
  };
}

export type Slot = 'armor' | 'drive' | 'weapon' | 'power';

/** Returns the loadout with `partId` equipped (support toggles on/off). Does not validate weight. */
export function withPart(l: Loadout, category: PartCategory, partId: string): Loadout {
  if (category === 'support') {
    const has = l.support.includes(partId);
    return { ...l, support: has ? l.support.filter((s) => s !== partId) : [...l.support, partId] };
  }
  return { ...l, [category]: partId };
}

export function equip(p: Profile, index: number, category: PartCategory, partId: string): ShopResult {
  const l = p.loadouts[index];
  const part = PART_BY_ID[partId];
  if (!l || !part || part.category !== category) return { ok: false, error: 'notOwned' };
  if (ownedLevel(p, partId) === 0) return { ok: false, error: 'notOwned' };
  const next = withPart(l, category, partId);
  if (next.support.length > MAX_SUPPORT_SLOTS) return { ok: false, error: 'slots' };
  if (!validateBuild(loadoutToBuild(p, next)).ok) return { ok: false, error: 'overweight' };
  const loadouts = p.loadouts.map((x, i) => (i === index ? next : x));
  return { ok: true, profile: { ...p, loadouts } };
}

export function equipChassis(p: Profile, index: number, chassisId: string): ShopResult {
  const l = p.loadouts[index];
  if (!l || !p.chassis.includes(chassisId)) return { ok: false, error: 'notOwned' };
  const next = { ...l, chassis: chassisId };
  if (!validateBuild(loadoutToBuild(p, next)).ok) return { ok: false, error: 'overweight' };
  return { ok: true, profile: { ...p, loadouts: p.loadouts.map((x, i) => (i === index ? next : x)) } };
}

export function repairCost(p: Profile, index: number): number {
  const frac = p.damage[index] ?? 0;
  const l = p.loadouts[index];
  if (!l || frac <= 0) return 0;
  const value = buildValue(loadoutToBuild(p, l));
  return Math.max(ECONOMY.repair.minimum, Math.round(frac * value * ECONOMY.repair.perFractionOfValue));
}

export function repair(p: Profile, index: number): ShopResult {
  const cost = repairCost(p, index);
  if (cost === 0) return { ok: true, profile: p };
  if (p.credits < cost) return { ok: false, error: 'credits' };
  const damage = p.damage.map((d, i) => (i === index ? 0 : d));
  return { ok: true, profile: { ...p, credits: p.credits - cost, damage } };
}
