import { describe, expect, it } from 'vitest';
import { ARENAS } from '../../src/config/arenas';
import { CAMPAIGN, EXPECTED_PROGRESS, LEAGUES } from '../../src/config/campaign';
import { CHASSIS } from '../../src/config/chassis';
import { PARTS } from '../../src/config/upgrades';
import { expectedPlayerBuild } from '../../src/core/campaign/expectedBuild';
import {
  campaignMatchConfig,
  isLevelUnlocked,
  nextLevel,
  recordLevelResult,
  totalStars,
} from '../../src/core/campaign/progress';
import { validateBuild } from '../../src/core/robot/computeStats';
import { defaultProfile } from '../../src/core/save/defaults';
import { STARTER_BUILD } from '../../src/config/presets';

describe('campaign content', () => {
  it('has at least 12 levels across 4 leagues with a boss closing each league', () => {
    expect(CAMPAIGN.length).toBeGreaterThanOrEqual(12);
    for (const league of LEAGUES) {
      const levels = CAMPAIGN.filter((l) => l.league === league);
      expect(levels.length, league).toBeGreaterThanOrEqual(3);
      expect(levels[levels.length - 1]!.boss, league).toBe(true);
      expect(new Set(levels.map((l) => l.arena)).size).toBe(1);
    }
    expect(CAMPAIGN[0]!.tutorial).toBe(true);
  });

  it('every opponent build is legal and every level has expected progress', () => {
    for (const l of CAMPAIGN) {
      for (const o of l.opponents) expect(validateBuild(o.build).ok, `${l.id} ${o.build.name}`).toBe(true);
      expect(EXPECTED_PROGRESS[l.id], l.id).toBeDefined();
      expect(validateBuild(expectedPlayerBuild(l.id)).ok).toBe(true);
      expect(ARENAS[l.arena], l.arena).toBeDefined();
    }
  });

  it('unlock references point at real levels', () => {
    const ids = new Set(CAMPAIGN.map((l) => l.id));
    for (const p of PARTS) if (p.unlockAfter) expect(ids.has(p.unlockAfter), p.id).toBe(true);
    for (const c of Object.values(CHASSIS)) if (c.unlockAfter) expect(ids.has(c.unlockAfter)).toBe(true);
    for (const a of Object.values(ARENAS)) if (a.unlockAfter) expect(ids.has(a.unlockAfter)).toBe(true);
  });
});

describe('campaign progress', () => {
  it('unlocks levels in order and records stars', () => {
    let p = defaultProfile();
    expect(isLevelUnlocked(p, 'c01')).toBe(true);
    expect(isLevelUnlocked(p, 'c02')).toBe(false);
    expect(isLevelUnlocked(p, 'nope')).toBe(false);
    p = recordLevelResult(p, 'c01', false, 0, 80);
    expect(isLevelUnlocked(p, 'c02')).toBe(false);
    p = recordLevelResult(p, 'c01', true, 2, 70);
    p = recordLevelResult(p, 'c01', true, 1, 60);
    expect(p.campaign.levels.c01).toEqual({ stars: 2, bestTime: 60, wins: 2 });
    expect(isLevelUnlocked(p, 'c02')).toBe(true);
    expect(totalStars(p)).toBe(2);
    expect(nextLevel(p).id).toBe('c02');
  });

  it('builds match configs (mirror copies the player, bosses get a small HP bump on top difficulty)', () => {
    const mirror = campaignMatchConfig(
      CAMPAIGN.find((l) => l.id === 'c11')!,
      STARTER_BUILD,
      'normal',
      1,
      1,
    );
    expect(mirror.robots[1]!.build.weapon).toEqual(STARTER_BUILD.weapon);
    const boss = campaignMatchConfig(
      CAMPAIGN.find((l) => l.id === 'c04')!,
      STARTER_BUILD,
      'mechanic',
      0.5,
      1,
    );
    expect(boss.robots[1]!.hpMul).toBeGreaterThan(1);
    expect(boss.robots[0]!.hpFraction).toBe(0.5);
    const twin = campaignMatchConfig(
      CAMPAIGN.find((l) => l.id === 'c07')!,
      STARTER_BUILD,
      'normal',
      1,
      1,
    );
    expect(twin.robots.length).toBe(3);
  });
});
