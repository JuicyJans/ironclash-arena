import Phaser from 'phaser';
import type { ArenaView } from '../render/arenaView';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

export type Quality = 'low' | 'medium' | 'high';
const QUALITY_MUL: Record<Quality, number> = { low: 0.35, medium: 0.7, high: 1 };
const DEPTH = 600;
const NUMBER_POOL = 24;

/**
 * Pooled particle effects. Phaser emitters recycle their particles internally,
 * and damage numbers are taken from a fixed pool, so repeated matches don't leak.
 */
export class FxManager {
  private sparks: Emitter;
  private debris: Emitter;
  private smoke: Emitter;
  private fire: Emitter;
  private flame: Emitter;
  private dust: Emitter;
  private steam: Emitter;
  private numbers: Phaser.GameObjects.Text[] = [];
  private nextNumber = 0;
  private mul: number;

  constructor(
    private scene: Phaser.Scene,
    quality: Quality,
    private arena: ArenaView,
  ) {
    this.mul = QUALITY_MUL[quality];
    const s = scene;
    const base = { emitting: false };
    this.sparks = s.add.particles(0, 0, 'fx:dot', {
      ...base,
      speed: { min: 180, max: 620 },
      lifespan: { min: 220, max: 560 },
      scale: { start: 0.9, end: 0 },
      tint: [0xffffff, 0xffe08a, 0xffa43c],
      blendMode: Phaser.BlendModes.ADD,
      maxParticles: 400,
    });
    this.debris = s.add.particles(0, 0, 'fx:shard', {
      ...base,
      speed: { min: 80, max: 320 },
      lifespan: { min: 500, max: 1000 },
      rotate: { min: -360, max: 360 },
      scale: { min: 0.8, max: 1.8 },
      tint: [0x9aa1ab, 0x6b727c, 0xc8ced6],
      maxParticles: 160,
      deathCallback: (p: Phaser.GameObjects.Particles.Particle) => {
        if (Math.random() < 0.6) this.arena.stamp('fx:shard', p.x, p.y, p.scaleX, 0.85, p.rotation);
      },
    });
    this.smoke = s.add.particles(0, 0, 'fx:smoke', {
      ...base,
      speed: { min: 8, max: 40 },
      lifespan: { min: 900, max: 1700 },
      scale: { start: 0.35, end: 1.6 },
      alpha: { start: 0.55, end: 0 },
      tint: [0x2b2b2b, 0x3d3d3d, 0x555555],
      maxParticles: 220,
    });
    this.fire = s.add.particles(0, 0, 'fx:fire', {
      ...base,
      speed: { min: 20, max: 90 },
      lifespan: { min: 260, max: 600 },
      scale: { start: 0.9, end: 0.1 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      maxParticles: 300,
    });
    this.flame = s.add.particles(0, 0, 'fx:fire', {
      ...base,
      speed: { min: 260, max: 380 },
      lifespan: { min: 180, max: 320 },
      scale: { start: 0.5, end: 1.4 },
      alpha: { start: 0.95, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      maxParticles: 300,
    });
    this.dust = s.add.particles(0, 0, 'fx:smoke', {
      ...base,
      speed: { min: 30, max: 120 },
      lifespan: { min: 400, max: 800 },
      scale: { start: 0.3, end: 1 },
      alpha: { start: 0.35, end: 0 },
      tint: 0x8a7e6a,
      maxParticles: 120,
    });
    this.steam = s.add.particles(0, 0, 'fx:smoke', {
      ...base,
      speed: { min: 5, max: 25 },
      lifespan: { min: 1500, max: 2600 },
      scale: { start: 0.5, end: 2.2 },
      alpha: { start: 0.18, end: 0 },
      tint: 0xdff6ff,
      maxParticles: 80,
    });
    for (const e of [this.smoke, this.dust, this.steam]) e.setDepth(DEPTH);
    for (const e of [this.debris]) e.setDepth(DEPTH - 1);
    for (const e of [this.sparks, this.fire, this.flame]) e.setDepth(DEPTH + 1);

    for (let i = 0; i < NUMBER_POOL; i++) {
      const t = s.add
        .text(0, 0, '', {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '26px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(DEPTH + 10)
        .setVisible(false);
      this.numbers.push(t);
    }
  }

  private n(count: number): number {
    return Math.max(1, Math.round(count * this.mul));
  }

  sparksAt(x: number, y: number, intensity: number, angle?: number): void {
    const deg = angle === undefined ? 180 : Phaser.Math.RadToDeg(angle);
    const spread = angle === undefined ? 180 : 50;
    this.sparks.setEmitterAngle({ min: deg - spread, max: deg + spread });
    this.sparks.emitParticleAt(x, y, this.n(6 + intensity * 26));
  }

  debrisAt(x: number, y: number, intensity: number): void {
    this.debris.emitParticleAt(x, y, this.n(2 + intensity * 8));
  }

  smokeAt(x: number, y: number, count = 1): void {
    this.smoke.emitParticleAt(x, y, this.n(count));
  }

  fireAt(x: number, y: number, count = 1): void {
    this.fire.emitParticleAt(x, y, this.n(count));
  }

  dustAt(x: number, y: number, count = 4): void {
    this.dust.emitParticleAt(x, y, this.n(count));
  }

  steamAt(x: number, y: number): void {
    this.steam.emitParticleAt(x, y, 1);
  }

  /** Cone of fire (flamethrower / flame jets). */
  flameCone(x: number, y: number, angle: number, spread: number, count = 3): void {
    const deg = Phaser.Math.RadToDeg(angle);
    const sp = Phaser.Math.RadToDeg(spread);
    this.flame.setEmitterAngle({ min: deg - sp, max: deg + sp });
    this.flame.emitParticleAt(x, y, this.n(count));
  }

  explosion(x: number, y: number): void {
    this.sparksAt(x, y, 1.5);
    this.debrisAt(x, y, 2);
    this.fireAt(x, y, 18);
    this.smokeAt(x, y, 14);
    this.shockwave(x, y, 0xffa43c, 3);
    this.arena.stamp('fx:scorch', x, y, 1.6, 0.9);
  }

  shockwave(x: number, y: number, tint: number, scale = 2.5): void {
    const ring = this.scene.add
      .image(x, y, 'fx:ring')
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH + 2)
      .setScale(0.2);
    this.scene.tweens.add({
      targets: ring,
      scale,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  damageNumber(x: number, y: number, amount: number, color: string): void {
    const t = this.numbers[this.nextNumber]!;
    this.nextNumber = (this.nextNumber + 1) % this.numbers.length;
    this.scene.tweens.killTweensOf(t);
    const big = amount >= 15;
    t.setText(String(Math.round(amount)))
      .setColor(color)
      .setFontSize(big ? 34 : 24)
      .setPosition(x + (Math.random() - 0.5) * 20, y - 20)
      .setAlpha(1)
      .setScale(big ? 1.3 : 1)
      .setVisible(true);
    this.scene.tweens.add({
      targets: t,
      y: t.y - 46,
      alpha: 0,
      scale: 1,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => t.setVisible(false),
    });
  }

  destroy(): void {
    for (const e of [this.sparks, this.debris, this.smoke, this.fire, this.flame, this.dust, this.steam])
      e.destroy();
    for (const t of this.numbers) t.destroy();
  }
}
