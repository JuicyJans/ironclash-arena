import Phaser from 'phaser';
import type { ArenaDef } from '../../config/types';
import type { HouseView as HouseState, WorldState } from '../../core/match/worldState';
import { HazardView } from './hazardView';
import { ARENA_MARGIN, paintArenaFloor, paintLightMask, paintLightPools } from './paint/arenaPainter';
import {
  paintHouseRobot,
  paintHouseWeapon,
  paintPitDoor,
  paintPitHole,
  paintProp,
} from './paint/propsPainter';
import { canvasTexture } from './textures';

const HOUSE_SIZE = 74;
const DEPTH = { floor: 0, decals: 2, pits: 3, lights: 900, pools: 901 };

interface PitView {
  hole: Phaser.GameObjects.Image;
  doorA: Phaser.GameObjects.Image;
  doorB: Phaser.GameObjects.Image;
  open: number;
}

interface HouseSprite {
  body: Phaser.GameObjects.Image;
  weapon: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
}

/** Static and dynamic arena visuals: floor, decals, lights, pits, hazards and house robots. */
export class ArenaView {
  readonly decals: Phaser.GameObjects.RenderTexture;
  readonly hazards: HazardView[];
  private pits: PitView[] = [];
  private houses: HouseSprite[] = [];
  private props: Phaser.GameObjects.Image[] = [];
  private barrierLights: Phaser.GameObjects.Arc[] = [];
  private objs: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private scene: Phaser.Scene,
    readonly arena: ArenaDef,
    quality: 'low' | 'medium' | 'high',
    houseCount: number,
  ) {
    const s = scene;
    const M = ARENA_MARGIN;
    const { w, h } = arena.size;
    const floorKey = canvasTexture(s, `arena:${arena.id}:${quality}`, paintArenaFloor(arena, quality));
    this.objs.push(s.add.image(-M, -M, floorKey).setOrigin(0).setDepth(DEPTH.floor));
    this.decals = s.add.renderTexture(0, 0, w, h).setOrigin(0).setDepth(DEPTH.decals);
    this.objs.push(this.decals);

    for (const pit of arena.pits) {
      const r = pit.rect;
      const hole = s.add
        .image(r.x, r.y, canvasTexture(s, `pit:hole:${r.w}x${r.h}`, paintPitHole(r.w, r.h)))
        .setOrigin(0)
        .setDepth(DEPTH.pits);
      const doorKey = canvasTexture(s, `pit:door:${r.w}x${r.h}`, paintPitDoor(r.w / 2, r.h));
      const doorA = s.add
        .image(r.x, r.y, doorKey)
        .setOrigin(0)
        .setDepth(DEPTH.pits + 0.1);
      const doorB = s.add
        .image(r.x + r.w, r.y, doorKey)
        .setOrigin(1, 0)
        .setFlipX(true)
        .setDepth(DEPTH.pits + 0.1);
      this.pits.push({ hole, doorA, doorB, open: 0 });
      this.objs.push(hole, doorA, doorB);
    }

    this.hazards = arena.hazards.map((hz, i) => new HazardView(s, hz, arena.theme.accent, i));

    arena.houseRobots.slice(0, houseCount).forEach((def) => {
      const bodyKey = canvasTexture(s, `house:${def.id}`, paintHouseRobot(def, HOUSE_SIZE));
      const wKey = canvasTexture(s, `house:${def.id}:w`, paintHouseWeapon(def.attack, HOUSE_SIZE));
      const shadow = s.add.image(0, 0, bodyKey).setScale(0.5).setTint(0).setAlpha(0.45).setDepth(10);
      const body = s.add.image(0, 0, bodyKey).setScale(0.5);
      const weapon = s.add.image(0, 0, wKey).setScale(0.5).setOrigin(0, 0.5);
      this.houses.push({ body, weapon, shadow });
      this.objs.push(shadow, body, weapon);
    });

    (arena.props ?? []).forEach((p, i) => {
      const key = canvasTexture(s, `prop:${p.w}x${p.h}:${i % 2}`, paintProp(p.w, p.h, i));
      const img = s.add.image(p.x, p.y, key).setScale(0.5).setDepth(90);
      this.props.push(img);
      this.objs.push(img);
    });

    if (quality !== 'low') {
      const n = quality === 'high' ? 28 : 14;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const per = 2 * (w + h);
        let d = t * per;
        let x = -40;
        let y = -40;
        if (d < w) [x, y] = [d, -40];
        else if ((d -= w) < h) [x, y] = [w + 40, d];
        else if ((d -= h) < w) [x, y] = [w - d, h + 40];
        else [x, y] = [-40, h - (d - w)];
        const light = s.add
          .circle(x, y, 4, i % 2 ? 0xffc21a : 0xff5a1f)
          .setDepth(DEPTH.pools - 1)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.barrierLights.push(light);
        this.objs.push(light);
      }
    }

    const mask = s.add
      .image(-M, -M, canvasTexture(s, `arena:${arena.id}:mask`, paintLightMask(arena)))
      .setOrigin(0)
      .setScale(2)
      .setDepth(DEPTH.lights);
    const pools = s.add
      .image(-M, -M, canvasTexture(s, `arena:${arena.id}:pools`, paintLightPools(arena)))
      .setOrigin(0)
      .setScale(2)
      .setDepth(DEPTH.pools)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.objs.push(mask, pools);
  }

  /** Persistent floor decal (scorch marks, metal shards) – bounded cost thanks to the render texture. */
  stamp(key: string, x: number, y: number, scale: number, alpha: number, rotation = 0): void {
    const img = this.scene.make
      .image({ key, add: false })
      .setScale(scale)
      .setAlpha(alpha)
      .setRotation(rotation);
    this.decals.draw(img, x, y);
    img.destroy();
  }

  update(state: WorldState, houses: HouseState[], dt: number): void {
    state.hazards.forEach((h, i) => this.hazards[i]?.update(h.phase, h.progress, state.time));
    state.pits.forEach((open, i) => {
      const p = this.pits[i];
      if (!p) return;
      p.open = Phaser.Math.Clamp(p.open + (open ? dt * 1.5 : -dt), 0, 1);
      p.doorA.setScale(1 - p.open * 0.92, 1);
      p.doorB.setScale(1 - p.open * 0.92, 1);
    });
    houses.forEach((h, i) => {
      const v = this.houses[i];
      if (!v) return;
      v.body
        .setPosition(h.x, h.y - 4)
        .setRotation(h.angle)
        .setDepth(100 + h.y * 0.01);
      v.shadow.setPosition(h.x + 6, h.y + 8).setRotation(h.angle);
      const swing = h.attackAnim;
      v.weapon
        .setPosition(h.x, h.y - 4)
        .setRotation(h.angle)
        .setScale(0.5 * (0.8 + swing * 0.5), 0.5 * (1 + swing * 0.3))
        .setDepth(v.body.depth + 0.01);
    });
    state.props.forEach((p, i) => {
      const r = this.props[i];
      if (!r) return;
      r.setVisible(p.alive).setPosition(p.x, p.y).setRotation(p.angle);
    });
    const t = state.time;
    this.barrierLights.forEach((l, i) => l.setAlpha(0.4 + 0.6 * Math.max(0, Math.sin(t * 3 + i * 0.7))));
  }

  destroy(): void {
    for (const h of this.hazards) h.destroy();
    for (const o of this.objs) o.destroy();
  }
}
