import type { InputFrame } from '../../core/entities/robot';
import type { Keymap } from '../../core/save/schema';
import { padFor, readPad } from './gamepad';
import { isDown } from './keyboard';
import { touchState } from './touch';

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

/** Merges keyboard, gamepad and (for player 1) touch input into one frame. */
export function readPlayerInput(player: number, humans: number, keymap: Keymap): InputFrame {
  let throttle = (isDown(keymap.up) ? 1 : 0) - (isDown(keymap.down) ? 1 : 0);
  let steer = (isDown(keymap.right) ? 1 : 0) - (isDown(keymap.left) ? 1 : 0);
  let weapon = isDown(keymap.weapon);
  let special = isDown(keymap.special);
  let boost = isDown(keymap.boost);

  const pad = padFor(player, humans);
  if (pad) {
    const p = readPad(pad);
    throttle += p.throttle;
    steer += p.steer;
    weapon ||= p.weapon;
    special ||= p.special;
    boost ||= p.boost;
  }
  if (player === 0 && touchState.active) {
    throttle += touchState.throttle;
    steer += touchState.steer;
    weapon ||= touchState.weapon;
    special ||= touchState.special;
    boost ||= touchState.boost;
  }
  return { throttle: clamp1(throttle), steer: clamp1(steer), weapon, special, boost };
}

/** True while any pad's Start button is held (used for pause). */
export function anyPadStart(): boolean {
  for (let i = 0; i < 2; i++) {
    const pad = padFor(i, 2);
    if (pad && readPad(pad).start) return true;
  }
  return false;
}
