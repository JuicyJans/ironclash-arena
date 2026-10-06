import { ARENA_IDS, ARENAS } from '../../config/arenas';
import { getLevel } from '../../config/campaign';
import type { RobotBuild } from '../../config/types';
import { isUnlocked } from '../../core/economy/shop';
import type { Profile } from '../../core/save/schema';
import { uiClick } from '../../audio/sfx';
import { t } from '../../i18n';
import css from '../screens/screens.module.css';

/** Grid of arenas; locked ones show which campaign level unlocks them. */
export function ArenaPicker({
  value,
  onChange,
  profile,
  ignoreLocks,
}: {
  value: string;
  onChange: (id: string) => void;
  profile: Profile;
  ignoreLocks?: boolean;
}) {
  return (
    <div class={css.choiceGrid} role="radiogroup" aria-label={t('setup.arena')}>
      {ARENA_IDS.map((id) => {
        const a = ARENAS[id]!;
        const open = ignoreLocks || isUnlocked(profile, a.unlockAfter);
        return (
          <button
            key={id}
            type="button"
            role="radio"
            class={css.choice}
            aria-checked={value === id}
            disabled={!open}
            title={
              open ? t(a.descKey) : t('garage.unlockHint', { level: t(getLevel(a.unlockAfter!).nameKey) })
            }
            onClick={() => {
              uiClick();
              onChange(id);
            }}
            style={{ borderLeft: `4px solid ${a.theme.accent}` }}
          >
            <div class={css.choiceTitle}>{open ? t(a.nameKey) : `🔒 ${t(a.nameKey)}`}</div>
            <div class={css.muted} style={{ fontSize: '0.8em' }}>
              {open ? t(a.descKey) : t('common.locked')}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export interface RobotOption {
  id: string;
  build: RobotBuild;
  label: string;
  sub: string;
}

export function RobotPicker({
  options,
  value,
  onChange,
  label,
}: {
  options: RobotOption[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div class={css.choiceGrid} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          class={css.choice}
          aria-checked={value === o.id}
          onClick={() => {
            uiClick();
            onChange(o.id);
          }}
          style={{ borderLeft: `4px solid ${o.build.cosmetics.primary}` }}
        >
          <div class={css.choiceTitle}>{o.label}</div>
          <div class={css.muted} style={{ fontSize: '0.8em' }}>
            {o.sub}
          </div>
        </button>
      ))}
    </div>
  );
}
