import { BALANCE } from '../../../config/balance';
import { keyLabel } from '../../../game/input/keyboard';
import { gameBridge } from '../../../state/gameBridge';
import type { HudRobot, HudState } from '../../../state/store';
import { useApp, useT } from '../../hooks';
import css from './hud.module.css';
import { Minimap } from './Minimap';

const SEGMENTS = 20;
const TEAM_COLORS = ['var(--c-p1)', 'var(--c-p2)'];

function HpBar({ r }: { r: HudRobot }) {
  const frac = Math.max(0, r.hp / r.maxHp);
  const on = Math.ceil(frac * SEGMENTS);
  const cls = frac < 0.25 ? css.segLow : frac < 0.5 ? css.segMid : css.segOn;
  return (
    <div
      class={css.hp}
      role="meter"
      aria-label="HP"
      aria-valuemin={0}
      aria-valuemax={r.maxHp}
      aria-valuenow={Math.round(r.hp)}
    >
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <div key={i} class={`${css.seg} ${i < on ? cls : ''}`} />
      ))}
    </div>
  );
}

function RobotCard({ r, showCooldown, label }: { r: HudRobot; showCooldown: boolean; label: string }) {
  const t = useT();
  const ready = r.cooldown <= 0.01;
  const cdPct = Math.min(1, r.cooldown / r.cooldownMax);
  const im = r.immobile > BALANCE.immobile.showAfterSec && r.alive;
  return (
    <div class={css.card} style={{ opacity: r.alive ? 1 : 0.45 }}>
      <div class={css.nameRow}>
        <span class={css.badge} style={{ background: TEAM_COLORS[r.team] ?? '#fff' }}>
          {label}
        </span>
        <span>{r.name}</span>
      </div>
      <HpBar r={r} />
      <div class={css.bars}>
        <div class={css.thin} title={t('hud.energy')} aria-label={t('hud.energy')}>
          <div class={css.thinFill} style={{ width: `${(r.energy / Math.max(1, r.energyMax)) * 100}%` }} />
        </div>
        <div class={css.weapon}>
          {showCooldown ? (
            <span class={ready ? css.ready : css.cool}>
              {r.weapon}{' '}
              {r.rpm > 0.05
                ? `${Math.round(r.rpm * 100)}%`
                : ready
                  ? '●'
                  : `${Math.round((1 - cdPct) * 100)}%`}
            </span>
          ) : (
            <span class={css.cool}>{r.weapon}</span>
          )}
        </div>
      </div>
      <div class={css.status}>
        {!r.alive && <span class={css.chip}>{t('hud.ko')}</span>}
        {r.inverted && r.alive && <span class={`${css.chip} ${css.chipWarn}`}>{t('hud.flipped')}</span>}
        {r.driveDamaged && <span class={css.chip}>{t('hud.driveDamaged')}</span>}
        {r.weaponDamaged && <span class={css.chip}>{t('hud.weaponDamaged')}</span>}
        {im && (
          <span class={css.chip}>
            {t('hud.immobile', { s: Math.ceil(BALANCE.immobile.countdownSec - r.immobile) })}
          </span>
        )}
        {r.specialCd > 0 && <span class={css.cool}>{t('hud.special', { s: Math.ceil(r.specialCd) })}</span>}
      </div>
    </div>
  );
}

