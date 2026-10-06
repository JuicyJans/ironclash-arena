import { useState } from 'preact/hooks';
import { PRESETS } from '../../config/presets';
import { activeBuild, startPractice } from '../../state/actions';
import { Button } from '../components/Button';
import { Row, Toggle } from '../components/Controls';
import { Panel } from '../components/Panel';
import { ArenaPicker, RobotPicker } from '../components/Pickers';
import { ScreenFrame } from '../components/ScreenFrame';
import { useApp, useT } from '../hooks';
import { robotOptions } from '../robotOptions';
import css from './screens.module.css';

export function Practice() {
  const t = useT();
  const profile = useApp((s) => s.save.profile);
  const [arena, setArena] = useState('workshop');
  const [hazards, setHazards] = useState(false);
  const [dummy, setDummy] = useState('preset0');
  const options = robotOptions(null);
  const { build } = activeBuild();
  return (
    <ScreenFrame title={t('practice.title')} subtitle={t('practice.subtitle')}>
      <div class={`${css.body} ${css.setup} ${css.scroll}`}>
        <Panel title={t('setup.arena')}>
          <ArenaPicker value={arena} onChange={setArena} profile={profile} ignoreLocks />
          <Row label={t('practice.hazards')}>
            <Toggle label={t('practice.hazards')} value={hazards} onChange={setHazards} />
          </Row>
        </Panel>
        <Panel title={t('practice.dummy')}>
          <RobotPicker options={options} value={dummy} onChange={setDummy} label={t('practice.dummy')} />
          <p class={css.muted}>{t('practice.info', { name: build.name })}</p>
          <div class={css.footer}>
            <Button
              variant="primary"
              size="big"
              onClick={() =>
                startPractice(arena, hazards, options.find((o) => o.id === dummy)?.build ?? PRESETS[0]!)
              }
            >
              {t('practice.start')}
            </Button>
          </div>
        </Panel>
      </div>
    </ScreenFrame>
  );
}
