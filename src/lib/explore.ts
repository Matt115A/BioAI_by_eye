import { accuracy, clusterPeople, describeGroup, featureNames, humanAgreement, kappa, learningCurve, modelAccuracy, nearest, pca2, prepare, type Prepared, profile, profileOf, sameSubmission, standardize, testMask } from './analysis';
import type { Submission } from './submission';
import type { TaskData, TaskInfo } from './tasks';

export interface Person { prep: Prepared; acc: number; testAcc: number; group: number | null; mine: boolean; xy: { x: number; y: number } | null }

/** Everything the Explore view shows for one task, from contributions + your local sessions. */
export function explore(task: TaskData, info: TaskInfo, contributions: Submission[], mine: Submission[]) {
  // your local sessions that were also uploaded count once (as a contributor, marked as you)
  const subs = contributions.map((c) => ({ ...c, mine: mine.some((m) => sameSubmission(m, c)) }));
  const localOnly = mine.filter((m) => !contributions.some((c) => sameSubmission(m, c)));
  const people = subs.map((s) => prepare(s, task, info)).filter((p): p is Prepared => !!p);
  const yours = localOnly.map((s) => prepare(s, task, info)).filter((p): p is Prepared => !!p);
  const X = people.map((p) => profile(p, task));
  const names = featureNames(task);
  const st = X.length ? standardize(X) : null;
  const clusters = st ? clusterPeople(st.Z) : null;
  const pca = st && st.Z.length >= 3 ? pca2(st.Z) : null;
  const M = task.models.length;

  const persons: Person[] = people.map((p, i) => ({ prep: p, acc: accuracy(p), testAcc: accuracy(p, testMask(p, info)), group: clusters ? clusters.labels[i] : null, mine: !!p.sub.mine, xy: pca ? pca.project(st!.Z[i]) : null }));
  const me = [...persons.filter((p) => p.mine).map((p) => p.prep), ...yours].at(-1) ?? null;
  let you: { acc: number; testAcc: number; group: number | null; xy: { x: number; y: number } | null; contributed: boolean; profile: number[] } | null = null;
  if (me) {
    const raw = profile(me, task), z = st ? st.z(raw) : null;
    you = { acc: accuracy(me), testAcc: accuracy(me, testMask(me, info)), group: clusters && z ? nearest(z, clusters.centroids) : null, xy: pca && z ? pca.project(z) : null, contributed: persons.some((p) => p.mine && p.prep === me), profile: raw };
  }

  // models, on exactly the items people answered: accuracy averaged person by person; a "profile" on the pooled items for the map
  const modelAcc = task.models.map((_, m) => avg(people.map((p) => modelAccuracy(p, m))));
  const modelTestAcc = task.models.map((_, m) => avg(people.map((p) => modelAccuracy(p, m, testMask(p, info)))));
  const pooled = new Map<number, true>();
  for (const p of people) p.sub.items.forEach((id, i) => p.open[i] !== false && task.truth.has(id) && pooled.set(id, true));
  const ids = [...pooled.keys()], truth = ids.map((id) => task.truth.get(id)!).join(''), calls = task.models.map((_, m) => ids.map((id) => task.calls.get(id)![m]).join(''));
  const models = task.models.map((mi, m) => {
    const raw = ids.length ? profileOf(calls[m], truth, calls, task) : [];
    return { ...mi, index: m, acc: modelAcc[m], testAcc: modelTestAcc[m], xy: pca && st && raw.length ? pca.project(st.z(raw).map((v) => Math.max(-6, Math.min(6, v)))) : null };
  });

  const groups = clusters ? clusters.centroids.map((zc, j) => {
    const members = persons.filter((p) => p.group === j);
    const rawC = X[0].map((_, d) => avg(X.filter((_, i) => clusters.labels[i] === j).map((x) => x[d])));
    return { index: j, size: members.length, acc: avg(members.map((m) => m.acc)), ...describeGroup(rawC, zc, task, info) };
  }) : [];

  const agreement = task.models.map((mi, m) => ({ ...mi, kappa: avg(X.map((x) => x[m])) })).sort((a, b) => b.kappa - a.kappa);
  return {
    persons, you, models, groups, names, silhouette: clusters?.sil ?? null, agreement,
    human: people.length >= 2 ? humanAgreement(people) : { kappa: NaN, pairs: 0, shared: 0 },
    curve: learningCurve(people), nPeople: people.length, nTrials: people.reduce((a, p) => a + p.correct.length, 0),
    modelVsModel: (a: number, b: number) => kappa(calls[a], calls[b]), M,
  };
}
const avg = (xs: number[]) => { const v = xs.filter((x) => Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; };
export type Exploration = ReturnType<typeof explore>;
