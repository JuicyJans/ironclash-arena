import { CHASSIS } from '../../../config/chassis';
import { getLevel } from '../../../config/campaign';
import { buyChassis, canBuyChassis, equipChassis, isUnlocked } from '../../../core/economy/shop';
import type { Profile } from '../../../core/save/schema';
import { coin, uiError } from '../../../audio/sfx';
import { toast, updateProfile } from '../../../state/actions';
import { Button } from '../../components/Button';
import { useT } from '../../hooks';
import css from '../screens.module.css';
import { errorText } from './PartsTab';

export function ChassisTab({
  profile,
  index,
  onPreview,
}: {
  profile: Profile;
  index: number;
  onPreview: (id: string | null) => void;
}) {
  const t = useT();
  const loadout = profile.loadouts[index]!;
  return (
    <div class={css.partGrid}>
      {Object.values(CHASSIS).map((c) => {
        const owned = profile.chassis.includes(c.id);
        const equipped = loadout.chassis === c.id;
        const err = canBuyChassis(profile, c.id);
        const open = isUnlocked(profile, c.unlockAfter);
        return (
          <div
            key={c.id}
            class={css.card}
            onMouseEnter={() => onPreview(c.id)}
            onMouseLeave={() => onPreview(null)}
            aria-pressed={equipped}
          >
            {equipped && <span class={css.equipped}>{t('garage.equipped')}</span>}
            <span class={css.cardTitle}>{t(c.nameKey)}</span>
            <span class={css.muted} style={{ fontSize: '0.85em' }}>
              {t('garage.chassisInfo', { limit: c.weightLimit, hp: c.base.hp })}
            </span>
            {!open && c.unlockAfter && (
              <span style={{ color: 'var(--c-signal)', fontSize: '0.85em' }}>
                {t('garage.unlockHint', { level: t(getLevel(c.unlockAfter).nameKey) })}
              </span>
            )}
            {!owned && (
              <Button
                size="small"
                variant="primary"
                disabled={!!err}
                onFocus={() => onPreview(c.id)}
                onClick={() => {
                  const res = buyChassis(profile, c.id);
                  if (!res.ok) {
                    uiError();
                    toast(errorText(t, res.error), 'error');
                    return;
                  }
                  coin();
                  updateProfile(() => res.profile);
                  const eq = equipChassis(res.profile, index, c.id);
                  if (eq.ok) updateProfile(() => eq.profile);
                }}
              >
                {t('shop.buy')} ⛁ {c.price}
                {c.scrap > 0 && ` ⚙ ${c.scrap}`}
              </Button>
            )}
            {owned && !equipped && (
              <Button
                size="small"
                onFocus={() => onPreview(c.id)}
                onClick={() => {
                  const res = equipChassis(profile, index, c.id);
                  if (res.ok) updateProfile(() => res.profile);
                  else toast(errorText(t, res.error), 'error');
                }}
              >
                {t('garage.equip')}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
