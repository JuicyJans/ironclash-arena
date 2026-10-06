/** Tracks held keys by `KeyboardEvent.code` so keymaps are layout-independent and remappable. */
const held = new Set<string>();
let installed = false;

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
};

export function installKeyboard(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('keydown', (e) => {
    if (isTyping(e)) return;
    held.add(e.code);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
}

export const isDown = (code: string): boolean => held.has(code);
export const clearKeys = (): void => held.clear();

/** Human-readable label for a key code ("KeyW" → "W", "ArrowUp" → "↑"). */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Space: 'Space',
    ShiftLeft: 'L-Shift',
    ShiftRight: 'R-Shift',
    ControlLeft: 'L-Ctrl',
    ControlRight: 'R-Ctrl',
    AltLeft: 'L-Alt',
    AltRight: 'R-Alt',
    Enter: 'Enter',
    NumpadEnter: 'Num Enter',
  };
  return map[code] ?? code.replace('Numpad', 'Num ');
}
