import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { PRESETS } from '../../src/config/presets';
import { MatchSim } from '../../src/core/match/matchSim';
import { captureState } from '../../src/core/match/worldState';
import { build, place, run, sim } from './helpers';

const fwd = { throttle: 1, steer: 0, weapon: false, special: false, boost: false };

function fingerprint(s: MatchSim): string {
  return s.robots
    .map((r) => `${r.body.position.x.toFixed(3)},${r.body.position.y.toFixed(3)},${r.hp.toFixed(3)}`)
    .join('|');
}

describe('MatchSim', () => {
  it('is deterministic: same seed + inputs → identical state', () => {
    const make = () =>
      new MatchSim({
        arenaId: 'colosseum',
        seed: 1234,
        durationSec: 150,
        hazards: true,
        houseRobots: true,
        mode: 'sim',
        robots: [
          { build: PRESETS[1]!, team: 0, controller: 'ai', ai: 'standard' },
          { build: PRESETS[2]!, team: 1, controller: 'ai', ai: 'champion' },
        ],
      });
    const a = make();
    const b = make();
    for (let i = 0; i < 1200; i++) {
      a.step();
      b.step();
    }
    expect(fingerprint(a)).toBe(fingerprint(b));
    expect(JSON.stringify(captureState(a))).toBe(JSON.stringify(captureState(b)));
  });

  it('drives a human robot with inputs and counts time', () => {
    const s = sim([{}, {}]);
    const x0 = s.robots[0]!.body.position.x;
    run(s, 60, { 0: fwd });
    expect(s.robots[0]!.body.position.x).toBeGreaterThan(x0 + 100);
    expect(s.time).toBeCloseTo(1, 5);
    expect(s.timeLeft).toBeCloseTo(149, 5);
  });

  it('counts out an immobile robot after 10 s', () => {
    const s = sim([{}, {}]);
    let ko = '';
    s.events.on('ko', (e) => (ko = e.reason));
    // Robot 0 keeps moving in circles, robot 1 stands still.
    run(s, 60 * (BALANCE.immobile.countdownSec + BALANCE.immobile.mobilityWindowSec + 0.5), {
      0: { ...fwd, steer: 1, throttle: 0.6 },
    });
    expect(ko).toBe('immobile');
    expect(s.ended).toBe(true);
    expect(s.result?.winnerTeam).toBe(0);
    expect(s.result?.reason).toBe('ko');
  });

  it('a robot over the open pit falls in and loses', async () => {
    const s = sim([{}, {}], { hazards: true });
    s.pitOpen[0] = true;
    await place(s, 1, 935, 605);
    run(s, 2, { 0: fwd });
    expect(s.robots[1]!.alive).toBe(false);
    expect(s.robots[1]!.koReason).toBe('pit');
    expect(s.result?.reason).toBe('pit');
  });

  it('pit button opens the pit early', async () => {
    const s = sim([{}, { controller: 'dummy' }], { hazards: true });
    await place(s, 0, 100, 700);
    run(s, 40);
    expect(s.pitOpen[0]).toBe(true);
  });

  it('time-out goes to the judges (aggression and damage count)', () => {
    const s = sim([{}, {}], { durationSec: 3 });
    s.robots[0]!.score.damageDealt = 50;
    run(s, 60 * 3 + 2, { 0: { ...fwd, steer: 1, throttle: 0.5 }, 1: { ...fwd, steer: -1, throttle: 0.5 } });
    expect(s.ended).toBe(true);
    expect(s.result?.reason).toBe('judges');
    expect(s.result?.winnerTeam).toBe(0);
  });

  it('flippers launch, can flip, and flipped robots can self-right', async () => {
    const s = sim([{ build: build('flipper', 'medium', 5) }, { build: build('wedge', 'light', 1) }]);
    let launched = 0;
    s.events.on('launched', () => launched++);
    await place(s, 0, 500, 400, 0);
    await place(s, 1, 575, 400, 0);
    s.step({ 0: { ...fwd, throttle: 0, weapon: true } });
    run(s, 40);
    expect(launched).toBe(1);
    const victim = s.robots[1]!;
    run(s, 90);
    expect(victim.z).toBe(0);
    if (victim.inverted) {
      run(s, 60 * 5, { 1: { ...fwd, throttle: 0, weapon: true } });
      expect(victim.inverted).toBe(false);
    }
  });

  it('spinners spin up, hit and recoil; hammers stun; crushers grab', async () => {
    for (const [weapon, hold] of [
      ['hSpinner', true],
      ['hammer', false],
      ['crusher', false],
      ['saw', true],
      ['lance', false],
      ['flamethrower', true],
      ['magnet', true],
      ['drum', true],
      ['wedge', false],
    ] as const) {
      const s = sim([
        { build: build(weapon, 'medium', 3) },
        { build: build('wedge', 'medium', 1), controller: 'dummy' },
      ]);
      await place(s, 0, 500, 400, 0);
      await place(s, 1, 590, 400, 0);
      let hits = 0;
      s.events.on('damage', (e) => e.sourceId === 0 && hits++);
      for (let i = 0; i < 150; i++)
        s.step({ 0: { ...fwd, throttle: 0.2, weapon: hold ? true : i % 50 === 0 } });
      run(s, 15);
      expect(hits, weapon).toBeGreaterThan(0);
    }
  });

  it('house robots punish robots lingering in their corner', async () => {
    const s = sim([{ controller: 'dummy' }, { controller: 'dummy' }], { houseRobots: true });
    let attacks = 0;
    s.events.on('houseAttack', () => attacks++);
    await place(s, 0, 1150, 70);
    run(s, 60 * 6);
    expect(attacks).toBeGreaterThan(0);
  });

  it('2v1: match ends only when the whole team is out', () => {
    const s = sim([{ team: 0 }, { team: 1 }, { team: 1 }]);
    s.ko(s.robots[1]!, 'destroyed', 0);
    s.step();
    expect(s.ended).toBe(false);
    s.ko(s.robots[2]!, 'destroyed', 0);
    s.step();
    expect(s.ended).toBe(true);
    expect(s.result?.winnerTeam).toBe(0);
  });

  it('forfeit gives a walkover', () => {
    const s = sim([{}, {}]);
    s.forfeit(1);
    expect(s.result?.reason).toBe('walkover');
    expect(s.result?.winnerTeam).toBe(0);
  });

  it('warm-up freezes AI, clock and immobility', () => {
    const s = sim([{}, { controller: 'ai', ai: 'berserker' }]);
    s.warmup = true;
    run(s, 60 * 15);
    expect(s.time).toBe(0);
    expect(s.robots[0]!.alive).toBe(true);
    s.warmup = false;
    run(s, 10);
    expect(s.time).toBeGreaterThan(0);
  });

  it('AI vs AI matches finish with a result', () => {
    const s = new MatchSim({
      arenaId: 'foundry',
      seed: 5,
      durationSec: 150,
      hazards: true,
      houseRobots: true,
      mode: 'sim',
      robots: [
        { build: PRESETS[3]!, team: 0, controller: 'ai', ai: 'bruiser' },
        { build: PRESETS[4]!, team: 1, controller: 'ai', ai: 'berserker' },
      ],
    });
    while (!s.ended) s.step();
    expect(s.result).not.toBeNull();
    expect(s.result!.durationSec).toBeLessThanOrEqual(150.1);
    s.destroy();
  });
});
