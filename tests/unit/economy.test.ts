import { describe, expect, it } from 'vitest';
import { getLevel } from '../../src/config/campaign';
import { ECONOMY, levelPrice } from '../../src/config/economy';
import { getPart } from '../../src/config/upgrades';
import { computeRewards, computeStars } from '../../src/core/economy/rewards';
import {
  buyChassis,
  buyNext,
  canBuyNext,
  equip,
  equipChassis,
  isUnlocked,
  loadoutToBuild,
  nextLevelCost,
  repair,
  repairCost,
  sellPart,
  sellValue,
  spentOn,
} from '../../src/core/economy/shop';
import type { MatchResult } from '../../src/core/match/types';
import { defaultProfile } from '../../src/core/save/defaults';
import type { Profile } from '../../src/core/save/schema';

const rich = (p: Profile = defaultProfile()): Profile => ({ ...p, credits: 1e6, scrap: 100 });
const cleared = (p: Profile, ...ids: string[]): Profile => ({
  ...p,
  campaign: { levels: Object.fromEntries(ids.map((id) => [id, { stars: 1, bestTime: 50, wins: 1 }])) },
});

describe('shop', () => {
  it('prices follow the curve', () => {
    expect(levelPrice(1000, 1)).toBe(1000);
    expect(levelPrice(1000, 3)).toBe(1800);
    expect(nextLevelCost(defaultProfile(), 'armor_balanced')?.price).toBe(
      getPart('armor_balanced').levels[1]!.price,
    );
  });

  it('buys, upgrades and reports errors', () => {
    const p = defaultProfile();
    expect(canBuyNext({ ...p, credits: 0 }, 'weapon_saw')).toBe('credits');
    expect(canBuyNext(p, 'weapon_flipper')).toBe('locked');
    const r = buyNext(p, 'weapon_saw');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.inventory.weapon_saw).toBe(1);
    expect(r.profile.credits).toBe(p.credits - getPart('weapon_saw').levels[0]!.price);
    let q = rich(r.profile);
    for (let i = 0; i < 4; i++) {
      const u = buyNext(q, 'weapon_saw');
      if (u.ok) q = u.profile;
    }
    expect(q.inventory.weapon_saw).toBe(5);
    expect(canBuyNext(q, 'weapon_saw')).toBe('maxed');
    expect(
      canBuyNext({ ...cleared(defaultProfile(), 'c08'), credits: 1e6, scrap: 0 }, 'weapon_crusher'),
    ).toBe('scrap');
  });

  it('unlocks follow campaign progress', () => {
    expect(isUnlocked(defaultProfile(), undefined)).toBe(true);
    expect(isUnlocked(defaultProfile(), 'c02')).toBe(false);
    expect(isUnlocked(cleared(defaultProfile(), 'c02'), 'c02')).toBe(true);
  });

  it('equips parts, respects weight and support slots', () => {
    let p = rich(cleared(defaultProfile(), 'c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c07', 'c08'));
    for (const id of ['weapon_crusher', 'support_selfRight', 'support_sensor', 'support_shieldPulse']) {
      const r = buyNext(p, id);
      if (r.ok) p = r.profile;
    }
    expect(equip(p, 0, 'weapon', 'weapon_laser').ok).toBe(false);
    const e1 = equip(p, 0, 'support', 'support_selfRight');
    expect(e1.ok).toBe(true);
    if (e1.ok) p = e1.profile;
    const e2 = equip(p, 0, 'support', 'support_sensor');
    if (e2.ok) p = e2.profile;
    const e3 = equip(p, 0, 'support', 'support_shieldPulse');
    expect(e3.ok).toBe(false);
    if (!e3.ok) expect(['slots', 'overweight']).toContain(e3.error);
    // Toggle off
    const off = equip(p, 0, 'support', 'support_selfRight');
    expect(off.ok && off.profile.loadouts[0]!.support.includes('support_selfRight')).toBe(false);
  });

  it('chassis can be bought and equipped', () => {
    let p = rich(cleared(defaultProfile(), 'c02'));
    const b = buyChassis(p, 'medium');
    expect(b.ok).toBe(true);
    if (b.ok) p = b.profile;
    expect(buyChassis(p, 'medium').ok).toBe(false);
    expect(buyChassis(p, 'heavy').ok).toBe(false);
    const e = equipChassis(p, 0, 'medium');
    expect(e.ok && e.profile.loadouts[0]!.chassis).toBe('medium');
    expect(equipChassis(p, 0, 'heavy').ok).toBe(false);
  });

  it('sells for 60 % and refuses equipped parts', () => {
    let p = rich();
    const r = buyNext(p, 'weapon_saw');
    if (r.ok) p = r.profile;
    expect(sellPart(p, 'weapon_wedge').ok).toBe(false);
    expect(sellValue(p, 'weapon_saw')).toBe(Math.floor(spentOn(p, 'weapon_saw') * ECONOMY.sellRatio));
    const s = sellPart(p, 'weapon_saw');
    expect(s.ok).toBe(true);
    if (s.ok) {
      expect(s.profile.inventory.weapon_saw).toBeUndefined();
      expect(s.profile.credits).toBe(p.credits + sellValue(p, 'weapon_saw'));
    }
    expect(sellPart(p, 'weapon_drum').ok).toBe(false);
  });

  it('repairs cost money proportional to damage', () => {
    const p = { ...rich(), damage: [0.5, 0, 0] };
    expect(repairCost(p, 1)).toBe(0);
    expect(repairCost(p, 0)).toBeGreaterThanOrEqual(ECONOMY.repair.minimum);
    const r = repair(p, 0);
    expect(r.ok && r.profile.damage[0]).toBe(0);
    expect(repair({ ...p, credits: 0 }, 0).ok).toBe(false);
    expect(loadoutToBuild(p, p.loadouts[0]!).weapon.level).toBe(1);
  });
});

