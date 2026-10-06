import { useState } from 'preact/hooks';
import { DIFFICULTIES } from '../../config/aiProfiles';
import { getArena } from '../../config/arenas';
import { CAMPAIGN, LEAGUES, STAR_DAMAGE_THRESHOLD } from '../../config/campaign';
import { ECONOMY } from '../../config/economy';
import { isLevelUnlocked, nextLevel, totalStars } from '../../core/campaign/progress';
import { repair, repairCost } from '../../core/economy/shop';
import { go, startCampaignLevel, toast, updateProfile } from '../../state/actions';
import { Button } from '../components/Button';
import { Currency, Segmented, Stars } from '../components/Controls';
import { Panel } from '../components/Panel';
import { RobotPreview } from '../components/RobotPreview';
import { ScreenFrame } from '../components/ScreenFrame';
import { useApp, useT } from '../hooks';
import css from './screens.module.css';

const LEAGUE_COLORS: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c7d1',
  gold: '#FFC21A',
  master: '#FF5A1F',
};

export function Campaign() {
  const t = useT();
  const profile = useApp((s) => s.save.profile);
  const repairsOn = useApp((s) => s.settings.repairCosts);
  const [selected, setSelected] = useState(() => nextLevel(profile).id);
  const level = CAMPAIGN.find((l) => l.id === selected) ?? CAMPAIGN[0]!;
  const rec = profile.campaign.levels[level.id];
  const unlocked = isLevelUnlocked(profile, level.id);
  const arena = getArena(level.arena);
  const idx = profile.activeLoadout;
  const damage = profile.damage[idx] ?? 0;
  const cost = repairCost(profile, idx);
  const carry = repairsOn || profile.difficulty === 'mechanic';
  const reward =
    ECONOMY.reward.winBase + ECONOMY.reward.winPerLevel * CAMPAIGN.indexOf(level) + level.rewardBase;

  return (
    <ScreenFrame
      title={t('campaign.title')}
      subtitle={t('campaign.subtitle', { stars: totalStars(profile), max: CAMPAIGN.length * 3 })}
      right={
        <Currency
          credits={profile.credits}
          scrap={profile.scrap}
          labels={{ credits: t('common.credits'), scrap: t('common.scrap') }}
        />
      }
    >
      <div class={`${css.body} ${css.ladder}`}>
        {LEAGUES.map((league) => (
          <section key={league} class={css.league} aria-label={t(`campaign.league.${league}`)}>
            <div class={css.leagueTitle} style={{ color: LEAGUE_COLORS[league] }}>
              {t(`campaign.league.${league}`)}
            </div>
            <div class={css.muted} style={{ fontSize: '0.85em' }}>
              {t(getArena(CAMPAIGN.find((l) => l.league === league)!.arena).nameKey)}
            </div>
            {CAMPAIGN.filter((l) => l.league === league).map((l) => {
              const open = isLevelUnlocked(profile, l.id);
              const r = profile.campaign.levels[l.id];
              const n = CAMPAIGN.indexOf(l) + 1;
              return (
                <button
                  key={l.id}
                  class={`${css.node} ${l.boss ? css.boss : ''}`}
                  aria-pressed={selected === l.id}
                  disabled={!open}
                  onClick={() => setSelected(l.id)}
                  aria-label={`${n}. ${l.opponents.map((o) => o.build.name).join(' + ')}${open ? '' : `, ${t('common.locked')}`}${r ? `, ${r.stars} ${t('common.stars')}` : ''}`}
                >
                  <span class={css.nodeNum}>{open ? n : '🔒'}</span>
                  <span class={css.nodeName}>
                    {l.opponents.map((o) => o.build.name).join(' + ')}
                    {l.boss && <span class={css.tag}>{t('campaign.boss')}</span>}
                  </span>
                  <Stars count={r?.stars ?? 0} label={`${r?.stars ?? 0} ${t('common.stars')}`} />
                </button>
              );
            })}
          </section>
        ))}

        <Panel
          title={t('campaign.details')}
          style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: '0.6em' }}
        >
          <h2 style={{ fontSize: '1.7em' }}>
            {CAMPAIGN.indexOf(level) + 1}. {t(level.nameKey)}
          </h2>
          <RobotPreview
            build={level.opponents[0]!.build}
            label={level.opponents[0]!.build.name}
            height={170}
          />
          <div class={css.muted}>
            {t('campaign.opponent')}:{' '}
            <strong style={{ color: 'var(--c-text)' }}>
              {level.opponents.map((o) => o.build.name).join(' + ')}
            </strong>
          </div>
          <div class={css.muted}>
            {t('campaign.arena')}: <strong style={{ color: 'var(--c-text)' }}>{t(arena.nameKey)}</strong>
          </div>
          <div class={css.muted} style={{ fontSize: '0.88em' }}>
            {t('campaign.starRules', { par: level.parTime, dmg: Math.round(STAR_DAMAGE_THRESHOLD * 100) })}
          </div>
          <div class={css.muted}>
            {t('campaign.reward')}: <span style={{ color: 'var(--c-hazard)' }}>⛁ {reward}</span>
            {level.scrapReward > 0 && <span> · ⚙ {level.scrapReward}</span>}
          </div>
          {rec?.bestTime !== null && rec?.bestTime !== undefined && (
            <div class={css.muted}>
              {t('campaign.best')}: {rec.bestTime.toFixed(1)} s
            </div>
          )}
          <div>
            <div class={css.muted} style={{ fontSize: '0.85em', marginBottom: '0.3em' }}>
              {t('campaign.difficulty')}
            </div>
            <Segmented
              label={t('campaign.difficulty')}
              value={profile.difficulty}
              options={DIFFICULTIES.map((d) => ({ id: d, label: t(`difficulty.${d}`) }))}
              onChange={(d) => updateProfile((p) => ({ ...p, difficulty: d }))}
            />
          </div>
          {carry && damage > 0 && (
            <div style={{ color: 'var(--c-signal)' }}>
              {t('campaign.damaged', { pct: Math.round(damage * 100) })}{' '}
              <Button
                size="small"
                disabled={profile.credits < cost}
                onClick={() => {
                  const res = repair(profile, idx);
                  if (res.ok) {
                    updateProfile(() => res.profile);
                    toast(t('campaign.repaired'), 'success');
                  }
                }}
              >
                {t('campaign.repair', { cost })}
              </Button>
            </div>
          )}
          <div style={{ flex: 1 }} />
          <div class={css.footer}>
            <Button onClick={() => go('garage')}>{t('menu.garage')}</Button>
            <Button
              variant="primary"
              size="big"
              disabled={!unlocked}
              onClick={() => startCampaignLevel(level.id)}
            >
              {t('campaign.fight')}
            </Button>
          </div>
        </Panel>
      </div>
    </ScreenFrame>
  );
}
