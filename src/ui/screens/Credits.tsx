import { Panel } from '../components/Panel';
import { ScreenFrame } from '../components/ScreenFrame';
import { useT } from '../hooks';
import css from './screens.module.css';

const ENTRIES: [string, string, string][] = [
  ['Phaser 3', 'MIT', 'https://phaser.io'],
  ['Matter.js', 'MIT', 'https://brm.io/matter-js/'],
  ['Preact', 'MIT', 'https://preactjs.com'],
  ['PeerJS', 'MIT', 'https://peerjs.com'],
  ['Zod', 'MIT', 'https://zod.dev'],
  ['Rajdhani (Indian Type Foundry)', 'SIL OFL 1.1', 'https://fonts.google.com/specimen/Rajdhani'],
  ['Inter (Rasmus Andersson)', 'SIL OFL 1.1', 'https://rsms.me/inter/'],
];

export function Credits() {
  const t = useT();
  return (
    <ScreenFrame title={t('credits.title')}>
      <div class={`${css.body} ${css.setup} ${css.scroll}`}>
        <Panel title={t('credits.game')}>
          <p>{t('credits.made')}</p>
          <p class={css.muted}>{t('credits.original')}</p>
          <p class={css.muted}>{t('credits.procedural')}</p>
        </Panel>
        <Panel title={t('credits.libraries')}>
          <table class={css.table}>
            <tbody>
              {ENTRIES.map(([name, license, url]) => (
                <tr key={name}>
                  <td>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--c-cyan)' }}
                    >
                      {name}
                    </a>
                  </td>
                  <td>{license}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p class={css.muted} style={{ fontSize: '0.85em' }}>
            {t('credits.full')}
          </p>
        </Panel>
      </div>
    </ScreenFrame>
  );
}
