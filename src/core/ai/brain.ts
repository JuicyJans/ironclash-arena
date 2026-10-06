import { getProfile, scaledProfile } from '../../config/aiProfiles';
import { BALANCE } from '../../config/balance';
import type { AiProfile } from '../../config/types';
import { WEAPONS } from '../../config/weapons';
import { angleDiff, clamp } from '../../utils/math';
import type { InputFrame, RobotEntity } from '../entities/robot';
import { getVel } from '../physics/world';
import { Rng, hashSeed } from '../rng';
import { createGrid, dangerLevel, hazardProximity, updateDangerGrid, type DangerGrid } from './dangerMap';
import { computeFlowField, flowWaypoint } from './flowField';
import { planAction, type Plan } from './plans';
import { predict, steerTo } from './steering';
import type { AiAction, AiDebugInfo, AiWorldView, Seen } from './types';

export type { Seen };
import { chooseAction, scoreActions, WEAPON_THREAT, type Situation } from './utility';

const HISTORY = 64;
const GRID_EVERY = 6;
const FLOW_EVERY = 10;
const ADAPT_EVERY_SEC = 6;
const SPIN_UP_RANGE = 340;

export class AiBrain {
  profile: AiProfile;
  debug: AiDebugInfo;
  readonly rng: Rng;
  private history: Seen[][] = [];
  private lastClear = new Map<number, Seen>();
  private grid: DangerGrid | null = null;
  private flow: Float32Array | null = null;
  private flowGoal = { x: -1e9, y: -1e9 };
  private flowTick = -1e9;
  private action: AiAction = 'attack';
  private nextDecision = 0;
  private mistakeUntil = 0;
  private aimNoise = 0;
  private reachNoise = 0;
  private adapt = { at: 0, dealt: 0, taken: 0 };

  constructor(
    readonly robotId: number,
    profile: AiProfile,
    seed: number,
  ) {
    this.profile = profile;
    this.rng = new Rng(hashSeed(seed, 'ai', robotId));
    const zero = {
      attack: 0,
      flank: 0,
      avoidHazard: 0,
      lureHazard: 0,
      retreat: 0,
      selfRight: 0,
      avoidWall: 0,
      useSpecial: 0,
    };
    this.debug = {
      action: 'attack',
      scores: zero,
      goal: { x: 0, y: 0 },
      targetId: -1,
      perceived: { x: 0, y: 0 },
    };
  }

  get currentAction(): AiAction {
    return this.action;
  }

  think(view: AiWorldView, r: RobotEntity): InputFrame {
    this.record(view);
    const idle: InputFrame = { throttle: 0, steer: 0, weapon: false, special: false, boost: false };
    if (!r.alive) return idle;
    if (r.inverted) {
      this.action = 'selfRight';
      this.debug.action = 'selfRight';
      return { ...idle, weapon: true, special: true };
    }

    const delay = Math.round((this.profile.reactionMs / 1000) * BALANCE.tickRate);
    const seen = this.perceive(view, delay);
    const target = this.pickTarget(view, r, seen);
    if (!target) return idle;
    const enemy = view.robots[target.id]!;
    const t = target.seen;

    if (!this.grid) this.grid = createGrid(view.arena);
    if (view.tick % GRID_EVERY === 0) updateDangerGrid(this.grid, view, r.radius);
    if (this.profile.adaptive) this.adaptTo(view, r);

    const pos = r.body.position;
    const situation = this.situation(view, r, enemy, t);
    if (view.tick >= this.nextDecision) {
      const scores = scoreActions(situation, this.profile);
      this.debug.scores = scores;
      let next = chooseAction(scores, this.action);
      if (view.tick >= this.mistakeUntil && this.rng.chance(this.profile.mistakeRate * 0.15)) {
        // Human-like misjudgement: commit to a sub-optimal plan for a moment.
        next = this.rng.pick(['attack', 'flank', 'retreat'] as const);
        this.mistakeUntil = view.tick + BALANCE.tickRate * 0.7;
      }
      if (view.tick < this.mistakeUntil) next = this.action;
      this.action = next;
      const spread = 1 - this.profile.precision;
      this.aimNoise = this.rng.gauss() * spread * 0.3;
      this.reachNoise = this.rng.gauss() * spread * 30;
      this.nextDecision = view.tick + Math.max(4, Math.round(delay * 0.5));
    }

    const plan: Plan = planAction(this.action, {
      view,
      r,
      t,
      enemy,
      grid: this.grid,
      rng: this.rng,
      profile: this.profile,
    });
    const goal = this.navigate(view, r, plan.goal, plan.direct ?? false);
    const steer = steerTo(pos, r.body.angle, goal, { arrive: plan.arrive, reverse: true });

    const weapon = plan.weapon ?? this.wantsWeapon(r, t, plan);
    this.debug.action = this.action;
    this.debug.goal = plan.goal;
    this.debug.targetId = target.id;
    this.debug.perceived = { x: t.x, y: t.y };
    return {
      throttle: steer.throttle,
      steer: steer.steer,
      weapon,
      special: plan.special ?? false,
      boost: (plan.boost ?? false) && r.energy > r.stats.energyMax * 0.35,
    };
  }