function fmtTime(s: number): string {
  const v = Math.max(0, Math.ceil(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
}

export function Hud({ hud }: { hud: HudState }) {
  const t = useT();
  const session = useApp((s) => s.session);
  const keymap = useApp((s) => s.settings.keymaps.p1);
  if (!session) return null;
  const local = session.localTeam;
  const left = hud.robots.filter((r) => r.team === 0);
  const right = hud.robots.filter((r) => r.team !== 0);
  const me = hud.robots.find((r) => r.team === local && r.human);
  const lowHp = me && me.alive && me.hp / me.maxHp < 0.3 && session.kind !== 'local';
  const practice = session.kind === 'practice';
  const labelFor = (r: HudRobot) =>
    r.human
      ? session.kind === 'local'
        ? `P${r.playerIndex + 1}`
        : r.team === local
          ? t('hud.you')
          : 'P2'
      : 'CPU';
  const myImmobile = me && me.alive && me.immobile > BALANCE.immobile.showAfterSec;
  const step = hud.tutorial?.step;
  const keys = {
    up: keyLabel(keymap.up),
    down: keyLabel(keymap.down),
    left: keyLabel(keymap.left),
    right: keyLabel(keymap.right),
    weapon: keyLabel(keymap.weapon),
    special: keyLabel(keymap.special),
    boost: keyLabel(keymap.boost),
  };

  return (
    <div class={css.hud} aria-live="off">
      {lowHp && <div class={css.vignette} />}
      <div class={css.top}>
        <div class={css.side}>
          {left.map((r, i) => (
            <RobotCard key={i} r={r} label={labelFor(r)} showCooldown />
          ))}
        </div>
        <div
          class={`${css.timer} ${hud.timeLeft < 20 && !practice ? css.timerLow : ''}`}
          role="timer"
          aria-label={t('hud.timeLeft')}
        >
          {practice ? '∞' : fmtTime(hud.timeLeft)}
          <div class={css.timerSub}>
            {practice
              ? t('hud.practice')
              : hud.timeLeft < 30
                ? t('hud.judges', { a: Math.round(hud.scores[0] ?? 0), b: Math.round(hud.scores[1] ?? 0) })
                : hud.pits.some((p) => p.open)
                  ? t('hud.pitOpen')
                  : t('hud.fight')}
          </div>
        </div>
        <div class={`${css.side} ${css.right}`}>
          {right.map((r, i) => (
            <RobotCard
              key={i}
              r={r}
              label={labelFor(r)}
              showCooldown={hud.showOpponentCooldown || session.kind === 'local' || r.team === local}
            />
          ))}
        </div>
      </div>

      {hud.countdown !== null && !step && (
        <div class={css.center} aria-live="assertive">
          <div key={hud.countdown} class={css.count}>
            {hud.countdown > 0 ? hud.countdown : t('hud.go')}
          </div>
        </div>
      )}
      {hud.countdown === null && myImmobile && (
        <div class={css.center} aria-live="assertive">
          <span class={css.warn}>
            {me.inverted
              ? t('hud.selfRightHint', { weapon: keys.weapon, special: keys.special })
              : t('hud.moveHint')}
            <span class={css.warnBig}>{Math.ceil(BALANCE.immobile.countdownSec - me.immobile)}</span>
          </span>
        </div>
      )}
      {hud.net === 'disconnected' && (
        <div class={css.center} aria-live="assertive">
          <span class={css.warn}>
            {t('hud.disconnected')}
            <span class={css.warnBig}>{Math.ceil(hud.disconnectLeft ?? 0)}</span>
          </span>
        </div>
      )}
      {hud.net === 'waiting' && (
        <div class={css.center}>
          <span class={css.warn} style={{ color: 'var(--c-cyan)' }}>
            {t('hud.waitingHost')}
          </span>
        </div>
      )}
      {hud.ping !== undefined && <div class={css.net}>{t('online.ping', { ms: hud.ping })}</div>}

      {step && (
        <div class={css.tutorial} role="status">
          <div class={css.tutorialTitle}>{t(`tutorial.${step}.title`)}</div>
          <div>{t(`tutorial.${step}.text`, keys)}</div>
          <div class={css.progress}>
            <div class={css.progressFill} style={{ width: `${(hud.tutorial?.progress ?? 0) * 100}%` }} />
          </div>
          <button type="button" class={css.skip} onClick={() => gameBridge.skipTutorial()}>
            {t('common.skip')} ›
          </button>
        </div>
      )}

      {hud.aiDebug && hud.aiDebug.length > 0 && <div class={css.debug}>{hud.aiDebug.join('\n')}</div>}
      <Minimap hud={hud} />
    </div>
  );
}
