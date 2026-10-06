import Matter from 'matter-js';
import { BALANCE } from '../../config/balance';
import type { ArenaDef } from '../../config/types';

/** Collision categories. Airborne robots use mask 0 so they fly over everything. */
export const CAT = { wall: 0x1, robot: 0x2, house: 0x4, prop: 0x8 } as const;
const SOLID_MASK = CAT.wall | CAT.robot | CAT.house | CAT.prop;

export const WALL_THICKNESS = 400;
const TICK_MS = 1000 / BALANCE.tickRate;

/** Matter velocities are per base tick; game config uses units per second. */
export const perTick = (v: number): number => v / BALANCE.tickRate;
export const perSecond = (v: number): number => v * BALANCE.tickRate;

export interface PhysicsWorld {
  engine: Matter.Engine;
  walls: Matter.Body[];
}

export function createPhysics(arena: ArenaDef): PhysicsWorld {
  const engine = Matter.Engine.create({
    gravity: { x: 0, y: 0, scale: 0 },
    enableSleeping: false,
    positionIterations: 8,
    velocityIterations: 6,
  });
  const { w, h } = arena.size;
  const t = WALL_THICKNESS;
  const wallOpts: Matter.IChamferableBodyDefinition = {
    isStatic: true,
    label: 'wall',
    restitution: BALANCE.physics.wallRestitution,
    friction: 0.05,
    collisionFilter: { category: CAT.wall, mask: SOLID_MASK },
  };
  const walls = [
    Matter.Bodies.rectangle(w / 2, -t / 2, w + t * 2, t, wallOpts),
    Matter.Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t, wallOpts),
    Matter.Bodies.rectangle(-t / 2, h / 2, t, h + t * 2, wallOpts),
    Matter.Bodies.rectangle(w + t / 2, h / 2, t, h + t * 2, wallOpts),
  ];
  Matter.Composite.add(engine.world, walls);
  return { engine, walls };
}

export interface BodySpec {
  x: number;
  y: number;
  angle: number;
  w: number;
  h: number;
  mass: number;
  label: string;
  category: number;
  chamfer?: number;
}

export function createBody(world: PhysicsWorld, spec: BodySpec): Matter.Body {
  const body = Matter.Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, {
    angle: spec.angle,
    label: spec.label,
    chamfer: { radius: spec.chamfer ?? 6 },
    restitution: BALANCE.physics.robotRestitution,
    friction: 0.08,
    frictionStatic: 0.2,
    frictionAir: BALANCE.physics.frictionAir,
    collisionFilter: { category: spec.category, mask: SOLID_MASK },
  });
  Matter.Body.setMass(body, spec.mass);
  Matter.Composite.add(world.engine.world, body);
  return body;
}

export function removeBody(world: PhysicsWorld, body: Matter.Body): void {
  Matter.Composite.remove(world.engine.world, body);
}

/** Toggles whether a body collides (airborne / falling robots do not). */
export function setSolid(body: Matter.Body, solid: boolean): void {
  body.collisionFilter.mask = solid ? SOLID_MASK : 0;
}

export function stepPhysics(world: PhysicsWorld): void {
  Matter.Engine.update(world.engine, TICK_MS);
}

/** Velocity in units/second. */
export function getVel(body: Matter.Body): { x: number; y: number } {
  return { x: perSecond(body.velocity.x), y: perSecond(body.velocity.y) };
}

export function setVel(body: Matter.Body, vx: number, vy: number): void {
  Matter.Body.setVelocity(body, { x: perTick(vx), y: perTick(vy) });
}

export function addVel(body: Matter.Body, dvx: number, dvy: number): void {
  const v = getVel(body);
  setVel(body, v.x + dvx, v.y + dvy);
}

export function setAngVel(body: Matter.Body, radPerSec: number): void {
  Matter.Body.setAngularVelocity(body, perTick(radPerSec));
}

export function getAngVel(body: Matter.Body): number {
  return perSecond(body.angularVelocity);
}

export function setPos(body: Matter.Body, x: number, y: number): void {
  Matter.Body.setPosition(body, { x, y });
}

export function setAngle(body: Matter.Body, angle: number): void {
  Matter.Body.setAngle(body, angle);
}

/** Pairs that started touching during the last step. */
export function startedPairs(world: PhysicsWorld): Matter.Pair[] {
  return world.engine.pairs.collisionStart;
}

/** All pairs currently touching. */
export function activePairs(world: PhysicsWorld): Matter.Pair[] {
  return world.engine.pairs.list.filter((p: Matter.Pair) => p.isActive);
}

export function contactPoint(pair: Matter.Pair): { x: number; y: number } {
  const count = (pair.collision as { supportCount?: number }).supportCount ?? pair.collision.supports.length;
  const s = count > 0 ? pair.collision.supports[0] : undefined;
  if (s) return { x: s.x, y: s.y };
  return {
    x: (pair.bodyA.position.x + pair.bodyB.position.x) / 2,
    y: (pair.bodyA.position.y + pair.bodyB.position.y) / 2,
  };
}
