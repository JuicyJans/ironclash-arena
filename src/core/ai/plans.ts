import type { AiProfile } from '../../config/types';
import { WEAPONS } from '../../config/weapons';
import { angleDiff, clamp, rotate } from '../../utils/math';
import type { RobotEntity } from '../entities/robot';
import type { Rng } from '../rng';
import { dangerLevel, hazardProximity, type DangerGrid } from './dangerMap';
import { predict } from './steering';
import type { AiAction, AiWorldView, Seen } from './types';

export interface Plan {
  goal: { x: number; y: number };
  /** Slow down within this distance (0 = ram at full speed). */
  arrive?: number;
  /** Skip flow-field routing (e.g. when deliberately driving through a target). */
  direct?: boolean;
  weapon?: boolean;
  special?: boolean;
  boost?: boolean;
  saveEnergy?: boolean;
}

export interface PlanContext {
  view: AiWorldView;
  r: RobotEntity;
  t: Seen;
  enemy: RobotEntity;
  grid: DangerGrid;
  rng: Rng;
  profile: AiProfile;
}

const RAM_WEAPONS = new Set(['wedge', 'hSpinner', 'drum', 'saw', 'crusher', 'flipper']);
const ESCAPE_RADIUS = 170;
const ESCAPE_DIRS = 12;

/** Converts the chosen action into a concrete movement goal and button presses. */
export function planAction(action: AiAction, c: PlanContext): Plan {
  switch (action) {
    case 'attack':
      return attack(c);
    case 'flank':
      return flank(c);
    case 'avoidHazard':
      return escape(c, false);
    case 'avoidWall':
      return avoidWall(c);
    case 'lureHazard':
      return lure(c);
    case 'retreat':
      return retreat(c);
    case 'useSpecial':
      return { ...attack(c), special: true };
    case 'selfRight':
      return { goal: c.r.body.position, weapon: true, special: true };
  }
}

function attack(c: PlanContext): Plan {
  const { r, t } = c;
  const pos = r.body.position;
  const dist = Math.hypot(t.x - pos.x, t.y - pos.y);
  // Holding someone with the crusher: carry them into the nearest hazard.
  if (r.weapon.phase === 'holding') return carry(c);
  const lead = (dist / Math.max(r.stats.topSpeed, 1)) * 0.5 * c.profile.precision;
  const aim = predict(t, lead);
  const type = r.stats.weaponType;
  if (RAM_WEAPONS.has(type)) {
    return { goal: aim, arrive: 0, boost: dist > 260 && c.profile.aggression > 0.6 };
  }
  // Ranged strikers keep a stand-off distance so the strike lands at the tip.
  const standoff = r.stats.size.w / 2 + t.radius + r.stats.range * 0.55;
  const dx = pos.x - aim.x;
  const dy = pos.y - aim.y;
  const d = Math.hypot(dx, dy) || 1;
  const goal =
    d > standoff ? { x: aim.x + (dx / d) * standoff * 0.6, y: aim.y + (dy / d) * standoff * 0.6 } : aim;
  return { goal, arrive: standoff, boost: dist > 320 };
}

function flank(c: PlanContext): Plan {
  const { r, t } = c;
  const pos = r.body.position;
  const rel = angleDiff(t.angle, Math.atan2(pos.y - t.y, pos.x - t.x));
  if (Math.abs(rel) > 2.1) return attack(c); // already behind them
  const side = rel >= 0 ? 1 : -1;
  const back = rotate(-Math.cos(t.angle), -Math.sin(t.angle), side * 0.9);
  const reach = t.radius + r.radius + 70;
  return {
    goal: { x: t.x + back.x * reach, y: t.y + back.y * reach },
    arrive: 0,
    boost: Math.abs(rel) < 0.8,
  };
}

/** Moves to the safest nearby spot. `fromEnemy` also prefers points away from the enemy. */
function escape(c: PlanContext, fromEnemy: boolean): Plan {
  const pos = c.r.body.position;
  const { w, h } = c.view.arena.size;
  let best = { x: pos.x, y: pos.y };
  let bestScore = Infinity;
  for (let i = 0; i < ESCAPE_DIRS; i++) {
    const a = (i / ESCAPE_DIRS) * Math.PI * 2;
    const p = {
      x: clamp(pos.x + Math.cos(a) * ESCAPE_RADIUS, 60, w - 60),
      y: clamp(pos.y + Math.sin(a) * ESCAPE_RADIUS, 60, h - 60),
    };
    let score = dangerLevel(c.grid, p.x, p.y) * 10;
    if (fromEnemy) score -= Math.hypot(p.x - c.t.x, p.y - c.t.y) / 100;
    if (score < bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return { goal: best, arrive: 40, saveEnergy: true };
}

function avoidWall(c: PlanContext): Plan {
  const { r, t } = c;
  const pos = r.body.position;
  const px = pos.x - t.x;
  const py = pos.y - t.y;
  const d = Math.hypot(px, py) || 1;
  const cx = c.view.arena.size.w / 2 - pos.x;
  const cy = c.view.arena.size.h / 2 - pos.y;
  // Slip sideways: the tangent that points more towards the arena centre.
  const t1 = { x: -py / d, y: px / d };
  const dir = t1.x * cx + t1.y * cy >= 0 ? t1 : { x: -t1.x, y: -t1.y };
  return { goal: { x: pos.x + dir.x * 160, y: pos.y + dir.y * 160 }, arrive: 0, boost: true, direct: true };
}

function lure(c: PlanContext): Plan {
  const { r, t } = c;
  const pos = r.body.position;
  const hz = hazardProximity(c.view, t);
  if (hz.value <= 0) return attack(c);
  if (r.weapon.phase === 'holding') return carry(c);
  const hx = t.x - hz.x;
  const hy = t.y - hz.y;
  const hd = Math.hypot(hx, hy) || 1;
  const push = {
    x: t.x + (hx / hd) * (r.radius + t.radius + 45),
    y: t.y + (hy / hd) * (r.radius + t.radius + 45),
  };
  const toTarget = Math.atan2(t.y - pos.y, t.x - pos.x);
  const toHazard = Math.atan2(hz.y - t.y, hz.x - t.x);
  const aligned = Math.abs(angleDiff(toTarget, toHazard)) < 0.5;
  if (aligned) return { goal: { x: hz.x, y: hz.y }, arrive: 0, boost: true, direct: true };
  return { goal: push, arrive: 0 };
}

function carry(c: PlanContext): Plan {
  const hz = hazardProximity(c.view, c.r.body.position, 600);
  if (hz.value > 0) return { goal: { x: hz.x, y: hz.y }, arrive: 0, direct: true };
  return { goal: { x: c.view.arena.size.w / 2, y: c.view.arena.size.h / 2 }, arrive: 0 };
}

function retreat(c: PlanContext): Plan {
  const plan = escape(c, true);
  const dist = Math.hypot(c.t.x - c.r.body.position.x, c.t.y - c.r.body.position.y);
  const smoke = c.r.support.some((s) => s.module === 'smokeScreen' && s.cooldown <= 0) && dist < 200;
  const spinner = WEAPONS[c.r.stats.weaponType].spinUp !== undefined;
  return { ...plan, boost: dist < 220, special: smoke, saveEnergy: !spinner || dist > 200 };
}
