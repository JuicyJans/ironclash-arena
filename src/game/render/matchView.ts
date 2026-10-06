import Phaser from 'phaser';
import { getArena } from '../../config/arenas';
import type { RobotStats } from '../../config/types';
import type { EventBus } from '../../core/events';
import type { MatchConfig } from '../../core/match/types';
import {
  interpolateHouse,
  interpolateRobot,
  type RobotView,
  type WorldState,
} from '../../core/match/worldState';
import { ContinuousVoice } from '../../audio/voices';
import { FxManager, type Quality } from '../fx/fxManager';
import { bindMatchEvents } from './matchEvents';
import { ArenaView } from './arenaView';
import { RobotSpriteView } from './robotView';

export interface ViewSettings {
  quality: Quality;
  damageNumbers: boolean;
  /** Attract-mode backdrop: no sound effects. */
  silent?: boolean;
}

/** Camera / time effects the view asks the scene to perform. */
export interface ViewHooks {
  shake(intensity: number): void;
  hitStop(ms: number): void;
  slowMo(): void;
  focus(x: number, y: number): void;
}

interface Voices {
  motor: ContinuousVoice;
  weapon?: ContinuousVoice;
}

export const TEAM_COLORS = [0x22d3ee, 0xff5a1f, 0xa3e635, 0xf472b6];

/** Renders a match from interpolated WorldStates and turns events into FX and audio. */
export class MatchView {
  readonly arena: ArenaView;
  readonly fx: FxManager;
  readonly robots: RobotSpriteView[];
  private voices: Voices[];
  private unbind: () => void;
  private magnet: Phaser.GameObjects.Graphics;
  private fxTimer = 0;
  current: RobotView[] = [];

  constructor(
    readonly scene: Phaser.Scene,
    readonly config: MatchConfig,
    readonly stats: RobotStats[],
    events: EventBus,
    readonly settings: ViewSettings,
    hooks: ViewHooks,
  ) {
    const arenaDef = getArena(config.arenaId);
    this.arena = new ArenaView(
      scene,
      arenaDef,
      settings.quality,
      config.houseRobots ? arenaDef.houseRobots.length : 0,
    );
    this.fx = new FxManager(scene, settings.quality, this.arena);
    this.robots = config.robots.map(
      (r, i) => new RobotSpriteView(scene, r.build, stats[i]!.weaponType, TEAM_COLORS[r.team] ?? 0xffffff),
    );
    this.voices = stats.map((s) => {
      const weapon =
        s.weaponType === 'hSpinner' || s.weaponType === 'drum'
          ? new ContinuousVoice('whine')
          : s.weaponType === 'saw'
            ? new ContinuousVoice('grind')
            : s.weaponType === 'flamethrower'
              ? new ContinuousVoice('roar')
              : undefined;
      return { motor: new ContinuousVoice('motor'), weapon };
    });
    this.magnet = scene.add.graphics().setDepth(650).setBlendMode(Phaser.BlendModes.ADD);
    this.unbind = bindMatchEvents(this, events, hooks);
  }

  maxHp(i: number): number {
    const cfg = this.config.robots[i];
    return Math.round((this.stats[i]?.hp ?? 1) * (cfg?.hpMul ?? 1));
  }

  render(prev: WorldState, curr: WorldState, alpha: number, dt: number): void {
    this.current = curr.robots.map((r, i) => {
      const p = prev.robots[i];
      return p ? interpolateRobot(p, r, alpha) : r;
    });
    const houses = curr.houses.map((h, i) => {
      const p = prev.houses[i];
      return p ? interpolateHouse(p, h, alpha) : h;
    });
    this.current.forEach((r, i) => this.robots[i]?.update(r, dt, this.maxHp(i)));
    this.arena.update(curr, houses, dt);
    this.continuousFx(curr, dt);
    if (!this.settings.silent) this.updateVoices(this.current);
  }

