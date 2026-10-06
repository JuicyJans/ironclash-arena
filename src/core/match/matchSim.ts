import type Matter from 'matter-js';
import { getArena } from '../../config/arenas';
import { BALANCE, DT } from '../../config/balance';
import type { ArenaDef } from '../../config/types';
import { inRect } from '../../utils/math';
import { createAi, type AiBrain } from '../ai/brain';
import { processCollisions, type BodyOwner } from '../combat/collisions';
import { applyDamage, type DamageHit } from '../combat/damage';
import { updateSupport } from '../combat/support';
import { updateWeapon } from '../combat/weapons';
import { EventBus, type KoReason } from '../events';
import { HazardSystem } from '../entities/hazardSystem';
import { HouseRobot } from '../entities/houseRobot';
import { NO_INPUT, type InputFrame, type RobotEntity } from '../entities/robot';
import {
  CAT,
  createBody,
  createPhysics,
  getVel,
  removeBody,
  stepPhysics,
  type PhysicsWorld,
} from '../physics/world';
import { Rng } from '../rng';
import type { SimContext } from './context';
import { createRobot } from './createRobot';
import { judgeScore, updateJudges } from './judges';
import { launchRobot, updateRobot } from './robotUpdate';
import type { MatchConfig, MatchResult, WinReason } from './types';

const DAMAGE_FLUSH_TICKS = 12;

interface PendingDamage {
  hit: DamageHit;
  amount: number;
}

export interface Prop {
  body: Matter.Body;
  hp: number;
  maxHp: number;
  w: number;
  h: number;
  alive: boolean;
}

/** Headless, deterministic match simulation running at a fixed 60 Hz timestep. */
export class MatchSim implements SimContext {
  readonly events = new EventBus();
  readonly arena: ArenaDef;
  readonly physics: PhysicsWorld;
  readonly rng: Rng;
  readonly robots: RobotEntity[] = [];
  readonly houses: HouseRobot[] = [];
  readonly hazards: HazardSystem;
  readonly props: Prop[] = [];
  readonly ais = new Map<number, AiBrain>();
  readonly pitOpen: boolean[];
  readonly dt = DT;
  tick = 0;
  /** Ticks of match time (does not advance during a tutorial warm-up). */
  matchTicks = 0;
  /** Warm-up (tutorial): AI, hazards and the clock are frozen. */
  warmup = false;
  ended = false;
  result: MatchResult | null = null;
  private pitButtonTimers: number[];
  private owners = new Map<number, BodyOwner>();
  private pending = new Map<string, PendingDamage>();
  private preVelocity = new Map<number, { x: number; y: number }>();
  private lastKoReason: KoReason = 'destroyed';

  constructor(readonly config: MatchConfig) {
    this.arena = getArena(config.arenaId);
    this.physics = createPhysics(this.arena);
    this.rng = new Rng(config.seed);
    this.pitOpen = this.arena.pits.map(() => false);
    this.pitButtonTimers = this.arena.pits.map(() => 0);
    for (const w of this.physics.walls) this.owners.set(w.id, { kind: 'wall' });

    const perTeam = new Map<number, number>();
    config.robots.forEach((cfg, id) => {
      const idx = perTeam.get(cfg.team) ?? 0;
      perTeam.set(cfg.team, idx + 1);
      const spawnIdx = idx === 0 ? Math.min(cfg.team, 1) : Math.min(1 + idx, this.arena.spawns.length - 1);
      const spawn = this.arena.spawns[spawnIdx] ?? { x: 100, y: 100, angle: 0 };
      const r = createRobot(id, cfg, spawn, this.physics);
      this.robots.push(r);
      this.owners.set(r.body.id, { kind: 'robot', robot: r });
      if (cfg.controller === 'ai') this.ais.set(id, createAi(r, config.seed));
    });

    if (config.houseRobots) {
      for (const def of this.arena.houseRobots) {
        const h = new HouseRobot(def, this.physics);
        this.houses.push(h);
        this.owners.set(h.body.id, { kind: 'house', id: def.id });
      }
    }
    this.hazards = new HazardSystem(this.arena.hazards, config.seed, config.hazards);
    (this.arena.props ?? []).forEach((p, index) => {
      const body = createBody(this.physics, {
        ...p,
        angle: 0,
        label: `prop:${index}`,
        category: CAT.prop,
        chamfer: 3,
      });
      this.props.push({ body, hp: p.hp, maxHp: p.hp, w: p.w, h: p.h, alive: true });
      this.owners.set(body.id, { kind: 'prop', index });
    });
  }

