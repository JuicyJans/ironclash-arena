import { saveStore, toast } from '../../state/actions';
import { Button } from '../components/Button';
import { useT } from '../hooks';
import css from './screens.module.css';

/** Friendly crash screen with copyable log. */
export function ErrorScreen({
  message,
  log,
  onReset,
}: {
  message: string;
  log: string;
  onReset?: () => void;
}) {
  const t = useT();
  return (
    <main class={css.error} role="alert">
      <h1 style={{ fontSize: '3em', color: 'var(--c-signal)' }}>{t('error.title')}</h1>
      <p style={{ maxWidth: '40em' }}>{t('error.text')}</p>
      <p class={css.muted}>{message}</p>
      <pre class={css.log}>{log}</pre>
      <div style={{ display: 'flex', gap: '0.6em' }}>
        <Button
          onClick={() => {
            void navigator.clipboard
              ?.writeText(`${message}\n\n${log}`)
              .then(() => toast(t('error.copied'), 'success'));
          }}
        >
          {t('error.copy')}
        </Button>
        <Button variant="primary" onClick={() => location.reload()}>
          {t('error.reload')}
        </Button>
        {onReset && (
          <Button
            variant="danger"
            onClick={() => {
              saveStore.reset();
              onReset();
            }}
          >
            {t('error.resetSave')}
          </Button>
        )}
      </div>
    </main>
  );
}
