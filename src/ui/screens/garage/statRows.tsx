import type { RobotStats } from '../../../config/types';
import { t } from '../../../i18n';
import { RadarChart } from '../../components/RadarChart';
import { StatBar } from '../../components/StatBar';

interface Row {
  key: keyof RobotStats;
  max: number;
  lower?: boolean;
  pct?: boolean;
}

const ROWS: Row[] = [
  { key: 'hp', max: 700 },
  { key: 'topSpeed', max: 450 },
  { key: 'accel', max: 1500 },
  { key: 'turnRate', max: 6 },
  { key: 'armorFront', max: 0.6, pct: true },
  { key: 'armorSide', max: 0.6, pct: true },
  { key: 'armorRear', max: 0.6, pct: true },
  { key: 'armorTop', max: 0.6, pct: true },
  { key: 'damage', max: 80 },
  { key: 'cooldown', max: 3, lower: true },
  { key: 'range', max: 160 },
  { key: 'energyMax', max: 260 },
  { key: 'energyRegen', max: 45 },
  { key: 'pushForce', max: 2.6 },
  { key: 'flipResist', max: 0.85, pct: true },
];

const num = (s: RobotStats, k: keyof RobotStats) => (typeof s[k] === 'number' ? (s[k] as number) : 0);

/** All stat bars with before/after comparison. */
export function StatList({ stats, next }: { stats: RobotStats; next?: RobotStats }) {
  return (
    <div>
      {ROWS.map((r) => (
        <StatBar
          key={r.key}
          label={t(`stats.${r.key}`)}
          value={num(stats, r.key)}
          next={next ? num(next, r.key) : undefined}
          max={r.max}
          lowerIsBetter={r.lower}
          format={r.pct ? (v) => `${Math.round(v * 100)}%` : undefined}
        />
      ))}
    </div>
  );
}

const armorAvg = (s: RobotStats) => (s.armorFront + s.armorSide + s.armorRear + s.armorTop) / 4;

const axes = (s: RobotStats) => [
  { label: t('radar.hp'), v: s.hp / 650 },
  { label: t('radar.speed'), v: s.topSpeed / 420 },
  { label: t('radar.armor'), v: armorAvg(s) / 0.45 },
  { label: t('radar.damage'), v: s.damage / 70 },
  { label: t('radar.energy'), v: (s.energyMax / 240 + s.energyRegen / 40) / 2 },
  { label: t('radar.handling'), v: (s.turnRate / 5.5 + s.grip) / 2 },
];

export function StatRadar({ stats, next }: { stats: RobotStats; next?: RobotStats }) {
  const a = axes(stats);
  const b = next ? axes(next) : undefined;
  return (
    <RadarChart
      axes={a.map((x, i) => ({
        label: x.label,
        value: Math.min(1, x.v),
        next: b ? Math.min(1, b[i]!.v) : undefined,
      }))}
    />
  );
}
