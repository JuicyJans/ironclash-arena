import type { Keymap } from '../core/save/schema';
import type { MatchController } from '../game/match/localController';
import type { MatchSession } from '../state/store';
import { GuestController } from './guestController';
import { HostController } from './hostController';
import { netLobby } from './session';

export function createNetController(session: MatchSession, keymap: Keymap): MatchController {
  return session.netRole === 'host'
    ? new HostController(session.config, netLobby, keymap)
    : new GuestController(session.config, netLobby, keymap);
}