const result = (patch: Partial<MatchResult> = {}): MatchResult => ({
  winnerTeam: 0,
  reason: 'ko',
  durationSec: 40,
  judgeScores: [10, 5],
  robots: [
    { id: 0, team: 0, hpFraction: 0.98, damageDealt: 300, damageTaken: 5, flips: 2, pits: 0 },
    {
      id: 1,
      team: 1,
      hpFraction: 0,
      damageDealt: 5,
      damageTaken: 300,
      flips: 0,
      pits: 0,
      koReason: 'destroyed',
    },
  ],
  ...patch,
});

describe('rewards', () => {
  it('stars', () => {
    expect(computeStars(false, 10, 60, 0)).toBe(0);
    expect(computeStars(true, 90, 60, 0)).toBe(1);
    expect(computeStars(true, 50, 60, 0.6)).toBe(2);
    expect(computeStars(true, 50, 60, 0.1)).toBe(3);
  });

  it('a perfect quick KO with first-win bonus pays well', () => {
    const level = getLevel('c04');
    const r = computeRewards({
      result: result(),
      playerTeam: 0,
      playerRobotId: 0,
      difficulty: 'normal',
      level,
      levelIndex: 3,
      firstWin: true,
      quickMatch: false,
    });
    expect(r.won).toBe(true);
    expect(r.stars).toBe(3);
    const keys = r.lines.map((l) => l.key);
    expect(keys).toEqual(expect.arrayContaining(['win', 'flips', 'ko', 'perfect', 'quick', 'firstWin']));
    expect(r.scrap).toBeGreaterThanOrEqual(level.scrapReward);
    const again = computeRewards({
      result: result(),
      playerTeam: 0,
      playerRobotId: 0,
      difficulty: 'normal',
      level,
      levelIndex: 3,
      firstWin: false,
      quickMatch: false,
    });
    expect(again.credits).toBeLessThan(r.credits);
  });

  it('losses pay a little; difficulty and quick-match scale rewards', () => {
    const loss = computeRewards({
      result: result({ winnerTeam: 1 }),
      playerTeam: 0,
      playerRobotId: 0,
      difficulty: 'normal',
      firstWin: false,
      quickMatch: false,
    });
    expect(loss.won).toBe(false);
    expect(loss.credits).toBe(ECONOMY.reward.lossBase);
    const hard = computeRewards({
      result: result({ winnerTeam: 1 }),
      playerTeam: 0,
      playerRobotId: 0,
      difficulty: 'mechanic',
      firstWin: false,
      quickMatch: false,
    });
    expect(hard.credits).toBeGreaterThan(loss.credits);
    const quick = computeRewards({
      result: result(),
      playerTeam: 0,
      playerRobotId: 0,
      difficulty: 'normal',
      firstWin: false,
      quickMatch: true,
    });
    const full = computeRewards({
      result: result(),
      playerTeam: 0,
      playerRobotId: 0,
      difficulty: 'normal',
      firstWin: false,
      quickMatch: false,
    });
    expect(quick.credits).toBeLessThan(full.credits);
  });
});
