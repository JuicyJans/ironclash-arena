import type { ComponentChildren } from 'preact';
import { uiClick } from '../../audio/sfx';
import css from './components.module.css';

export function Row({ label, children, id }: { label: string; children: ComponentChildren; id?: string }) {
  return (
    <div class={css.row}>
      <label class={css.rowLabel} for={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function Toggle({
  value,
  onChange,
  label,
  id,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      class={css.toggle}
      onClick={() => {
        uiClick();
        onChange(!value);
      }}
    />
  );
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  label,
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  id?: string;
}) {
  return (
    <input
      id={id}
      class={css.slider}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      aria-valuetext={`${Math.round(((value - min) / (max - min)) * 100)}%`}
      onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div class={css.segment} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          onClick={() => {
            uiClick();
            onChange(o.id);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Kbd({ children }: { children: ComponentChildren }) {
  return <kbd class={css.kbd}>{children}</kbd>;
}

export function Stars({ count, max = 3, label }: { count: number; max?: number; label: string }) {
  return (
    <span class={css.stars} role="img" aria-label={label}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} class={i < count ? css.starOn : undefined} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}

export function Currency({
  credits,
  scrap,
  labels,
}: {
  credits: number;
  scrap: number;
  labels: { credits: string; scrap: string };
}) {
  return (
    <div class={css.currency}>
      <span class={css.coin} aria-label={`${labels.credits}: ${credits}`}>
        ⛁ {credits.toLocaleString()}
      </span>
      <span class={css.scrap} aria-label={`${labels.scrap}: ${scrap}`}>
        ⚙ {scrap}
      </span>
    </div>
  );
}
