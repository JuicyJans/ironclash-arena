import { useEffect } from 'preact/hooks';
import { uiConfirm } from '../../audio/sfx';
import { music } from '../../audio/music';
import { go } from '../../state/actions';
import { useT } from '../hooks';
import css from './screens.module.css';

export function Logo({ small }: { small?: boolean }) {
  return (
    <div class={`${css.logo} ${small ? css.logoSmall : ''}`} aria-label="IRONCLASH ARENA" role="img">
      <span class={css.logoMain}>Ironclash</span>
      <span class={css.logoSub}>Arena</span>
    </div>
  );
}

/** Animated robot silhouette with a spinning weapon. */
function Silhouette() {
  return (
    <svg class={css.silhouette} viewBox="0 0 200 100" aria-hidden="true">
      <defs>
        <linearGradient id="sg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#3a414b" />
          <stop offset="1" stop-color="#14171c" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="92" rx="80" ry="6" fill="rgba(255,90,31,0.25)" />
      <path
        d="M30 70 L50 40 L150 40 L170 70 L170 82 L30 82 Z"
        fill="url(#sg)"
        stroke="#FFC21A"
        stroke-width="1.5"
      />
      <rect x="40" y="76" width="30" height="14" rx="4" fill="#0d0f12" />
      <rect x="130" y="76" width="30" height="14" rx="4" fill="#0d0f12" />
      <rect x="85" y="46" width="30" height="6" fill="#22D3EE" opacity="0.8" />
      <g style={{ transformOrigin: '100px 30px', animation: 'spin 0.25s linear infinite' }}>
        <rect x="40" y="27" width="120" height="6" rx="2" fill="#c4cad4" />
      </g>
      <rect x="96" y="30" width="8" height="12" fill="#2a2f37" />
      <style>
        {
          '@keyframes spin { from { transform: scaleX(1) } 50% { transform: scaleX(-1) } to { transform: scaleX(1) } }'
        }
      </style>
    </svg>
  );
}

export function Splash() {
  const t = useT();
  useEffect(() => {
    const start = () => {
      uiConfirm();
      music.play('menu');
      go('menu');
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') start();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', start);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', start);
    };
  }, []);
  return (
    <main class={css.splash} aria-label={t('splash.title')}>
      <Silhouette />
      <Logo />
      <p class={css.muted} style={{ maxWidth: '36em' }}>
        {t('splash.tagline')}
      </p>
      <div class={css.press} role="button" tabIndex={0}>
        {t('splash.press')}
      </div>
    </main>
  );
}
