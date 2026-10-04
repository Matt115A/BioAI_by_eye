import { SITE } from './config';

export type GameKey = 'nanopore' | 'mutations' | 'seq' | 'struct';

export interface ModelInfo { name: string; label: string; kind: string }

/** Everything the hub needs about one task, in a common shape: truth and every model's call per item. */
export interface TaskData {
  key: GameKey;
  version: string;
  /** answer alphabet, one character per class */
  alphabet: string;
  /** group letters into families for the answer-tendency profile (identity for small alphabets) */
  families: { label: string; members: string }[];
  models: ModelInfo[];
  truth: Map<number, string>;
  /** item → one call character per model (same order as models) */
  calls: Map<number, string>;
}

export interface TaskInfo {
  key: GameKey;
  title: string;
  game: string;
  url: string;
  question: string;
  answer: string;
  /** canonical phase names: a submission stores each trial's index into this list */
  phases: string[];
  /** phases where every class could be chosen (used for reasoning profiles) */
  openPhases: string[];
  /** phases that test on new material, for the "test" accuracy */
  testPhases: string[];
  dataset: string;
  responseName: (c: string) => string;
}

const AA_FAMILIES = [
  { label: 'hydrophobic', members: 'AVLIM' }, { label: 'aromatic', members: 'FWY' }, { label: 'polar', members: 'STNQ' },
  { label: 'positive', members: 'KRH' }, { label: 'negative', members: 'DE' }, { label: 'special', members: 'GPC' },
];

export const TASKS: TaskInfo[] = [
  { key: 'nanopore', title: 'Reading DNA by eye', game: 'Nanopore', url: `${SITE}/Nanopore_by_eye/`, dataset: `${SITE}/Nanopore_by_eye/data/dataset.json`,
    question: 'Which base is in the highlighted stretch of a raw nanopore current trace?', answer: 'base',
    phases: ['pretest', 'training', 'learning', 'cg', 'ag', 'mixed', 'posttest', 'methylated'], openPhases: ['pretest', 'training', 'learning', 'mixed', 'posttest', 'methylated'], testPhases: ['posttest'],
    responseName: (c) => c },
  { key: 'mutations', title: 'Mutation effects by eye', game: 'Mutations', url: `${SITE}/Mutations_by_eye/`, dataset: `${SITE}/Mutations_by_eye/data/dataset.json`,
    question: 'Does this amino-acid change damage the protein, or is it tolerated?', answer: 'call',
    phases: ['learn', 'new', 'shallow'], openPhases: ['learn', 'new', 'shallow'], testPhases: ['new', 'shallow'],
    responseName: (c) => (c === '0' ? 'damaging' : 'tolerated') },
  { key: 'seq', title: 'Protein sequence by eye · sequence', game: 'Sequence', url: `${SITE}/Protein_sequence_by_eye/`, dataset: `${SITE}/Protein_sequence_by_eye/data/dataset.json`,
    question: 'Which amino acid is hidden in this 10-residue window? (like ESM2)', answer: 'amino acid',
    phases: ['learn', 'new'], openPhases: ['learn', 'new'], testPhases: ['new'], responseName: (c) => c },
  { key: 'struct', title: 'Protein sequence by eye · structure', game: 'Structure', url: `${SITE}/Protein_sequence_by_eye/`, dataset: `${SITE}/Protein_sequence_by_eye/data/dataset.json`,
    question: 'Which amino acid fits this spot in the 3D structure? (like ProteinMPNN)', answer: 'amino acid',
    phases: ['learn', 'new'], openPhases: ['learn', 'new'], testPhases: ['new'], responseName: (c) => c },
];
export const taskInfo = (k: GameKey) => TASKS.find((t) => t.key === k)!;

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseTask(key: GameKey, raw: any): TaskData {
  const order: string[] = raw.model_order;
  const modelsRaw: any[] = raw.models;
  const pick = (names: string[]) => names.map((n) => modelsRaw.find((m) => m.name === n)!).map((m) => ({ name: m.name, label: m.label.replace(' (sees what you see)', '').replace(' (MSA)', ''), kind: m.kind }));
  if (key === 'nanopore') {
    const models = pick(order);
    const truth = new Map<number, string>(), calls = new Map<number, string>();
    for (const w of raw.windows) { truth.set(w.id, w.l); calls.set(w.id, w.p); }
    return { key, version: raw.version, alphabet: 'ACGT', families: [...'ACGT'].map((b) => ({ label: b, members: b })), models, truth, calls };
  }
  if (key === 'mutations') {
    const models = pick(order);
    const truth = new Map<number, string>(), calls = new Map<number, string>();
    for (const v of raw.variants) { truth.set(v.id, String(v.y)); calls.set(v.id, v.c); }
    return { key, version: raw.version, alphabet: '01', families: [{ label: 'damaging', members: '0' }], models, truth, calls };
  }
  // seq / struct share a dataset; keep the models that are a fair or reference comparison in that game
  const keep = modelsRaw.filter((m) => (m.games ?? []).includes(key)).map((m) => m.name);
  const idx = keep.map((n) => order.indexOf(n));
  const truth = new Map<number, string>(), calls = new Map<number, string>();
  for (const s of raw.sites) { truth.set(s.id, s.aa); calls.set(s.id, idx.map((i) => s.c[i]).join('')); }
  return { key, version: raw.version, alphabet: 'ACDEFGHIKLMNPQRSTVWY', families: AA_FAMILIES, models: pick(keep), truth, calls };
}

const cache = new Map<string, Promise<any>>();
export async function loadTask(key: GameKey): Promise<TaskData> {
  const t = taskInfo(key);
  if (!cache.has(t.dataset)) cache.set(t.dataset, fetch(t.dataset).then((r) => { if (!r.ok) throw new Error(`${t.dataset}: HTTP ${r.status}`); return r.json(); }));
  return parseTask(key, await cache.get(t.dataset)!);
}
