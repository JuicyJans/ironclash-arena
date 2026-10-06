import type { ArmorSide, HazardKind, SupportModule } from '../config/types';
import { WEAPON_TYPES } from '../config/weapons';
import type { EventName, GameEvents } from '../core/events';
import type { ByteReader, ByteWriter } from './codec';

export type NetEvent = { [K in EventName]: { name: K; payload: GameEvents[K] } }[EventName];

// ------------------------------------------------------------------ enums for compact events
const SOURCES = [...WEAPON_TYPES, 'ram', 'wall', 'hazard', 'house', 'burn', 'pit'] as const;
const SIDES: ArmorSide[] = ['front', 'side', 'rear', 'top'];
const HAZARDS: HazardKind[] = [
  'spikes',
  'flameJet',
  'press',
  'floorFlipper',
  'wallSaw',
  'lava',
  'ice',
  'turntable',
];
const KO = ['immobile', 'pit', 'destroyed', 'walkover'] as const;
const MODULES: SupportModule[] = ['selfRight', 'shieldPulse', 'smokeScreen', 'magnetAnchor', 'sensor'];
const COMPONENTS = ['drive', 'weapon'] as const;
const REASONS = ['ko', 'pit', 'judges', 'walkover', 'draw'] as const;

type FieldType = 'id' | 'f' | 'bool' | 'str' | readonly string[];

/** Field layout per event (order matters). */
const EVENT_FIELDS: { [K in EventName]: [keyof GameEvents[K], FieldType][] } = {
  damage: [
    ['targetId', 'id'],
    ['sourceId', 'id'],
    ['amount', 'f'],
    ['x', 'f'],
    ['y', 'f'],
    ['side', SIDES],
    ['source', SOURCES],
    ['force', 'f'],
  ],
  collision: [
    ['aId', 'id'],
    ['bId', 'id'],
    ['x', 'f'],
    ['y', 'f'],
    ['speed', 'f'],
    ['wall', 'bool'],
  ],
  launched: [
    ['robotId', 'id'],
    ['byId', 'id'],
    ['power', 'f'],
  ],
  landed: [
    ['robotId', 'id'],
    ['inverted', 'bool'],
    ['x', 'f'],
    ['y', 'f'],
    ['power', 'f'],
  ],
  righted: [['robotId', 'id']],
  ko: [
    ['robotId', 'id'],
    ['reason', KO],
    ['byId', 'id'],
  ],
  componentDamaged: [
    ['robotId', 'id'],
    ['component', COMPONENTS],
  ],
  weaponWindup: [
    ['robotId', 'id'],
    ['weapon', WEAPON_TYPES],
    ['duration', 'f'],
  ],
  weaponFire: [
    ['robotId', 'id'],
    ['weapon', WEAPON_TYPES],
    ['x', 'f'],
    ['y', 'f'],
    ['angle', 'f'],
    ['hit', 'bool'],
  ],
  grab: [
    ['robotId', 'id'],
    ['targetId', 'id'],
    ['released', 'bool'],
  ],
  special: [
    ['robotId', 'id'],
    ['module', MODULES],
    ['x', 'f'],
    ['y', 'f'],
  ],
  boost: [['robotId', 'id']],
  hazardTelegraph: [
    ['hazardId', 'str'],
    ['kind', HAZARDS],
    ['x', 'f'],
    ['y', 'f'],
  ],
  hazardTriggered: [
    ['hazardId', 'str'],
    ['kind', HAZARDS],
    ['x', 'f'],
    ['y', 'f'],
  ],
  hazardHit: [
    ['hazardId', 'str'],
    ['kind', HAZARDS],
    ['robotId', 'id'],
  ],
  pitOpened: [
    ['index', 'id'],
    ['x', 'f'],
    ['y', 'f'],
  ],
  propBroken: [
    ['index', 'id'],
    ['x', 'f'],
    ['y', 'f'],
  ],
  houseAttack: [
    ['houseId', 'str'],
    ['targetId', 'id'],
    ['x', 'f'],
    ['y', 'f'],
  ],
  matchEnd: [
    ['winnerTeam', 'id'],
    ['reason', REASONS],
  ],
};

export const EVENT_NAMES = Object.keys(EVENT_FIELDS) as EventName[];

export function writeEvent(w: ByteWriter, e: NetEvent): void {
  w.u8(EVENT_NAMES.indexOf(e.name));
  const payload = e.payload as unknown as Record<string, unknown>;
  for (const [field, type] of EVENT_FIELDS[e.name] as [string, FieldType][]) {
    const v = payload[field];
    if (type === 'id') w.i8(v as number);
    else if (type === 'f') w.f32(v as number);
    else if (type === 'bool') w.u8(v ? 1 : 0);
    else if (type === 'str') w.str(v as string);
    else w.u8(Math.max(0, type.indexOf(v as string)));
  }
}

export function readEvent(r: ByteReader): NetEvent {
  const name = EVENT_NAMES[r.u8()];
  if (!name) throw new Error('Unknown event');
  const payload: Record<string, unknown> = {};
  for (const [field, type] of EVENT_FIELDS[name] as [string, FieldType][]) {
    if (type === 'id') payload[field] = r.i8();
    else if (type === 'f') payload[field] = r.f32();
    else if (type === 'bool') payload[field] = r.u8() === 1;
    else if (type === 'str') payload[field] = r.str();
    else payload[field] = type[r.u8()];
  }
  return { name, payload } as NetEvent;
}
