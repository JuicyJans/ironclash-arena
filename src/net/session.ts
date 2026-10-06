import { NetLobby } from './lobby';
import { peerProvider } from './peerProvider';

/** The single lobby/connection used by the online screens and match controllers. */
export const netLobby = new NetLobby(peerProvider);
