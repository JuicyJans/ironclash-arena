import { useEffect } from 'preact/hooks';
import { getArena } from '../../config/arenas';
import { getLevel } from '../../config/campaign';
import { computeRobotStats } from '../../core/robot/computeStats';
import { go } from '../../state/actions';
import { RobotPreview } from '../components/RobotPreview';
import { StatBar } from '../components/StatBar';
import { useApp, useT } from '../hooks';
import css from './screens.module.css';
import type { RobotBuild } from '../../config/types';
import { crowd } from '../../audio/sfx';

const AUTO_SEC = 4.5;

function Side({ builds, right, color }: { builds: RobotBuild[]; right?: boolean; color: string }) {
  const t = useT();
  const b = builds[0]!;
  const s = computeRobotStats(b);
  return (
    <div class={`${css.vsSide} ${right ? css.vsRight : css.vsLeft}`}>
      <div class={css.vsName} style={{ color }}>
        {builds.map((x) => x.name).join(' + ')}
      </div>
      <div class={css.muted}>
        {t(`parts.chassis.${b.chassis}`)} · {t(`parts.weapon.${s.weaponType}.name`)} ·{' '}
        {t(`parts.drive.${s.driveType}.name`)}
      </div>
      <RobotPreview build={b} label={b.name} height={260} />
      <StatBar label={t('stats.hp')} value={s.hp} max={700} />
      <StatBar label={t('stats.topSpeed')} value={s.topSpeed} max={450} />
      <StatBar label={t('stats.damage')} value={s.damage} max={80} />
      <StatBar label={t('stats.weight')} value={s.weight} max={190} />
    </div>
  );
}

/** Boxing-style pre-match screen. Continues on any key, click or after a few seconds. */
export function VsScreen() {
  const t = useT();
  const session = useApp((s) => s.session);
  useEffect(() => {
    crowd(0.6);
    const next = () => go('match');
    const timer = setTimeout(next, AUTO_SEC * 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') next();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  if (!session) return null;
  const teams = [0, 1].map((team) =>
    session.config.robots.filter((r) => r.team === team).map((r) => r.build),
  );
  const level = session.levelId ? getLevel(session.levelId) : null;
  return (
    <main class={css.vs} onClick={() => go('match')} aria-label={t('vs.label')}>
      <Side builds={teams[0]!} color="var(--c-p1)" />
      <div style={{ textAlign: 'center' }}>
        <div class={css.vsMark}>VS</div>
        <div
          class={css.muted}
          style={{ fontFamily: 'var(--f-heading)', letterSpacing: '0.2em', textTransform: 'uppercase' }}
        >
          {t(getArena(session.config.arenaId).nameKey)}
        </div>
        {level && (
          <div style={{ marginTop: '0.6em' }}>
            {t(level.nameKey)}
            {level.boss && <span class={css.tag}>{t('campaign.boss')}</span>}
          </div>
        )}
        <p class={css.press} style={{ fontSize: '0.9em', marginTop: '2em' }}>
          {t('vs.continue')}
        </p>
      </div>
      <Side builds={teams[1]!} right color="var(--c-p2)" />
    </main>
  );
}
