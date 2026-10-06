interface Axis {
  label: string;
  value: number; // 0..1
  next?: number; // 0..1
}

/** SVG radar chart: current build (cyan) and pending change (orange outline). */
export function RadarChart({ axes, size = 220 }: { axes: Axis[]; size?: number }) {
  const c = size / 2;
  const r = size * 0.36;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / axes.length) * Math.PI * 2;
    return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v] as const;
  };
  const poly = (key: 'value' | 'next') =>
    axes.map((ax, i) => pt(i, Math.max(0.04, Math.min(1, ax[key] ?? ax.value))).join(',')).join(' ');
  const hasNext = axes.some((a) => a.next !== undefined && Math.abs(a.next - a.value) > 1e-3);
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={axes.map((a) => `${a.label} ${Math.round(a.value * 100)}%`).join(', ')}
    >
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon
          key={k}
          points={axes.map((_, i) => pt(i, k).join(',')).join(' ')}
          fill="none"
          stroke="rgba(138,147,163,0.25)"
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgba(138,147,163,0.2)" />;
      })}
      <polygon points={poly('value')} fill="rgba(34,211,238,0.25)" stroke="#22D3EE" stroke-width="2" />
      {hasNext && (
        <polygon
          points={poly('next')}
          fill="rgba(255,90,31,0.12)"
          stroke="#FF5A1F"
          stroke-width="2"
          stroke-dasharray="5 3"
        />
      )}
      {axes.map((ax, i) => {
        const [x, y] = pt(i, 1.22);
        return (
          <text
            key={ax.label}
            x={x}
            y={y}
            fill="#c4cad4"
            font-size="11"
            font-family="Rajdhani, sans-serif"
            font-weight="700"
            text-anchor="middle"
            dominant-baseline="middle"
          >
            {ax.label.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}