  get time(): number {
    return this.matchTicks * DT;
  }

  get timeLeft(): number {
    return Math.max(0, this.config.durationSec - this.time);
  }

  robot(id: number): RobotEntity | undefined {
    return this.robots[id];
  }

  enemiesOf(r: RobotEntity): RobotEntity[] {
    return this.robots.filter((o) => o.team !== r.team && o.alive);
  }

  gripAt(x: number, y: number): number {
    return this.hazards.gripAt(x, y);
  }

  infiniteHp(r: RobotEntity): boolean {
    return r.controller === 'dummy';
  }

  /** Advances the simulation by one fixed tick. `inputs` maps robot id → input for non-AI robots. */
  step(inputs: Record<number, InputFrame | undefined> = {}): void {
    for (const r of this.robots) {
      r.prevInput = r.input;
      const ai = this.ais.get(r.id);
      const frozenAi = ai && this.warmup;
      const input = this.ended || frozenAi ? NO_INPUT : ai ? ai.think(this, r) : (inputs[r.id] ?? NO_INPUT);
      r.input = r.controller === 'dummy' ? NO_INPUT : input;
    }

    for (const r of this.robots) updateRobot(this, r);
    for (const r of this.robots) {
      if (!r.alive) continue;
      updateWeapon(this, r);
      updateSupport(this, r);
      updateJudges(this, r);
    }
    if (!this.warmup) {
      for (const h of this.houses) h.update(this);
      this.hazards.update(this);
      this.updatePits();
    }

    this.preVelocity.clear();
    for (const r of this.robots) this.preVelocity.set(r.body.id, getVel(r.body));
    for (const h of this.houses) this.preVelocity.set(h.body.id, getVel(h.body));
    stepPhysics(this.physics);
    processCollisions(this, {
      owner: (b) => this.owners.get(b.id),
      preVelocity: this.preVelocity,
      damageProp: (i, amount, x, y) => this.damageProp(i, amount, x, y),
    });

    this.tick++;
    if (!this.warmup) this.matchTicks++;
    if (this.tick % DAMAGE_FLUSH_TICKS === 0) this.flushDamage();
    if (!this.ended && !this.warmup) this.checkEnd();
  }

  damage(hit: DamageHit): number {
    const final = applyDamage(this, hit);
    if (hit.silent && final > 0) {
      const key = `${hit.target.id}:${hit.sourceId}:${hit.source}`;
      const p = this.pending.get(key);
      if (p) p.amount += final;
      else this.pending.set(key, { hit, amount: final });
    }
    return final;
  }

  private flushDamage(): void {
    for (const { hit, amount } of this.pending.values()) {
      const pos = hit.target.body.position;
      this.events.emit('damage', {
        targetId: hit.target.id,
        sourceId: hit.sourceId,
        amount,
        x: pos.x,
        y: pos.y,
        side: hit.side,
        source: hit.source,
        force: 0,
      });
    }
    this.pending.clear();
  }

  onKo = (r: RobotEntity, reason: 'destroyed', byId: number): void => this.ko(r, reason, byId);

