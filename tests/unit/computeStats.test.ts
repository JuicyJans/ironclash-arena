import { describe, expect, it } from 'vitest';
import { CHASSIS } from '../../src/config/chassis';
import { makeBuild, PRESETS, STARTER_BUILD } from '../../src/config/presets';
import { PARTS } from '../../src/config/upgrades';
import { WEAPON_TYPES } from '../../src/config/weapons';
import { buildValue, computeRobotStats, validateBuild } from '../../src/core/robot/computeStats';
import { build, cos } from './helpers';

describe('computeRobotStats', () => {
  it('computes the starter robot', () => {
    const s = computeRobotStats(STARTER_BUILD);
    expect(s.weaponType).toBe('wedge');
    expect(s.driveType).toBe('wheels');
    expect(s.weightLimit).toBe(CHASSIS.light!.weightLimit);
    expect(s.hp).toBeGreaterThan(200);
    expect(s.topSpeed).toBeGreaterThan(200);
    expect(s.weight).toBeLessThanOrEqual(s.weightLimit);
  });

  it('higher part levels improve their stats', () => {
    const a = computeRobotStats(build('hammer', 'medium', 1));
    const b = computeRobotStats(build('hammer', 'medium', 4));
    expect(b.damage).toBeGreaterThan(a.damage);
    expect(b.cooldown).toBeLessThan(a.cooldown);
    expect(b.topSpeed).toBeGreaterThan(a.topSpeed);
    expect(b.energyMax).toBeGreaterThan(a.energyMax);
  });

  it('front-heavy armour shifts protection to the front', () => {
    const even = computeRobotStats(
      makeBuild({
        name: 'a',
        chassis: 'medium',
        armor: ['balanced', 3],
        drive: ['wheels', 1],
        weapon: ['wedge', 1],
        power: ['capacity', 1],
        cosmetics: cos,
      }),
    );
    const front = computeRobotStats(
      makeBuild({
        name: 'b',
        chassis: 'medium',
        armor: ['frontHeavy', 3],
        drive: ['wheels', 1],
        weapon: ['wedge', 1],
        power: ['capacity', 1],
        cosmetics: cos,
      }),
    );
    expect(front.armorFront).toBeGreaterThan(even.armorFront);
    expect(front.armorRear).toBeLessThan(even.armorRear);
  });

  it('clamps armour at the cap', () => {
    const s = computeRobotStats(
      makeBuild({
        name: 'x',
        chassis: 'heavy',
        armor: ['frontHeavy', 5],
        drive: ['tracks', 1],
        weapon: ['wedge', 1],
        power: ['capacity', 1],
        cosmetics: cos,
      }),
    );
    expect(s.armorFront).toBeLessThanOrEqual(0.6);
  });

  it('support modules contribute (self-right, anchor, sensor)', () => {
    const s = computeRobotStats(
      makeBuild({
        name: 's',
        chassis: 'heavy',
        armor: ['balanced', 1],
        drive: ['wheels', 1],
        weapon: ['wedge', 1],
        power: ['capacity', 1],
        support: [
          ['selfRight', 3],
          ['magnetAnchor', 2],
        ],
        cosmetics: cos,
      }),
    );
    expect(s.selfRight).toBeGreaterThan(0);
    expect(s.flipResist).toBeGreaterThan(0);
    expect(s.support.map((m) => m.module)).toEqual(['selfRight', 'magnetAnchor']);
  });

  it('throws on unknown chassis or part', () => {
    expect(() => computeRobotStats({ ...STARTER_BUILD, chassis: 'nope' })).toThrow();
    expect(() => computeRobotStats({ ...STARTER_BUILD, weapon: { id: 'weapon_laser', level: 1 } })).toThrow();
  });

  it('every weapon has a legal level-1 medium build', () => {
    for (const w of WEAPON_TYPES) expect(validateBuild(build(w, 'medium', 1)).ok, w).toBe(true);
  });

  it('every part has five levels with rising prices (data integrity)', () => {
    for (const p of PARTS) {
      expect(p.levels.length, p.id).toBeGreaterThanOrEqual(5);
      for (let i = 1; i < p.levels.length; i++)
        expect(p.levels[i]!.price).toBeGreaterThanOrEqual(p.levels[i - 1]!.price);
    }
  });
});

describe('validateBuild', () => {
  it('flags overweight builds', () => {
    const heavy = makeBuild({
      name: 'fat',
      chassis: 'light',
      armor: ['balanced', 5],
      drive: ['shuffler', 5],
      weapon: ['crusher', 5],
      power: ['capacity', 5],
      cosmetics: cos,
    });
    const v = validateBuild(heavy);
    expect(v.ok).toBe(false);
    expect(v.errors).toContain('overweight');
    expect(v.overweight).toBeGreaterThan(0);
  });

  it('flags wrong categories and duplicate support', () => {
    const bad = {
      ...STARTER_BUILD,
      armor: { id: 'weapon_saw', level: 1 },
      support: [
        { id: 'support_sensor', level: 1 },
        { id: 'support_sensor', level: 1 },
      ],
    };
    const v = validateBuild(bad);
    expect(v.errors).toContain('wrongCategory');
    expect(v.errors).toContain('duplicateSupport');
  });

  it('all presets are legal', () => {
    for (const p of PRESETS) expect(validateBuild(p).ok, p.name).toBe(true);
  });
});

describe('buildValue', () => {
  it('counts every owned level', () => {
    expect(buildValue(STARTER_BUILD)).toBe(0);
    expect(buildValue(build('hammer', 'medium', 2))).toBeGreaterThan(
      buildValue(build('hammer', 'medium', 1)),
    );
  });
});
