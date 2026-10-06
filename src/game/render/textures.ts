import Phaser from 'phaser';

/** Registers a canvas as a Phaser texture once and returns its key. */
export function canvasTexture(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): string {
  // addImage accepts canvases too and, unlike addCanvas, does not read back pixel data (getImageData).
  if (!scene.textures.exists(key)) scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
  return key;
}

/** Removes match-specific textures (robot paint jobs, arena floors) to avoid leaks. */
export function removeTextures(scene: Phaser.Scene, prefix: string): void {
  for (const key of scene.textures.getTextureKeys()) {
    if (key.startsWith(prefix)) scene.textures.remove(key);
  }
}
