import css from './components.module.css';

interface Props {
  label: string;
  value: number;
  /** Value after a pending change (before/after comparison). */
  next?: number;
  max: number;
  format?: (v: number) => string;
  /** For stats where lower is better (cooldown, weight). */
  lowerIsBetter?: boolean;
}

const fmt = (v: number) =>
  Math.abs(v) >= 10 ? Math.round(v).toString() : v.toFixed(2).replace(/\.?0+$/, '');

/** Segmented stat bar with green/red delta arrows for upgrade previews. */
export function StatBar({ label, value, next, max, format = fmt, lowerIsBetter }: Props) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  const delta = next === undefined ? 0 : next - value;
  const better = lowerIsBetter ? delta < 0 : delta > 0;
  const show = next !== undefined && Math.abs(delta) > 1e-6;
  return (
    <div
      class={css.stat}
      role="group"
      aria-label={`${label}: ${format(value)}${show ? ` → ${format(next!)}` : ''}`}
    >
      <span class={css.statLabel}>{label}</span>
      <div class={css.statTrack}>
        {show && (
          <div
            class={`${css.statGhost} ${better ? css.statGhostUp : css.statGhostDown}`}
            style={{ width: pct(Math.max(value, next!)) }}
          />
        )}
        <div class={css.statFill} style={{ width: pct(show ? Math.min(value, next!) : value) }} />
      </div>
      <span class={css.statValue}>{format(show ? next! : value)}</span>
      <span class={`${css.delta} ${better ? css.up : css.down}`} aria-hidden="true">
        {show ? `${delta > 0 ? '▲' : '▼'} ${format(Math.abs(delta))}` : ''}
      </span>
    </div>
  );
}
