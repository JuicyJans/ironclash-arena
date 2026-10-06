import Phaser from 'phaser';
import type { HazardDef } from '../../config/types';
import { HAZARD_PHASES } from '../../core/match/worldState';
import { paintLava, paintPressPlate, paintSawBlade, paintSpikes, paintTurntable } from './paint/propsPainter';
import { makeCanvas, chamferPath, hazardStripes } from './paint/colors';
import { canvasTexture } from './textures';

const DEPTH_FLOOR_FX = 5;
const DEPTH_PRESS = 400;

/** Visuals for one hazard. Driven purely by the (network-synchronised) phase/progress. */
export class HazardView {
  private objs: Phaser.GameObjects.GameObject[] = [];
  private glow?: Phaser.GameObjects.Image;
  private main?: Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite;
  private extra: Phaser.GameObjects.Image[] = [];
  private shadow?: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    readonly def: HazardDef,
    accent: string,
    private index: number,
  ) {
    const s = scene;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.objs.push(o);
      return o;
    };
    const glowAt = (x: number, y: number, size: number, tint: number) =>
      add(
        s.add
          .image(x, y, 'fx:glow')
          .setTint(tint)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDisplaySize(size, size)
          .setAlpha(0)
          .setDepth(DEPTH_FLOOR_FX + 1),
      );

    switch (def.kind) {
      case 'spikes': {
        const r = def.rect;
        const key = canvasTexture(s, `hz:spikes:${r.w}x${r.h}`, paintSpikes(r.w, r.h));
        this.main = add(s.add.image(r.x, r.y, key).setOrigin(0).setDepth(DEPTH_FLOOR_FX).setAlpha(0));
        this.glow = glowAt(r.x + r.w / 2, r.y + r.h / 2, r.w * 2.2, 0xff3b1f);
        break;
      }
      case 'flameJet': {
        const c = def.circle;
        this.glow = glowAt(c.x, c.y, c.r * 4, 0xff6a1f);
        break;
      }
      case 'press': {
        const r = def.rect;
        const key = canvasTexture(s, `hz:press:${r.w}x${r.h}`, paintPressPlate(r.w, r.h));
        this.shadow = add(s.add.graphics().setDepth(DEPTH_FLOOR_FX));
        this.main = add(
          s.add
            .image(r.x + r.w / 2, r.y + r.h / 2, key)
            .setDepth(DEPTH_PRESS)
            .setAlpha(0),
        );
        break;
      }
      case 'floorFlipper': {
        const r = def.rect;
        const [cv, ctx] = makeCanvas(r.w, r.h);
        chamferPath(ctx, 0, 0, r.w, r.h, 4);
        ctx.fillStyle = '#8c949f';
        ctx.fill();
        hazardStripes(ctx, 4, r.h / 2 - 5, r.w - 8, 10, 6);
        const key = canvasTexture(s, `hz:ff:${r.w}x${r.h}`, cv);
        this.main = add(s.add.image(r.x + r.w / 2, r.y + r.h / 2, key).setDepth(DEPTH_FLOOR_FX));
        this.glow = glowAt(r.x + r.w / 2, r.y + r.h / 2, r.w * 2, 0xffc21a);
        break;
      }
      case 'wallSaw': {
        const r = def.rect;
        const key = canvasTexture(s, 'hz:saw', paintSawBlade(30));
        for (let i = 0; i < 2; i++) {
          this.extra.push(
            add(
              s.add
                .image(r.x + r.w * (0.25 + i * 0.5), r.y + r.h / 2, key)
                .setDepth(DEPTH_FLOOR_FX + 2)
                .setScale(0),
            ),
          );
        }
        this.glow = glowAt(r.x + r.w / 2, r.y + r.h / 2, r.w * 1.4, 0xff3b1f);
        break;
      }
      case 'lava': {
        const r = def.rect;
        const key = canvasTexture(s, 'hz:lava', paintLava(256, 128));
        this.main = add(s.add.tileSprite(r.x, r.y, r.w, r.h, key).setOrigin(0).setDepth(DEPTH_FLOOR_FX));
        this.glow = add(
          s.add
            .image(r.x + r.w / 2, r.y + r.h / 2, 'fx:glow')
            .setTint(0xff5a1f)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDisplaySize(r.w * 1.2, r.h * 5)
            .setAlpha(0.5)
            .setDepth(DEPTH_FLOOR_FX + 1),
        );
        break;
      }
      case 'turntable': {
        const c = def.circle;
        const key = canvasTexture(s, `hz:tt:${c.r}`, paintTurntable(c.r, accent));
        this.main = add(s.add.image(c.x, c.y, key).setDepth(DEPTH_FLOOR_FX));
        break;
      }
      case 'ice':
        break;
    }
  }

  get center(): { x: number; y: number } {
    const d = this.def;
    return 'rect' in d
      ? { x: d.rect.x + d.rect.w / 2, y: d.rect.y + d.rect.h / 2 }
      : { x: d.circle.x, y: d.circle.y };
  }

  update(phaseIdx: number, progress: number, time: number): void {
    const phase = HAZARD_PHASES[phaseIdx] ?? 'off';
    const blink = 0.5 + 0.5 * Math.sin(time * 18);
    const tele = phase === 'telegraph';
    const active = phase === 'active';
    switch (this.def.kind) {
      case 'spikes':
        this.main?.setAlpha(active ? 1 : tele ? 0.15 * progress : 0);
        this.main?.setScale(active ? 1 + 0.05 * Math.sin(progress * Math.PI) : 1);
        this.glow?.setAlpha(tele ? blink * 0.6 * progress + 0.1 : active ? 0.3 : 0);
        break;
      case 'flameJet':
        this.glow?.setAlpha(tele ? 0.25 + progress * 0.5 * blink : active ? 0.9 : 0);
        break;
      case 'press': {
        const r = (this.def as { rect: { x: number; y: number; w: number; h: number } }).rect;
        this.shadow?.clear();
        if (tele || active) {
          const a = active ? 0.55 : 0.1 + progress * 0.4;
          this.shadow?.fillStyle(0x000000, a).fillRect(r.x, r.y, r.w, r.h);
          this.shadow?.lineStyle(3, 0xff3b1f, tele ? blink : 1).strokeRect(r.x, r.y, r.w, r.h);
        }
        const img = this.main as Phaser.GameObjects.Image | undefined;
        img?.setAlpha(active ? 1 : tele ? progress * 0.35 : 0);
        img?.setScale(active ? 1 + Math.max(0, 0.3 - progress) : 1.35 - progress * 0.1);
        break;
      }
      case 'floorFlipper': {
        const img = this.main as Phaser.GameObjects.Image | undefined;
        img?.setScale(1, active ? 1 + Math.sin(progress * Math.PI) * 0.8 : 1);
        img?.setTint(active ? 0xffffff : 0xb8bec6);
        this.glow?.setAlpha(tele ? blink * 0.7 : 0);
        break;
      }
      case 'wallSaw':
        for (const img of this.extra) {
          img.setScale(active ? 1 : tele ? progress * 0.4 : Math.max(0, img.scale - 0.05));
          img.rotation += active ? 0.5 : 0.1;
        }
        this.glow?.setAlpha(tele ? blink * 0.5 : active ? 0.35 : 0);
        break;
      case 'lava': {
        const ts = this.main as Phaser.GameObjects.TileSprite;
        ts.tilePositionX = time * 14;
        ts.tilePositionY = Math.sin(time * 0.7) * 10;
        this.glow?.setAlpha(0.35 + Math.sin(time * 2.1 + this.index) * 0.12);
        break;
      }
      case 'turntable':
        (this.main as Phaser.GameObjects.Image).setRotation(time * this.def.angularSpeed);
        break;
      case 'ice':
        break;
    }
  }

  destroy(): void {
    for (const o of this.objs) o.destroy();
  }
}
