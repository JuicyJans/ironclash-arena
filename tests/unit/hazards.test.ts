import { describe, expect, it } from 'vitest';
import { ARENAS } from '../../src/config/arenas';
import type { HazardDef } from '../../src/config/types';
import {
  hazardBounds,
  hazardContains,
  hazardOffset,
  hazardPhase,
  isDamaging,
  rotateAround,
} from '../../src/core/entities/hazards';
import { place, run, sim } from './helpers';

const spikes: HazardDef = {
  kind: 'spikes',
  id: 's',
  rect: { x: 0, y: 0, w: 50, h: 50 },
  damage: 10,
  launch: 100,
  period: 6,
  telegraph: 1,
  active: 0.5,
  randomPhase: true,
};

describe('hazard timing', () => {
  it('always idles first and telegraphs before every activation', () => {
    for (const seed of [1, 2, 3, 99, 12345]) {
      const off = hazardOffset(spikes, seed);
      let prev = 'idle';
      expect(hazardPhase(spikes, 0, off).phase).toBe('idle');
      for (let t = 0; t < 60; t += 1 / 60) {
        const p = hazardPhase(spikes, t, off).phase;
        if (p === 'active' && prev !== 'active') expect(prev).toBe('telegraph');
        prev = p;
      }
    }
  });

  it('is deterministic per seed and respects from/until windows', () => {
    expect(hazardOffset(spikes, 7)).toBe(hazardOffset(spikes, 7));
    const windowed: HazardDef = { ...spikes, from: 10, until: 20 };
    expect(hazardPhase(windowed, 5, 0).phase).toBe('off');
    expect(hazardPhase(windowed, 25, 0).phase).toBe('off');
    expect(hazardPhase(windowed, 15, 0).phase).not.toBe('off');
  });

  it('all arena hazards telegraph at least 0.75 s', () => {
    for (const a of Object.values(ARENAS)) {
      for (const h of a.hazards)
        if ('telegraph' in h) expect(h.telegraph, `${a.id}/${h.id}`).toBeGreaterThanOrEqual(0.75);
    }
  });

  it('geometry helpers', () => {
    const tt: HazardDef = { kind: 'turntable', id: 't', circle: { x: 0, y: 0, r: 10 }, angularSpeed: 1 };
    expect(hazardBounds(tt)).toEqual({ x: -10, y: -10, w: 20, h: 20 });
    expect(hazardContains(tt, { x: 12, y: 0 }, 3)).toBe(true);
    expect(hazardContains(spikes, { x: 60, y: 10 }, 5)).toBe(false);
    expect(isDamaging(tt)).toBe(false);
    expect(isDamaging(spikes)).toBe(true);
    const p = rotateAround({ x: 1, y: 0 }, { x: 0, y: 0 }, Math.PI / 2);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });
});

describe('hazards in a match', () => {
  it('lava burns, ice reduces grip, turntables rotate robots', async () => {
    const foundry = sim([{}, { controller: 'dummy' }], { arenaId: 'foundry', hazards: true });
    await place(foundry, 0, 300, 815);
    run(foundry, 30);
    expect(foundry.robots[0]!.hp).toBeLessThan(foundry.robots[0]!.maxHp);

    const ice = sim([{}, {}], { arenaId: 'icefactory', hazards: true });
    expect(ice.gripAt(400, 200)).toBeLessThan(0.5);
    expect(ice.gripAt(50, 850)).toBe(1);
    await place(ice, 0, 650 + 100, 450);
    const before = { ...ice.robots[0]!.body.position };
    run(ice, 30);
    const after = ice.robots[0]!.body.position;
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(5);
  });

  it('spikes launch robots and the pit opens on time', async () => {
    const s = sim([{ controller: 'dummy' }, { controller: 'dummy' }], { hazards: true });
    let launched = 0;
    s.events.on('launched', () => launched++);
    let opened = false;
    s.events.on('pitOpened', () => (opened = true));
    await place(s, 0, 425, 215);
    run(s, 60 * 61);
    expect(launched).toBeGreaterThan(0);
    expect(opened).toBe(true);
  });
});
