import Phaser from 'phaser';
import type { RobotBuild, WeaponType } from '../../config/types';
import { WEAPONS } from '../../config/weapons';
import { hashSeed } from '../../core/rng';
import type { RobotView as RobotState } from '../../core/match/worldState';
import { BALANCE } from '../../config/balance';
import { DRIVE_FRAMES, type WeaponPart } from './paint/robotParts';
import { PAINT_SCALE, paintRobot, type RobotArt } from './robotPainter';
import { canvasTexture } from './textures';

const INV = 1 / PAINT_SCALE;
const MAX_SCRATCHES = 40;
const LIFT = 0.6; // screen-space lift per unit of height
const GROOVE = 10; // world units of travel per drive animation cycle

interface PartSprite {
  img: Phaser.GameObjects.Image;
  part: WeaponPart;
}

/** Draws one robot: shadow, extrusion, drive, body, weapon, LEDs, damage marks and status rings. */
export class RobotSpriteView {
  readonly container: Phaser.GameObjects.Container;
  private shadow: Phaser.GameObjects.Image;
  private extrusion: Phaser.GameObjects.Image;
  private drive: Phaser.GameObjects.Image;
  private body: Phaser.GameObjects.Image;
  private underside: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private scratches: Phaser.GameObjects.Graphics;
  private ring: Phaser.GameObjects.Graphics;
  private base?: PartSprite;
  private moving?: PartSprite;
  private blur?: PartSprite;
  private driveKeys: string[];
  private drivePhase = 0;
  private spin = 0;
  private fireAnim = 0;
  private scratchCount = 0;
  readonly art: RobotArt;
  readonly weapon: WeaponType;

  constructor(scene: Phaser.Scene, build: RobotBuild, weaponType: WeaponType, teamColor: number) {
    this.weapon = weaponType;
    const art = paintRobot(build);
    this.art = art;
    const prefix = `robot:${hashSeed(art.key)}`;
    const tex = (name: string, c: HTMLCanvasElement) => canvasTexture(scene, `${prefix}:${name}`, c);
    const img = (key: string) => scene.add.image(0, 0, key).setScale(INV);

    this.shadow = img(tex('sil', art.silhouette)).setTint(0x000000).setAlpha(0.45);
    this.extrusion = img(`${prefix}:sil`).setTint(0x101114);
    this.driveKeys = art.drive.map((c, i) => tex(`drive${i}`, c));
    this.drive = img(this.driveKeys[0]!);
    this.body = img(tex('body', art.body));
    this.underside = img(tex('under', art.underside)).setVisible(false);
    this.glow = img(tex('glow', art.glow)).setBlendMode(Phaser.BlendModes.ADD);
    this.scratches = scene.add.graphics();
    this.ring = scene.add.graphics();

    const mk = (name: string, part: WeaponPart | undefined): PartSprite | undefined => {
      if (!part) return undefined;
      const key = tex(`w-${name}`, part.canvas);
      const image = img(key)
        .setOrigin(part.pivotX / part.canvas.width, part.pivotY / part.canvas.height)
        .setPosition(part.localX, part.localY);
      return { img: image, part };
    };
    this.base = mk('base', art.weapon.base);
    this.moving = mk('moving', art.weapon.moving);
    this.blur = mk('blur', art.weapon.blur);
    this.blur?.img.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);

