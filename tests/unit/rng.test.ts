import { describe, expect, it } from 'vitest';
import { Rng, hashSeed } from '../../src/core/rng';

describe('Rng (mulberry32)', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(123);
    const b = new Rng(123);
    const sa = Array.from({ length: 50 }, () => a.next());
    const sb = Array.from({ length: 50 }, () => b.next());
    expect(sa).toEqual(sb);
  });

  it('differs between seeds and stays in [0,1)', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    expect(a.next()).not.toEqual(b.next());
    const r = new Rng(9);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('supports ranges, ints, chance, gauss, pick and state save/restore', () => {
    const r = new Rng(77);
    for (let i = 0; i < 200; i++) {
      const v = r.int(3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      expect(r.range(-2, 2)).toBeLessThan(2);
    }
    expect(r.chance(0)).toBe(false);
    expect(r.chance(1)).toBe(true);
    expect(Math.abs(r.gauss())).toBeLessThan(5);
    expect(['a', 'b']).toContain(r.pick(['a', 'b']));
    expect(() => r.pick([])).toThrow();
    const saved = r.state;
    const x = r.next();
    r.state = saved;
    expect(r.next()).toBe(x);
  });

  it('hashSeed is stable', () => {
    expect(hashSeed('c01', 5)).toBe(hashSeed('c01', 5));
    expect(hashSeed('c01', 5)).not.toBe(hashSeed('c01', 6));
  });
});
