import { describe, expect, it } from 'vitest';
import { AI_PROFILES, scaledProfile } from '../../src/config/aiProfiles';
import { BLOCKED, createGrid, dangerAt, updateDangerGrid } from '../../src/core/ai/dangerMap';
import { computeFlowField, flowWaypoint } from '../../src/core/ai/flowField';
import { predict, steerTo } from '../../src/core/ai/steering';
import { chooseAction, scoreActions, type Situation } from '../../src/core/ai/utility';
import { getArena } from '../../src/config/arenas';
import { place, run, sim } from './helpers';

const base: Situation = {
  dist: 300,
  myHp: 1,
  enemyHp: 1,
  energy: 1,
  inverted: false,
  danger: 0,
  enemyFacingMe: 0,
  enemyThreat: 0.5,
  enemyNearHazard: 0,
  nearEdge: 0,
  beingPushed: false,
  weaponReady: true,
  grabbed: false,
  hasShield: false,
  hasSmoke: false,
  enemyInverted: false,
  enemyWindingUp: false,
  enemyRearWeak: 0,
};
const P = AI_PROFILES.standard!;
const best = (s: Partial<Situation>) => chooseAction(scoreActions({ ...base, ...s }, P), 'attack', 0);

describe('utility AI decisions', () => {
  it('defaults to attacking', () => expect(best({})).toBe('attack'));
  it('self-rights when inverted', () => expect(best({ inverted: true })).toBe('selfRight'));
  it('avoids imminent hazards', () => expect(best({ danger: 1 })).toBe('avoidHazard'));
  it('escapes being pushed into a wall/pit', () =>
    expect(best({ beingPushed: true, nearEdge: 1 })).toBe('avoidWall'));
  it('lures enemies into hazards', () =>
    expect(
      chooseAction(scoreActions({ ...base, enemyNearHazard: 1 }, { ...P, hazardUse: 1 }), 'attack', 0),
    ).toBe('lureHazard'));
  it('flanks dangerous fronts', () =>
    expect(
      chooseAction(
        scoreActions(
          { ...base, enemyFacingMe: 1, enemyThreat: 1, dist: 200 },
          { ...P, flanking: 1, aggression: 0.3 },
        ),
        'attack',
        0,
      ),
    ).toBe('flank'));
  it('retreats to recharge when drained and cautious', () =>
    expect(
      chooseAction(
        scoreActions(
          { ...base, energy: 0.05, myHp: 0.2, enemyHp: 0.9 },
          { ...P, caution: 1, aggression: 0.1 },
        ),
        'attack',
        0,
      ),
    ).toBe('retreat'));
  it('uses a shield pulse when grabbed', () =>
    expect(best({ grabbed: true, hasShield: true })).toBe('useSpecial'));
  it('hysteresis keeps the current action on near-ties', () => {
    const scores = {
      attack: 1,
      flank: 1.05,
      avoidHazard: 0,
      lureHazard: 0,
      retreat: 0,
      selfRight: 0,
      avoidWall: 0,
      useSpecial: 0,
    };
    expect(chooseAction(scores, 'attack')).toBe('attack');
    expect(chooseAction(scores, 'attack', 0)).toBe('flank');
  });

  it('difficulty changes behaviour parameters, not stats', () => {
    const easy = scaledProfile(P, 'easy');
    const hard = scaledProfile(P, 'mechanic');
    expect(easy.reactionMs).toBeGreaterThan(hard.reactionMs);
    expect(easy.precision).toBeLessThan(hard.precision);
    expect(easy.mistakeRate).toBeGreaterThan(hard.mistakeRate);
  });
});

describe('navigation', () => {
  it('steers towards goals and reverses for close goals behind', () => {
    const ahead = steerTo({ x: 0, y: 0 }, 0, { x: 100, y: 0 });
    expect(ahead.throttle).toBeGreaterThan(0.9);
    expect(Math.abs(ahead.steer)).toBeLessThan(0.01);
    const right = steerTo({ x: 0, y: 0 }, 0, { x: 0, y: 100 });
    expect(right.steer).toBeGreaterThan(0);
    const behind = steerTo({ x: 0, y: 0 }, 0, { x: -100, y: 1 }, { reverse: true });
    expect(behind.throttle).toBeLessThan(0);
    const arrive = steerTo({ x: 0, y: 0 }, 0, { x: 5, y: 0 }, { arrive: 100, face: Math.PI / 2 });
    expect(arrive.throttle).toBe(0);
    expect(predict({ x: 0, y: 0, vx: 10, vy: -10 }, 2)).toEqual({ x: 20, y: -20 });
  });

  it('flow field routes around blocked cells', () => {
    const g = createGrid(getArena('workshop'));
    // Wall of blocked cells with a gap at the bottom.
    for (let y = 0; y < g.rows - 2; y++) g.cost[y * g.cols + 10] = BLOCKED;
    const field = computeFlowField(g, 15 * g.cell, 2 * g.cell);
    const wp = flowWaypoint(g, field, 5 * g.cell, 2 * g.cell, 1);
    expect(wp.y).toBeGreaterThan(2 * g.cell);
  });

  it('flow field stays fast with huge costs (float precision regression)', () => {
    const g = createGrid(getArena('colosseum'));
    for (let i = 0; i < g.cost.length; i++) g.cost[i] = i % 3 === 0 ? 999_999.7 : 1 + (i % 7) * 13.37;
    const t0 = performance.now();
    computeFlowField(g, 800, 500);
    expect(performance.now() - t0).toBeLessThan(100);
  });

  it('danger map marks open pits as blocked and imminent hazards as costly', () => {
    const s = sim([{}, {}], { hazards: true });
    s.pitOpen[0] = true;
    const g = createGrid(s.arena);
    updateDangerGrid(g, s, 30);
    expect(dangerAt(g, 935, 605)).toBeGreaterThanOrEqual(BLOCKED);
    expect(dangerAt(g, 600, 400)).toBeLessThan(10);
  });
});

describe('AI brain in a match', () => {
  it('moves towards the enemy, reacts with delay and exposes debug info', async () => {
    const s = sim([{ controller: 'ai', ai: 'berserker' }, { controller: 'dummy' }]);
    await place(s, 0, 200, 400, 0);
    await place(s, 1, 900, 400, 0);
    run(s, 90);
    const brain = s.ais.get(0)!;
    expect(s.robots[0]!.body.position.x).toBeGreaterThan(300);
    expect(brain.debug.targetId).toBe(1);
    expect(brain.currentAction).toBeDefined();
  });

  it('a flipped AI tries to self-right', async () => {
    const s = sim([{ controller: 'ai', ai: 'standard' }, { controller: 'dummy' }]);
    s.robots[0]!.inverted = true;
    run(s, 5);
    expect(s.robots[0]!.input.weapon).toBe(true);
    expect(s.ais.get(0)!.debug.action).toBe('selfRight');
  });
});
