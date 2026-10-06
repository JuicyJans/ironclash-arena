import { defaultSave, defaultSettings } from './defaults';
import { migrate } from './migrations';
import { SaveSchema, SettingsSchema, type SaveData, type Settings } from './schema';

/** Minimal key/value storage so tests can inject an in-memory implementation. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = 'ironclash.save';
export const SETTINGS_KEY = 'ironclash.settings';

export type LoadStatus = 'ok' | 'new' | 'migrated' | 'corrupt';

export interface LoadResult<T> {
  data: T;
  status: LoadStatus;
  error?: string;
}

export function memoryStorage(): KeyValueStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

/** Parses and validates save JSON, running migrations. Never throws. */
export function parseSave(json: string): LoadResult<SaveData> {
  try {
    const { data, migrated } = migrate(JSON.parse(json));
    const parsed = SaveSchema.safeParse(data);
    if (!parsed.success)
      return { data: defaultSave(), status: 'corrupt', error: parsed.error.issues[0]?.message };
    return { data: parsed.data, status: migrated ? 'migrated' : 'ok' };
  } catch (e) {
    return { data: defaultSave(), status: 'corrupt', error: e instanceof Error ? e.message : String(e) };
  }
}

export class SaveStore {
  constructor(private storage: KeyValueStorage) {}

  load(): LoadResult<SaveData> {
    const raw = safeGet(this.storage, SAVE_KEY);
    if (raw === null) return { data: defaultSave(), status: 'new' };
    return parseSave(raw);
  }

  save(data: SaveData): void {
    const next = { ...data, updatedAt: Date.now() };
    safeSet(this.storage, SAVE_KEY, JSON.stringify(next));
  }

  reset(): SaveData {
    const fresh = defaultSave();
    this.save(fresh);
    return fresh;
  }

  loadSettings(fallbackLang: 'no' | 'en'): Settings {
    const raw = safeGet(this.storage, SETTINGS_KEY);
    if (raw === null) return defaultSettings(fallbackLang);
    try {
      const parsed = SettingsSchema.safeParse({ ...defaultSettings(fallbackLang), ...JSON.parse(raw) });
      return parsed.success ? parsed.data : defaultSettings(fallbackLang);
    } catch {
      return defaultSettings(fallbackLang);
    }
  }

  saveSettings(settings: Settings): void {
    safeSet(this.storage, SETTINGS_KEY, JSON.stringify(settings));
  }

  /** Full export (progress + settings) as pretty JSON. */
  exportJson(save: SaveData, settings: Settings): string {
    return JSON.stringify({ game: 'ironclash-arena', save, settings }, null, 2);
  }

  /** Validates an exported file. Returns null when it is not a valid save. */
  importJson(text: string): { save: SaveData; settings: Settings | null } | null {
    try {
      const obj = JSON.parse(text) as { save?: unknown; settings?: unknown };
      const res = parseSave(JSON.stringify(obj.save ?? obj));
      if (res.status === 'corrupt') return null;
      const s = SettingsSchema.safeParse(obj.settings);
      return { save: res.data, settings: s.success ? s.data : null };
    } catch {
      return null;
    }
  }
}

function safeGet(s: KeyValueStorage, key: string): string | null {
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(s: KeyValueStorage, key: string, value: string): void {
  try {
    s.setItem(key, value);
  } catch (e) {
    console.warn('Could not persist', key, e);
  }
}