  private record(view: AiWorldView): void {
    const frame = view.robots.map((o) => {
      const v = getVel(o.body);
      return {
        x: o.body.position.x,
        y: o.body.position.y,
        vx: v.x,
        vy: v.y,
        angle: o.body.angle,
        alive: o.alive,
        inverted: o.inverted,
        windingUp: o.weapon.phase === 'windup',
        z: o.z,
        radius: o.radius,
        smoke: o.status.smoke > 0,
      };
    });
    this.history.push(frame);
    if (this.history.length > HISTORY) this.history.shift();
  }

  /** Delayed view of all robots; robots hidden in smoke keep their last clear position. */
  private perceive(_view: AiWorldView, delay: number): Seen[] {
    const idx = Math.max(0, this.history.length - 1 - delay);
    const frame = (this.history[idx] ?? []) as (Seen & { smoke: boolean })[];
    return frame.map((s, id) => {
      if (s.smoke) return this.lastClear.get(id) ?? s;
      this.lastClear.set(id, s);
      return s;
    });
  }

  private pickTarget(view: AiWorldView, r: RobotEntity, seen: Seen[]) {
    let best: { id: number; seen: Seen } | null = null;
    let bestD = Infinity;
    view.robots.forEach((o, id) => {
      const s = seen[id];
      if (!s || o.team === r.team || !o.alive || !s.alive) return;
      const d = Math.hypot(s.x - r.body.position.x, s.y - r.body.position.y);
      if (d < bestD) {
        bestD = d;
        best = { id, seen: s };
      }
    });
    return best as { id: number; seen: Seen } | null;
  }

  private situation(view: AiWorldView, r: RobotEntity, enemy: RobotEntity, t: Seen): Situation {
    const pos = r.body.position;
    const dist = Math.hypot(t.x - pos.x, t.y - pos.y);
    const bearingFromEnemy = Math.abs(angleDiff(t.angle, Math.atan2(pos.y - t.y, pos.x - t.x)));
    const edge = Math.min(pos.x, pos.y, view.arena.size.w - pos.x, view.arena.size.h - pos.y);
    const nearPit = hazardProximity(view, pos, 160).value;
    const v = getVel(r.body);
    const pushedDir = (v.x * (pos.x - t.x) + v.y * (pos.y - t.y)) / (dist || 1);
    const hasModule = (m: string) => r.support.some((s) => s.module === m && s.cooldown <= 0);
    return {
      dist,
      myHp: r.hp / r.maxHp,
      enemyHp: enemy.hp / enemy.maxHp,
      energy: r.energy / Math.max(1, r.stats.energyMax),
      inverted: r.inverted,
      danger: this.grid ? dangerLevel(this.grid, pos.x, pos.y) : 0,
      enemyFacingMe: clamp(1 - bearingFromEnemy / (Math.PI / 2), 0, 1),
      enemyThreat: WEAPON_THREAT[enemy.stats.weaponType],
      enemyNearHazard: hazardProximity(view, t).value,
      nearEdge: Math.max(clamp(1 - edge / 150, 0, 1), nearPit),
      beingPushed: r.contacts.includes(enemy.id) && pushedDir > 30,
      weaponReady: r.weapon.cooldown <= 0,
      grabbed: r.status.heldBy >= 0,
      hasShield: hasModule('shieldPulse'),
      hasSmoke: hasModule('smokeScreen'),
      enemyInverted: t.inverted,
      enemyWindingUp: t.windingUp,
    };
  }

