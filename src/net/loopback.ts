import { Emitter, type NetProvider, type NetTransport, type RoomHost } from './transport';

/** In-memory transport pair (tests, offline development). Messages are delivered asynchronously. */
export function loopbackPair(): [NetTransport, NetTransport] {
  const make = () => ({ msg: new Emitter<[Uint8Array]>(), close: new Emitter<[]>(), open: true });
  const a = make();
  const b = make();
  const side = (self: ReturnType<typeof make>, other: ReturnType<typeof make>): NetTransport => ({
    get open() {
      return self.open;
    },
    send: (d) => {
      if (!self.open) return;
      const copy = d.slice();
      queueMicrotask(() => other.open && other.msg.emit(copy));
    },
    onMessage: (cb) => self.msg.on(cb),
    onClose: (cb) => self.close.on(cb),
    close: () => {
      if (!self.open) return;
      self.open = false;
      other.open = false;
      self.close.emit();
      other.close.emit();
    },
  });
  return [side(a, b), side(b, a)];
}

export function loopbackProvider(): NetProvider {
  const rooms = new Map<string, Emitter<[NetTransport]>>();
  return {
    async host(code) {
      const guests = new Emitter<[NetTransport]>();
      rooms.set(code, guests);
      const host: RoomHost = { code, onGuest: (cb) => void guests.on(cb), close: () => rooms.delete(code) };
      return host;
    },
    async join(code) {
      const room = rooms.get(code);
      if (!room) throw new Error('room-not-found');
      const [h, g] = loopbackPair();
      room.emit(h);
      return g;
    },
  };
}
