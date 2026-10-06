import { BALANCE } from '../../config/balance';
import { SUPPORT_COOLDOWNS, SUPPORT_ENERGY, SUPPORT_STRENGTH } from '../../config/upgrades';
import { canAct, isPressed, type RobotEntity } from '../entities/robot';
import type { SimContext } from '../match/context';
import { knockback } from './reach';
import { releaseGrab } from './weapons';

const S = BALANCE.support;

/** Active support modules (shield pulse, smoke screen). Passive ones are folded into stats. */
export function updateSupport(ctx: SimContext, r: RobotEntity): void {
  for (const s of r.support) s.cooldown = Math.max(0, s.cooldown - ctx.dt);
  if (!isPressed(r, 'special') || r.inverted || !r.alive) return;
  // A shield pulse is the one thing that works while being held.
  const held = r.status.heldBy >= 0;
  if (!canAct(r) && !held) return;

  for (const s of r.support) {
    if (s.cooldown > 0) continue;
    const cost = SUPPORT_ENERGY[s.module] ?? 0;
    if (r.energy < cost) continue;
    const strength = SUPPORT_STRENGTH[s.level - 1] ?? 1;
    const pos = r.body.position;
    if (s.module === 'shieldPulse') {
      for (const e of ctx.enemiesOf(r)) {
        const d = Math.hypot(e.body.position.x - pos.x, e.body.position.y - pos.y);
        if (d <= S.shieldRadius * strength) knockback(e, pos.x, pos.y, S.shieldKnockback * strength);
        if (e.weapon.heldTarget === r.id) releaseGrab(ctx, e);
      }
      r.status.shield = S.shieldDuration * strength;
    } else if (s.module === 'smokeScreen' && !held) {
      r.status.smoke = S.smokeDuration * strength;
    } else {
      continue;
    }
    s.cooldown = SUPPORT_COOLDOWNS[s.module]?.[s.level - 1] ?? 0;
    r.energy -= cost;
    ctx.events.emit('special', { robotId: r.id, module: s.module, x: pos.x, y: pos.y });
    return;
  }
}

/** Seconds needed to self-right, choosing the fastest available method. */
export function rightingTime(r: RobotEntity): number {
  const R = BALANCE.righting;
  let best: number = R.struggleSec;
  if (R.nativeWeapons.includes(r.stats.weaponType)) best = Math.min(best, R.nativeSec);
  if (r.support.some((s) => s.module === 'selfRight') && r.stats.selfRight > 0) {
    best = Math.min(best, r.stats.selfRight);
  }
  return best;
}
