import { BLOCKED, cellIndex, type DangerGrid } from './dangerMap';

const DIRS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
] as const;

/** Binary min-heap keyed by distance. */
class Heap {
  private items: { i: number; d: number }[] = [];
  get size() {
    return this.items.length;
  }
  push(i: number, d: number) {
    const a = this.items;
    a.push({ i, d });
    let n = a.length - 1;
    while (n > 0) {
      const p = (n - 1) >> 1;
      if (a[p]!.d <= a[n]!.d) break;
      [a[p], a[n]] = [a[n]!, a[p]!];
      n = p;
    }
  }
  pop(): { i: number; d: number } {
    const a = this.items;
    const top = a[0]!;
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let n = 0;
      for (;;) {
        const l = n * 2 + 1;
        const r = l + 1;
        let m = n;
        if (l < a.length && a[l]!.d < a[m]!.d) m = l;
        if (r < a.length && a[r]!.d < a[m]!.d) m = r;
        if (m === n) break;
        [a[m], a[n]] = [a[n]!, a[m]!];
        n = m;
      }
    }
    return top;
  }
}

/** Dijkstra from the goal cell over the danger grid. Returns travel cost to the goal per cell. */
export function computeFlowField(g: DangerGrid, goalX: number, goalY: number): Float64Array {
  // Float64 on purpose: float32 rounding makes Dijkstra re-relax the same cells endlessly.
  const dist = new Float64Array(g.cols * g.rows).fill(Infinity);
  const start = cellIndex(g, goalX, goalY);
  dist[start] = 0;
  const heap = new Heap();
  heap.push(start, 0);
  while (heap.size > 0) {
    const { i, d } = heap.pop();
    if (d > (dist[i] ?? Infinity)) continue;
    const x = i % g.cols;
    const y = (i - x) / g.cols;
    for (const [dx, dy, len] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= g.cols || ny >= g.rows) continue;
      const ni = ny * g.cols + nx;
      const c = g.cost[ni] ?? 1;
      if (c >= BLOCKED) continue;
      const nd = d + c * len;
      if (nd < (dist[ni] ?? Infinity)) {
        dist[ni] = nd;
        heap.push(ni, nd);
      }
    }
  }
  return dist;
}

/** Follows the flow field a few cells ahead from (x, y). Returns a waypoint in world units. */
export function flowWaypoint(
  g: DangerGrid,
  dist: Float64Array,
  x: number,
  y: number,
  lookahead = 3,
): { x: number; y: number } {
  let i = cellIndex(g, x, y);
  for (let step = 0; step < lookahead; step++) {
    const cx = i % g.cols;
    const cy = (i - cx) / g.cols;
    let best = i;
    let bestD = dist[i] ?? Infinity;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= g.cols || ny >= g.rows) continue;
      const ni = ny * g.cols + nx;
      if ((dist[ni] ?? Infinity) < bestD) {
        bestD = dist[ni] ?? Infinity;
        best = ni;
      }
    }
    if (best === i) break;
    i = best;
  }
  const cx = i % g.cols;
  const cy = (i - cx) / g.cols;
  return { x: (cx + 0.5) * g.cell, y: (cy + 0.5) * g.cell };
}
