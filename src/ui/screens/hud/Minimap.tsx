import type { HudState } from '../../../state/store';
import { t } from '../../../i18n';
import css from './hud.module.css';

const TEAM = ['var(--c-p1)', 'var(--c-p2)', '#a3e635', '#f472b6'];

/** Arena overview with hazards (phase shown by fill AND outline style, not colour alone). */
export function Minimap({ hud }: { hud: HudState }) {
  const { w, h } = hud.arena;
  return (
    <div class={css.minimap}>
      <svg viewBox={`-20 -20 ${w + 40} ${h + 40}`} width="100%" role="img" aria-label={t('hud.minimap')}>
        <rect x={0} y={0} width={w} height={h} fill="#1b1e23" stroke="#4a515c" stroke-width="8" />
        {hud.pits.map((p, i) => (
          <rect
            key={`p${i}`}
            x={p.x}
            y={p.y}
            width={p.w}
            height={p.h}
            fill={p.open ? '#000' : 'none'}
            stroke="#FFC21A"
            stroke-width="8"
            stroke-dasharray={p.open ? undefined : '20 14'}
          />
        ))}
        {hud.hazards.map((z, i) => {
          if (z.kind === 'ice' || z.kind === 'turntable') {
            return <rect key={i} x={z.x} y={z.y} width={z.w} height={z.h} fill="rgba(140,200,240,0.18)" />;
          }
          const active = z.phase === 3;
          const tele = z.phase === 2;
          return (
            <rect
              key={i}
              x={z.x}
              y={z.y}
              width={z.w}
              height={z.h}
              fill={active ? 'rgba(255,59,31,0.75)' : 'rgba(255,90,31,0.12)'}
              stroke={tele || active ? '#ff3b1f' : '#6b4a3a'}
              stroke-width={tele ? 10 : 5}
              stroke-dasharray={tele ? '16 10' : undefined}
            />
          );
        })}
        {hud.positions.map((p, i) =>
          p.alive ? (
            <g key={i} transform={`translate(${p.x} ${p.y})`}>
              <polygon
                points="40,0 -26,-26 -16,0 -26,26"
                transform={`rotate(${(p.angle * 180) / Math.PI})`}
                fill={TEAM[p.team] ?? '#fff'}
                stroke="#000"
                stroke-width="6"
              />
              <text
                x={0}
                y={-40}
                font-size="44"
                font-weight="700"
                fill="#fff"
                stroke="#000"
                stroke-width="3"
                text-anchor="middle"
              >
                {i + 1}
              </text>
            </g>
          ) : null,
        )}
      </svg>
    </div>
  );
}
