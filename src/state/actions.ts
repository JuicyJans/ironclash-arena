import { ARENAS } from '../config/arenas';
import { BALANCE } from '../config/balance';
import { CAMPAIGN, getLevel } from '../config/campaign';
import { CHASSIS } from '../config/chassis';
import type { Difficulty, RobotBuild } from '../config/types';
import { PARTS } from '../config/upgrades';
import { audio } from '../audio/audioManager';
import { campaignMatchConfig, levelIndex, recordLevelResult } from '../core/campaign/progress';
import { computeRewards } from '../core/economy/rewards';
import { isCleared, loadoutToBuild, repairCost } from '../core/economy/shop';
import type { MatchConfig, MatchResult } from '../core/match/types';
import { buildValue, validateBuild } from '../core/robot/computeStats';
import type { Profile, SaveData, Settings } from '../core/save/schema';
import { SaveStore } from '../core/save/storage';
import { setLang, t } from '../i18n';
import { gameBridge } from './gameBridge';
import { store, type MatchSession, type Screen } from './store';

export const saveStore = new SaveStore(
  typeof localStorage !== 'undefined'
    ? localStorage
    : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
);

let toastId = 0;
export function toast(text: string, kind: 'info' | 'error' | 'success' = 'info'): void {
  const id = ++toastId;
  store.set({ toast: { id, text, kind } });
  setTimeout(() => {
    if (store.get().toast?.id === id) store.set({ toast: null });
  }, 3200);
}

export function go(screen: Screen): void {
  store.set({ screen });
}

export function applySettings(s: Settings): void {
  setLang(s.lang);
  const root = document.documentElement;
  root.dataset.cb = s.colorBlind;
  root.dataset.reduceMotion = String(s.reduceMotion);
  root.style.setProperty('--text-scale', String(s.textScale));
  audio.setVolumes(s.volume);
}

export function updateSettings(patch: Partial<Settings>): void {
  const settings = { ...store.get().settings, ...patch };
  store.set({ settings });
  saveStore.saveSettings(settings);
  applySettings(settings);
}

export function updateProfile(fn: (p: Profile) => Profile): void {
  const save = store.get().save;
  const next: SaveData = { ...save, profile: fn(save.profile) };
  store.set({ save: next });
  saveStore.save(next);
}

export function replaceSave(save: SaveData): void {
  store.set({ save, saveStatus: 'ok', saveError: undefined });
  saveStore.save(save);
}

const randomSeed = () => (crypto.getRandomValues(new Uint32Array(1))[0] ?? 1) >>> 0;

export function activeBuild(): { build: RobotBuild; index: number } {
  const p = store.get().save.profile;
  const index = p.activeLoadout;
  return { build: loadoutToBuild(p, p.loadouts[index]!), index };
}

function begin(session: MatchSession): void {
  store.set({ session, results: null, hud: null, paused: false });
  go('vs');
}

export function startCampaignLevel(levelId: string): void {
  const level = getLevel(levelId);
  const s = store.get();
  const { build, index } = activeBuild();
  if (!validateBuild(build).ok) {
    toast(t('garage.overweight'), 'error');
    go('garage');
    return;
  }
  const difficulty = s.save.profile.difficulty;
  const carry = s.settings.repairCosts || difficulty === 'mechanic';
  const hpFraction = carry ? Math.max(0.15, 1 - (s.save.profile.damage[index] ?? 0)) : 1;
  const config = campaignMatchConfig(level, build, difficulty, hpFraction, randomSeed());
  const session: MatchSession = {
    kind: 'campaign',
    config,
    levelId,
    loadoutIndex: index,
    humans: 1,
    localTeam: 0,
    attempt: 0,
  };
  if (level.introKey) {
    store.set({ session, cutscene: { key: level.introKey, speaker: 'host' } });
    return;
  }
  begin(session);
}

/** Called when the host's intro text is dismissed. */
export function endCutscene(): void {
  const s = store.get();
  store.set({ cutscene: null });
  if (s.screen === 'results') return;
  if (s.session) begin(s.session);
}

export interface QuickOptions {
  arenaId: string;
  opponent: RobotBuild;
  ai: string;
  difficulty: Difficulty;
}

export function startQuickMatch(o: QuickOptions): void {
  const { build, index } = activeBuild();
  if (!validateBuild(build).ok) {
    toast(t('garage.overweight'), 'error');
    return;
  }
  const config: MatchConfig = {
    arenaId: o.arenaId,
    seed: randomSeed(),
    durationSec: BALANCE.matchDurationSec,
    hazards: true,
    houseRobots: true,
    mode: 'quick',
    robots: [
      { build, team: 0, controller: 'human', playerIndex: 0 },
      { build: o.opponent, team: 1, controller: 'ai', ai: o.ai, difficulty: o.difficulty },
    ],
  };
  begin({ kind: 'quick', config, loadoutIndex: index, humans: 1, localTeam: 0, attempt: 0 });
}

/** Fair mode: compensates a budget gap with a bounded HP multiplier. */
export function fairHpMultipliers(a: RobotBuild, b: RobotBuild): [number, number] {
  const va = Math.max(1, buildValue(a));
  const vb = Math.max(1, buildValue(b));
  const avg = (va + vb) / 2;
  const f = (v: number) => Math.min(1.3, Math.max(0.75, Math.sqrt(avg / v)));
  return [f(va), f(vb)];
}

