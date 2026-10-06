import Phaser from 'phaser';
import { registerGameBridge } from '../state/gameBridge';
import { store } from '../state/store';
import { ArenaScene } from './scenes/ArenaScene';
import { BackdropScene } from './scenes/BackdropScene';
import { BootScene } from './scenes/BootScene';
import { installKeyboard } from './input/keyboard';

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

/** Creates the Phaser game and registers the bridge the UI uses to start/stop matches. */
export function createGame(parent: HTMLElement): Phaser.Game {
  installKeyboard();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#07080a',
    banner: false,
    disableContextMenu: true,
    audio: { noAudio: true },
    input: { keyboard: false, gamepad: false },
    fps: { target: 60, smoothStep: true },
    render: { antialias: true, powerPreference: 'high-performance', roundPixels: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, BackdropScene, ArenaScene],
  });

  const arena = () => game.scene.getScene('arena') as ArenaScene;
  registerGameBridge({
    startMatch(session) {
      if (game.scene.isActive('arena')) game.scene.stop('arena');
      if (game.scene.isActive('backdrop')) game.scene.sleep('backdrop');
      game.scene.start('arena', { session });
    },
    stopMatch() {
      if (game.scene.isActive('arena') || game.scene.isPaused('arena')) game.scene.stop('arena');
      if (game.scene.isSleeping('backdrop')) game.scene.wake('backdrop');
    },
    setPaused(p) {
      if (game.scene.isActive('arena')) arena().setPaused(p);
    },
    forfeit() {
      /* handled by the network controllers */
    },
  });

  setInterval(() => {
    if (store.get().settings.fpsCounter) store.set({ fps: Math.round(game.loop.actualFps) });
  }, 1000);
  return game;
}
