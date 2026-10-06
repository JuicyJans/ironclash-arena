import { useEffect } from 'preact/hooks';
import { music } from '../../audio/music';
import { loadoutToBuild } from '../../core/economy/shop';
import { computeRobotStats } from '../../core/robot/computeStats';
import { totalStars } from '../../core/campaign/progress';
import { CAMPAIGN } from '../../config/campaign';
import { go, updateSettings } from '../../state/actions';
import type { Screen } from '../../state/store';
import { Button } from '../components/Button';
import { Currency, Segmented } from '../components/Controls';
import { Panel } from '../components/Panel';
import { RobotPreview } from '../components/RobotPreview';
import { useApp, useT } from '../hooks';
import { Logo } from './Splash';
import css from './screens.module.css';
import { GAME_VERSION } from '../../net/lobby';

export function MainMenu() {
  const t = useT();
  const profile = useApp((s) => s.save.profile);
  const lang = useApp((s) => s.settings.lang);
  useEffect(() => music.play('menu'), []);
  const loadout = profile.loadouts[profile.activeLoadout]!;
  const build = loadoutToBuild(profile, loadout);
  const stats = computeRobotStats(build);
  const items: { id: Screen; label: string; hint: string; primary?: boolean }[] = [
    {
      id: 'campaign',
      label: t('menu.campaign'),
      hint: `${totalStars(profile)}/${CAMPAIGN.length * 3} ★`,
      primary: true,
    },
    { id: 'quick', label: t('menu.quick'), hint: t('menu.quickHint') },
    { id: 'local', label: t('menu.local'), hint: t('menu.localHint') },
    { id: 'online', label: t('menu.online'), hint: t('menu.onlineHint') },
    { id: 'practice', label: t('menu.practice'), hint: t('menu.practiceHint') },
    { id: 'garage', label: t('menu.garage'), hint: t('menu.garageHint') },
    { id: 'settings', label: t('menu.settings'), hint: '' },
    { id: 'credits', label: t('menu.credits'), hint: '' },
  ];
  return (
    <main class={css.screen} aria-label={t('menu.title')}>
      <div class={css.header}>
        <Logo small />
        <div class={css.spacer} />
        <Currency
          credits={profile.credits}
          scrap={profile.scrap}
          labels={{ credits: t('common.credits'), scrap: t('common.scrap') }}
        />
        <Segmented
          label={t('settings.language')}
          value={lang}
          options={[
            { id: 'no', label: 'NO' },
            { id: 'en', label: 'EN' },
          ]}
          onChange={(l) => updateSettings({ lang: l })}
        />
      </div>
      <div class={`${css.body} ${css.menuGrid}`}>
        <nav class={css.menuList} aria-label={t('menu.title')} data-arrow-nav>
          {items.map((it, i) => (
            <Button
              key={it.id}
              variant={it.primary ? 'primary' : 'default'}
              size="big"
              onClick={() => go(it.id)}
              autoFocus={i === 0}
            >
              {it.label}
              {it.hint && <span class={css.menuHint}>{it.hint}</span>}
            </Button>
          ))}
        </nav>
        <Panel class={css.showcase} title={t('menu.yourRobot')}>
          <div>
            <h2 style={{ fontSize: '2em' }}>{loadout.name}</h2>
            <div class={css.muted}>
              {t(`parts.chassis.${loadout.chassis}`)} · {t(`parts.weapon.${stats.weaponType}.name`)} ·{' '}
              {t(`parts.drive.${stats.driveType}.name`)}
            </div>
          </div>
          <RobotPreview build={build} label={t('garage.previewLabel', { name: loadout.name })} height={300} />
          <div class={css.footer} style={{ justifyContent: 'space-between' }}>
            <span class={css.muted}>
              {t('menu.record', { wins: profile.stats.wins, matches: profile.stats.matches })}
            </span>
            <Button size="small" onClick={() => go('garage')}>
              {t('menu.garage')} →
            </Button>
          </div>
        </Panel>
      </div>
      <div class={css.version}>
        v{GAME_VERSION} · {t('menu.footer')}
      </div>
    </main>
  );
}
