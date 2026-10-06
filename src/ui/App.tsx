import { Component, type ComponentChildren } from 'preact';
import { replaceSave } from '../state/actions';
import { store, type Screen } from '../state/store';
import { defaultSave } from '../core/save/defaults';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import css from './components/components.module.css';
import { useApp, useT } from './hooks';
import { Campaign } from './screens/Campaign';
import { Credits } from './screens/Credits';
import { Cutscene } from './screens/Cutscene';
import { ErrorScreen } from './screens/ErrorScreen';
import { Garage } from './screens/garage/Garage';
import { LocalSetup } from './screens/LocalSetup';
import { MainMenu } from './screens/MainMenu';
import { MatchScreen } from './screens/MatchScreen';
import { Online } from './screens/Online';
import { Practice } from './screens/Practice';
import { QuickMatch } from './screens/QuickMatch';
import { Results } from './screens/Results';
import { Settings } from './screens/Settings';
import { Splash } from './screens/Splash';
import { VsScreen } from './screens/VsScreen';

const SCREENS: Record<Screen, () => ComponentChildren> = {
  splash: () => <Splash />,
  menu: () => <MainMenu />,
  campaign: () => <Campaign />,
  garage: () => <Garage />,
  quick: () => <QuickMatch />,
  local: () => <LocalSetup />,
  online: () => <Online />,
  practice: () => <Practice />,
  settings: () => <Settings />,
  credits: () => <Credits />,
  vs: () => <VsScreen />,
  match: () => <MatchScreen />,
  results: () => <Results />,
};

/** Catches render errors and shows the friendly error screen. */
export class ErrorBoundary extends Component<{ children: ComponentChildren }, { error: Error | null }> {
  override state = { error: null as Error | null };

  override componentDidCatch(error: Error): void {
    console.error(error);
    this.setState({ error });
  }

  override render() {
    if (this.state.error) {
      return (
        <ErrorScreen
          message={this.state.error.message}
          log={this.state.error.stack ?? ''}
          onReset={() => {
            replaceSave(defaultSave());
            this.setState({ error: null });
            store.set({ screen: 'menu' });
          }}
        />
      );
    }
    return this.props.children;
  }
}

function CorruptSave() {
  const t = useT();
  const status = useApp((s) => s.saveStatus);
  const error = useApp((s) => s.saveError);
  if (status !== 'corrupt') return null;
  return (
    <Modal title={t('save.corruptTitle')}>
      <p>{t('save.corruptText')}</p>
      <p style={{ opacity: 0.6, fontSize: '0.85em' }}>{error}</p>
      <div style={{ display: 'flex', gap: '0.6em', justifyContent: 'flex-end' }}>
        <Button variant="danger" onClick={() => replaceSave(defaultSave())}>
          {t('save.reset')}
        </Button>
      </div>
    </Modal>
  );
}

function Toast() {
  const toast = useApp((s) => s.toast);
  if (!toast) return null;
  const cls = toast.kind === 'error' ? css.toastError : toast.kind === 'success' ? css.toastSuccess : '';
  return (
    <div class={`${css.toast} ${cls}`} role="status" aria-live="polite" key={toast.id}>
      {toast.text}
    </div>
  );
}

function Fps() {
  const on = useApp((s) => s.settings.fpsCounter);
  const fps = useApp((s) => s.fps);
  if (!on) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: 4,
        left: 6,
        fontFamily: 'monospace',
        fontSize: '0.8em',
        color: fps < 50 ? '#ff6b6b' : '#3ddc84',
        zIndex: 90,
      }}
    >
      {fps} FPS
    </div>
  );
}

export function App() {
  const screen = useApp((s) => s.screen);
  const fatal = useApp((s) => s.fatal);
  if (fatal) return <ErrorScreen message={fatal.message} log={fatal.log} />;
  return (
    <ErrorBoundary>
      {SCREENS[screen]()}
      <Cutscene />
      <CorruptSave />
      <Toast />
      <Fps />
    </ErrorBoundary>
  );
}
