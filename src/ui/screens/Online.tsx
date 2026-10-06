import { useEffect, useRef, useState } from 'preact/hooks';
import { BALANCE } from '../../config/balance';
import type { MatchConfig } from '../../core/match/types';
import { netLobby } from '../../net/session';
import { isValidRoomCode } from '../../net/transport';
import { go, toast } from '../../state/actions';
import { Button } from '../components/Button';
import { Row, Toggle } from '../components/Controls';
import { Panel } from '../components/Panel';
import { ArenaPicker, RobotPicker } from '../components/Pickers';
import { RobotPreview } from '../components/RobotPreview';
import { ScreenFrame } from '../components/ScreenFrame';
import { useApp, useSelect, useT } from '../hooks';
import { robotOptions } from '../robotOptions';
import css from './screens.module.css';

const joinParam = () => new URLSearchParams(location.search).get('join')?.toUpperCase() ?? '';

export function Online() {
  const t = useT();
  const profile = useApp((s) => s.save.profile);
  const lobby = useSelect(netLobby.state, (s) => s);
  const options = robotOptions(profile);
  const [pick, setPick] = useState(options[0]?.id ?? 'preset0');
  const [code, setCode] = useState(joinParam());
  const [name, setName] = useState(profile.loadouts[profile.activeLoadout]?.name ?? 'Player');
  const autoJoined = useRef(false);
  const build = options.find((o) => o.id === pick)?.build ?? options[0]!.build;

  useEffect(() => {
    const c = joinParam();
    if (c && isValidRoomCode(c) && !autoJoined.current && lobby.phase === 'idle') {
      autoJoined.current = true;
      void netLobby.join(c, name, build);
    }
  }, []);

  const leave = () => {
    netLobby.leave();
    history.replaceState(null, '', location.pathname);
    go('menu');
  };
  const choose = (id: string) => {
    setPick(id);
    const b = options.find((o) => o.id === id)?.build;
    if (b && (lobby.phase === 'connected' || lobby.phase === 'hosting')) netLobby.selectBuild(b);
  };
  const link = `${location.origin}${location.pathname}?join=${lobby.code}`;
  const isHost = lobby.role === 'host';
  const myReady = isHost ? lobby.hostReady : lobby.guestReady;

  const start = () => {
    if (!lobby.hostBuild || !lobby.guestBuild) return;
    const config: MatchConfig = {
      arenaId: lobby.arenaId,
      seed: (crypto.getRandomValues(new Uint32Array(1))[0] ?? 7) >>> 0,
      durationSec: BALANCE.matchDurationSec,
      hazards: true,
      houseRobots: true,
      mode: 'online',
      robots: [
        { build: lobby.hostBuild, team: 0, controller: 'human', playerIndex: 0 },
        { build: lobby.guestBuild, team: 1, controller: 'remote' },
      ],
    };
    netLobby.start(config);
  };

  return (
    <ScreenFrame title={t('online.title')} subtitle={t('online.subtitle')} onBack={leave}>
      {lobby.phase === 'idle' && (
        <div class={`${css.body} ${css.setup} ${css.scroll}`}>
          <Panel title={t('online.you')}>
            <Row label={t('online.name')} id="net-name">
              <input
                id="net-name"
                class={css.textInput}
                style={{ maxWidth: '14em' }}
                maxLength={20}
                value={name}
                onInput={(e) => setName((e.target as HTMLInputElement).value.slice(0, 20) || 'Player')}
              />
            </Row>
            <RobotPreview build={build} label={build.name} height={150} />
            <RobotPicker options={options} value={pick} onChange={setPick} label={t('online.robot')} />
          </Panel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
            <Panel title={t('online.create')}>
              <p class={css.muted}>{t('online.createHint')}</p>
              <Button variant="primary" onClick={() => void netLobby.create(name, build)}>
                {t('online.createBtn')}
              </Button>
            </Panel>
            <Panel title={t('online.join')}>
              <p class={css.muted}>{t('online.joinHint')}</p>
              <div style={{ display: 'flex', gap: '0.6em' }}>
                <input
                  class={css.textInput}
                  aria-label={t('online.code')}
                  placeholder="ABC123"
                  maxLength={6}
                  value={code}
                  onInput={(e) =>
                    setCode((e.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                  }
                />
                <Button
                  disabled={!isValidRoomCode(code)}
                  onClick={() => void netLobby.join(code, name, build)}
                >
                  {t('online.joinBtn')}
                </Button>
              </div>
            </Panel>
            <p class={css.muted} style={{ fontSize: '0.85em' }}>
              {t('online.p2pNote')}
            </p>
          </div>
        </div>
      )}

      {lobby.phase === 'connecting' && (
        <div class={`${css.body} ${css.center}`}>
          <Panel title={t('online.connecting')}>
            <p class={css.press}>{t('online.pleaseWait')}</p>
          </Panel>
        </div>
      )}

      {lobby.phase === 'error' && (
        <div class={`${css.body} ${css.center}`}>
          <Panel title={t('online.errorTitle')}>
            <p>{t(`online.errors.${lobby.error ?? 'network'}`)}</p>
            <div class={css.footer}>
              <Button onClick={() => netLobby.leave()}>{t('common.tryAgain')}</Button>
            </div>
          </Panel>
        </div>
      )}

      {(lobby.phase === 'hosting' || lobby.phase === 'connected') && (
        <div class={`${css.body} ${css.setup} ${css.scroll}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
            <Panel title={t('online.room')}>
              <div class={css.code} aria-label={t('online.code')}>
                {lobby.code}
              </div>
              <div style={{ display: 'flex', gap: '0.6em', justifyContent: 'center' }}>
                <Button
                  size="small"
                  onClick={() => {
                    void navigator.clipboard
                      ?.writeText(link)
                      .then(() => toast(t('online.copied'), 'success'));
                  }}
                >
                  {t('online.copyLink')}
                </Button>
                <span class={css.muted} style={{ alignSelf: 'center' }}>
                  {lobby.peerPresent ? t('online.ping', { ms: lobby.ping }) : t('online.waiting')}
                </span>
              </div>
            </Panel>
            <Panel title={t('online.players')}>
              <div class={css.lobbyPlayers}>
                <div>
                  <strong>{lobby.hostName || '—'}</strong>
                  <div class={css.muted}>{lobby.hostBuild?.name ?? '—'}</div>
                  <div class={lobby.hostReady ? css.ready : css.notReady}>
                    {lobby.hostReady ? t('online.ready') : t('online.notReady')}
                  </div>
                </div>
                <div class={css.vsMark} style={{ fontSize: '2.5em', animation: 'none' }}>
                  VS
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>{lobby.guestName || '—'}</strong>
                  <div class={css.muted}>{lobby.guestBuild?.name ?? '—'}</div>
                  <div class={lobby.guestReady ? css.ready : css.notReady}>
                    {lobby.guestReady ? t('online.ready') : t('online.notReady')}
                  </div>
                </div>
              </div>
            </Panel>
            <Panel title={t('setup.arena')}>
              {isHost ? (
                <ArenaPicker
                  value={lobby.arenaId}
                  onChange={(id) => netLobby.setArena(id)}
                  profile={profile}
                  ignoreLocks
                />
              ) : (
                <p>{t(`arenas.${lobby.arenaId}.name`)}</p>
              )}
            </Panel>
          </div>
          <Panel title={t('online.robot')}>
            <RobotPicker options={options} value={pick} onChange={choose} label={t('online.robot')} />
            <Row label={t('online.readyToggle')}>
              <Toggle
                label={t('online.readyToggle')}
                value={myReady}
                onChange={(v) => netLobby.setReady(v)}
              />
            </Row>
            <div class={css.footer}>
              <Button onClick={leave}>{t('online.leave')}</Button>
              {isHost && (
                <Button
                  variant="primary"
                  size="big"
                  disabled={!lobby.hostReady || !lobby.guestReady || !lobby.peerPresent}
                  onClick={start}
                >
                  {t('online.start')}
                </Button>
              )}
              {!isHost && <span class={css.muted}>{t('online.hostStarts')}</span>}
            </div>
          </Panel>
        </div>
      )}
    </ScreenFrame>
  );
}
