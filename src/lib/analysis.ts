import { makeRng } from './rng';
import type { Submission } from './submission';
import type { TaskData, TaskInfo } from './tasks';

export interface Pt { x: number; y: number }

/** Cohen's κ between two equal-length answer sequences (multi-class). */
export function kappa(a: string, b: string): number {
  const n = a.length;
  if (!n) return 0;
  let agree = 0;
  const pa: Record<string, number> = {}, pb: Record<string, number> = {};
  for (let i = 0; i < n; i++) { if (a[i] === b[i]) agree++; pa[a[i]] = (pa[a[i]] ?? 0) + 1; pb[b[i]] = (pb[b[i]] ?? 0) + 1; }
  const po = agree / n;
  let pe = 0;
  for (const k in pa) pe += (pa[k] / n) * ((pb[k] ?? 0) / n);
  return pe >= 1 ? (po >= 1 ? 1 : 0) : (po - pe) / (1 - pe);
}

/** A submission lined up against the task: truth and every model's call on the same items. */
export interface Prepared {
  sub: Submission;
  resp: string;
  truth: string;
  /** model index → that model's calls on these items */
  calls: string[];
  phase: string[];
  open: boolean[];
  correct: boolean[];
}

export function prepare(sub: Submission, task: TaskData, info: TaskInfo): Prepared | null {
  const keep: number[] = [];
  sub.items.forEach((id, i) => { if (task.truth.has(id) && task.alphabet.includes(sub.responses[i])) keep.push(i); });
  if (keep.length < 20) return null;
  const truth = keep.map((i) => task.truth.get(sub.items[i])!).join('');
  const resp = keep.map((i) => sub.responses[i]).join('');
  const calls = task.models.map((_, m) => keep.map((i) => task.calls.get(sub.items[i])![m]).join(''));
  const phase = keep.map((i) => info.phases[Number(sub.phases[i])] ?? 'other');
  return { sub, resp, truth, calls, phase, open: phase.map((p) => info.openPhases.includes(p)), correct: [...resp].map((c, i) => c === truth[i]) };
}

const pick = (s: string, mask: boolean[]) => [...s].filter((_, i) => mask[i]).join('');
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
export const accuracy = (p: Prepared, mask?: boolean[]) => { const c = p.correct.filter((_, i) => !mask || mask[i]); return c.length ? c.filter(Boolean).length / c.length : NaN; };
export function modelAccuracy(p: Prepared, m: number, mask?: boolean[]) {
  let k = 0, n = 0;
  for (let i = 0; i < p.truth.length; i++) if (!mask || mask[i]) { n++; if (p.calls[m][i] === p.truth[i]) k++; }
  return n ? k / n : NaN;
}
export const testMask = (p: Prepared, info: TaskInfo) => p.phase.map((ph) => info.testPhases.includes(ph));

/** Reasoning profile: κ with each model, then per family (pick rate − true rate), all on the open (every-answer-allowed) trials. */
export function profileOf(resp: string, truth: string, calls: string[], task: TaskData): number[] {
  const n = resp.length;
  const fam = task.families.map((f) => {
    let r = 0, t = 0;
    for (let i = 0; i < n; i++) { if (f.members.includes(resp[i])) r++; if (f.members.includes(truth[i])) t++; }
    return n ? (r - t) / n : 0;
  });
  return [...calls.map((c) => kappa(resp, c)), ...fam];
}
export function profile(p: Prepared, task: TaskData): number[] {
  return profileOf(pick(p.resp, p.open), pick(p.truth, p.open), p.calls.map((c) => pick(c, p.open)), task);
}
export function featureNames(task: TaskData): string[] {
  return [...task.models.map((m) => `κ ${m.label}`), ...task.families.map((f) => (task.families.length === 1 ? `calls ${f.label}` : `picks ${f.label}`))];
}

// ── clustering ──
export function standardize(X: number[][]) {
  const d = X[0]?.length ?? 0;
  const mu = Array.from({ length: d }, (_, j) => mean(X.map((x) => x[j])));
  const sd = Array.from({ length: d }, (_, j) => Math.sqrt(mean(X.map((x) => (x[j] - mu[j]) ** 2))) || 1);
  const z = (x: number[]) => x.map((v, j) => (v - mu[j]) / sd[j]);
  return { Z: X.map(z), mu, sd, z };
}
const dist2 = (a: number[], b: number[]) => a.reduce((s, v, j) => s + (v - b[j]) ** 2, 0);