export function startLocalMatch(a: RobotBuild, b: RobotBuild, arenaId: string, fair: boolean): void {
  const [ma, mb] = fair ? fairHpMultipliers(a, b) : [1, 1];
  const config: MatchConfig = {
    arenaId,
    seed: randomSeed(),
    durationSec: BALANCE.matchDurationSec,
    hazards: true,
    houseRobots: true,
    mode: 'local',
    robots: [
      { build: a, team: 0, controller: 'human', playerIndex: 0, hpMul: ma },
      { build: b, team: 1, controller: 'human', playerIndex: 1, hpMul: mb },
    ],
  };
  begin({ kind: 'local', config, humans: 2, localTeam: 0, attempt: 0 });
}

export function startPractice(arenaId: string, hazards: boolean, dummy: RobotBuild): void {
  const { build } = activeBuild();
  const config: MatchConfig = {
    arenaId,
    seed: randomSeed(),
    durationSec: BALANCE.practiceDurationSec,
    hazards,
    houseRobots: hazards,
    mode: 'practice',
    robots: [
      { build, team: 0, controller: 'human', playerIndex: 0 },
      { build: dummy, team: 1, controller: 'dummy' },
    ],
  };
  store.set({
    session: { kind: 'practice', config, humans: 1, localTeam: 0, attempt: 0 },
    results: null,
    hud: null,
    paused: false,
  });
  go('match');
}

export function startOnlineMatch(config: MatchConfig, role: 'host' | 'guest'): void {
  const localTeam = role === 'host' ? 0 : 1;
  store.set({
    session: { kind: 'online', config, humans: 1, netRole: role, localTeam, attempt: 0 },
    results: null,
    hud: null,
    paused: false,
  });
  go('vs');
}

export function restartMatch(): void {
  const s = store.get().session;
  if (!s || s.kind === 'online') return;
  if (s.kind === 'campaign' && s.levelId) {
    startCampaignLevel(s.levelId);
    return;
  }
  const session = { ...s, config: { ...s.config, seed: randomSeed() }, attempt: s.attempt + 1 };
  store.set({ session, results: null, hud: null, paused: false });
  go(s.kind === 'practice' ? 'match' : 'vs');
}

export function quitMatch(): void {
  gameBridge.stopMatch();
  const kind = store.get().session?.kind;
  store.set({ session: null, hud: null, paused: false });
  go(kind === 'campaign' ? 'campaign' : 'menu');
}

/** Rewards, progression, carried damage and statistics after the final bell. */
export function finishMatch(result: MatchResult): void {
  const s = store.get();
  const session = s.session;
  if (!session) return;
  const playerId = session.config.robots.findIndex((r) => r.team === session.localTeam);
  const me = result.robots[playerId];
  const level = session.levelId ? getLevel(session.levelId) : undefined;
  let profile = s.save.profile;
  let rewards = null;
  const unlocks: string[] = [];
  const won = session.kind === 'local' ? null : result.winnerTeam === session.localTeam;

  if (session.kind === 'campaign' || session.kind === 'quick') {
    const firstWin = level ? !isCleared(profile, level.id) : false;
    rewards = computeRewards({
      result,
      playerTeam: session.localTeam,
      playerRobotId: playerId,
      difficulty: profile.difficulty,
      level,
      levelIndex: level ? levelIndex(level.id) : 0,
      firstWin,
      quickMatch: session.kind === 'quick',
    });
    profile = {
      ...profile,
      credits: profile.credits + rewards.credits,
      scrap: profile.scrap + rewards.scrap,
    };
    if (level) {
      const wasCleared = isCleared(profile, level.id);
      profile = recordLevelResult(profile, level.id, !!won, rewards.stars, result.durationSec);
      if (!wasCleared && won) {
        for (const p of PARTS) if (p.unlockAfter === level.id) unlocks.push(t(p.nameKey));
        for (const c of Object.values(CHASSIS)) if (c.unlockAfter === level.id) unlocks.push(t(c.nameKey));
        for (const a of Object.values(ARENAS)) if (a.unlockAfter === level.id) unlocks.push(t(a.nameKey));
        if (level.tutorial) profile = { ...profile, tutorialDone: true };
      }
    }
    const carry = s.settings.repairCosts || profile.difficulty === 'mechanic';
    if (carry && session.loadoutIndex !== undefined && me) {
      const lost = me.koReason ? 0.85 : 1 - me.hpFraction;
      profile = {
        ...profile,
        damage: profile.damage.map((d, i) => (i === session.loadoutIndex ? Math.min(0.85, lost) : d)),
      };
    }
  }
  if (me && session.kind !== 'practice') {
    const st = profile.stats;
    const enemyKo = result.robots.some((r) => r.team !== session.localTeam && r.koReason);
    profile = {
      ...profile,
      stats: {
        matches: st.matches + 1,
        wins: st.wins + (won ? 1 : 0),
        kos: st.kos + (won && enemyKo ? 1 : 0),
        flips: st.flips + me.flips,
        pits: st.pits + me.pits,
        damageDealt: st.damageDealt + Math.round(me.damageDealt),
      },
    };
  }
  updateProfile(() => profile);

  const winner = session.config.robots.find((r) => r.team === result.winnerTeam);
  store.set({
    results: {
      session,
      result,
      winnerName: winner ? winner.build.name : '',
      won,
      rewards,
      unlocks,
      repairCost: session.loadoutIndex !== undefined ? repairCost(profile, session.loadoutIndex) : 0,
    },
  });
  if (level?.outroKey && won && rewards && rewards.stars > 0)
    store.set({ cutscene: { key: level.outroKey, speaker: 'host' } });
  go('results');
}

export const campaignLevels = CAMPAIGN;
