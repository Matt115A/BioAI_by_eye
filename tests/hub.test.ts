import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { clusterPeople, kappa, kmeans, prepare, profile, silhouette, standardize } from '../src/lib/analysis';
import { explore } from '../src/lib/explore';
import { simulateContributors } from '../src/lib/mock';
import { fromSession } from '../src/lib/submission';
import { type GameKey, parseTask, taskInfo } from '../src/lib/tasks';

const Y = process.env.BIOAI_GAMES_DIR ?? "../..";   // folder holding the game repos (nanopore/, proteins/, masked/)
const raw: Record<GameKey, string> = { nanopore: `${Y}/nanopore/app/public/data/dataset.json`, mutations: `${Y}/proteins/app/public/data/dataset.json`, seq: `${Y}/masked/app/public/data/dataset.json`, struct: `${Y}/masked/app/public/data/dataset.json` };
const tasks = Object.fromEntries((Object.keys(raw) as GameKey[]).map((k) => [k, parseTask(k, JSON.parse(readFileSync(raw[k], 'utf8')))])) as Record<GameKey, ReturnType<typeof parseTask>>;

describe('maths', () => {
  it('κ: identical = 1, chance-level ≈ 0, opposite binary = −1', () => {
    expect(kappa('ACGTACGT', 'ACGTACGT')).toBeCloseTo(1);
    expect(kappa('0101010101', '1010101010')).toBeCloseTo(-1);
    expect(Math.abs(kappa('AACCGGTTAACCGGTT', 'ACGTACGTACGTACGT'))).toBeLessThan(0.1);
  });
  it('k-means + silhouette recover planted groups', () => {
    const pts = [[0, 0], [10, 0], [0, 10]].flatMap(([x, y], g) => Array.from({ length: 10 }, (_, i) => [x + Math.sin(i + g), y + Math.cos(i * 2 + g)]));
    const km = kmeans(pts, 3);
    for (let g = 0; g < 3; g++) expect(new Set(km.labels.slice(g * 10, g * 10 + 10)).size).toBe(1);
    expect(silhouette(pts, km.labels)).toBeGreaterThan(0.7);
    expect(clusterPeople(standardize(pts).Z)!.k).toBe(3);
    expect(clusterPeople(pts.slice(0, 5))).toBeNull();
  });
});

describe('tasks', () => {
  for (const k of Object.keys(raw) as GameKey[]) {
    it(`${k}: dataset parses; a model-copying player has κ = 1 with that model`, () => {
      const t = tasks[k], info = taskInfo(k);
      expect(t.models.length).toBeGreaterThan(3);
      const ids = [...t.truth.keys()].slice(0, 60);
      const sub = { game: k, app_version: 't', dataset_version: t.version, n: 60, items: ids, responses: ids.map((id) => t.calls.get(id)![1]).join(''), phases: ids.map(() => String(info.phases.indexOf(info.openPhases[0]))).join(''), rt: ids.map(() => 1000) };
      const p = prepare(sub, t, info)!;
      expect(profile(p, t)[1]).toBeCloseTo(1, 6);
    });
  }
  it('simulated contributors form groups and the exploration is complete', () => {
    for (const k of ['mutations', 'seq'] as GameKey[]) {
      const t = tasks[k], info = taskInfo(k);
      const ex = explore(t, info, simulateContributors(t, info), []);
      expect(ex.nPeople).toBe(48);
      expect(ex.groups.length).toBeGreaterThanOrEqual(2);
      expect(ex.groups.reduce((a, g) => a + g.size, 0)).toBe(48);
      expect(ex.models.every((m) => m.xy && Number.isFinite(m.acc))).toBe(true);
      expect(ex.curve.length).toBeGreaterThan(3);
      expect(ex.you).toBeNull();
    }
  });
});

describe('sessions → submissions', () => {
  it('converts each game\'s session format, drops simulated ones, and marks you', () => {
    const t = tasks.mutations, ids = [...t.truth.keys()].slice(0, 30);
    const mut = { meta: { app: 'protein-effects', app_version: '1.0.0', dataset_version: t.version, simulated: false }, trials: ids.map((id, i) => ({ variant_id: id, response: i % 2, phase: i < 20 ? 'learn' : 'new', rt_ms: 3456 })) };
    const s = fromSession(mut)!;
    expect(s.game).toBe('mutations'); expect(s.responses).toMatch(/^[01]{30}$/); expect(s.phases).toBe('0'.repeat(20) + '1'.repeat(10)); expect(s.rt[0]).toBe(3460);
    expect(fromSession({ ...mut, meta: { ...mut.meta, simulated: true } })).toBeNull();
    const nano = { meta: { app: 'nanopore-by-eye', app_version: '1', dataset_version: tasks.nanopore.version }, trials: [...tasks.nanopore.truth.keys()].slice(0, 25).map((id) => ({ window_id: id, pressed: 'C', phase: 'cg', rt_ms: 900 })) };
    expect(fromSession(nano)!.phases).toBe('3'.repeat(25));
    const seq = { meta: { app: 'masked-residue', app_version: '1', dataset_version: tasks.seq.version, config: { mode: 'struct' } }, trials: [...tasks.seq.truth.keys()].slice(0, 25).map((id) => ({ site_id: id, response: 'L', phase: 'learn', rt_ms: 900 })) };
    const ss = fromSession(seq)!;
    expect(ss.game).toBe('struct');
    const t2 = tasks.struct, info = taskInfo('struct');
    const ex = explore(t2, info, simulateContributors(t2, info), [{ ...ss, mine: true }]);
    expect(ex.you).not.toBeNull();
    expect(ex.you!.group).not.toBeNull();
  });
});
