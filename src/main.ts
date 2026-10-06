import '@fontsource/rajdhani/latin-500.css';
import '@fontsource/rajdhani/latin-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import './ui/theme/global.css';
import { h, render } from 'preact';
import { audio } from './audio/audioManager';
import { createGame } from './game/createGame';
import { netLobby } from './net/session';
import { applySettings, saveStore, startOnlineMatch } from './state/actions';
import { store } from './state/store';
import { App } from './ui/App';
import { installMenuNavigation } from './ui/menuNavigation';

function boot(): void {
  const browserLang = navigator.language.toLowerCase().startsWith('en') ? 'en' : 'no';
  const settings = saveStore.loadSettings(browserLang);
  const loaded = saveStore.load();
  const params = new URLSearchParams(location.search);
  store.set({
    settings,
    save: loaded.data,
    saveStatus: loaded.status,
    saveError: loaded.error,
    debugAi: params.get('debug') === 'ai',
    screen: params.has('join') ? 'online' : 'splash',
  });
  if (loaded.status === 'migrated' || loaded.status === 'new') saveStore.save(loaded.data);
  applySettings(settings);
  audio.installUnlock();

  window.addEventListener('error', (e) => reportFatal(e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => {
    // Network errors are handled in the lobby; only report real crashes.
    console.error(e.reason);
  });

  netLobby.onStart = (config, role) => startOnlineMatch(config, role);
  // Test/debug hook (used by Playwright smoke tests).
  (window as unknown as { __ironclash: unknown }).__ironclash = { store };

  const canvasRoot = document.getElementById('game-canvas');
  const uiRoot = document.getElementById('ui-root');
  if (!canvasRoot || !uiRoot) throw new Error('Missing root elements');
  createGame(canvasRoot);
  installMenuNavigation();
  render(h(App, {}), uiRoot);
}

function reportFatal(err: unknown): void {
  const e = err instanceof Error ? err : new Error(String(err));
  // Ignore benign resize observer noise.
  if (/ResizeObserver/.test(e.message)) return;
  console.error(e);
  store.set({
    fatal: {
      message: e.message,
      log: `${e.stack ?? ''}\n\nUA: ${navigator.userAgent}\nURL: ${location.href}`,
    },
  });
}

boot();
