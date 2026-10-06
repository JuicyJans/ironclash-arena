/** Virtual joystick / button state written by the DOM touch controls. */
export const touchState = {
  active: false,
  throttle: 0,
  steer: 0,
  weapon: false,
  special: false,
  boost: false,
};

export function resetTouch(): void {
  touchState.throttle = 0;
  touchState.steer = 0;
  touchState.weapon = false;
  touchState.special = false;
  touchState.boost = false;
}

export const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
