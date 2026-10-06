import type { MatchSession } from './store';

/** Functions the Phaser layer registers so the UI can control matches without importing Phaser. */
export interface GameBridge {
  startMatch(session: MatchSession): void;
  stopMatch(): void;
  setPaused(paused: boolean): void;
  /** Network: guest-side forfeit / host walkover. */
  forfeit(): void;
}

const noop = () => {};

export const gameBridge: GameBridge = {
  startMatch: noop,
  stopMatch: noop,
  setPaused: noop,
  forfeit: noop,
};

export function registerGameBridge(impl: GameBridge): void {
  Object.assign(gameBridge, impl);
}
