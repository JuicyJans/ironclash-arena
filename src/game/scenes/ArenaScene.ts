import Phaser from 'phaser';
import { getArena } from '../../config/arenas';
import { BALANCE, DT } from '../../config/balance';
import { music } from '../../audio/music';
import { countdownBeep } from '../../audio/sfx';
import { finishMatch } from '../../state/actions';
import { store, type MatchSession } from '../../state/store';
import { clearKeys } from '../input/keyboard';
import { resetTouch } from '../input/touch';
import { createController } from '../match/createController';
import type { MatchController } from '../match/localController';
import { buildHud } from '../match/hud';
import { MatchView } from '../render/matchView';
import { removeTextures } from '../render/textures';
import { AiDebugOverlay } from '../render/aiDebug';

const COUNTDOWN_SEC = 3;
const END_DELAY_SEC = 2.6;
const HUD_INTERVAL = 1 / 15;
const MAX_STEPS_PER_FRAME = 5;
const HUD_TOP = 120; // px at 1080p reserved for the HUD bar
const HUD_BOTTOM = 40;

/** The match scene: fixed 60 Hz simulation steps with interpolated rendering. */
export class ArenaScene extends Phaser.Scene {
  private controller!: MatchController;
  private view!: MatchView;
  private session!: MatchSession;
  private acc = 0;
  private countdown = COUNTDOWN_SEC;
  private lastBeep = -1;
  private hitStopMs = 0;
  private slowMoLeft = 0;
  private hudTimer = 0;
  private endTimer = -1;
  private paused = false;
  private finished = false;
  private debug?: AiDebugOverlay;
  private baseZoom = 1;

  constructor() {
    super('arena');
  }

  init(data: { session: MatchSession }): void {
    this.session = data.session;
    this.acc = 0;
    this.countdown = this.session.kind === 'practice' ? 0 : COUNTDOWN_SEC;
    this.lastBeep = -1;
    this.hitStopMs = 0;
    this.slowMoLeft = 0;
    this.endTimer = -1;
    this.paused = false;
    this.finished = false;
  }

  create(): void {
    const t0 = performance.now();
    const settings = store.get().settings;
    this.controller = createController(this.session, settings.keymaps);
    this.view = new MatchView(
      this,
      this.session.config,
      this.controller.stats,
      this.controller.events,
      { quality: settings.graphics, damageNumbers: settings.damageNumbers },
      {
        shake: (i) => this.shake(i),
        hitStop: (ms) => {
          if (this.controller.pausable) this.hitStopMs = Math.max(this.hitStopMs, ms);
        },
        slowMo: () => {
          if (this.controller.pausable && !store.get().settings.reduceMotion)
            this.slowMoLeft = BALANCE.slowMo.durationSec;
        },
        focus: (x, y) => this.punchIn(x, y),
      },
    );
    this.frameCamera();
    if (store.get().debugAi && this.controller.sim)
      this.debug = new AiDebugOverlay(this, this.controller.sim);
    music.play('battle');
    music.setIntensity(0.4);
    clearKeys();
    resetTouch();
    (document.activeElement as HTMLElement | null)?.blur?.();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.view.render(this.controller.prev, this.controller.curr, 1, 0);
    this.pushHud(true);
    if (import.meta.env.DEV) console.info(`[arena] created in ${Math.round(performance.now() - t0)} ms`);
  }

  private frameCamera(): void {
    const arena = getArena(this.session.config.arenaId);
    const cam = this.cameras.main;
    const { width, height } = this.scale;
    const availH = height - HUD_TOP - HUD_BOTTOM;
    const zoom = Math.min((width - 60) / (arena.size.w + 60), availH / (arena.size.h + 70));
    this.baseZoom = zoom;
    cam.setZoom(zoom);
    cam.centerOn(arena.size.w / 2, arena.size.h / 2 - (HUD_TOP - HUD_BOTTOM) / 2 / zoom);
    cam.setBackgroundColor('#07080a');
  }

  private shake(intensity: number): void {
    const s = store.get().settings;
    const amount = intensity * s.screenShake * (s.reduceMotion ? 0.25 : 1);
    if (amount < 0.05) return;
    this.cameras.main.shake(90 + amount * 160, BALANCE.shake.maxIntensity * amount, false);
  }

  private punchIn(x: number, y: number): void {
    if (store.get().settings.reduceMotion) return;
    const cam = this.cameras.main;
    const target = this.baseZoom * 1.18;
    this.tweens.add({
      targets: cam,
      zoom: target,
      duration: 220,
      yoyo: true,
      hold: 500,
      ease: 'Sine.easeInOut',
    });
    cam.pan(x, y, 220, 'Sine.easeInOut', true);
    this.time.delayedCall(950, () => {
      const arena = getArena(this.session.config.arenaId);
      cam.pan(
        arena.size.w / 2,
        arena.size.h / 2 - (HUD_TOP - HUD_BOTTOM) / 2 / this.baseZoom,
        400,
        'Sine.easeInOut',
        true,
      );
    });
  }

  skipTutorial(): void {
    this.controller.tutorial?.skip();
  }

  setPaused(p: boolean): void {
    if (!this.controller.pausable) return;
    this.paused = p;
    if (p) this.view.silence();
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    if (this.paused) return;

    if (this.countdown > 0 && !this.controller.tutorial?.step) {
      this.countdown -= dt;
      const sec = Math.ceil(this.countdown);
      if (sec !== this.lastBeep) {
        this.lastBeep = sec;
        countdownBeep(sec <= 0);
      }
    } else if (this.controller.frame) {
      this.controller.frame(dt);
    } else {
      if (this.hitStopMs > 0) {
        this.hitStopMs -= deltaMs;
      } else {
        const scale = this.slowMoLeft > 0 ? BALANCE.slowMo.timeScale : 1;
        if (this.slowMoLeft > 0) this.slowMoLeft -= dt;
        this.acc += dt * scale;
        let steps = 0;
        while (this.acc >= DT && steps < MAX_STEPS_PER_FRAME) {
          this.controller.step();
          this.acc -= DT;
          steps++;
        }
        if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
      }
    }

    const alpha = this.controller.frame ? (this.controller.alpha ?? 1) : Math.min(1, this.acc / DT);
    this.view.render(this.controller.prev, this.controller.curr, alpha, dt);
    this.debug?.update();

    this.hudTimer += dt;
    if (this.hudTimer >= HUD_INTERVAL) {
      this.hudTimer = 0;
      this.pushHud(false);
    }
    this.checkEnd(dt);
  }

  private pushHud(initial: boolean): void {
    const countdown =
      this.countdown > 0 && !this.controller.tutorial?.step ? Math.ceil(this.countdown) : null;
    const hud = buildHud(this.session, this.controller, countdown, initial);
    if (this.debug) hud.aiDebug = this.debug.lines();
    store.set({ hud });
    const me = hud.robots.find((r) => r.team === this.session.localTeam);
    const low = me ? me.hp / me.maxHp < 0.3 : false;
    music.setIntensity(hud.timeLeft < 20 || low ? 1 : 0.6);
  }

  private checkEnd(dt: number): void {
    if (!this.controller.ended || this.finished) return;
    if (this.endTimer < 0) this.endTimer = END_DELAY_SEC;
    this.endTimer -= dt;
    if (this.endTimer > 0) return;
    this.finished = true;
    const result = this.controller.result;
    if (result) finishMatch(result);
  }

  private cleanup(): void {
    this.view.destroy();
    this.debug?.destroy();
    this.controller.destroy();
    removeTextures(this, 'robot:');
    store.set({ hud: null });
  }
}
