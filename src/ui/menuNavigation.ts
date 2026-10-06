import { connectedPads, readPad } from '../game/input/gamepad';
import { store } from '../state/store';

const FOCUSABLE = 'button:not(:disabled), [href], input, select, [tabindex]:not([tabindex="-1"])';
const REPEAT_MS = 220;

function focusables(): HTMLElement[] {
  const root = document.querySelector<HTMLElement>('[role="dialog"]') ?? document.getElementById('ui-root');
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
}

function move(delta: number): void {
  const items = focusables();
  if (!items.length) return;
  const i = items.indexOf(document.activeElement as HTMLElement);
  const next = items[(i + delta + items.length) % items.length] ?? items[0]!;
  next.focus();
}

/**
 * Menu navigation without a mouse: arrow keys move focus in vertical lists, and a
 * gamepad's D-pad/stick moves focus, A clicks and B goes back (Escape).
 */
export function installMenuNavigation(): void {
  window.addEventListener('keydown', (e) => {
    if (store.get().screen === 'match') return;
    const el = document.activeElement as HTMLElement | null;
    const inList = el?.closest('[data-arrow-nav]');
    if (!inList || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
    e.preventDefault();
    const items = [...inList.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const i = items.indexOf(el as HTMLElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  });

  let last = 0;
  let prevA = false;
  let prevB = false;
  const poll = () => {
    requestAnimationFrame(poll);
    if (store.get().screen === 'match' && !store.get().paused) return;
    const pad = connectedPads()[0];
    if (!pad) return;
    const p = readPad(pad);
    const now = performance.now();
    if (now - last > REPEAT_MS) {
      if (p.throttle > 0.5 || p.steer < -0.5) {
        move(-1);
        last = now;
      } else if (p.throttle < -0.5 || p.steer > 0.5) {
        move(1);
        last = now;
      }
    }
    if (p.weapon && !prevA) (document.activeElement as HTMLElement | null)?.click();
    if (p.special && !prevB)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
    prevA = p.weapon;
    prevB = p.special;
  };
  requestAnimationFrame(poll);
}