  ko(r: RobotEntity, reason: KoReason, byId: number): void {
    if (!r.alive || this.infiniteHp(r)) return;
    if (this.warmup && reason !== 'pit') {
      r.immobileTimer = 0;
      return;
    }
    r.alive = false;
    r.koReason = reason;
    this.lastKoReason = reason;
    if (r.weapon.heldTarget >= 0) {
      const t = this.robot(r.weapon.heldTarget);
      if (t) t.status.heldBy = -1;
      r.weapon.heldTarget = -1;
    }
    this.events.emit('ko', { robotId: r.id, reason, byId });
  }

  launch(r: RobotEntity, power: number, byId: number): void {
    launchRobot(this, r, power, byId);
  }

  private updatePits(): void {
    this.arena.pits.forEach((pit, i) => {
      if (this.pitOpen[i]) return;
      let open = this.time >= pit.opensAt && this.config.hazards;
      if (pit.button && this.config.hazards) {
        const pressed = this.robots.some((r) => r.alive && r.z <= 0 && inRect(r.body.position, pit.button!));
        this.pitButtonTimers[i] = pressed ? (this.pitButtonTimers[i] ?? 0) + DT : 0;
        if ((this.pitButtonTimers[i] ?? 0) >= BALANCE.pit.buttonHoldSec) open = true;
      }
      if (open) {
        this.pitOpen[i] = true;
        this.events.emit('pitOpened', {
          index: i,
          x: pit.rect.x + pit.rect.w / 2,
          y: pit.rect.y + pit.rect.h / 2,
        });
      }
    });
  }

  private damageProp(index: number, amount: number, x: number, y: number): void {
    const p = this.props[index];
    if (!p || !p.alive || amount <= 0) return;
    p.hp -= amount;
    if (p.hp <= 0) {
      p.alive = false;
      removeBody(this.physics, p.body);
      this.events.emit('propBroken', { index, x, y });
    }
  }

  private checkEnd(): void {
    if (this.config.mode === 'practice') return;
    const teams = new Set(this.robots.filter((r) => r.alive).map((r) => r.team));
    if (teams.size <= 1) {
      const winner = teams.size === 1 ? [...teams][0]! : -1;
      this.finish(winner, winner < 0 ? 'draw' : this.lastKoReason === 'pit' ? 'pit' : 'ko');
    } else if (this.time >= this.config.durationSec) {
      const scores = this.teamScores();
      const best = Math.max(...scores);
      const leaders = scores.map((s, i) => (s === best ? i : -1)).filter((i) => i >= 0);
      this.finish(leaders.length === 1 ? leaders[0]! : -1, leaders.length === 1 ? 'judges' : 'draw');
    }
  }

  teamScores(): number[] {
    const teams = Math.max(...this.robots.map((r) => r.team)) + 1;
    const scores = new Array<number>(teams).fill(0);
    for (const r of this.robots) scores[r.team] = (scores[r.team] ?? 0) + judgeScore(r);
    return scores;
  }

  /** Ends the match because a team left (online disconnect). */
  forfeit(team: number): void {
    if (this.ended) return;
    const winner = this.robots.find((r) => r.team !== team)?.team ?? -1;
    this.finish(winner, 'walkover');
  }

  private finish(winnerTeam: number, reason: WinReason): void {
    this.ended = true;
    this.flushDamage();
    this.result = {
      winnerTeam,
      reason,
      durationSec: this.time,
      judgeScores: this.teamScores(),
      robots: this.robots.map((r) => ({
        id: r.id,
        team: r.team,
        hpFraction: Math.max(0, r.hp / r.maxHp),
        damageDealt: r.score.damageDealt,
        damageTaken: r.score.damageTaken,
        flips: r.score.flips,
        pits: r.score.pits,
        koReason: r.koReason,
      })),
    };
    this.events.emit('matchEnd', { winnerTeam, reason });
  }

  /** Releases physics resources (call when leaving a match to avoid leaks). */
  destroy(): void {
    this.events.clear();
    this.robots.length = 0;
    this.owners.clear();
    this.ais.clear();
  }
}
