import { useEffect, useState } from 'preact/hooks';
import { getLevel } from '../../config/campaign';
import { coin, crowd } from '../../audio/sfx';
import { music } from '../../audio/music';
import { netLobby } from '../../net/session';
import { gameBridge } from '../../state/gameBridge';
import { go, restartMatch, startCampaignLevel } from '../../state/actions';
import { store } from '../../state/store';
import { Button } from '../components/Button';
import { Stars } from '../components/Controls';
import { Panel } from '../components/Panel';
import { ScreenFrame } from '../components/ScreenFrame';
import { useApp, useT } from '../hooks';
import css from './screens.module.css';
import { CAMPAIGN } from '../../config/campaign';

/** Counts a number up with coin sounds. */
function useCountUp(target: number, delayMs: number): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const dur = 1200;
    const step = (now: number) => {
      if (!start) start = now;
      const p = Math.min(1, (now - start - delayMs) / dur);
      if (p > 0) setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const ticks = setInterval(() => coin(), 150);
    const stop = setTimeout(() => clearInterval(ticks), delayMs + dur);
    const begin = setTimeout(() => undefined, delayMs);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(ticks);
      clearTimeout(stop);
      clearTimeout(begin);
    };
  }, [target, delayMs]);
  return v;
}

export function Results() {
  const t = useT();
  const res = useApp((s) => s.results);
  useEffect(() => {
    gameBridge.stopMatch();
    music.play('menu');
    if (res?.won) crowd(1);
  }, []);
  const credits = useCountUp(res?.rewards?.credits ?? 0, 500);
  if (!res) return null;
  const { session, result } = res;
  const level = session.levelId ? getLevel(session.levelId) : null;
  const nextLvl = level ? CAMPAIGN[CAMPAIGN.indexOf(level) + 1] : undefined;
  const verdict =
    res.won === null
      ? t('results.winner', { name: res.winnerName || t('results.nobody') })
      : res.won
        ? t('results.victory')
        : t('results.defeat');
  const backToLobby = () => {
    netLobby.backToLobby();
    store.set({ session: null, results: null });
    go('online');
  };
  return (
    <ScreenFrame title={t('results.title')} back={null}>
      <div class={`${css.body} ${css.results} ${css.scroll}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
          <div class={`${css.verdict} ${res.won === false ? css.lose : css.win}`}>{verdict}</div>
          <div class={css.muted} style={{ fontSize: '1.2em' }}>
            {t(`results.reason.${result.reason}`)} · {result.durationSec.toFixed(1)} s
          </div>
          {res.rewards && level && (
            <div class={css.bigStars}>
              <Stars count={res.rewards.stars} label={t('results.starsLabel', { n: res.rewards.stars })} />
            </div>
          )}
          <Panel title={t('results.stats')}>
            <table class={css.table}>
              <thead>
                <tr>
                  <th>{t('results.robot')}</th>
                  <th>{t('results.dealt')}</th>
                  <th>{t('results.taken')}</th>
                  <th>{t('results.flips')}</th>
                  <th>{t('results.hp')}</th>
                </tr>
              </thead>
              <tbody>
                {result.robots.map((r) => (
                  <tr key={r.id}>
                    <td style={{ color: r.team === 0 ? 'var(--c-p1)' : 'var(--c-p2)' }}>
                      {session.config.robots[r.id]?.build.name}
                    </td>
                    <td>{Math.round(r.damageDealt)}</td>
                    <td>{Math.round(r.damageTaken)}</td>
                    <td>{r.flips}</td>
                    <td>
                      {r.koReason ? t(`results.ko.${r.koReason}`) : `${Math.round(r.hpFraction * 100)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.reason === 'judges' && (
              <p class={css.muted}>
                {t('results.judgeScores', {
                  a: Math.round(result.judgeScores[0] ?? 0),
                  b: Math.round(result.judgeScores[1] ?? 0),
                })}
              </p>
            )}
          </Panel>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
          {res.rewards && (
            <Panel title={t('results.rewards')}>
              {res.rewards.lines.map((l, i) => (
                <div key={l.key} class={css.rewardLine} style={{ animationDelay: `${300 + i * 150}ms` }}>
                  <span>{t(`results.reward.${l.key}`)}</span>
                  <span>
                    {l.credits > 0 && `⛁ ${l.credits}`} {l.scrap > 0 && `⚙ ${l.scrap}`}
                  </span>
                </div>
              ))}
              <div class={css.rewardLine}>
                <span>{t('results.total')}</span>
                <span class={css.total}>
                  ⛁ {credits} {res.rewards.scrap > 0 && `⚙ ${res.rewards.scrap}`}
                </span>
              </div>
              {res.repairCost > 0 && (
                <p style={{ color: 'var(--c-signal)' }}>
                  {t('results.repairNeeded', { cost: res.repairCost })}
                </p>
              )}
            </Panel>
          )}
          {res.unlocks.length > 0 && (
            <Panel title={t('results.unlocked')}>
              {res.unlocks.map((u) => (
                <div key={u} class={css.rewardLine}>
                  🔓 {u}
                </div>
              ))}
            </Panel>
          )}
          <div style={{ display: 'grid', gap: '0.5em' }}>
            {session.kind === 'campaign' && res.won && nextLvl && (
              <Button variant="primary" size="big" onClick={() => startCampaignLevel(nextLvl.id)}>
                {t('results.nextLevel')}
              </Button>
            )}
            {session.kind === 'campaign' && (
              <Button onClick={() => go('campaign')}>{t('results.toMap')}</Button>
            )}
            {session.kind !== 'online' && (
              <Button variant={res.won === false ? 'primary' : 'default'} onClick={() => restartMatch()}>
                {res.won === false ? t('results.retry') : t('results.rematch')}
              </Button>
            )}
            {(session.kind === 'campaign' || session.kind === 'quick') && (
              <Button onClick={() => go('garage')}>{t('menu.garage')}</Button>
            )}
            {session.kind === 'online' && netLobby.connection && (
              <Button variant="primary" onClick={backToLobby}>
                {t('results.backToLobby')}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                if (session.kind === 'online') netLobby.leave();
                store.set({ session: null, results: null });
                go('menu');
              }}
            >
              {t('results.menu')}
            </Button>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}
