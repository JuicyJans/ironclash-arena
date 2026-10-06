import Phaser from 'phaser';
import { ARENAS } from '../../config/arenas';
import { DT } from '../../config/balance';
import { PRESETS } from '../../config/presets';
import { LocalController } from '../match/localController';
import { MatchView } from '../render/matchView';
import { store } from '../../state/store';
import { removeTextures } from '../render/textures';

const DEMO_ARENAS = ['workshop', 'foundry', 'icefactory', 'colosseum'];

/** Attract mode: two AI robots fight silently behind the menus. */
export class BackdropScene extends Phaser.Scene {
  private controller: LocalController | null = null;
  private view: MatchView | null = null;
  private acc = 0;
  private round = 0;
  private endTimer = 0;
  private drift = 0;

  constructor() {
    super('backdrop');
  }

  create(): void {
    this.startDemo();
    this.events.on(Phaser.Scenes.Events.SLEEP, () => this.teardown());
    this.events.on(Phaser.Scenes.Events.WAKE, () => this.startDemo());
  }

  private startDemo(): void {
    this.teardown();
    const n = PRESETS.length;
    const a = PRESETS[(this.round * 3) % n]!;
    const b = PRESETS[(this.round * 7 + 4) % n]!;
    const arenaId = DEMO_ARENAS[this.round % DEMO_ARENAS.length]!;
    this.round++;
    const config = {
      arenaId,
      seed: 1000 + this.round,
      durationSec: 90,
      hazards: true,
      houseRobots: true,
      mode: 'sim' as const,
      robots: [
        { build: a, team: 0, controller: 'ai' as const, ai: 'standard', difficulty: 'normal' as const },
        { build: b, team: 1, controller: 'ai' as const, ai: 'standard', difficulty: 'normal' as const },
      ],
    };
    this.controller = new LocalController(config, store.get().settings.keymaps, false);
    const quality = store.get().settings.graphics === 'high' ? 'medium' : 'low';
    this.view = new MatchView(
      this,
      config,
      this.controller.stats,
      this.controller.events,
      { quality, damageNumbers: false, silent: true },
      {
        shake: () => {},
        hitStop: () => {},
        slowMo: () => {},
        focus: () => {},
      },
    );
    const arena = ARENAS[arenaId]!;
    const cam = this.cameras.main;
    cam.setZoom(Math.min(1920 / arena.size.w, 1080 / arena.size.h) * 1.05);
    cam.centerOn(arena.size.w / 2, arena.size.h / 2);
    this.endTimer = 0;
    this.acc = 0;
  }

  override update(_t: number, deltaMs: number): void {
    if (!this.controller || !this.view) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.acc += dt;
    let steps = 0;
    while (this.acc >= DT && steps < 3) {
      this.controller.step();
      this.acc -= DT;
      steps++;
    }
    if (steps === 3) this.acc = 0;
    this.view.render(this.controller.prev, this.controller.curr, Math.min(1, this.acc / DT), dt);
    this.drift += dt * 0.08;
    const arena = ARENAS[this.controller.config.arenaId]!;
    this.cameras.main.centerOn(
      arena.size.w / 2 + Math.sin(this.drift) * 60,
      arena.size.h / 2 + Math.cos(this.drift * 0.7) * 30,
    );
    if (this.controller.ended) {
      this.endTimer += dt;
      if (this.endTimer > 3) this.startDemo();
    }
  }

  private teardown(): void {
    this.view?.destroy();
    this.controller?.destroy();
    this.view = null;
    this.controller = null;
    removeTextures(this, 'robot:');
  }
}