  /** Routes around danger with the flow field when the straight line is unsafe. */
  private navigate(view: AiWorldView, r: RobotEntity, goal: { x: number; y: number }, direct: boolean) {
    const pos = r.body.position;
    if (direct || !this.grid) return goal;
    let unsafe = false;
    for (let i = 1; i <= 6 && !unsafe; i++) {
      const f = i / 6;
      if (dangerLevel(this.grid, pos.x + (goal.x - pos.x) * f, pos.y + (goal.y - pos.y) * f) > 0.4)
        unsafe = true;
    }
    if (!unsafe) return goal;
    const moved = Math.hypot(goal.x - this.flowGoal.x, goal.y - this.flowGoal.y) > this.grid.cell * 1.5;
    if (!this.flow || (moved && view.tick - this.flowTick >= FLOW_EVERY)) {
      this.flow = computeFlowField(this.grid, goal.x, goal.y);
      this.flowGoal = goal;
      this.flowTick = view.tick;
    }
    return flowWaypoint(this.grid, this.flow, pos.x, pos.y);
  }

  private wantsWeapon(r: RobotEntity, t: Seen, plan: Plan): boolean {
    const spec = WEAPONS[r.stats.weaponType];
    const pos = r.body.position;
    const dist = Math.hypot(t.x - pos.x, t.y - pos.y);
    const lead = predict(t, 0.08);
    const bearing = angleDiff(r.body.angle, Math.atan2(lead.y - pos.y, lead.x - pos.x)) + this.aimNoise;
    const own = spec.arc >= Math.PI - 1e-3 ? r.radius : r.stats.size.w / 2;
    const gap = dist - own - t.radius * 0.85 + this.reachNoise;
    if (t.z > 18) return false;
    if (spec.spinUp !== undefined)
      return !plan.saveEnergy && dist < SPIN_UP_RANGE && r.energy > r.stats.energyMax * 0.12;
    if (spec.mode === 'hold') return gap <= r.stats.range * 1.15 && Math.abs(bearing) <= spec.arc * 1.3;
    if (r.weapon.phase !== 'idle' || r.weapon.cooldown > 0) return false;
    if (spec.type === 'wedge') return gap > 30 && gap < 170 && Math.abs(bearing) < 0.22;
    const inReach = gap <= r.stats.range * 0.95 && Math.abs(bearing) <= spec.arc * 0.85;
    // Occasional premature strike (mis-timed) for human-like imperfection.
    const whiff = gap < r.stats.range * 2 && this.rng.chance(this.profile.mistakeRate * 0.01);
    return inReach || whiff;
  }

  private adaptTo(view: AiWorldView, r: RobotEntity): void {
    if (view.time - this.adapt.at < ADAPT_EVERY_SEC) return;
    const dealt = r.score.damageDealt - this.adapt.dealt;
    const taken = r.score.damageTaken - this.adapt.taken;
    const p = { ...this.profile };
    if (taken > dealt * 1.3 + 5) {
      p.flanking = clamp(p.flanking + 0.12, 0, 1);
      p.caution = clamp(p.caution + 0.08, 0, 1);
      p.aggression = clamp(p.aggression - 0.06, 0.2, 1);
    } else if (dealt > taken * 1.3 + 5) {
      p.aggression = clamp(p.aggression + 0.08, 0, 1);
      p.hazardUse = clamp(p.hazardUse + 0.05, 0, 1);
    }
    this.profile = p;
    this.adapt = { at: view.time, dealt: r.score.damageDealt, taken: r.score.damageTaken };
  }
}

export function createAi(r: RobotEntity, seed: number): AiBrain {
  return new AiBrain(r.id, scaledProfile(getProfile(r.aiProfile), r.difficulty ?? 'normal'), seed);
}
