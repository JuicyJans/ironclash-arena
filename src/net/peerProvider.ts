import type { DataConnection, Peer as PeerType, PeerOptions } from 'peerjs';
import { Emitter, type NetProvider, type NetTransport, type RoomHost } from './transport';

const PREFIX = 'ironclash-arena-';
const CONNECT_TIMEOUT_MS = 15000;

/** PeerJS options from the environment (.env): custom signalling server and TURN relay. */
export function peerOptions(): PeerOptions {
  const env = import.meta.env;
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ];
  if (env.VITE_TURN_URL) {
    iceServers.push({
      urls: env.VITE_TURN_URL,
      username: env.VITE_TURN_USER ?? '',
      credential: env.VITE_TURN_CREDENTIAL ?? '',
    });
  }
  const opts: PeerOptions = { config: { iceServers }, debug: 1 };
  if (env.VITE_PEER_HOST) {
    opts.host = env.VITE_PEER_HOST;
    if (env.VITE_PEER_PORT) opts.port = Number(env.VITE_PEER_PORT);
    opts.path = env.VITE_PEER_PATH ?? '/';
    opts.secure = env.VITE_PEER_SECURE !== 'false';
  }
  return opts;
}

function wrap(conn: DataConnection): NetTransport {
  const msg = new Emitter<[Uint8Array]>();
  const closed = new Emitter<[]>();
  let open = conn.open;
  conn.on('open', () => (open = true));
  conn.on('data', (d) => {
    if (d instanceof ArrayBuffer) msg.emit(new Uint8Array(d));
    else if (d instanceof Uint8Array) msg.emit(d);
  });
  const onClose = () => {
    if (!open && !conn.open) {
      closed.emit();
      return;
    }
    open = false;
    closed.emit();
  };
  conn.on('close', onClose);
  conn.on('error', onClose);
  return {
    get open() {
      return open;
    },
    send: (d) => {
      if (open) conn.send(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength));
    },
    onMessage: (cb) => msg.on(cb),
    onClose: (cb) => closed.on(cb),
    close: () => {
      open = false;
      conn.close();
    },
  };
}

async function createPeer(id?: string): Promise<PeerType> {
  const { Peer } = await import('peerjs');
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id, peerOptions()) : new Peer(peerOptions());
    const timer = setTimeout(() => reject(new Error('timeout')), CONNECT_TIMEOUT_MS);
    peer.on('open', () => {
      clearTimeout(timer);
      resolve(peer);
    });
    peer.on('error', (err: { type?: string }) => {
      clearTimeout(timer);
      reject(new Error(err.type ?? 'peer-error'));
    });
  });
}

/** WebRTC data channels via PeerJS. The host owns peer id `PREFIX + code`. */
export const peerProvider: NetProvider = {
  async host(code) {
    const peer = await createPeer(PREFIX + code);
    const guests = new Emitter<[NetTransport]>();
    peer.on('connection', (conn) => {
      conn.on('open', () => guests.emit(wrap(conn)));
    });
    peer.on('disconnected', () => {
      if (!peer.destroyed) peer.reconnect();
    });
    const host: RoomHost = { code, onGuest: (cb) => void guests.on(cb), close: () => peer.destroy() };
    return host;
  },
  async join(code) {
    const peer = await createPeer();
    return new Promise((resolve, reject) => {
      const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'raw' });
      const timer = setTimeout(() => reject(new Error('timeout')), CONNECT_TIMEOUT_MS);
      peer.on('error', (err: { type?: string }) => {
        clearTimeout(timer);
        reject(new Error(err.type === 'peer-unavailable' ? 'room-not-found' : (err.type ?? 'peer-error')));
      });
      conn.on('open', () => {
        clearTimeout(timer);
        const t = wrap(conn);
        const close = t.close;
        resolve({
          ...t,
          get open() {
            return t.open;
          },
          close: () => {
            close();
            peer.destroy();
          },
        });
      });
    });
  },
};
