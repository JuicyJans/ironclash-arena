import { useState } from 'preact/hooks';
import { DEFAULT_KEYMAPS, defaultSave } from '../../core/save/defaults';
import type { Keymap, Settings as SettingsData } from '../../core/save/schema';
import { keyLabel } from '../../game/input/keyboard';
import { replaceSave, saveStore, toast, updateSettings } from '../../state/actions';
import { store } from '../../state/store';
import { Button } from '../components/Button';
import { Row, Segmented, Slider, Toggle } from '../components/Controls';
import { Modal } from '../components/Modal';
import { Panel } from '../components/Panel';
import { ScreenFrame } from '../components/ScreenFrame';
import { Tabs } from '../components/Tabs';
import { useApp, useT } from '../hooks';
import css from './screens.module.css';

type Tab = 'general' | 'audio' | 'graphics' | 'controls' | 'access' | 'data';
const ACTIONS: (keyof Keymap)[] = ['up', 'down', 'left', 'right', 'weapon', 'special', 'boost'];

function KeyButton({ code, onSet, label }: { code: string; onSet: (code: string) => void; label: string }) {
  const t = useT();
  const [listening, setListening] = useState(false);
  return (
    <Button
      size="small"
      aria-label={`${label}: ${keyLabel(code)}`}
      onClick={() => {
        setListening(true);
        const onKey = (e: KeyboardEvent) => {
          e.preventDefault();
          e.stopPropagation();
          window.removeEventListener('keydown', onKey, true);
          setListening(false);
          if (e.code !== 'Escape') onSet(e.code);
        };
        window.addEventListener('keydown', onKey, true);
      }}
    >
      {listening ? t('settings.pressKey') : keyLabel(code)}
    </Button>
  );
}

