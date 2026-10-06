/**
 * Balance simulator: runs thousands of headless AI-vs-AI matches across all CPU cores.
 *   npm run sim                         – full run (weapons, upgrade variants, campaign)
 *   npm run sim -- --matches 40         – matches per pairing
 *   npm run sim -- --only weapons       – weapons | variants | campaign
 *   npm run sim -- --write              – also writes docs/SIM_RESULTS.md
 */
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { Worker } from 'node:worker_threads';
import { CAMPAIGN } from '../src/config/campaign';
import { makeBuild } from '../src/config/presets';
import type { RobotBuild, WeaponType } from '../src/config/types';
import { WEAPON_TYPES } from '../src/config/weapons';
import { expectedPlayerBuild } from '../src/core/campaign/expectedBuild';
import type { MatchRobotConfig } from '../src/core/match/types';
import { validateBuild } from '../src/core/robot/computeStats';
import type { SimJob, SimOutcome } from './simWorker';

const args = process.argv.slice(2);
const argValue = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const MATCHES = Number(argValue('matches') ?? 20);
const ONLY = argValue('only');
const WRITE = args.includes('--write');
const ARENAS = ['workshop', 'foundry', 'icefactory', 'colosseum'];
const MAX_WINRATE = 0.6;
const cos = { primary: '#888888', secondary: '#222222', led: '#22D3EE', decal: 'none' as const };

/** Runs jobs across CPU cores using worker threads (results keep the job order). */
async function runAll(jobs: SimJob[]): Promise<SimOutcome[]> {
  const n = Math.max(1, Math.min(cpus().length - 1, 12));
  const chunks: { idx: number[]; jobs: SimJob[] }[] = Array.from({ length: n }, () => ({
    idx: [],
    jobs: [],
  }));
  jobs.forEach((j, i) => {
    chunks[i % n]!.idx.push(i);
    chunks[i % n]!.jobs.push(j);
  });
  const out: SimOutcome[] = new Array(jobs.length);
  await Promise.all(
    chunks.map(
      (chunk) =>
        new Promise<void>((resolve, reject) => {
          if (chunk.jobs.length === 0) return resolve();
          const w = new Worker(new URL('./simWorker.ts', import.meta.url), {
            workerData: chunk.jobs,
            execArgv: ['--import', 'tsx'],
          });
          w.once('message', (m: SimOutcome[]) => {
            m.forEach((o, k) => (out[chunk.idx[k]!] = o));
            void w.terminate();
            resolve();
          });
          w.once('error', reject);
        }),
    ),
  );
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

const ai = (build: RobotBuild, profile = 'standard'): MatchRobotConfig => ({
  build,
  team: 0,
  controller: 'ai',
  ai: profile,
  difficulty: 'normal',
});

interface Pairing {
  a: string;
  b: string;
  jobs: number[]; // indices into the job list
  swapped: boolean[];
}

/** Round-robin of named entries; each pairing plays MATCHES games alternating sides and arenas. */
function roundRobin(
  ids: string[],
  make: (id: string, m: number) => MatchRobotConfig[],
  seedBase: number,
  jobs: SimJob[],
): Pairing[] {
  const pairings: Pairing[] = [];
  let seed = seedBase;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const p: Pairing = { a: ids[i]!, b: ids[j]!, jobs: [], swapped: [] };
      for (let m = 0; m < MATCHES; m++) {
        const swap = m % 2 === 1;
        p.jobs.push(jobs.length);
        p.swapped.push(swap);
        jobs.push({
          a: make(swap ? p.b : p.a, m),
          b: make(swap ? p.a : p.b, m),
          arenaId: ARENAS[m % ARENAS.length]!,
          seed: seed++,
        });
      }
      pairings.push(p);
    }
  }
  return pairings;
}

function tally(pairings: Pairing[], results: SimOutcome[], label: string) {
  const wins: Record<string, number> = {};
  const games: Record<string, number> = {};
  const matrix: Record<string, Record<string, number>> = {};
  const reasons: Record<string, number> = {};
  let dur = 0;
  let total = 0;
  for (const p of pairings) {
    let aWins = 0;
    p.jobs.forEach((ji, k) => {
      const o = results[ji]!;
      const aTeam = p.swapped[k] ? 1 : 0;
      const aWon = o.winner === aTeam;
      const draw = o.winner < 0;
      if (aWon) aWins++;
      wins[p.a] = (wins[p.a] ?? 0) + (aWon ? 1 : draw ? 0.5 : 0);
      wins[p.b] = (wins[p.b] ?? 0) + (!aWon && !draw ? 1 : draw ? 0.5 : 0);
      games[p.a] = (games[p.a] ?? 0) + 1;
      games[p.b] = (games[p.b] ?? 0) + 1;
      reasons[o.reason] = (reasons[o.reason] ?? 0) + 1;
      dur += o.duration;
      total++;
    });
    (matrix[p.a] ??= {})[p.b] = aWins / p.jobs.length;
    (matrix[p.b] ??= {})[p.a] = 1 - aWins / p.jobs.length;
  }
  const rows = Object.keys(games)
    .map((id) => ({ id, rate: (wins[id] ?? 0) / (games[id] ?? 1) }))
    .sort((x, y) => y.rate - x.rate);
  let md = `### ${label}\n\n| Build | Win rate | Best matchup | Worst matchup |\n|---|---|---|---|\n`;
  for (const r of rows) {
    const vs = Object.entries(matrix[r.id] ?? {}).sort((a, b) => b[1] - a[1]);
    const best = vs[0];
    const worst = vs[vs.length - 1];
    md += `| ${r.id} | ${(r.rate * 100).toFixed(1)} % | ${best ? `${best[0]} ${(best[1] * 100).toFixed(0)} %` : '-'} | ${worst ? `${worst[0]} ${(worst[1] * 100).toFixed(0)} %` : '-'} |\n`;
  }
  const outcome = Object.entries(reasons)
    .map(([k, v]) => `${k} ${((v / total) * 100).toFixed(0)} %`)
    .join(', ');
  md += `\nMatches: ${total}, average duration ${(dur / total).toFixed(1)} s, outcomes: ${outcome}\n\n`;
  return { md, over: rows.filter((r) => r.rate > MAX_WINRATE) };
}

