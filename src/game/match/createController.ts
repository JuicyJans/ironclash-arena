import type { Keymap } from '../../core/save/schema';
import { getLevel } from '../../config/campaign';
import type { MatchSession } from '../../state/store';
import { LocalController, type MatchController } from './localController';
import { createNetController } from '../../net/netController';

export function createController(
  session: MatchSession,
  keymaps: { p1: Keymap; p2: Keymap },
): MatchController {
  if (session.kind === 'online' && session.netRole) return createNetController(session, keymaps.p1);
  const tutorial = !!(session.levelId && getLevel(session.levelId).tutorial);
  return new LocalController(session.config, keymaps, tutorial);
}
