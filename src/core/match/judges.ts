import { BALANCE } from '../../config/balance';
import { canAct, type RobotEntity } from '../entities/robot';
import { getVel } from '../physics/world';
import type { SimContext } from './context';

const J = BALANCE.judges;

/** Accumulates aggression and control points for the judges' decision. */
export function updateJudges(ctx: SimContext, r: RobotEntity): void {
  if (!canAct(r)) return;
  const v = getVel(r.body);
  const pos = r.body.position;
  for (const e of ctx.enemiesOf(r)) {
    if (!e.alive) continue;
    const dx = e.body.position.x - pos.x;
    const dy = e.body.position.y - pos.y;
    const d = Math.hypot(dx, dy) || 1;
    const towards = (v.x * dx + v.y * dy) / d;
    if (
      d < J.aggressionRange &&
      (towards > r.stats.topSpeed * 0.3 || r.weapon.active || r.weapon.phase !== 'idle')
    ) {
      r.score.aggression += ctx.dt;
    }
    if (r.contacts.includes(e.id) && towards > J.pushSpeed && r.input.throttle > 0.3) {
      r.score.control += J.pushControlPerSec * ctx.dt;
    }
    break;
  }
}

export function judgeScore(r: RobotEntity): number {
  return (
    r.score.damageDealt * J.damageWeight +
    r.score.aggression * J.aggressionPointsPerSec * J.aggressionWeight +
    r.score.control * J.controlWeight
  );
}
