import type { AiProfile, WeaponType } from '../../config/types';
import type { AiAction } from './types';

/** Everything the utility scorer considers. All values are perceived (delayed), never peeked. */
export interface Situation {
  dist: number;
  myHp: number; // 0..1
  enemyHp: number; // 0..1
  energy: number; // 0..1
  inverted: boolean;
  danger: number; // 0..1 at my position
  /** 0..1 how squarely I am in front of the enemy's weapon. */
  enemyFacingMe: number;
  /** 0..1 how dangerous the enemy's front is. */
  enemyThreat: number;
  /** 0..1 how close the enemy is to a pit or active hazard. */
  enemyNearHazard: number;
  /** 0..1 how close I am to a wall or open pit. */
  nearEdge: number;
  beingPushed: boolean;
  weaponReady: boolean;
  grabbed: boolean;
  hasShield: boolean;
  hasSmoke: boolean;
  enemyInverted: boolean;
  enemyWindingUp: boolean;
  /** 0..1 how much weaker the enemy's rear is than its front (front-heavy armour). */
  enemyRearWeak: number;
}

/** Danger of facing each weapon head-on (used for flanking decisions). */
export const WEAPON_THREAT: Record<WeaponType, number> = {
  wedge: 0.35,
  flipper: 0.9,
  hSpinner: 0.85,
  drum: 0.9,
  hammer: 0.75,
  crusher: 0.85,
  saw: 0.55,
  lance: 0.7,
  flamethrower: 0.6,
  magnet: 0.5,
};

/** Pure utility scoring. Higher = more desirable. */
export function scoreActions(s: Situation, p: AiProfile): Record<AiAction, number> {
  const close = s.dist < 350 ? 1 : 0.5;
  const exposed = s.enemyFacingMe * s.enemyThreat;
  return {
    selfRight: s.inverted ? 10 : 0,
    avoidHazard: s.danger * (0.7 + p.caution * 0.9) * 1.5,
    avoidWall: s.beingPushed ? s.nearEdge * (0.9 + p.caution) : 0,
    useSpecial:
      (s.grabbed && s.hasShield ? 5 : 0) +
      (s.hasShield && s.dist < 130 && s.enemyWindingUp && exposed > 0.5 ? 1.4 : 0) +
      (s.hasSmoke && s.myHp < 0.35 && s.dist < 220 ? 0.9 : 0),
    retreat:
      (s.energy < 0.2 ? 0.75 : 0) * (0.5 + p.caution) +
      (s.myHp < 0.3 && s.myHp < s.enemyHp ? 0.6 * p.caution : 0),
    attack:
      0.45 +
      p.aggression * 0.6 +
      (s.enemyInverted ? 0.6 : 0) +
      (s.weaponReady ? 0.15 : 0) -
      exposed * (1 - p.aggression) * 0.6,
    flank: (p.flanking * exposed * 1.3 + p.flanking * s.enemyRearWeak * 0.7) * close,
    lureHazard: p.hazardUse * s.enemyNearHazard * 1.25,
  };
}

/** Best action with hysteresis towards the current one. */
export function chooseAction(
  scores: Record<AiAction, number>,
  current: AiAction,
  hysteresis = 0.15,
): AiAction {
  let best = current;
  let bestScore = (scores[current] ?? 0) + hysteresis;
  for (const [a, v] of Object.entries(scores) as [AiAction, number][]) {
    if (v > bestScore) {
      best = a;
      bestScore = v;
    }
  }
  return best;
}
