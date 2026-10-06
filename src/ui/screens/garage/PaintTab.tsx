import type { Cosmetics } from '../../../config/types';
import type { Profile } from '../../../core/save/schema';
import { uiClick } from '../../../audio/sfx';
import { updateProfile } from '../../../state/actions';
import { Row } from '../../components/Controls';
import { useT } from '../../hooks';
import css from '../screens.module.css';

const PALETTE = [
  '#2b6cb0',
  '#c53030',
  '#2f855a',
  '#d69e2e',
  '#805ad5',
  '#dd6b20',
  '#1a202c',
  '#718096',
  '#e2e8f0',
  '#b83280',
  '#2c7a7b',
  '#975a16',
];
const LEDS = ['#22D3EE', '#FFC21A', '#FF5A1F', '#3ddc84', '#ff4d6d', '#b794f4', '#ffffff', '#63b3ed'];
const DECALS: Cosmetics['decal'][] = ['none', 'stripes', 'flames', 'skull', 'bolt', 'checker', 'number'];

function Swatches({
  value,
  colors,
  onPick,
  label,
}: {
  value: string;
  colors: string[];
  onPick: (c: string) => void;
  label: string;
}) {
  return (
    <div class={css.swatches} role="radiogroup" aria-label={label}>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          class={css.swatch}
          style={{ background: c }}
          aria-checked={value.toLowerCase() === c.toLowerCase()}
          aria-label={c}
          onClick={() => {
            uiClick();
            onPick(c);
          }}
        />
      ))}
    </div>
  );
}

export function PaintTab({ profile, index }: { profile: Profile; index: number }) {
  const t = useT();
  const l = profile.loadouts[index]!;
  const set = (patch: Partial<Cosmetics> & { name?: string }) =>
    updateProfile((p) => ({
      ...p,
      loadouts: p.loadouts.map((x, i) => {
        if (i !== index) return x;
        const { name, ...cos } = patch;
        return { ...x, name: name ?? x.name, cosmetics: { ...x.cosmetics, ...cos } };
      }),
    }));
  return (
    <div class={css.scroll}>
      <Row label={t('garage.paint.name')} id="robot-name">
        <input
          id="robot-name"
          class={css.textInput}
          style={{ maxWidth: '16em' }}
          maxLength={20}
          value={l.name}
          onInput={(e) => {
            const v = (e.target as HTMLInputElement).value.replace(/[^\p{L}\p{N} \-_.!]/gu, '').slice(0, 20);
            if (v.trim()) set({ name: v });
          }}
        />
      </Row>
      <Row label={t('garage.paint.primary')}>
        <Swatches
          label={t('garage.paint.primary')}
          value={l.cosmetics.primary}
          colors={PALETTE}
          onPick={(c) => set({ primary: c })}
        />
      </Row>
      <Row label={t('garage.paint.secondary')}>
        <Swatches
          label={t('garage.paint.secondary')}
          value={l.cosmetics.secondary}
          colors={PALETTE}
          onPick={(c) => set({ secondary: c })}
        />
      </Row>
      <Row label={t('garage.paint.led')}>
        <Swatches
          label={t('garage.paint.led')}
          value={l.cosmetics.led}
          colors={LEDS}
          onPick={(c) => set({ led: c })}
        />
      </Row>
      <Row label={t('garage.paint.decal')}>
        <div class={css.swatches} role="radiogroup" aria-label={t('garage.paint.decal')}>
          {DECALS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              class={css.choice}
              aria-checked={l.cosmetics.decal === d}
              onClick={() => {
                uiClick();
                set({ decal: d });
              }}
            >
              {t(`garage.decals.${d}`)}
            </button>
          ))}
        </div>
      </Row>
    </div>
  );
}