export function kmeans(Z: number[][], k: number, seed = 1, restarts = 12) {
  const rng = makeRng(seed);
  let best: { labels: number[]; centroids: number[][]; inertia: number } | null = null;
  for (let r = 0; r < restarts; r++) {
    const C: number[][] = [Z[Math.floor(rng() * Z.length)]];
    while (C.length < k) {   // k-means++
      const d = Z.map((z) => Math.min(...C.map((c) => dist2(z, c))));
      let u = rng() * d.reduce((a, b) => a + b, 0), i = 0;
      while (i < d.length - 1 && (u -= d[i]) > 0) i++;
      C.push(Z[i]);
    }
    let labels = new Array(Z.length).fill(0);
    for (let it = 0; it < 100; it++) {
      const next = Z.map((z) => { let b = 0; C.forEach((c, j) => { if (dist2(z, c) < dist2(z, C[b])) b = j; }); return b; });
      const same = next.every((l, i) => l === labels[i]);
      labels = next;
      for (let j = 0; j < k; j++) { const m = Z.filter((_, i) => labels[i] === j); if (m.length) C[j] = m[0].map((_, d) => mean(m.map((z) => z[d]))); }
      if (same && it > 0) break;
    }
    const inertia = Z.reduce((s, z, i) => s + dist2(z, C[labels[i]]), 0);
    if (!best || inertia < best.inertia) best = { labels, centroids: C.map((c) => [...c]), inertia };
  }
  return best!;
}

export function silhouette(Z: number[][], labels: number[]): number {
  const k = Math.max(...labels) + 1;
  const s = Z.map((z, i) => {
    const byC = Array.from({ length: k }, (_, j) => Z.filter((_, q) => labels[q] === j && q !== i).map((w) => Math.sqrt(dist2(z, w))));
    const a = mean(byC[labels[i]]);
    const b = Math.min(...byC.map((d, j) => (j === labels[i] || !d.length ? Infinity : mean(d))));
    return byC[labels[i]].length ? (b - a) / Math.max(a, b) : 0;
  });
  return mean(s);
}

export const MIN_FOR_CLUSTERS = 8;
/** Pick k = 2..5 by silhouette (each group ≥ 3 people); null when there are too few contributors. */
export function clusterPeople(Z: number[][]) {
  if (Z.length < MIN_FOR_CLUSTERS) return null;
  let best: { k: number; labels: number[]; centroids: number[][]; sil: number } | null = null;
  for (let k = 2; k <= Math.min(5, Math.floor(Z.length / 3)); k++) {
    const km = kmeans(Z, k);
    const sizes = Array.from({ length: k }, (_, j) => km.labels.filter((l) => l === j).length);
    if (Math.min(...sizes) < 3) continue;
    const sil = silhouette(Z, km.labels);
    if (!best || sil > best.sil + 0.02) best = { k, labels: km.labels, centroids: km.centroids, sil };
  }
  if (!best) return null;
  // order groups by size, biggest first, so letters are stable-ish
  const order = Array.from({ length: best.k }, (_, j) => j).sort((a, b) => best!.labels.filter((l) => l === b).length - best!.labels.filter((l) => l === a).length);
  return { ...best, labels: best.labels.map((l) => order.indexOf(l)), centroids: order.map((j) => best!.centroids[j]) };
}
export const nearest = (z: number[], centroids: number[][]) => centroids.reduce((b, c, j) => (dist2(z, c) < dist2(z, centroids[b]) ? j : b), 0);

/** First two principal components (power iteration with deflation). */
export function pca2(Z: number[][]) {
  const d = Z[0].length, n = Z.length;
  const C = Array.from({ length: d }, (_, a) => Array.from({ length: d }, (_, b) => Z.reduce((s, z) => s + z[a] * z[b], 0) / Math.max(1, n - 1)));
  const comps: number[][] = [];
  const M = C.map((r) => [...r]);
  for (let c = 0; c < 2; c++) {
    let v = Array.from({ length: d }, (_, i) => Math.sin(i + 1 + c));
    let lambda = 0;
    for (let it = 0; it < 300; it++) {
      const w = M.map((r) => r.reduce((s, x, j) => s + x * v[j], 0));
      lambda = Math.hypot(...w) || 1; v = w.map((x) => x / lambda);
    }
    comps.push(v);
    for (let a = 0; a < d; a++) for (let b = 0; b < d; b++) M[a][b] -= lambda * v[a] * v[b];
  }
  // sign convention: make the largest loading of each component positive (stable picture)
  for (const v of comps) { const i = v.reduce((b, x, j) => (Math.abs(x) > Math.abs(v[b]) ? j : b), 0); if (v[i] < 0) v.forEach((_, j) => (v[j] = -v[j])); }
  return { comps, project: (z: number[]): Pt => ({ x: z.reduce((s, v, j) => s + v * comps[0][j], 0), y: z.reduce((s, v, j) => s + v * comps[1][j], 0) }) };
}

