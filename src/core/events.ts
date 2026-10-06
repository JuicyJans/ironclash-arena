import type { ArmorSide, HazardKind, SupportModule, WeaponType } from '../config/types';

export type DamageSource = WeaponType | 'ram' | 'wall' | 'hazard' | 'house' | 'burn' | 'pit';
export type KoReason = 'immobile' | 'pit' | 'destroyed' | 'walkover';

/** All simulation events. FX, audio, UI and statistics subscribe to these. */
export interface GameEvents {
  damage: {
    targetId: number;
    sourceId: number; // -1 for environment
    amount: number;
    x: number;
    y: number;
    side: ArmorSide;
    source: DamageSource;
    force: number;
  };
  collision: { aId: number; bId: number; x: number; y: number; speed: number; wall: boolean };
  launched: { robotId: number; byId: number; power: number };
  landed: { robotId: number; inverted: boolean; x: number; y: number; power: number };
  righted: { robotId: number };
  ko: { robotId: number; reason: KoReason; byId: number };
  componentDamaged: { robotId: number; component: 'drive' | 'weapon' };
  weaponWindup: { robotId: number; weapon: WeaponType; duration: number };
  weaponFire: { robotId: number; weapon: WeaponType; x: number; y: number; angle: number; hit: boolean };
  grab: { robotId: number; targetId: number; released: boolean };
  special: { robotId: number; module: SupportModule; x: number; y: number };
  boost: { robotId: number };
  hazardTelegraph: { hazardId: string; kind: HazardKind; x: number; y: number };
  hazardTriggered: { hazardId: string; kind: HazardKind; x: number; y: number };
  hazardHit: { hazardId: string; kind: HazardKind; robotId: number };
  pitOpened: { index: number; x: number; y: number };
  propBroken: { index: number; x: number; y: number };
  houseAttack: { houseId: string; targetId: number; x: number; y: number };
  matchEnd: { winnerTeam: number; reason: 'ko' | 'pit' | 'judges' | 'walkover' | 'draw' };
}

export type EventName = keyof GameEvents;
type Handler<K extends EventName> = (payload: GameEvents[K]) => void;
export type AnyHandler = <K extends EventName>(name: K, payload: GameEvents[K]) => void;

/** Typed synchronous pub/sub bus. */
export class EventBus {
  private handlers: { [K in EventName]?: Set<Handler<K>> } = {};
  private anyHandlers = new Set<AnyHandler>();

  on<K extends EventName>(name: K, fn: Handler<K>): () => void {
    let set = this.handlers[name] as Set<Handler<K>> | undefined;
    if (!set) {
      set = new Set();
      (this.handlers as Record<string, Set<Handler<K>>>)[name] = set;
    }
    set.add(fn);
    return () => set.delete(fn);
  }

  emit<K extends EventName>(name: K, payload: GameEvents[K]): void {
    const set = this.handlers[name] as Set<Handler<K>> | undefined;
    if (set) for (const fn of set) fn(payload);
    for (const fn of this.anyHandlers) fn(name, payload);
  }

  /** Subscribe to every event (used by recorders and the network host). */
  onAny(fn: AnyHandler): () => void {
    this.anyHandlers.add(fn);
    return () => this.anyHandlers.delete(fn);
  }

  clear(): void {
    this.handlers = {};
    this.anyHandlers.clear();
  }
}
