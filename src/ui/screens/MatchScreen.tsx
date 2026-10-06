import { useEffect, useRef, useState } from 'preact/hooks';
import { anyPadStart } from '../../game/input/playerInput';
import { isTouchDevice } from '../../game/input/touch';
import { quitMatch, restartMatch } from '../../state/actions';
import { gameBridge } from '../../state/gameBridge';
import { store } from '../../state/store';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useApp, useT } from '../hooks';
import css from './screens.module.css';
import hudCss from './hud/hud.module.css';
import { Hud } from './hud/Hud';
import { TouchControls } from './hud/TouchControls';
import { Settings } from './Settings';

function setPaused(p: boolean): void {
  store.set({ paused: p });
  gameBridge.setPaused(p);
}

/** Starts the Phaser match for the current session and overlays the HUD and pause menu. */
export function MatchScreen() {
  const t = useT();
  const session = useApp((s) => s.session);
  const hud = useApp((s) => s.hud);
  const paused = useApp((s) => s.paused);
  const touchMode = useApp((s) => s.settings.touchControls);
  const [showSettings, setShowSettings] = useState(false);
  const settingsOpen = useRef(false);
  settingsOpen.current = showSettings;

  useEffect(() => {
    if (session) gameBridge.startMatch(session);
  }, [session]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'p' && e.key !== 'P') return;
      if (settingsOpen.current) return;
      if (document.querySelector('[role="dialog"]') && !store.get().paused) return;
      setPaused(!store.get().paused);
      setShowSettings(false);
    };
    let lastStart = false;
    const poll = setInterval(() => {
      const start = anyPadStart();
      if (start && !lastStart) setPaused(!store.get().paused);
      lastStart = start;
    }, 100);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearInterval(poll);
    };
  }, []);

  if (!session) return null;
  const online = session.kind === 'online';
  const touch = touchMode === 'on' || (touchMode === 'auto' && isTouchDevice());
  return (
    <>
      {hud && <Hud hud={hud} />}
      {touch && !paused && <TouchControls />}
      {touch && (
        <button class={hudCss.pauseBtn} onClick={() => setPaused(true)} aria-label={t('pause.title')}>
          ❚❚
        </button>
      )}
      {paused && !showSettings && (
        <Modal title={online ? t('pause.menu') : t('pause.title')} onClose={() => setPaused(false)}>
          {online && <p class={css.muted}>{t('pause.onlineNote')}</p>}
          <div style={{ display: 'grid', gap: '0.5em', minWidth: '18em' }}>
            <Button variant="primary" onClick={() => setPaused(false)}>
              {t('pause.resume')}
            </Button>
            {!online && (
              <Button
                onClick={() => {
                  setPaused(false);
                  restartMatch();
                }}
              >
                {t('pause.restart')}
              </Button>
            )}
            <Button onClick={() => setShowSettings(true)}>{t('menu.settings')}</Button>
            <Button
              variant="danger"
              onClick={() => {
                setPaused(false);
                quitMatch();
              }}
            >
              {online ? t('pause.forfeit') : t('pause.quit')}
            </Button>
          </div>
        </Modal>
      )}
      {paused && showSettings && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 55 }}>
          <Settings onBack={() => setShowSettings(false)} />
        </div>
      )}
    </>
  );
}
