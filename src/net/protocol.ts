import type { WorldState } from '../core/match/worldState';
import { EVENT_NAMES, readEvent, writeEvent, type NetEvent } from './netEvents';
import { readState, writeState } from './snapshot';
import { ByteReader, ByteWriter } from './codec';

/** Bump when the wire format changes; clients with different versions refuse to play. */
export const PROTOCOL_VERSION = 3;

export enum Msg {
  Hello = 1,
  Welcome = 2,
  Lobby = 3,
  SelectBuild = 4,
  Ready = 5,
  Start = 6,
  Input = 7,
  Snapshot = 8,
  Ping = 9,
  Pong = 10,
  Leave = 11,
  BackToLobby = 12,
  Result = 13,
}

export type NetMessage =
  | { type: Msg.Hello; protocol: number; game: string; name: string }
  | { type: Msg.Welcome; ok: boolean; reason: string }
  | {
      type: Msg.Lobby;
      arenaId: string;
      hostBuild: string;
      guestBuild: string;
      hostReady: boolean;
      guestReady: boolean;
      hostName: string;
      guestName: string;
    }
  | { type: Msg.SelectBuild; build: string }
  | { type: Msg.Ready; ready: boolean }
  | { type: Msg.Start; config: string }
  | { type: Msg.Input; seq: number; throttle: number; steer: number; buttons: number }
  | { type: Msg.Snapshot; ackSeq: number; state: WorldState; events: NetEvent[] }
  | { type: Msg.Ping; t: number }
  | { type: Msg.Pong; t: number }
  | { type: Msg.Leave }
  | { type: Msg.BackToLobby }
  | { type: Msg.Result; result: string };

// ------------------------------------------------------------------ input buttons
export const BTN = { weapon: 1, special: 2, boost: 4 } as const;

export { EVENT_NAMES, type NetEvent };

// ------------------------------------------------------------------ messages
export function encode(m: NetMessage): Uint8Array {
  const w = new ByteWriter(m.type === Msg.Snapshot ? 1024 : 128);
  w.u8(m.type);
  switch (m.type) {
    case Msg.Hello:
      w.u16(m.protocol).str(m.game).str(m.name);
      break;
    case Msg.Welcome:
      w.u8(m.ok ? 1 : 0).str(m.reason);
      break;
    case Msg.Lobby:
      w.str(m.arenaId)
        .str(m.hostBuild)
        .str(m.guestBuild)
        .u8(m.hostReady ? 1 : 0)
        .u8(m.guestReady ? 1 : 0)
        .str(m.hostName)
        .str(m.guestName);
      break;
    case Msg.SelectBuild:
      w.str(m.build);
      break;
    case Msg.Ready:
      w.u8(m.ready ? 1 : 0);
      break;
    case Msg.Start:
      w.str(m.config);
      break;
    case Msg.Result:
      w.str(m.result);
      break;
    case Msg.Input:
      w.u32(m.seq)
        .i8(m.throttle * 127)
        .i8(m.steer * 127)
        .u8(m.buttons);
      break;
    case Msg.Snapshot:
      w.u32(m.ackSeq);
      writeState(w, m.state);
      w.u8(Math.min(255, m.events.length));
      for (const e of m.events.slice(0, 255)) writeEvent(w, e);
      break;
    case Msg.Ping:
    case Msg.Pong:
      w.f64(m.t);
      break;
    case Msg.Leave:
    case Msg.BackToLobby:
      break;
  }
  return w.bytes();
}

export function decode(data: Uint8Array): NetMessage {
  const r = new ByteReader(data);
  const type = r.u8() as Msg;
  switch (type) {
    case Msg.Hello:
      return { type, protocol: r.u16(), game: r.str(), name: r.str() };
    case Msg.Welcome:
      return { type, ok: r.u8() === 1, reason: r.str() };
    case Msg.Lobby:
      return {
        type,
        arenaId: r.str(),
        hostBuild: r.str(),
        guestBuild: r.str(),
        hostReady: r.u8() === 1,
        guestReady: r.u8() === 1,
        hostName: r.str(),
        guestName: r.str(),
      };
    case Msg.SelectBuild:
      return { type, build: r.str() };
    case Msg.Ready:
      return { type, ready: r.u8() === 1 };
    case Msg.Start:
      return { type, config: r.str() };
    case Msg.Result:
      return { type, result: r.str() };
    case Msg.Input:
      return { type, seq: r.u32(), throttle: r.i8() / 127, steer: r.i8() / 127, buttons: r.u8() };
    case Msg.Snapshot: {
      const ackSeq = r.u32();
      const state = readState(r);
      const n = r.u8();
      const events: NetEvent[] = [];
      for (let i = 0; i < n; i++) events.push(readEvent(r));
      return { type, ackSeq, state, events };
    }
    case Msg.Ping:
    case Msg.Pong:
      return { type, t: r.f64() };
    case Msg.Leave:
    case Msg.BackToLobby:
      return { type };
    default:
      throw new Error(`Unknown message type ${type as number}`);
  }
}
