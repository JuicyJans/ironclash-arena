import { useEffect, useRef, useState } from 'preact/hooks';
import { getLang, onLangChange, t } from '../i18n';
import { store, type AppState } from '../state/store';
import type { Store } from '../utils/store';

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/** Subscribes to a slice of any store; re-renders only when the (shallow) selection changes. */
export function useSelect<S extends object, T>(s: Store<S>, selector: (state: S) => T): T {
  const [value, setValue] = useState(() => selector(s.get()));
  const sel = useRef(selector);
  sel.current = selector;
  useEffect(() => {
    let last = sel.current(s.get());
    setValue(() => last);
    return s.subscribe((state) => {
      const next = sel.current(state);
      if (!shallowEqual(next, last)) {
        last = next;
        setValue(() => next);
      }
    });
  }, [s]);
  return value;
}

export const useApp = <T>(selector: (s: AppState) => T): T => useSelect(store, selector);

/** Re-renders on language change and returns the translate function. */
export function useT(): typeof t {
  const [, setLang] = useState(getLang());
  useEffect(() => onLangChange((l) => setLang(l)), []);
  return t;
}
