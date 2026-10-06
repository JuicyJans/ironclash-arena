/**
 * Balance simulator: runs thousands of headless AI-vs-AI matches.
 *   npm run sim                 – default run
 *   npm run sim -- --matches 40 – matches per pairing
 *   npm run sim -- --write      – also writes docs/SIM_RESULTS.md
 */
import { writeFileSync } from 'node:fs';
import { CAMPAIGN } from '../src/config/campaign';
import { makeBuild } from '../src/config/presets';
import type { RobotBuild, WeaponType } from '../src/config/types';
import { WEAPON_TYPES } from '../src/config/weapons';
import { MatchSim } from '../src/core/match/matchSim';
import type { MatchRobotConfig } from '../src/core/match/types';
import { validateBuild } from '../src/core/robot/computeStats';
import { expectedPlayerBuild } from '../src/core/campaign/expectedBuild';

const args = process.argv.slice(2);
const arg = (name: string, def: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const MATCHES = arg('matches', 20);
const WRITE = args.includes('--write');
const ARENAS = ['workshop', 'foundry', 'icefactory', 'colosseum'];
const cos = { primary: '#888888', secondary: '#222222', led: '#22D3EE', decal: 'none' as const };

interface Outcome {
  winner: number;
  duration: number;
  reason: string;
}

export function runMatch(
  a: MatchRobotConfig[],
  b: MatchRobotConfig[],
  arenaId: string,
  seed: number,
): Outcome {
  const sim = new MatchSim({
    arenaId,
    seed,
    durationSec: 150,
    hazards: true,
    houseRobots: true,
    mode: 'sim',
    robots: [...a.map((r) => ({ ...r, team: 0 })), ...b.map((r) => ({ ...r, team: 1 }))],
  });
  while (!sim.ended) sim.step();
  const out = {
    winner: sim.result?.winnerTeam ?? -1,
    duration: sim.time,
    reason: sim.result?.reason ?? 'draw',
  };
  sim.destroy();
  return out;
}

/** Comparable mid-game build for a weapon: same chassis and part levels. */
function weaponBuild(w: WeaponType): RobotBuild {
  for (const armor of [3, 2, 1]) {
    const b = makeBuild({
      name: w,
      chassis: 'medium',
      armor: ['balanced', armor],
      drive: ['wheels', 3],
      weapon: [w, 3],
      power: ['capacity', 3],
      cosmetics: cos,
    });
    if (validateBuild(b).ok) return b;
  }
  throw new Error(`No legal build for ${w}`);
}

const ai = (build: RobotBuild): MatchRobotConfig => ({
  build,
  team: 0,
  controller: 'ai',
  ai: 'standard',
  difficulty: 'normal',
});

function pairStats(builds: Record<string, RobotBuild>, label: string) {
  const ids = Object.keys(builds);
  const wins: Record<string, number> = {};
  const games: Record<string, number> = {};
  const matrix: Record<string, Record<string, number>> = {};
  let totalDur = 0;
  let total = 0;
  const reasons: Record<string, number> = {};
  let seed = 1;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const A = ids[i]!;
      const B = ids[j]!;
      let aWins = 0;
      for (let m = 0; m < MATCHES; m++) {
        const swap = m % 2 === 1;
        const arena = ARENAS[m % ARENAS.length]!;
        const o = runMatch([ai(builds[swap ? B : A]!)], [ai(builds[swap ? A : B]!)], arena, seed++);
        const aWon = o.winner === (swap ? 1 : 0);
        const bWon = o.winner === (swap ? 0 : 1);
        if (aWon) aWins++;
        wins[A] = (wins[A] ?? 0) + (aWon ? 1 : o.winner < 0 ? 0.5 : 0);
        wins[B] = (wins[B] ?? 0) + (bWon ? 1 : o.winner < 0 ? 0.5 : 0);
        games[A] = (games[A] ?? 0) + 1;
        games[B] = (games[B] ?? 0) + 1;
        totalDur += o.duration;
        total++;
        reasons[o.reason] = (reasons[o.reason] ?? 0) + 1;
      }
      (matrix[A] ??= {})[B] = aWins / MATCHES;
      (matrix[B] ??= {})[A] = 1 - aWins / MATCHES;
    }
  }
  const rows = ids
    .map((id) => ({ id, rate: (wins[id] ?? 0) / Math.max(1, games[id] ?? 1) }))
    .sort((x, y) => y.rate - x.rate);
  let md = `### ${label}\n\n| Build | Win rate | Best matchup | Worst matchup |\n|---|---|---|---|\n`;
  for (const r of rows) {
    const vs = Object.entries(matrix[r.id] ?? {}).sort((a, b) => b[1] - a[1]);
    const best = vs[0];
    const worst = vs[vs.length - 1];
    md += `| ${r.id} | ${(r.rate * 100).toFixed(1)} % | ${best ? `${best[0]} ${(best[1] * 100).toFixed(0)} %` : '-'} | ${worst ? `${worst[0]} ${(worst[1] * 100).toFixed(0)} %` : '-'} |\n`;
  }
  md += `\nMatches: ${total}, average duration ${(totalDur / total).toFixed(1)} s, outcomes: ${Object.entries(
    reasons,
  )
    .map(([k, v]) => `${k} ${((v / total) * 100).toFixed(0)} %`)
    .join(', ')}\n\n`;
  const over = rows.filter((r) => r.rate > 0.6);
  return { md, over, rows };
}

