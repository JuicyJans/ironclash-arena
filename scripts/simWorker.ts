/** Worker thread for the balance simulator: runs a batch of headless matches. */
import { parentPort, workerData } from 'node:worker_threads';
import { MatchSim } from '../src/core/match/matchSim';
import type { MatchRobotConfig } from '../src/core/match/types';

export interface SimJob {
  a: MatchRobotConfig[];
  b: MatchRobotConfig[];
  arenaId: string;
  seed: number;
}

export interface SimOutcome {
  winner: number;
  duration: number;
  reason: string;
}

export function runMatch(job: SimJob): SimOutcome {
  const sim = new MatchSim({
    arenaId: job.arenaId,
    seed: job.seed,
    durationSec: 150,
    hazards: true,
    houseRobots: true,
    mode: 'sim',
    robots: [...job.a.map((r) => ({ ...r, team: 0 })), ...job.b.map((r) => ({ ...r, team: 1 }))],
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

if (parentPort && workerData) {
  const jobs = workerData as SimJob[];
  parentPort.postMessage(jobs.map(runMatch));
}
