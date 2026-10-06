import { BALANCE } from '../../config/balance';
import type { EventBus } from '../../core/events';
import * as realSfx from '../../audio/sfx';
import type { MatchView, ViewHooks } from './matchView';

const HIT_STOP_MIN_DAMAGE = 9;
const CROWD_DAMAGE = 28;

/** Turns simulation events into particles, sound, camera shake and hit-stop. Returns an unsubscribe fn. */
export function bindMatchEvents(view: MatchView, events: EventBus, hooks: ViewHooks): () => void {
  const fx = view.fx;
  const sfx: typeof realSfx = view.settings.silent
    ? (new Proxy({}, { get: () => () => {} }) as typeof realSfx)
    : realSfx;
  const offs: (() => void)[] = [];
  const robotPos = (id: number) => view.current[id];
  const player = view.config.robots.findIndex((r) => r.controller === 'human' || r.controller === 'remote');

  offs.push(
    events.on('damage', (e) => {
      const impact = e.force > 0;
      if (view.settings.damageNumbers && e.amount >= BALANCE.damage.minDisplayedDamage) {
        const color = e.targetId === player ? '#ff6b6b' : e.sourceId === player ? '#FFC21A' : '#eef1f5';
        fx.damageNumber(e.x, e.y, e.amount, color);
      }
      if (!impact) {
        if (e.source === 'saw' || e.source === 'crusher') fx.sparksAt(e.x, e.y, 0.3);
        return;
      }
      const sev = Math.min(1, e.amount / 40);
      fx.sparksAt(e.x, e.y, sev);
      if (e.amount > 10) fx.debrisAt(e.x, e.y, sev);
      view.robots[e.targetId]?.addDamageMark(e.x, e.y, sev);
      sfx.clang(sev);
      if (e.amount >= HIT_STOP_MIN_DAMAGE) {
        const h = BALANCE.hitStop;
        hooks.hitStop(h.minMs + (h.maxMs - h.minMs) * Math.min(1, e.amount / h.damageForMax));
      }
      hooks.shake(Math.min(1, e.amount / BALANCE.shake.damageForMax));
      if (e.amount > CROWD_DAMAGE) sfx.crowd(Math.min(1, e.amount / 60));
    }),
    events.on('collision', (e) => {
      if (e.speed < 110) return;
      const sev = Math.min(1, e.speed / 600);
      fx.sparksAt(e.x, e.y, sev * 0.5);
      fx.dustAt(e.x, e.y, 2);
      if (e.wall) sfx.thud(sev);
      else sfx.clang(sev * 0.6, 1);
    }),
    events.on('launched', (e) => {
      const r = robotPos(e.robotId);
      if (r) fx.dustAt(r.x, r.y, 6);
      sfx.whoosh();
      if (e.power > 500) sfx.crowd(0.6);
    }),
    events.on('landed', (e) => {
      fx.dustAt(e.x, e.y, 8);
      fx.sparksAt(e.x, e.y, 0.4);
      sfx.thud(Math.min(1, e.power / 800));
      hooks.shake(Math.min(0.6, e.power / 1400));
      if (e.inverted) sfx.crowd(0.8);
    }),
    events.on('righted', () => sfx.hiss(0.3, 2500, 0.3)),
    events.on('ko', (e) => {
      const r = robotPos(e.robotId);
      if (!r) return;
      if (e.reason === 'destroyed' || e.reason === 'immobile') {
        if (e.reason === 'destroyed') {
          fx.explosion(r.x, r.y);
          sfx.explosion();
        }
        hooks.shake(1);
      } else if (e.reason === 'pit') {
        sfx.thud(1);
      }
      sfx.crowd(1);
      hooks.focus(r.x, r.y);
      hooks.slowMo();
    }),
    events.on('componentDamaged', (e) => {
      const r = robotPos(e.robotId);
      if (!r) return;
      fx.sparksAt(r.x, r.y, 0.8);
      fx.smokeAt(r.x, r.y, 6);
      sfx.hiss(0.4, 1200, 0.25);
    }),
    events.on('weaponWindup', (e) => {
      if (e.weapon === 'flipper' || e.weapon === 'hammer' || e.weapon === 'lance' || e.weapon === 'crusher')
        sfx.hiss(e.duration, 4000, 0.18);
      if (e.weapon === 'flamethrower') sfx.beep(2400, 0.05, 0.08, 'square');
    }),
    events.on('weaponFire', (e) => {
      view.robots[e.robotId]?.onFire();
      if (e.weapon === 'flipper') sfx.hiss(0.35, 1500, 0.45);
      else if (e.weapon === 'hammer' || e.weapon === 'lance' || e.weapon === 'wedge') sfx.whoosh();
      if (e.weapon === 'hSpinner' || e.weapon === 'drum') hooks.shake(0.5);
    }),
    events.on('grab', (e) => {
      if (e.released) return;
      sfx.clang(0.8, 2);
      sfx.crowd(0.4);
    }),
    events.on('special', (e) => {
      if (e.module === 'shieldPulse') {
        fx.shockwave(e.x, e.y, 0x22d3ee, 4);
        sfx.beep(520, 0.25, 0.2, 'sine');
        sfx.whoosh();
      } else if (e.module === 'smokeScreen') {
        for (let i = 0; i < 12; i++)
          fx.smokeAt(e.x + (Math.random() - 0.5) * 80, e.y + (Math.random() - 0.5) * 80);
        sfx.hiss(0.8, 800, 0.35);
      }
    }),
    events.on('boost', () => sfx.hiss(0.2, 5000, 0.12)),
    events.on('hazardTelegraph', () => sfx.hazardWarning()),
    events.on('hazardTriggered', (e) => {
      if (e.kind === 'press') {
        sfx.thud(1);
        sfx.clang(1, 1);
        hooks.shake(0.8);
        fx.dustAt(e.x, e.y, 14);
      } else if (e.kind === 'flameJet') {
        sfx.hiss(1.2, 300, 0.4);
      } else if (e.kind === 'spikes' || e.kind === 'floorFlipper') {
        sfx.clang(0.5, 2);
      } else if (e.kind === 'wallSaw') {
        sfx.hiss(0.6, 3500, 0.2);
      }
    }),
    events.on('pitOpened', (e) => {
      sfx.thud(0.9);
      sfx.beep(330, 0.4, 0.2, 'sawtooth');
      sfx.crowd(0.7);
      fx.dustAt(e.x, e.y, 10);
    }),
    events.on('houseAttack', (e) => {
      fx.sparksAt(e.x, e.y, 0.7);
      sfx.clang(0.9, 0);
      hooks.shake(0.6);
    }),
    events.on('propBroken', (e) => {
      fx.debrisAt(e.x, e.y, 2);
      fx.dustAt(e.x, e.y, 10);
      sfx.clang(0.7, 1);
    }),
    events.on('matchEnd', () => {
      sfx.buzzer();
      sfx.crowd(1);
    }),
  );
  return () => offs.forEach((o) => o());
}