  private continuousFx(state: WorldState, dt: number): void {
    this.fxTimer += dt;
    const tick = this.fxTimer > 1 / 30;
    if (tick) this.fxTimer = 0;
    this.magnet.clear();
    this.current.forEach((r, i) => {
      const stats = this.stats[i]!;
      const frac = r.hp / this.maxHp(i);
      const tipX = r.x + Math.cos(r.angle) * (stats.size.w / 2 + 6);
      const tipY = r.y + Math.sin(r.angle) * (stats.size.w / 2 + 6);
      if (!tick) return;
      if (r.falling > 0) return;
      if ((r.alive && frac < 0.35 && Math.random() < 0.5 - frac) || (!r.alive && Math.random() < 0.4))
        this.fx.smokeAt(r.x, r.y);
      if (r.alive && frac < 0.15 && Math.random() < 0.3) this.fx.fireAt(r.x, r.y);
      if (r.burning && Math.random() < 0.7)
        this.fx.fireAt(r.x + (Math.random() - 0.5) * 20, r.y + (Math.random() - 0.5) * 20);
      if (r.alive && r.driveHealth < 1 && Math.abs(r.speed) > 40 && Math.random() < 0.2)
        this.fx.sparksAt(r.x, r.y, 0.1);
      if (r.smoke)
        for (let k = 0; k < 2; k++)
          this.fx.smokeAt(r.x + (Math.random() - 0.5) * 120, r.y + (Math.random() - 0.5) * 120);
      if (r.weaponActive && stats.weaponType === 'flamethrower')
        this.fx.flameCone(tipX, tipY, r.angle, 0.3, 4);
      if (r.weaponActive && stats.weaponType === 'saw' && this.touchingEnemy(i, stats.range + 10))
        this.fx.sparksAt(tipX, tipY, 0.25, r.angle);
      if (r.boosting && Math.random() < 0.5)
        this.fx.dustAt(r.x - Math.cos(r.angle) * 30, r.y - Math.sin(r.angle) * 30, 1);
    });
    this.current.forEach((r, i) => {
      if (!r.weaponActive || this.stats[i]!.weaponType !== 'magnet') return;
      const t = performance.now() / 200;
      for (let k = 0; k < 3; k++) {
        const rr = ((t + k / 3) % 1) * this.stats[i]!.range + 20;
        this.magnet.lineStyle(2, 0x63b3ed, 0.6 * (1 - rr / (this.stats[i]!.range + 20)));
        this.magnet.beginPath();
        this.magnet.arc(r.x, r.y, rr, r.angle - 0.6, r.angle + 0.6);
        this.magnet.strokePath();
      }
    });
    if (!tick) return;
    this.arena.hazards.forEach((h, i) => {
      const phase = state.hazards[i]?.phase ?? 0;
      if (h.def.kind === 'flameJet' && phase === 3) {
        const c = h.def.circle;
        for (let k = 0; k < 3; k++)
          this.fx.fireAt(c.x + (Math.random() - 0.5) * c.r, c.y + (Math.random() - 0.5) * c.r, 2);
      }
      if (h.def.kind === 'lava' && Math.random() < 0.3) {
        const r = h.def.rect;
        this.fx.fireAt(r.x + Math.random() * r.w, r.y + Math.random() * r.h);
      }
      if (h.def.kind === 'ice' && Math.random() < 0.08) {
        const r = h.def.rect;
        this.fx.steamAt(r.x + Math.random() * r.w, r.y + Math.random() * r.h);
      }
    });
  }

  private touchingEnemy(i: number, reach: number): boolean {
    const me = this.current[i]!;
    const team = this.config.robots[i]!.team;
    return this.current.some((o, j) => {
      if (j === i || !o.alive || this.config.robots[j]!.team === team) return false;
      return (
        Math.hypot(o.x - me.x, o.y - me.y) < this.stats[i]!.size.w / 2 + this.stats[j]!.size.w / 2 + reach
      );
    });
  }

  private updateVoices(robots: RobotView[]): void {
    robots.forEach((r, i) => {
      const v = this.voices[i];
      const s = this.stats[i];
      if (!v || !s) return;
      const alive = r.alive && r.falling <= 0;
      const speed = Math.min(1, Math.abs(r.speed) / Math.max(1, s.topSpeed));
      v.motor.set(speed, alive ? 0.035 + speed * 0.05 : 0);
      if (s.weaponType === 'hSpinner' || s.weaponType === 'drum')
        v.weapon?.set(r.rpm, alive ? r.rpm * 0.07 : 0);
      else v.weapon?.set(r.weaponActive ? 1 : 0, alive && r.weaponActive ? 0.09 : 0);
    });
  }

  silence(): void {
    for (const v of this.voices) {
      v.motor.set(0, 0);
      v.weapon?.set(0, 0);
    }
  }

  destroy(): void {
    this.unbind();
    for (const v of this.voices) {
      v.motor.stop();
      v.weapon?.stop();
    }
    for (const r of this.robots) r.destroy();
    this.fx.destroy();
    this.arena.destroy();
    this.magnet.destroy();
  }
}
