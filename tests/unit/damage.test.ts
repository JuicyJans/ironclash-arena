import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { computeDamage, hitSide } from '../../src/core/combat/damage';
import { place, run, sim } from './helpers';

describe('directional damage', () => {
  it('detects front, side and rear hits', () => {
    const t = { angle: 0, x: 0, y: 0 };
    expect(hitSide(t, 10, 0)).toBe('front');
    expect(hitSide(t, 0, 10)).toBe('side');
    expect(hitSide(t, -10, 0)).toBe('rear');
    expect(hitSide({ angle: Math.PI, x: 0, y: 0 }, -10, 0)).toBe('front');
  });

  it('rear and side hits hurt more than front hits', () => {
    const front = computeDamage(100, 'front', 0, false);
    const side = computeDamage(100, 'side', 0, false);
    const rear = computeDamage(100, 'rear', 0, false);
    expect(side).toBeGreaterThan(front);
    expect(rear).toBeGreaterThan(side);
  });

  it('armour and shields reduce damage; armour is capped', () => {
    expect(computeDamage(100, 'front', 0.3, false)).toBeLessThan(computeDamage(100, 'front', 0, false));
    expect(computeDamage(100, 'front', 0, true)).toBeCloseTo(
      computeDamage(100, 'front', 0, false) * (1 - BALANCE.support.shieldDamageReduction),
    );
    expect(computeDamage(100, 'front', 5, false)).toBeCloseTo(
      computeDamage(100, 'front', BALANCE.damage.armorCap, false),
    );
    expect(computeDamage(-5, 'front', 0, false)).toBe(0);
  });
});

describe('applyDamage via MatchSim', () => {
  it('tracks scores, emits events, damages components and KOs', () => {
    const s = sim([{}, {}]);
    const [a, b] = s.robots;
    const events: string[] = [];
    s.events.on('damage', () => events.push('damage'));
    s.events.on('componentDamaged', () => events.push('component'));
    s.events.on('ko', () => events.push('ko'));
    s.damage({
      target: b!,
      amount: 40,
      side: 'rear',
      source: 'hammer',
      sourceId: a!.id,
      x: 0,
      y: 0,
      force: 10,
    });
    expect(b!.hp).toBeLessThan(b!.maxHp);
    expect(a!.score.damageDealt).toBeGreaterThan(0);
    expect(b!.lastAttacker).toBe(a!.id);
    for (let i = 0; i < 100 && b!.alive; i++)
      s.damage({
        target: b!,
        amount: 40,
        side: 'rear',
        source: 'hammer',
        sourceId: a!.id,
        x: 0,
        y: 0,
        force: 10,
      });
    expect(b!.alive).toBe(false);
    expect(b!.koReason).toBe('destroyed');
    expect(b!.thresholdsPassed).toBe(BALANCE.damage.componentThresholds.length);
    expect(events).toContain('damage');
    expect(events).toContain('ko');
  });

  it('silent (continuous) damage is batched into periodic events', () => {
    const s = sim([{}, {}]);
    let count = 0;
    s.events.on('damage', () => count++);
    for (let i = 0; i < 12; i++) {
      s.damage({
        target: s.robots[1]!,
        amount: 1,
        side: 'front',
        source: 'saw',
        sourceId: 0,
        x: 0,
        y: 0,
        force: 0,
        silent: true,
      });
      s.step();
    }
    expect(count).toBe(1);
  });

  it('a dummy never loses HP', async () => {
    const s = sim([{}, { controller: 'dummy' }], { mode: 'practice' });
    s.damage({
      target: s.robots[1]!,
      amount: 9999,
      side: 'rear',
      source: 'hammer',
      sourceId: 0,
      x: 0,
      y: 0,
      force: 1,
    });
    expect(s.robots[1]!.alive).toBe(true);
    expect(s.robots[1]!.hp).toBe(s.robots[1]!.maxHp);
    await place(s, 1, 600, 400);
    run(s, 60);
    expect(s.ended).toBe(false);
  });
});
