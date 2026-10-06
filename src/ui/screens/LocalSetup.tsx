import { useEffect, useState } from 'preact/hooks';
import { connectedPads } from '../../game/input/gamepad';
import { keyLabel } from '../../game/input/keyboard';
import { startLocalMatch } from '../../state/actions';
import { Button } from '../components/Button';
import { Kbd, Row, Toggle } from '../components/Controls';
import { Panel } from '../components/Panel';
import { ArenaPicker, RobotPicker } from '../components/Pickers';
import { RobotPreview } from '../components/RobotPreview';
import { ScreenFrame } from '../components/ScreenFrame';
import { useApp, useT } from '../hooks';
import { robotOptions } from '../robotOptions';
import css from './screens.module.css';
import type { Keymap } from '../../core/save/schema';

function Controls({ map, pad }: { map: Keymap; pad: string | null }) {
  const t = useT();
  return (
    <div class={css.muted} style={{ fontSize: '0.85em', display: 'grid', gap: '0.3em' }}>
      <div>
        {t('controls.drive')}: <Kbd>{keyLabel(map.up)}</Kbd> <Kbd>{keyLabel(map.left)}</Kbd>{' '}
        <Kbd>{keyLabel(map.down)}</Kbd> <Kbd>{keyLabel(map.right)}</Kbd>
      </div>
      <div>
        {t('controls.weapon')}: <Kbd>{keyLabel(map.weapon)}</Kbd> · {t('controls.special')}:{' '}
        <Kbd>{keyLabel(map.special)}</Kbd> · {t('controls.boost')}: <Kbd>{keyLabel(map.boost)}</Kbd>
      </div>
      <div>🎮 {pad ?? t('local.noPad')}</div>
    </div>
  );
}

export function LocalSetup() {
  const t = useT();
  const profile = useApp((s) => s.save.profile);
  const keymaps = useApp((s) => s.settings.keymaps);
  const options = robotOptions(profile);
  const [p1, setP1] = useState(options[0]?.id ?? 'preset0');
  const [p2, setP2] = useState('preset1');
  const [arena, setArena] = useState('workshop');
  const [fair, setFair] = useState(true);
  const [pads, setPads] = useState<string[]>([]);
  useEffect(() => {
    const poll = () => setPads(connectedPads().map((p) => p.id.split('(')[0]!.trim().slice(0, 28)));
    poll();
    const id = setInterval(poll, 700);
    return () => clearInterval(id);
  }, []);
  const b1 = options.find((o) => o.id === p1)?.build ?? options[0]!.build;
  const b2 = options.find((o) => o.id === p2)?.build ?? options[1]!.build;
  // Pad assignment mirrors game/input/gamepad.ts padFor(): one pad → player 2, two pads → one each.
  const pad1 = pads.length >= 2 ? pads[0]! : null;
  const pad2 = pads.length >= 2 ? pads[1]! : (pads[0] ?? null);
  return (
    <ScreenFrame title={t('local.title')} subtitle={t('local.subtitle')}>
      <div class={`${css.body} ${css.scroll}`} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {[
          {
            label: t('local.player', { n: 1 }),
            value: p1,
            set: setP1,
            build: b1,
            map: keymaps.p1,
            pad: pad1,
            color: 'var(--c-p1)',
          },
          {
            label: t('local.player', { n: 2 }),
            value: p2,
            set: setP2,
            build: b2,
            map: keymaps.p2,
            pad: pad2,
            color: 'var(--c-p2)',
          },
        ].map((p) => (
          <Panel key={p.label} title={<span style={{ color: p.color }}>{p.label}</span>}>
            <RobotPreview build={p.build} label={p.build.name} height={160} />
            <Controls map={p.map} pad={p.pad} />
            <div style={{ marginTop: '0.6em' }}>
              <RobotPicker options={options} value={p.value} onChange={p.set} label={p.label} />
            </div>
          </Panel>
        ))}
        <Panel title={t('setup.arena')}>
          <ArenaPicker value={arena} onChange={setArena} profile={profile} ignoreLocks />
          <Row label={t('local.fair')}>
            <Toggle label={t('local.fair')} value={fair} onChange={setFair} />
          </Row>
          <p class={css.muted} style={{ fontSize: '0.85em' }}>
            {t('local.fairHint')}
          </p>
          <div class={css.footer}>
            <Button variant="primary" size="big" onClick={() => startLocalMatch(b1, b2, arena, fair)}>
              {t('local.start')}
            </Button>
          </div>
        </Panel>
      </div>
    </ScreenFrame>
  );
}
