import { useEffect, useState } from 'preact/hooks';
import { endCutscene } from '../../state/actions';
import { store } from '../../state/store';
import { Button } from '../components/Button';
import { useApp, useT } from '../hooks';
import css from './screens.module.css';

const CHARS_PER_SEC = 55;

/** Host commentary before/after boss fights (text overlay with a typewriter effect). */
export function Cutscene() {
  const t = useT();
  const cut = useApp((s) => s.cutscene);
  const [shown, setShown] = useState(0);
  const text = cut ? t(cut.key) : '';
  useEffect(() => {
    setShown(0);
    const start = performance.now();
    const id = setInterval(
      () => setShown(Math.floor(((performance.now() - start) / 1000) * CHARS_PER_SEC)),
      30,
    );
    return () => clearInterval(id);
  }, [cut?.key]);
  const done = shown >= text.length;
  const next = () => {
    if (!done) setShown(text.length);
    else if (store.get().screen === 'results') store.set({ cutscene: null });
    else endCutscene();
  };
  useEffect(() => {
    if (!cut) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.stopImmediatePropagation();
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
  if (!cut) return null;
  return (
    <div class={css.cutscene} role="dialog" aria-label={t('host.name')} onClick={next}>
      <svg viewBox="0 0 100 100" width="100%" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="#1a1d23" stroke="#FFC21A" stroke-width="3" />
        <rect x="30" y="58" width="40" height="30" rx="6" fill="#2a2f37" />
        <circle cx="50" cy="40" r="17" fill="#c4cad4" />
        <rect x="36" y="36" width="28" height="7" rx="3" fill="#111" />
        <rect x="64" y="44" width="10" height="4" fill="#FF5A1F" />
        <circle cx="74" cy="46" r="4" fill="#FF5A1F" />
      </svg>
      <div>
        <div class={css.speaker}>{t('host.name')}</div>
        <p class={css.speech} aria-live="polite">
          {text.slice(0, shown)}
        </p>
        <Button size="small" variant={done ? 'primary' : 'ghost'} onClick={next}>
          {done ? t('common.continue') : t('common.skip')}
        </Button>
      </div>
    </div>
  );
}
