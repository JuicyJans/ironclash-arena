import { getArena } from '../../config/arenas';
import { hazardBounds } from '../../core/entities/hazards';
import type { HudState, MatchSession } from '../../state/store';
import { t } from '../../i18n';
import type { MatchController } from './localController';

/** Builds the HUD snapshot pushed to the Preact overlay (~15 times per second). */
export function buildHud(
  session: MatchSession,
  c: MatchController,
  countdown: number | null,
  _initial: boolean,
): HudState {
  const arena = getArena(session.config.arenaId);
  const s = c.curr;
  const robots = session.config.robots.map((cfg, i) => {
    const r = s.robots[i]!;
    const st = c.stats[i]!;
    return {
      name: cfg.build.name,
      team: cfg.team,
      hp: r.hp,
      maxHp: Math.round(st.hp * (cfg.hpMul ?? 1)),
      energy: r.energy,
      energyMax: st.energyMax,
      cooldown: r.cooldown,
      cooldownMax: Math.max(st.cooldown, 0.01),
      rpm: r.rpm,
      specialCd: r.specialCooldown,
      immobile: r.immobile,
      inverted: r.inverted,
      righting: r.righting,
      alive: r.alive,
      weapon: t(`parts.weapon.${st.weaponType}.name`),
      driveDamaged: r.driveHealth < 1,
      weaponDamaged: r.weaponHealth < 1,
      human: cfg.controller === 'human' || cfg.controller === 'remote',
      playerIndex: cfg.playerIndex ?? -1,
    };
  });
  const me = session.config.robots.findIndex((r) => r.team === session.localTeam);
  const sensor = c.stats[me]?.support.some((m) => m.module === 'sensor') ?? false;
  return {
    timeLeft: s.timeLeft,
    robots,
    scores: s.scores,
    arena: arena.size,
    positions: s.robots.map((r, i) => ({
      x: r.x,
      y: r.y,
      angle: r.angle,
      team: session.config.robots[i]!.team,
      alive: r.alive,
    })),
    hazards: session.config.hazards
      ? arena.hazards.map((h, i) => ({ ...hazardBounds(h), phase: s.hazards[i]?.phase ?? 0, kind: h.kind }))
      : [],
    pits: arena.pits.map((p, i) => ({ ...p.rect, open: s.pits[i] ?? false })),
    countdown,
    banner: null,
    showOpponentCooldown: sensor || session.kind === 'practice',
    tutorial: c.tutorial?.step ?? null,
    ...c.hudExtras?.(),
  };
}