/** Describe a group: the model it agrees with most, and its most distinctive tendency (vs everyone). */
export function describeGroup(rawCentroid: number[], zCentroid: number[], task: TaskData, info: TaskInfo) {
  const M = task.models.length;
  const kap = rawCentroid.slice(0, M);
  const closest = kap.map((k, m) => ({ m, k })).sort((a, b) => b.k - a.k);
  const famZ = zCentroid.slice(M).map((z, f) => ({ f, z, raw: rawCentroid[M + f] }));
  const trait = famZ.sort((a, b) => Math.abs(b.z) - Math.abs(a.z))[0];
  const modelZ = zCentroid.slice(0, M).map((z, m) => ({ m, z })).sort((a, b) => b.z - a.z)[0];
  const fam = trait ? task.families[trait.f] : null;
  const traitText = !trait || Math.abs(trait.z) < 0.5 ? 'answers in proportion to the truth'
    : task.families.length === 1 ? `${trait.raw > 0 ? 'over' : 'under'}-calls "${info.responseName(fam!.members)}"`
    : `${trait.raw > 0 ? 'over' : 'under'}-picks ${fam!.label}`;
  const top = closest[0];
  const logic = top.k < 0.1 ? 'doesn\'t follow any model\'s logic (κ < 0.1 with all)'
    : modelZ.m !== top.m && modelZ.z > 0.5 ? `closest to ${task.models[top.m].label} (κ ${top.k.toFixed(2)}), and agrees with ${task.models[modelZ.m].label} more than other people do`
    : `closest to ${task.models[top.m].label} (κ ${top.k.toFixed(2)})${modelZ.z > 0.5 ? ', more than other people are' : ''}`;
  return { closest: closest.slice(0, 2).map((c) => ({ ...task.models[c.m], kappa: c.k })), distinctiveModel: task.models[modelZ.m], traitText, logic };
}

/** Mean accuracy by trial position (bins), across contributors — how fast people learn. */
export function learningCurve(preps: Prepared[], bin = 20) {
  const maxN = Math.max(0, ...preps.map((p) => p.correct.length));
  const pts: (Pt & { n: number; lo: number; hi: number })[] = [];
  for (let s = 0; s < maxN; s += bin) {
    const vals = preps.filter((p) => p.correct.length >= s + bin).map((p) => p.correct.slice(s, s + bin).filter(Boolean).length / bin);
    if (vals.length < 2) continue;
    const sorted = [...vals].sort((a, b) => a - b);
    pts.push({ x: s + bin / 2, y: mean(vals), n: vals.length, lo: sorted[Math.floor(0.25 * (sorted.length - 1))], hi: sorted[Math.ceil(0.75 * (sorted.length - 1))] });
  }
  return pts;
}

/**
 * How much people agree with each other: κ over every pair of people's shared items, pooled across pairs
 * (each pair usually shares only a few items, so pairs are pooled rather than averaged). Needs ≥ 30 shared answers in total.
 */
export function humanAgreement(preps: Prepared[]): { kappa: number; pairs: number; shared: number } {
  const maps = preps.map((p) => { const m = new Map<number, string>(); p.sub.items.forEach((id, i) => { const c = p.sub.responses[i]; if (c) m.set(id, c); }); return m; });
  let ra = '', rb = '', pairs = 0;
  for (let a = 0; a < maps.length; a++) for (let b = a + 1; b < maps.length; b++) {
    let any = false;
    for (const [id, c] of maps[a]) { const d = maps[b].get(id); if (d) { ra += c; rb += d; any = true; } }
    if (any) pairs++;
  }
  return { kappa: ra.length >= 30 ? kappa(ra, rb) : NaN, pairs, shared: ra.length };
}

/** Same submission twice (local copy + uploaded copy)? */
export const sameSubmission = (a: Submission, b: Submission) => a.game === b.game && a.responses === b.responses && a.items.length === b.items.length && a.items.every((x, i) => x === b.items[i]);
