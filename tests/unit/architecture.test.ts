import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = 'src';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(p) && !p.endsWith('.d.ts') ? [p] : [];
  });
}

/** Value imports only (type-only imports are erased and can't create runtime cycles). */
function imports(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const out: string[] = [];
  for (const m of src.matchAll(/^import\s+(type\s+)?[^'"]*from\s+'(\.[^']+)'/gm)) {
    if (m[1]) continue;
    const base = normalize(join(dirname(file), m[2]!));
    for (const ext of ['.ts', '.tsx', '/index.ts']) {
      try {
        if (statSync(base + ext).isFile()) {
          out.push(base + ext);
          break;
        }
      } catch {
        /* try next */
      }
    }
  }
  return out;
}

describe('architecture', () => {
  const all = files(ROOT);
  const graph = new Map(all.map((f) => [f, imports(f)]));

  it('core/ and config/ never import from game/, ui/, net/ or audio/', () => {
    const bad: string[] = [];
    for (const [f, deps] of graph) {
      const layer = relative(ROOT, f).split('/')[0];
      if (layer !== 'core' && layer !== 'config') continue;
      for (const d of deps) {
        const dl = relative(ROOT, d).split('/')[0];
        if (['game', 'ui', 'net', 'audio', 'state'].includes(dl!)) bad.push(`${f} → ${d}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('has no circular (runtime) imports', () => {
    const state = new Map<string, 0 | 1 | 2>();
    const cycles: string[] = [];
    const visit = (f: string, stack: string[]) => {
      state.set(f, 1);
      for (const d of graph.get(f) ?? []) {
        const s = state.get(d) ?? 0;
        if (s === 1)
          cycles.push([...stack, f, d].slice(stack.indexOf(d) >= 0 ? stack.indexOf(d) : 0).join(' → '));
        else if (s === 0) visit(d, [...stack, f]);
      }
      state.set(f, 2);
    };
    for (const f of all) if (!state.get(f)) visit(f, []);
    expect(cycles).toEqual([]);
  });

  it('keeps modules reasonably small', () => {
    const big = all.filter((f) => readFileSync(f, 'utf8').split('\n').length > 330);
    expect(big).toEqual([]);
  });
});
