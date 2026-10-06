import { useState } from 'preact/hooks';
import type { PartCategory, PartDef } from '../../../config/types';
import { PARTS } from '../../../config/upgrades';
import { getLevel } from '../../../config/campaign';
import {
  buyNext,
  canBuyNext,
  equip,
  isUnlocked,
  nextLevelCost,
  ownedLevel,
  sellPart,
  sellValue,
  withPart,
  type ShopError,
} from '../../../core/economy/shop';
import type { Loadout, Profile } from '../../../core/save/schema';
import { coin, uiError } from '../../../audio/sfx';
import { toast, updateProfile } from '../../../state/actions';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useT } from '../../hooks';
import css from '../screens.module.css';

export const isEquipped = (l: Loadout, p: PartDef): boolean =>
  p.category === 'support'
    ? l.support.includes(p.id)
    : (l as unknown as Record<string, string>)[p.category] === p.id;

/** The loadout + inventory you'd get by acting on `part` (for before/after previews). */
export function previewFor(
  profile: Profile,
  loadout: Loadout,
  part: PartDef,
): { profile: Profile; loadout: Loadout } {
  const owned = ownedLevel(profile, part.id);
  const equipped = isEquipped(loadout, part);
  const level = owned === 0 ? 1 : equipped ? Math.min(part.levels.length, owned + 1) : owned;
  const p = { ...profile, inventory: { ...profile.inventory, [part.id]: level } };
  if (equipped && part.category !== 'support') return { profile: p, loadout };
  if (part.category === 'support' && equipped && owned < part.levels.length) return { profile: p, loadout };
  return { profile: p, loadout: withPart(loadout, part.category, part.id) };
}

export function errorText(
  t: (k: string, p?: Record<string, string | number>) => string,
  e: ShopError,
): string {
  return t(`shop.errors.${e}`);
}

export function PartsTab({
  category,
  profile,
  index,
  onPreview,
}: {
  category: PartCategory;
  profile: Profile;
  index: number;
  onPreview: (part: PartDef | null) => void;
}) {
  const t = useT();
  const loadout = profile.loadouts[index]!;
  const parts = PARTS.filter((p) => p.category === category);
  const [selectedId, setSelectedId] = useState(
    () => parts.find((p) => isEquipped(loadout, p))?.id ?? parts[0]?.id,
  );
  const [confirmSell, setConfirmSell] = useState(false);
  const part = parts.find((p) => p.id === selectedId) ?? parts[0]!;
  const owned = ownedLevel(profile, part.id);
  const equipped = isEquipped(loadout, part);
  const cost = nextLevelCost(profile, part.id);
  const buyErr = canBuyNext(profile, part.id);
  const unlocked = isUnlocked(profile, part.unlockAfter);

  const apply = (res: { ok: true; profile: Profile } | { ok: false; error: ShopError }, msg?: string) => {
    if (!res.ok) {
      uiError();
      toast(errorText(t, res.error), 'error');
      return false;
    }
    updateProfile(() => res.profile);
    if (msg) toast(msg, 'success');
    return true;
  };

  const buy = () => {
    const res = buyNext(profile, part.id);
    if (!apply(res)) return;
    coin();
    if (res.ok && !equipped) {
      const eq = equip(res.profile, index, part.category, part.id);
      if (eq.ok) updateProfile(() => eq.profile);
      else toast(errorText(t, eq.error), 'info');
    }
    toast(t('shop.bought', { name: t(part.nameKey), level: owned + 1 }), 'success');
  };

  return (
    <div class={css.scroll} style={{ flex: 1 }}>
      <div class={css.partGrid} role="listbox" aria-label={t(`garage.tabs.${category}`)}>
        {parts.map((p) => {
          const lv = ownedLevel(profile, p.id);
          const open = isUnlocked(profile, p.unlockAfter);
          return (
            <button
              key={p.id}
              class={css.card}
              role="option"
              aria-selected={p.id === part.id}
              aria-pressed={p.id === part.id}
              onClick={() => setSelectedId(p.id)}
              onMouseEnter={() => onPreview(p)}
              onFocus={() => onPreview(p)}
              onMouseLeave={() => onPreview(null)}
              onBlur={() => onPreview(null)}
            >
              {isEquipped(loadout, p) && <span class={css.equipped}>{t('garage.equipped')}</span>}
              <span class={css.cardTitle}>{open ? t(p.nameKey) : `🔒 ${t(p.nameKey)}`}</span>
              <span class={css.cardMeta}>
                <span class={css.pips} aria-label={t('garage.levelOf', { level: lv, max: p.levels.length })}>
                  {p.levels.map((_, i) => (
                    <span key={i} class={`${css.pip} ${i < lv ? css.pipOn : ''}`} />
                  ))}
                </span>
                <span>
                  {lv === 0
                    ? open
                      ? `⛁ ${p.levels[0]!.price}`
                      : t('common.locked')
                    : `${t('garage.level')} ${lv}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div class={css.detail}>
        <div>
          <h3 style={{ fontSize: '1.4em' }}>{t(part.nameKey)}</h3>
          <p class={css.muted} style={{ margin: '0.3em 0 0.6em' }}>
            {t(part.descKey)}
          </p>
          {!unlocked && part.unlockAfter && (
            <p style={{ color: 'var(--c-signal)' }}>
              {t('garage.unlockHint', { level: t(getLevel(part.unlockAfter).nameKey) })}
            </p>
          )}
          {owned > 0 && (
            <p class={css.muted}>{t('garage.owned', { level: owned, max: part.levels.length })}</p>
          )}
        </div>
        <div class={css.actions}>
          {owned < part.levels.length && (
            <Button
              variant="primary"
              disabled={!!buyErr}
              onClick={buy}
              onMouseEnter={() => onPreview(part)}
              title={buyErr ? errorText(t, buyErr) : undefined}
            >
              {owned === 0 ? t('shop.buy') : t('shop.upgrade')} ⛁ {cost?.price ?? 0}
              {(cost?.scrap ?? 0) > 0 && ` ⚙ ${cost?.scrap}`}
            </Button>
          )}
          {owned > 0 && !equipped && (
            <Button
              onClick={() =>
                apply(
                  equip(profile, index, part.category, part.id),
                  t('garage.equippedMsg', { name: t(part.nameKey) }),
                )
              }
            >
              {t('garage.equip')}
            </Button>
          )}
          {owned > 0 && equipped && part.category === 'support' && (
            <Button onClick={() => apply(equip(profile, index, part.category, part.id))}>
              {t('garage.unequip')}
            </Button>
          )}
          {owned > 0 && (
            <Button variant="ghost" size="small" onClick={() => setConfirmSell(true)}>
              {t('shop.sell')} ⛁ {sellValue(profile, part.id)}
            </Button>
          )}
        </div>
      </div>

      {confirmSell && (
        <Modal title={t('shop.sellTitle')} onClose={() => setConfirmSell(false)}>
          <p>{t('shop.sellConfirm', { name: t(part.nameKey), value: sellValue(profile, part.id) })}</p>
          <div class={css.footer}>
            <Button onClick={() => setConfirmSell(false)}>{t('common.cancel')}</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (apply(sellPart(profile, part.id), t('shop.sold'))) coin();
                setConfirmSell(false);
              }}
            >
              {t('shop.sell')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
