import no from './no.json';
import en from './en.json';

export type Lang = 'no' | 'en';
export const LANGS: readonly Lang[] = ['no', 'en'];

type Dict = { [key: string]: string | Dict };
const dicts: Record<Lang, Dict> = { no, en };

let current: Lang = 'no';
const listeners = new Set<(lang: Lang) => void>();

export const getLang = (): Lang => current;

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang === 'no' ? 'nb' : 'en';
  for (const l of listeners) l(lang);
}

export function onLangChange(fn: (lang: Lang) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function lookup(dict: Dict, key: string): string | undefined {
  let node: string | Dict | undefined = dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function hasKey(key: string, lang: Lang = current): boolean {
  return lookup(dicts[lang], key) !== undefined;
}

/** Translates `key`, interpolating `{name}` placeholders. Falls back to English, then to the key. */
export function t(key: string, params?: Record<string, string | number>): string {
  const raw = lookup(dicts[current], key) ?? lookup(dicts.en, key) ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

/** Flattens a dictionary into dotted keys. Used by tests to verify both languages are complete. */
export function flattenKeys(dict: Dict = dicts.en, prefix = ''): string[] {
  return Object.entries(dict).flatMap(([k, v]) =>
    typeof v === 'string' ? [prefix + k] : flattenKeys(v, `${prefix}${k}.`),
  );
}

export const dictionaries = dicts;
