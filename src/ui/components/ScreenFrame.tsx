import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { go } from '../../state/actions';
import type { Screen } from '../../state/store';
import { useT } from '../hooks';
import css from '../screens/screens.module.css';
import { Button } from './Button';

/** Standard screen layout: title bar with back button, optional right-side content, body. */
export function ScreenFrame({
  title,
  subtitle,
  back = 'menu',
  onBack,
  right,
  children,
  solid,
}: {
  title: string;
  subtitle?: string;
  back?: Screen | null;
  onBack?: () => void;
  right?: ComponentChildren;
  children: ComponentChildren;
  solid?: boolean;
}) {
  const t = useT();
  const doBack = onBack ?? (back ? () => go(back) : undefined);
  useEffect(() => {
    if (!doBack) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) doBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doBack]);
  return (
    <main class={`${css.screen} ${solid ? css.solid : ''}`} aria-labelledby="screen-title">
      <header class={css.header}>
        {doBack && (
          <Button variant="ghost" size="small" onClick={doBack} aria-label={t('common.back')}>
            ← {t('common.back')}
          </Button>
        )}
        <div>
          <h1 id="screen-title">{title}</h1>
          {subtitle && <div class={css.sub}>{subtitle}</div>}
        </div>
        <div class={css.spacer} />
        {right}
      </header>
      <div class={css.stripe} aria-hidden="true" style={{ marginBottom: '1.2em' }} />
      {children}
    </main>
  );
}
