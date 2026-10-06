import { useEffect, useMemo, useState } from 'preact/hooks';
import { CHASSIS } from '../../../config/chassis';
import type { PartCategory, PartDef } from '../../../config/types';
import { music } from '../../../audio/music';
import { loadoutToBuild, repair, repairCost } from '../../../core/economy/shop';
import { computeRobotStats } from '../../../core/robot/computeStats';
import { toast, updateProfile } from '../../../state/actions';
import { Button } from '../../components/Button';
import { Currency } from '../../components/Controls';
import { Panel } from '../../components/Panel';
import { RobotPreview } from '../../components/RobotPreview';
import { ScreenFrame } from '../../components/ScreenFrame';
import { Tabs } from '../../components/Tabs';
import { useApp, useT } from '../../hooks';
import css from '../screens.module.css';
import { ChassisTab } from './ChassisTab';
import { PaintTab } from './PaintTab';
import { PartsTab, previewFor } from './PartsTab';
import { StatList, StatRadar } from './statRows';

type Tab = 'chassis' | PartCategory | 'paint';
const TABS: Tab[] = ['chassis', 'armor', 'drive', 'weapon', 'power', 'support', 'paint'];

export function Garage() {
  const t = useT();
  const profile = useApp((s) => s.save.profile);
  const repairsOn = useApp((s) => s.settings.repairCosts);
  const [tab, setTab] = useState<Tab>('weapon');
  const [preview, setPreview] = useState<PartDef | null>(null);
  const [chassisPreview, setChassisPreview] = useState<string | null>(null);
  useEffect(() => music.play('garage'), []);

  const index = profile.activeLoadout;
  const loadout = profile.loadouts[index]!;
  const build = loadoutToBuild(profile, loadout);
  const stats = computeRobotStats(build);

  const nextStats = useMemo(() => {
    try {
      if (preview) {
        const p = previewFor(profile, loadout, preview);
        return computeRobotStats(loadoutToBuild(p.profile, p.loadout));
      }
      if (chassisPreview && chassisPreview !== loadout.chassis) {
        return computeRobotStats(loadoutToBuild(profile, { ...loadout, chassis: chassisPreview }));
      }
    } catch {
      return undefined;
    }
    return undefined;
  }, [preview, chassisPreview, profile, loadout]);

  const over = stats.weight > stats.weightLimit;
  const weightPct = (w: number, lim: number) => `${Math.min(100, (w / lim) * 100)}%`;
  const damage = profile.damage[index] ?? 0;
  const cost = repairCost(profile, index);

  return (
    <ScreenFrame
      title={t('garage.title')}
      subtitle={t('garage.subtitle')}
      right={
        <Currency
          credits={profile.credits}
          scrap={profile.scrap}
          labels={{ credits: t('common.credits'), scrap: t('common.scrap') }}
        />
      }
      solid
    >
      <div class={`${css.body} ${css.garage}`}>
        <div class={`${css.garageLeft} ${css.scroll}`}>
          <div class={css.slots} role="radiogroup" aria-label={t('garage.loadouts')}>
            {profile.loadouts.map((l, i) => (
              <Button
                key={i}
                class={css.slot}
                size="small"
                variant={i === index ? 'primary' : 'default'}
                role="radio"
                aria-checked={i === index}
                onClick={() => updateProfile((p) => ({ ...p, activeLoadout: i }))}
              >
                {i + 1}. {l.name}
              </Button>
            ))}
          </div>
          <Panel title={loadout.name}>
            <RobotPreview
              build={build}
              label={t('garage.previewLabel', { name: loadout.name })}
              height={250}
            />
            <div class={`${css.weight} ${over ? css.over : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span class={css.muted}>{t('garage.weight')}</span>
                <strong style={{ color: over ? 'var(--c-danger)' : undefined }}>
                  {stats.weight.toFixed(0)} / {stats.weightLimit} kg
                  {nextStats && Math.abs(nextStats.weight - stats.weight) > 0.1 && (
                    <span
                      style={{
                        color: nextStats.weight > nextStats.weightLimit ? 'var(--c-danger)' : 'var(--c-cyan)',
                      }}
                    >
                      {' '}
                      → {nextStats.weight.toFixed(0)} / {nextStats.weightLimit}
                    </span>
                  )}
                </strong>
              </div>
              <div
                class={css.weightBar}
                role="meter"
                aria-valuemin={0}
                aria-valuemax={stats.weightLimit}
                aria-valuenow={Math.round(stats.weight)}
                aria-label={t('garage.weight')}
              >
                <div class={css.weightFill} style={{ width: weightPct(stats.weight, stats.weightLimit) }} />
                {nextStats && (
                  <div
                    class={css.weightNext}
                    style={{ left: weightPct(nextStats.weight, nextStats.weightLimit) }}
                  />
                )}
              </div>
              {over && <span style={{ color: 'var(--c-danger)' }}>{t('garage.overweight')}</span>}
            </div>
            {damage > 0 && (repairsOn || profile.difficulty === 'mechanic') && (
              <div style={{ marginTop: '0.6em', display: 'flex', gap: '0.6em', alignItems: 'center' }}>
                <span style={{ color: 'var(--c-signal)' }}>
                  {t('campaign.damaged', { pct: Math.round(damage * 100) })}
                </span>
                <Button
                  size="small"
                  disabled={profile.credits < cost}
                  onClick={() => {
                    const res = repair(profile, index);
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
          </Panel>
          <Panel title={t('garage.stats')}>
            <StatRadar stats={stats} next={nextStats} />
          </Panel>
        </div>

        <Panel class={css.garageRight} style={{ minHeight: 0 }}>
          <Tabs<Tab>
            label={t('garage.categories')}
            value={tab}
            onChange={(id) => {
              setTab(id);
              setPreview(null);
            }}
            tabs={TABS.map((id) => ({ id, label: t(`garage.tabs.${id}`) }))}
          />
          {tab === 'chassis' && <ChassisTab profile={profile} index={index} onPreview={setChassisPreview} />}
          {tab === 'paint' && <PaintTab profile={profile} index={index} />}
          {tab !== 'chassis' && tab !== 'paint' && (
            <PartsTab key={tab} category={tab} profile={profile} index={index} onPreview={setPreview} />
          )}
          {tab !== 'paint' && (
            <section class={css.compare} aria-label={t('garage.compare')}>
              <h4 class={css.compareTitle}>{nextStats ? t('garage.compareActive') : t('garage.compare')}</h4>
              <StatList stats={stats} next={nextStats} />
            </section>
          )}
          <p class={css.muted} style={{ fontSize: '0.8em', marginTop: '0.6em' }}>
            {t('garage.hint', { limit: CHASSIS[loadout.chassis]?.weightLimit ?? 0 })}
          </p>
        </Panel>
      </div>
    </ScreenFrame>
  );
}
