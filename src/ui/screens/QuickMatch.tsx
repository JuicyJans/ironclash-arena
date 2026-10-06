import { useState } from 'preact/hooks';
import { AI_PROFILES, DIFFICULTIES } from '../../config/aiProfiles';
import { PRESETS } from '../../config/presets';
import type { Difficulty } from '../../config/types';
import { activeBuild, startQuickMatch } from '../../state/actions';
import { Button } from '../components/Button';
import { Row, Segmented } from '../components/Controls';
import { Panel } from '../components/Panel';
import { ArenaPicker, RobotPicker } from '../components/Pickers';
import { RobotPreview } from '../components/RobotPreview';
import { ScreenFrame } from '../components/ScreenFrame';
import { useApp, useT } from '../hooks';
import { robotOptions } from '../robotOptions';
import css from './screens.module.css';

const PERSONALITIES = [
  'rookie',
  'pusher',
  'berserker',
  'bruiser',
  'patient',
  'spinner',
  'tactician',
  'speedster',
  'champion',
];

export function QuickMatch() {
  const t = useT();
  const profile = useApp((s) => s.save.profile);
  const [arena, setArena] = useState('workshop');
  const [opp, setOpp] = useState('preset0');
  const [ai, setAi] = useState('bruiser');
  const [difficulty, setDifficulty] = useState<Difficulty>(profile.difficulty);
  const options = robotOptions(null);
  const oppBuild = options.find((o) => o.id === opp)?.build ?? PRESETS[0]!;
  const { build } = activeBuild();
  return (
    <ScreenFrame title={t('quick.title')} subtitle={t('quick.subtitle')}>
      <div class={`${css.body} ${css.setup} ${css.scroll}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
          <Panel title={t('setup.arena')}>
            <ArenaPicker value={arena} onChange={setArena} profile={profile} />
          </Panel>
          <Panel title={t('quick.ai')}>
            <Row label={t('quick.personality')}>
              <select
                class={css.textInput}
                style={{ maxWidth: '14em', textTransform: 'none' }}
                value={ai}
                onChange={(e) => setAi((e.target as HTMLSelectElement).value)}
                aria-label={t('quick.personality')}
              >
                {PERSONALITIES.filter((p) => AI_PROFILES[p]).map((p) => (
                  <option key={p} value={p}>
                    {t(`ai.${p}`)}
                  </option>
                ))}
              </select>
            </Row>
            <Row label={t('campaign.difficulty')}>
              <Segmented
                label={t('campaign.difficulty')}
                value={difficulty}
                options={DIFFICULTIES.map((d) => ({ id: d, label: t(`difficulty.${d}`) }))}
                onChange={setDifficulty}
              />
            </Row>
            <p class={css.muted} style={{ fontSize: '0.85em' }}>
              {t('quick.rewardNote')}
            </p>
          </Panel>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
          <Panel title={t('quick.opponent')}>
            <RobotPreview build={oppBuild} label={oppBuild.name} height={180} />
            <RobotPicker options={options} value={opp} onChange={setOpp} label={t('quick.opponent')} />
          </Panel>
          <div class={css.footer}>
            <span class={css.muted} style={{ alignSelf: 'center' }}>
              {t('quick.you', { name: build.name })}
            </span>
            <Button
              variant="primary"
              size="big"
              onClick={() => startQuickMatch({ arenaId: arena, opponent: oppBuild, ai, difficulty })}
            >
              {t('quick.start')}
            </Button>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}