    const children: Phaser.GameObjects.GameObject[] = [this.drive, this.body, this.underside, this.scratches];
    if (this.base) children.push(this.base.img);
    if (this.moving) children.push(this.moving.img);
    if (this.blur) children.push(this.blur.img);
    children.push(this.glow);
    this.container = scene.add.container(0, 0, children);
    this.ring.lineStyle(2, teamColor, 0.9);
  }

  /** Adds a scratch/dent where a hit landed (world coordinates). */
  addDamageMark(wx: number, wy: number, severity: number): void {
    if (this.scratchCount >= MAX_SCRATCHES) return;
    this.scratchCount++;
    const c = this.container;
    const dx = wx - c.x;
    const dy = wy - c.y;
    const a = -c.rotation;
    const lx = Phaser.Math.Clamp(
      dx * Math.cos(a) - dy * Math.sin(a),
      -this.art.L / 2 + 3,
      this.art.L / 2 - 3,
    );
    const ly = Phaser.Math.Clamp(
      dx * Math.sin(a) + dy * Math.cos(a),
      -this.art.W / 2 + 3,
      this.art.W / 2 - 3,
    );
    const len = 3 + severity * 8;
    const ang = Math.random() * Math.PI;
    this.scratches.lineStyle(1.2, 0x000000, 0.5);
    this.scratches.lineBetween(lx, ly, lx + Math.cos(ang) * len, ly + Math.sin(ang) * len);
    this.scratches.lineStyle(0.8, 0xffffff, 0.35);
    this.scratches.lineBetween(
      lx + 0.8,
      ly + 0.8,
      lx + Math.cos(ang) * len + 0.8,
      ly + Math.sin(ang) * len + 0.8,
    );
    if (severity > 0.6) {
      this.scratches.fillStyle(0x000000, 0.35);
      this.scratches.fillCircle(lx, ly, 2 + severity * 2);
    }
  }

  onFire(): void {
    this.fireAnim = 1;
  }

  update(s: RobotState, dt: number, maxHp: number): void {
    const c = this.container;
    const lift = s.z * LIFT;
    const scale = 1 + s.z / 220;
    c.setPosition(s.x, s.y - lift);
    c.setRotation(s.angle);
    const flip = Math.cos(s.flipAngle);
    const fallScale = s.falling > 0 ? Math.max(0.15, 1 - s.falling / BALANCE.pit.fallSec) : 1;
    c.setScale(scale * fallScale, scale * fallScale * (Math.abs(flip) < 0.08 ? 0.08 : Math.abs(flip)));
    const showUnder = s.inverted !== flip < 0;
    this.body.setVisible(!showUnder);
    this.underside.setVisible(showUnder);
    for (const p of [this.base, this.moving, this.blur]) p?.img.setVisible(!showUnder);
    this.glow.setVisible(!showUnder);
    c.setDepth(100 + s.y * 0.01 + s.z);

    const fall = s.falling > 0 ? Phaser.Math.Clamp(1 - s.falling / BALANCE.pit.fallSec, 0, 1) : 1;
    const dark = s.alive ? 0xffffff : 0x666666;
    this.body.setTint(fall < 1 ? Phaser.Display.Color.GetColor(255 * fall, 255 * fall, 255 * fall) : dark);

    this.shadow.setPosition(s.x + 5 + s.z * 0.5, s.y + 7 + s.z * 0.7).setRotation(s.angle);
    this.shadow.setScale(INV * (1 + s.z / 300)).setAlpha(Math.max(0.12, 0.45 - s.z / 400) * fall);
    this.shadow.setDepth(10);
    this.extrusion
      .setPosition(c.x, c.y + 4 * scale)
      .setRotation(s.angle)
      .setScale(INV * c.scaleX, INV * c.scaleY);
    this.extrusion.setDepth(c.depth - 0.001).setVisible(s.falling <= 0);

    // Drive animation follows travelled distance.
    this.drivePhase += (Math.abs(s.speed) * dt) / GROOVE;
    const frame = Math.floor((this.drivePhase * DRIVE_FRAMES) % DRIVE_FRAMES);
    this.drive.setTexture(this.driveKeys[frame] ?? this.driveKeys[0]!);

    const pulse = 0.65 + Math.sin(performance.now() / 260) * 0.25;
    this.glow.setAlpha(s.alive ? (s.boosting ? 1 : pulse) : 0.1);
    this.animateWeapon(s, dt);

    this.ring.clear();
    if (s.shield) {
      this.ring.lineStyle(3, 0x22d3ee, 0.8).strokeCircle(c.x, c.y, this.art.L * 0.9);
    }
    if (s.alive && s.hp / maxHp < 0.3) {
      this.ring
        .lineStyle(1, 0xff3b3b, 0.3 + 0.3 * Math.sin(performance.now() / 120))
        .strokeCircle(c.x, c.y, this.art.L * 0.62);
    }
    this.ring.setDepth(c.depth + 0.002);
  }

  private animateWeapon(s: RobotState, dt: number): void {
    this.fireAnim = Math.max(0, this.fireAnim - dt * 4);
    const m = this.moving?.img;
    const spec = WEAPONS[this.weapon];
    const windup = s.weaponPhase === 1 ? 1 - s.weaponTimer / Math.max(spec.windup, 0.01) : 0;
    switch (this.weapon) {
      case 'flipper':
        m?.setScale(INV * (1 + this.fireAnim * 0.55 - windup * 0.06), INV * (1 + this.fireAnim * 0.12));
        m?.setTint(this.fireAnim > 0.2 ? 0xffffff : 0xdfe3e8);
        break;
      case 'hSpinner':
      case 'saw':
        this.spin +=
          s.rpm * (this.weapon === 'saw' ? 34 : 42) * dt +
          (s.weaponActive && this.weapon === 'saw' ? 30 * dt : 0);
        m?.setRotation(this.spin);
        this.blur?.img.setAlpha(
          Math.min(1, (this.weapon === 'saw' ? Math.max(s.rpm, s.weaponActive ? 1 : 0) : s.rpm) * 0.95),
        );
        break;
      case 'drum':
        this.spin += s.rpm * 30 * dt;
        m?.setScale(INV * (1 + Math.sin(this.spin * 3) * 0.04 * s.rpm), INV);
        this.blur?.img.setAlpha(s.rpm * 0.9);
        break;
      case 'hammer': {
        const raise = s.weaponPhase === 1 ? windup : 0;
        const sx = 1 - raise * 1.6 + this.fireAnim * 0.1;
        const lift = 1 + Math.sin(Math.min(1, raise) * Math.PI * 0.5) * 0.3;
        m?.setScale(INV * sx * lift, INV * lift);
        break;
      }
      case 'crusher': {
        const open = s.weaponPhase === 1 ? 1.3 : s.weaponPhase === 3 ? 0.75 : 1;
        m?.setScale(INV, INV * open);
        break;
      }
      case 'lance': {
        const x = (this.moving?.part.localX ?? 0) - windup * 6 + this.fireAnim * 26;
        m?.setX(x);
        break;
      }
      default:
        break;
    }
  }

  destroy(): void {
    this.container.destroy();
    this.shadow.destroy();
    this.extrusion.destroy();
    this.ring.destroy();
  }
}