const VARIANT_WEAPONS: WeaponType[] = ['wedge', 'flipper', 'hSpinner', 'hammer'];
const VARIANTS: Record<string, (w: WeaponType) => RobotBuild> = {
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

async function main() {
  const t0 = Date.now();
  const jobs: SimJob[] = [];
  const weaponIds = WEAPON_TYPES as string[];
  const doW = !ONLY || ONLY === 'weapons';
  const doV = !ONLY || ONLY === 'variants';
  const doC = !ONLY || ONLY === 'campaign';
  const wPairs = doW ? roundRobin(weaponIds, (id) => [ai(weaponBuild(id as WeaponType))], 1, jobs) : [];
  for (const [k, f] of Object.entries(VARIANTS))
    for (const w of VARIANT_WEAPONS) if (!validateBuild(f(w)).ok) throw new Error(`illegal ${k} ${w}`);
  const vPairs = doV
    ? roundRobin(
        Object.keys(VARIANTS),
        (id, m) => [ai(VARIANTS[id]!(VARIANT_WEAPONS[m % VARIANT_WEAPONS.length]!))],
        50000,
        jobs,
      )
    : [];
  const campaignJobs: { level: string; idx: number[] }[] = [];
  if (doC) {
    let seed = 90000;
    const n = Math.max(MATCHES, 10);
    for (const level of CAMPAIGN) {
      const player = expectedPlayerBuild(level.id);
      const entry = { level: level.id, idx: [] as number[] };
      for (let m = 0; m < n; m++) {
        entry.idx.push(jobs.length);
        jobs.push({
          a: [ai(player)],
          b: level.opponents.map((o) => ({
            build: o.mirror ? player : o.build,
            team: 1,
            controller: 'ai' as const,
            ai: o.ai,
            difficulty: 'normal' as const,
            hpMul: o.hpMul,
          })),
          arenaId: level.arena,
          seed: seed++,
        });
      }
      campaignJobs.push(entry);
    }
  }

  const results = await runAll(jobs);
  const w = doW
    ? tally(wPairs, results, 'Weapons (equal medium builds, level 3 parts)')
    : { md: '', over: [] };
  const v = doV ? tally(vPairs, results, 'Upgrade variants (mirror weapons)') : { md: '', over: [] };
  let cmd = '';
  const problems: string[] = [];
  if (doC) {
    cmd =
      '### Campaign levels (expected player build, Normal)\n\n| Level | Opponent | Player win rate | Avg. duration | Verdict |\n|---|---|---|---|---|\n';
    for (const c of campaignJobs) {
      const level = CAMPAIGN.find((l) => l.id === c.level)!;
      const outs = c.idx.map((i) => results[i]!);
      const rate = outs.filter((o) => o.winner === 0).length / outs.length;
      const dur = outs.reduce((s, o) => s + o.duration, 0) / outs.length;
      const verdict = rate < 0.25 ? 'too hard' : rate > 0.9 ? 'trivial' : 'ok';
      if (verdict !== 'ok' && !level.tutorial) problems.push(`${level.id} ${verdict}`);
      cmd += `| ${level.id} | ${level.opponents.map((o) => o.build.name).join(' + ')} | ${(rate * 100).toFixed(0)} % | ${dur.toFixed(0)} s | ${verdict} |\n`;
    }
    cmd += '\n';
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  const report = `## Balance simulation\n\n_Generated by \`npm run sim\`: ${jobs.length} matches, ${MATCHES} per pairing, ${secs} s._\n\n${w.md}${v.md}${cmd}`;
  console.log(report);
  const issues = [
    ...w.over.map((r) => `weapon ${r.id} > 60 %`),
    ...v.over.map((r) => `variant ${r.id} > 60 %`),
    ...problems,
  ];
  console.log(issues.length ? `ISSUES:\n- ${issues.join('\n- ')}` : 'All balance targets met.');
  if (WRITE) writeFileSync('docs/SIM_RESULTS.md', report);
}

void main();
