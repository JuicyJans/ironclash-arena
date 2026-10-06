/**
 * Transport abstraction. The game only talks to these interfaces, so PeerJS/WebRTC can
 * later be replaced by an authoritative server (e.g. Colyseus/WebSocket) without touching game logic.
 */
export interface NetTransport {
  readonly open: boolean;
  send(data: Uint8Array): void;
  onMessage(cb: (data: Uint8Array) => void): () => void;
  onClose(cb: () => void): () => void;
  close(): void;
}

export interface RoomHost {
  readonly code: string;
  onGuest(cb: (t: NetTransport) => void): void;
  close(): void;
}

export interface NetProvider {
  host(code: string): Promise<RoomHost>;
  join(code: string): Promise<NetTransport>;
}

/** Simple listener set helper used by transport implementations. */
export class Emitter<T extends unknown[]> {
  private ls = new Set<(...a: T) => void>();
  on(cb: (...a: T) => void): () => void {
    this.ls.add(cb);
    return () => this.ls.delete(cb);
  }
  emit(...a: T): void {
    for (const l of [...this.ls]) l(...a);
  }
  clear(): void {
    this.ls.clear();
  }
}

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomRoomCode(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += ROOM_ALPHABET[Math.floor(rand() * ROOM_ALPHABET.length)];
  return s;
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code);
}
