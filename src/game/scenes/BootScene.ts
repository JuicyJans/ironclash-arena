import Phaser from 'phaser';
import { paintParticleTextures } from '../render/paint/particleTextures';
import { canvasTexture } from '../render/textures';

/** Generates shared procedural textures, then starts the attract-mode backdrop. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    for (const [key, canvas] of Object.entries(paintParticleTextures())) canvasTexture(this, key, canvas);
    this.scene.start('backdrop');
  }
}
