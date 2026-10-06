/** Gamepad API polling with automatic player assignment. */
export interface PadState {
  throttle: number;
  steer: number;
  weapon: boolean;
  special: boolean;
  boost: boolean;
  start: boolean;
}

const DEADZONE = 0.18;
const dz = (v: number) => (Math.abs(v) < DEADZONE ? 0 : (v - Math.sign(v) * DEADZONE) / (1 - DEADZONE));

export function connectedPads(): Gamepad[] {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return [];
  return [...navigator.getGamepads()].filter((p): p is Gamepad => !!p && p.connected);
}

/**
 * Which pad (index into connectedPads) controls each local player.
 * One human: pad 0. Two humans with one pad: player 2 gets it (player 1 keeps the keyboard).
 */
export function padFor(player: number, humans: number): Gamepad | undefined {
  const pads = connectedPads();
  if (humans <= 1) return player === 0 ? pads[0] : undefined;
  if (pads.length >= 2) return pads[player];
  return player === 1 ? pads[0] : undefined;
}

const pressed = (p: Gamepad, i: number) => !!p.buttons[i]?.pressed || (p.buttons[i]?.value ?? 0) > 0.5;

export function readPad(p: Gamepad): PadState {
  const lx = dz(p.axes[0] ?? 0);
  const ly = dz(p.axes[1] ?? 0);
  const rt = p.buttons[7]?.value ?? 0;
  const lt = p.buttons[6]?.value ?? 0;
  let throttle = -ly + rt - lt;
  if (pressed(p, 12)) throttle = 1;
  if (pressed(p, 13)) throttle = -1;
  let steer = lx;
  if (pressed(p, 14)) steer = -1;
  if (pressed(p, 15)) steer = 1;
  return {
    throttle: Math.max(-1, Math.min(1, throttle)),
    steer: Math.max(-1, Math.min(1, steer)),
    weapon: pressed(p, 0) || pressed(p, 5),
    special: pressed(p, 1) || pressed(p, 4),
    boost: pressed(p, 2) || pressed(p, 10),
    start: pressed(p, 9),
  };
}
