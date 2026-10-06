import type { WorldState } from '../core/match/worldState';
import { wrapAngle } from '../utils/math';
import type { ByteReader, ByteWriter } from './codec';

// ------------------------------------------------------------------ world state quantisation
const POS = 10; // 0.1 unit precision
const ANG = 10000 / Math.PI;
const FLAGS = [
  'inverted',
  'alive',
  'weaponActive',
  'held',
  'burning',
  'smoke',
  'shield',
  'boosting',
  'lifted',
] as const;

export function writeState(w: ByteWriter, s: WorldState): void {
  w.u32(s.tick)
    .f32(s.time)
    .f32(s.timeLeft)
    .u8(s.ended ? 1 : 0)
    .i8(s.winnerTeam);
  w.u8(s.robots.length);
  for (const r of s.robots) {
    w.u16(r.x * POS)
      .u16(r.y * POS)
      .i16(wrapAngle(r.angle) * ANG)
      .u16(r.z * 10)
      .u8((r.flipAngle / Math.PI) * 255);
    w.i16(r.vx * 10)
      .i16(r.vy * 10)
      .i16(r.av * 1000);
    w.u16(r.hp * 10)
      .u16(r.energy * 10)
      .u8(r.falling * 100)
      .u8(r.weaponPhase)
      .u8(r.weaponTimer * 100);
    w.u8(r.rpm * 255)
      .u8(r.cooldown * 40)
      .u8(r.immobile * 20)
      .u8(r.righting * 50)
      .i16(r.speed);
    w.u8(r.driveHealth * 255)
      .u8(r.weaponHealth * 255)
      .u8(r.specialCooldown * 20);
    let bits = 0;
    FLAGS.forEach((f, i) => {
      if (r[f]) bits |= 1 << i;
    });
    w.u16(bits);
  }
  w.u8(s.houses.length);
  for (const h of s.houses)
    w.u16(h.x * POS)
      .u16(h.y * POS)
      .i16(wrapAngle(h.angle) * ANG)
      .u8(h.attackAnim * 255)
      .i8(h.targetId);
  w.u8(s.hazards.length);
  for (const h of s.hazards) w.u8(h.phase).u8(h.progress * 255);
  w.u8(s.pits.length);
  for (const p of s.pits) w.u8(p ? 1 : 0);
  w.u8(s.props.length);
  for (const p of s.props)
    w.u16(p.x * POS)
      .u16(p.y * POS)
      .i16(wrapAngle(p.angle) * ANG)
      .u8(p.alive ? 1 : 0);
  w.u8(s.scores.length);
  for (const sc of s.scores) w.f32(sc);
}

export function readState(r: ByteReader): WorldState {
  const tick = r.u32();
  const time = r.f32();
  const timeLeft = r.f32();
  const ended = r.u8() === 1;
  const winnerTeam = r.i8();
  const robots: WorldState['robots'] = [];
  const n = r.u8();
  for (let i = 0; i < n; i++) {
    const v = {
      x: r.u16() / POS,
      y: r.u16() / POS,
      angle: r.i16() / ANG,
      z: r.u16() / 10,
      flipAngle: (r.u8() / 255) * Math.PI,
      vx: r.i16() / 10,
      vy: r.i16() / 10,
      av: r.i16() / 1000,
      hp: r.u16() / 10,
      energy: r.u16() / 10,
      falling: r.u8() / 100,
      weaponPhase: r.u8(),
      weaponTimer: r.u8() / 100,
      rpm: r.u8() / 255,
      cooldown: r.u8() / 40,
      immobile: r.u8() / 20,
      righting: r.u8() / 50,
      speed: r.i16(),
      driveHealth: r.u8() / 255,
      weaponHealth: r.u8() / 255,
      specialCooldown: r.u8() / 20,
    };
    const bits = r.u16();
    const flags = Object.fromEntries(FLAGS.map((f, i2) => [f, (bits & (1 << i2)) !== 0])) as Record<
      (typeof FLAGS)[number],
      boolean
    >;
    robots.push({ ...v, ...flags });
  }
  const houses: WorldState['houses'] = [];
  const hn = r.u8();
  for (let i = 0; i < hn; i++)
    houses.push({
      x: r.u16() / POS,
      y: r.u16() / POS,
      angle: r.i16() / ANG,
      attackAnim: r.u8() / 255,
      targetId: r.i8(),
    });
  const hazards: WorldState['hazards'] = [];
  const zn = r.u8();
  for (let i = 0; i < zn; i++) hazards.push({ phase: r.u8(), progress: r.u8() / 255 });
  const pits: boolean[] = [];
  const pn = r.u8();
  for (let i = 0; i < pn; i++) pits.push(r.u8() === 1);
  const props: WorldState['props'] = [];
  const prn = r.u8();
  for (let i = 0; i < prn; i++)
    props.push({ x: r.u16() / POS, y: r.u16() / POS, angle: r.i16() / ANG, alive: r.u8() === 1 });
  const scores: number[] = [];
  const sn = r.u8();
  for (let i = 0; i < sn; i++) scores.push(r.f32());
  return { tick, time, timeLeft, ended, winnerTeam, robots, houses, hazards, pits, props, scores };
}
