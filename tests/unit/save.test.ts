import { describe, expect, it } from 'vitest';
import { defaultSave, defaultSettings } from '../../src/core/save/defaults';
import { migrate, MigrationError } from '../../src/core/save/migrations';
import { SAVE_VERSION } from '../../src/core/save/schema';
import { memoryStorage, parseSave, SAVE_KEY, SaveStore, SETTINGS_KEY } from '../../src/core/save/storage';

describe('save system', () => {
  it('round-trips a save through storage', () => {
    const store = new SaveStore(memoryStorage());
    expect(store.load().status).toBe('new');
    const s = defaultSave();
    s.profile.credits = 1234;
    store.save(s);
    const loaded = store.load();
    expect(loaded.status).toBe('ok');
    expect(loaded.data.profile.credits).toBe(1234);
    expect(store.reset().profile.credits).not.toBe(1234);
  });

  it('migrates a v1 save', () => {
    const v1 = {
      version: 1,
      money: 777,
      parts: { weapon_saw: 2 },
      robot: { name: 'Oldie' },
      levels: { c01: { stars: 2, bestTime: 40, wins: 1 } },
    };
    const res = parseSave(JSON.stringify(v1));
    expect(res.status).toBe('migrated');
    expect(res.data.version).toBe(SAVE_VERSION);
    expect(res.data.profile.credits).toBe(777);
    expect(res.data.profile.inventory.weapon_saw).toBe(2);
    expect(res.data.profile.loadouts[0]!.name).toBe('Oldie');
    expect(res.data.profile.campaign.levels.c01?.stars).toBe(2);
  });

  it('handles corrupt and future saves gracefully', () => {
    expect(parseSave('{not json').status).toBe('corrupt');
    expect(parseSave(JSON.stringify({ version: 2, profile: { credits: -5 } })).status).toBe('corrupt');
    expect(parseSave(JSON.stringify({ version: 99 })).status).toBe('corrupt');
    expect(() => migrate(null)).toThrow(MigrationError);
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, 'garbage');
    expect(new SaveStore(storage).load().status).toBe('corrupt');
  });

  it('settings load with defaults and tolerate garbage', () => {
    const storage = memoryStorage();
    const store = new SaveStore(storage);
    expect(store.loadSettings('en').lang).toBe('en');
    const s = { ...defaultSettings('no'), graphics: 'low' as const };
    store.saveSettings(s);
    expect(store.loadSettings('en').graphics).toBe('low');
    storage.setItem(SETTINGS_KEY, '{oops');
    expect(store.loadSettings('no').graphics).toBe('high');
  });

  it('exports and imports', () => {
    const store = new SaveStore(memoryStorage());
    const save = defaultSave();
    save.profile.scrap = 9;
    const json = store.exportJson(save, defaultSettings());
    const back = store.importJson(json);
    expect(back?.save.profile.scrap).toBe(9);
    expect(back?.settings?.lang).toBe('no');
    expect(store.importJson('nope')).toBeNull();
  });

  it('survives storage that throws (private mode)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {},
    };
    const store = new SaveStore(throwing);
    expect(store.load().status).toBe('new');
    expect(() => store.save(defaultSave())).not.toThrow();
  });
});
