import type { ArenaDef } from '../../config/types';
import type { DamageContext, DamageHit } from '../combat/damage';
import type { KoReason } from '../events';
import type { RobotEntity } from '../entities/robot';
import type { PhysicsWorld } from '../physics/world';
import type { MatchConfig } from './types';

/** Everything the per-system update functions need from the running match. */
export interface SimContext extends DamageContext {
  arena: ArenaDef;
  physics: PhysicsWorld;
  config: MatchConfig;
  /** Seconds since the match started. */
  time: number;
  dt: number;
  pitOpen: boolean[];
  damage(hit: DamageHit): number;
  ko(r: RobotEntity, reason: KoReason, byId: number): void;
  launch(r: RobotEntity, power: number, byId: number): void;
  robot(id: number): RobotEntity | undefined;
  enemiesOf(r: RobotEntity): RobotEntity[];
  /** Ground friction multiplier at a point (ice). */
  gripAt(x: number, y: number): number;
}