function download(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function Settings({ onBack }: { onBack?: () => void } = {}) {
  const t = useT();
  const s = useApp((st) => st.settings);
  const [tab, setTab] = useState<Tab>('general');
  const [confirmReset, setConfirmReset] = useState(false);
  const set = (patch: Partial<SettingsData>) => updateSettings(patch);
  const setKey = (player: 'p1' | 'p2', action: keyof Keymap, code: string) =>
    set({ keymaps: { ...s.keymaps, [player]: { ...s.keymaps[player], [action]: code } } });

  return (
    <ScreenFrame title={t('settings.title')} solid onBack={onBack}>
      <Panel style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Tabs<Tab>
          label={t('settings.title')}
          value={tab}
          onChange={setTab}
          tabs={(['general', 'audio', 'graphics', 'controls', 'access', 'data'] as Tab[]).map((id) => ({
            id,
            label: t(`settings.tabs.${id}`),
          }))}
        />
        <div class={css.scroll} style={{ maxWidth: '52em' }} role="tabpanel">
          {tab === 'general' && (
            <>
              <Row label={t('settings.language')}>
                <Segmented
                  label={t('settings.language')}
                  value={s.lang}
                  options={[
                    { id: 'no', label: 'Norsk' },
                    { id: 'en', label: 'English' },
                  ]}
                  onChange={(lang) => set({ lang })}
                />
              </Row>
              <Row label={t('settings.repairCosts')}>
                <Toggle
                  label={t('settings.repairCosts')}
                  value={s.repairCosts}
                  onChange={(repairCosts) => set({ repairCosts })}
                />
              </Row>
              <p class={css.muted} style={{ fontSize: '0.85em' }}>
                {t('settings.repairHint')}
              </p>
              <Row label={t('settings.touch')}>
                <Segmented
                  label={t('settings.touch')}
                  value={s.touchControls}
                  options={(['auto', 'on', 'off'] as const).map((id) => ({
                    id,
                    label: t(`settings.touchModes.${id}`),
                  }))}
                  onChange={(touchControls) => set({ touchControls })}
                />
              </Row>
            </>
          )}
          {tab === 'audio' && (
            <>
              {(['master', 'music', 'sfx', 'ui'] as const).map((k) => (
                <Row key={k} label={t(`settings.volume.${k}`)} id={`vol-${k}`}>
                  <Slider
                    id={`vol-${k}`}
                    label={t(`settings.volume.${k}`)}
                    value={s.volume[k]}
                    onChange={(v) => set({ volume: { ...s.volume, [k]: v } })}
                  />
                </Row>
              ))}
            </>
          )}
          {tab === 'graphics' && (
            <>
              <Row label={t('settings.quality')}>
                <Segmented
                  label={t('settings.quality')}
                  value={s.graphics}
                  options={(['low', 'medium', 'high'] as const).map((id) => ({
                    id,
                    label: t(`settings.qualities.${id}`),
                  }))}
                  onChange={(graphics) => set({ graphics })}
                />
              </Row>
              <Row label={t('settings.shake')} id="shake">
                <Slider
                  id="shake"
                  label={t('settings.shake')}
                  value={s.screenShake}
                  onChange={(screenShake) => set({ screenShake })}
                />
              </Row>
              <Row label={t('settings.damageNumbers')}>
                <Toggle
                  label={t('settings.damageNumbers')}
                  value={s.damageNumbers}
                  onChange={(damageNumbers) => set({ damageNumbers })}
                />
              </Row>
              <Row label={t('settings.fps')}>
                <Toggle
                  label={t('settings.fps')}
                  value={s.fpsCounter}
                  onChange={(fpsCounter) => set({ fpsCounter })}
                />
              </Row>
              <Row label={t('settings.fullscreen')}>
                <Button
                  size="small"
                  onClick={() => {
                    if (document.fullscreenElement) void document.exitFullscreen();
                    else void document.documentElement.requestFullscreen?.();
                  }}
                >
                  {t('settings.toggleFullscreen')}
                </Button>
              </Row>
            </>
          )}
          {tab === 'controls' && (
            <>
              {(['p1', 'p2'] as const).map((p) => (
                <div key={p} style={{ marginBottom: '1em' }}>
                  <h3 style={{ margin: '0.4em 0', color: p === 'p1' ? 'var(--c-p1)' : 'var(--c-p2)' }}>
                    {t('local.player', { n: p === 'p1' ? 1 : 2 })}
                  </h3>
                  {ACTIONS.map((a) => (
                    <Row key={a} label={t(`controls.${a}`)}>
                      <KeyButton
                        code={s.keymaps[p][a]}
                        label={t(`controls.${a}`)}
                        onSet={(code) => setKey(p, a, code)}
                      />
                    </Row>
                  ))}
                </div>
              ))}
              <p class={css.muted} style={{ fontSize: '0.85em' }}>
                {t('settings.gamepadHint')}
              </p>
              <Button size="small" onClick={() => set({ keymaps: structuredClone(DEFAULT_KEYMAPS) })}>
                {t('settings.resetKeys')}
              </Button>
            </>
          )}
          {tab === 'access' && (
            <>
              <Row label={t('settings.colorBlind')}>
                <Segmented
                  label={t('settings.colorBlind')}
                  value={s.colorBlind}
                  options={(['off', 'deuteranopia', 'protanopia', 'tritanopia'] as const).map((id) => ({
                    id,
                    label: t(`settings.cb.${id}`),
                  }))}
                  onChange={(colorBlind) => set({ colorBlind })}
                />
              </Row>
              <Row label={t('settings.textScale')} id="text-scale">
                <Slider
                  id="text-scale"
                  label={t('settings.textScale')}
                  min={0.8}
                  max={1.5}
                  step={0.05}
                  value={s.textScale}
                  onChange={(textScale) => set({ textScale })}
                />
              </Row>
              <Row label={t('settings.reduceMotion')}>
                <Toggle
                  label={t('settings.reduceMotion')}
                  value={s.reduceMotion}
                  onChange={(reduceMotion) => set({ reduceMotion })}
                />
              </Row>
              <p class={css.muted} style={{ fontSize: '0.85em' }}>
                {t('settings.accessHint')}
              </p>
            </>
          )}
          {tab === 'data' && (
            <>
              <Row label={t('settings.export')}>
                <Button
                  size="small"
                  onClick={() =>
                    download(
                      'ironclash-save.json',
                      saveStore.exportJson(store.get().save, store.get().settings),
                    )
                  }
                >
                  {t('settings.exportBtn')}
                </Button>
              </Row>
              <Row label={t('settings.import')} id="import-file">
                <input
                  id="import-file"
                  type="file"
                  accept="application/json,.json"
                  onChange={async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    const res = saveStore.importJson(await file.text());
                    if (!res) {
                      toast(t('settings.importFailed'), 'error');
                      return;
                    }
                    replaceSave(res.save);
                    if (res.settings) updateSettings(res.settings);
                    toast(t('settings.imported'), 'success');
                  }}
                />
              </Row>
              <Row label={t('settings.reset')}>
                <Button size="small" variant="danger" onClick={() => setConfirmReset(true)}>
                  {t('settings.resetBtn')}
                </Button>
              </Row>
            </>
          )}
        </div>
      </Panel>
      {confirmReset && (
        <Modal title={t('settings.reset')} onClose={() => setConfirmReset(false)}>
          <p>{t('settings.resetConfirm')}</p>
          <div class={css.footer}>
            <Button onClick={() => setConfirmReset(false)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              onClick={() => {
                replaceSave(defaultSave());
                setConfirmReset(false);
                toast(t('settings.resetDone'), 'success');
              }}
            >
              {t('settings.resetBtn')}
            </Button>
          </div>
        </Modal>
      )}
    </ScreenFrame>
  );
}