function variantBuilds() {
  const out: Record<string, RobotBuild> = {};
  const weapons: WeaponType[] = ['wedge', 'flipper', 'hSpinner', 'hammer'];
  const variants: Record<string, (w: WeaponType) => RobotBuild> = {
    'armor:balanced': (w) =>
      makeBuild({
        name: 'a',
        chassis: 'medium',
        armor: ['balanced', 2],
        drive: ['wheels', 3],
        weapon: [w, 3],
        power: ['capacity', 3],
        cosmetics: cos,
      }),
    'armor:frontHeavy': (w) =>
      makeBuild({
        name: 'b',
        chassis: 'medium',
        armor: ['frontHeavy', 2],
        drive: ['wheels', 3],
        weapon: [w, 3],
        power: ['capacity', 3],
        cosmetics: cos,
      }),
    'drive:tracks': (w) =>
      makeBuild({
        name: 'c',
        chassis: 'medium',
        armor: ['balanced', 2],
        drive: ['tracks', 2],
        weapon: [w, 3],
        power: ['capacity', 3],
        cosmetics: cos,
      }),
    'drive:shuffler': (w) =>
      makeBuild({
        name: 'd',
        chassis: 'medium',
        armor: ['balanced', 1],
        drive: ['shuffler', 2],
        weapon: [w, 3],
        power: ['capacity', 3],
        cosmetics: cos,
      }),
    'power:regen': (w) =>
      makeBuild({
        name: 'e',
        chassis: 'medium',
        armor: ['balanced', 2],
        drive: ['wheels', 3],
        weapon: [w, 3],
        power: ['regen', 3],
        cosmetics: cos,
      }),
  };
  for (const [k, f] of Object.entries(variants)) {
    for (const w of weapons) {
      const b = f(w);
      if (!validateBuild(b).ok) throw new Error(`illegal ${k} ${w}`);
    }
    out[k] = f('hammer');
  }
  return { out, variants, weapons };
}

function variantStats() {
  const { variants, weapons } = variantBuilds();
  const ids = Object.keys(variants);
  const wins: Record<string, number> = {};
  const games: Record<string, number> = {};
  let seed = 50000;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      for (let m = 0; m < MATCHES; m++) {
        const w = weapons[m % weapons.length]!;
        const A = ids[i]!;
        const B = ids[j]!;
        const swap = m % 2 === 1;
        const o = runMatch(
          [ai(variants[swap ? B : A]!(w))],
          [ai(variants[swap ? A : B]!(w))],
          ARENAS[m % 4]!,
          seed++,
        );
        const aWon = o.winner === (swap ? 1 : 0);
        wins[A] = (wins[A] ?? 0) + (aWon ? 1 : o.winner < 0 ? 0.5 : 0);
        wins[B] = (wins[B] ?? 0) + (!aWon && o.winner >= 0 ? 1 : o.winner < 0 ? 0.5 : 0);
        games[A] = (games[A] ?? 0) + 1;
        games[B] = (games[B] ?? 0) + 1;
      }
    }
  }
  let md = '### Upgrade variants (mirror weapons)\n\n| Variant | Win rate |\n|---|---|\n';
  const rows = ids
    .map((id) => ({ id, rate: (wins[id] ?? 0) / (games[id] ?? 1) }))
    .sort((a, b) => b.rate - a.rate);
  for (const r of rows) md += `| ${r.id} | ${(r.rate * 100).toFixed(1)} % |\n`;
  return { md: md + '\n', over: rows.filter((r) => r.rate > 0.6) };
}

function campaignStats() {
  let md =
    '### Campaign levels (expected player build, Normal)\n\n| Level | Opponent | Player win rate | Verdict |\n|---|---|---|---|\n';
  const problems: string[] = [];
  let seed = 90000;
  for (const level of CAMPAIGN) {
    const player = expectedPlayerBuild(level.id);
    let won = 0;
    const n = Math.max(MATCHES, 10);
    for (let m = 0; m < n; m++) {
      const opp = level.opponents.map((o) => ({
        build: o.mirror ? player : o.build,
        team: 1,
        controller: 'ai' as const,
        ai: o.ai,
        difficulty: 'normal' as const,
        hpMul: o.hpMul,
      }));
      const o = runMatch([{ ...ai(player), ai: 'standard' }], opp, level.arena, seed++);
      if (o.winner === 0) won++;
    }
    const rate = won / n;
    const verdict = rate < 0.2 ? 'too hard' : rate > 0.92 ? 'trivial' : 'ok';
    if (verdict !== 'ok' && level.id !== 'c01') problems.push(`${level.id} ${verdict}`);
    md += `| ${level.id} | ${level.opponents.map((o) => o.build.name).join(' + ')} | ${(rate * 100).toFixed(0)} % | ${verdict} |\n`;
  }
  return { md: md + '\n', problems };
}

const weaponBuilds = Object.fromEntries(WEAPON_TYPES.map((w) => [w, weaponBuild(w)]));
const t0 = Date.now();
const w = pairStats(weaponBuilds, 'Weapons (equal medium builds, level 3 parts)');
const v = variantStats();
const c = campaignStats();
const report = `## Balance simulation\n\n_Generated by \`npm run sim\` with ${MATCHES} matches per pairing (${((Date.now() - t0) / 1000).toFixed(0)} s)._\n\n${w.md}${v.md}${c.md}`;
console.log(report);
const issues = [
  ...w.over.map((r) => `weapon ${r.id} > 60 %`),
  ...v.over.map((r) => `variant ${r.id} > 60 %`),
  ...c.problems,
];
console.log(issues.length ? `ISSUES:\n- ${issues.join('\n- ')}` : 'All balance targets met.');
if (WRITE) writeFileSync('docs/SIM_RESULTS.md', report);
