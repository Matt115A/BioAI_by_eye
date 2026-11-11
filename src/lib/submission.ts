import { extendsSubmission } from './analysis';
import { type GameKey, taskInfo } from './tasks';

/** One anonymous datapoint: exactly what is uploaded (plus a withdrawal hash), nothing else. */
export interface Submission {
  id?: number;
  game: GameKey;
  app_version: string;
  dataset_version: string;
  month?: string;
  n: number;
  items: number[];
  responses: string;
  phases: string;
  rt: number[];
  /** local-only flags */
  mine?: boolean;
  simulated?: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Turn a saved game session (any of the games) into a submission. Returns null for simulated or too-short sessions. */
export function fromSession(s: any): Submission | null {
  if (!s?.meta || !Array.isArray(s.trials) || s.meta.simulated) return null;
  const app: string = s.meta.app ?? '';
  let game: GameKey, item: (t: any) => number, resp: (t: any) => string;
  if (app.startsWith('nanopore') || s.trials[0]?.window_id !== undefined) { game = 'nanopore'; item = (t) => t.window_id; resp = (t) => t.pressed; }
  else if (s.trials[0]?.variant_id !== undefined) { game = 'mutations'; item = (t) => t.variant_id; resp = (t) => String(t.response); }
  else if (s.trials[0]?.item_id !== undefined) { game = 'binders'; item = (t) => t.item_id; resp = (t) => String(t.response); }
  else if (s.trials[0]?.site_id !== undefined) { game = s.meta.config?.mode === 'struct' ? 'struct' : 'seq'; item = (t) => t.site_id; resp = (t) => t.response; }
  else return null;
  const phases = taskInfo(game).phases;
  const ts = s.trials.filter((t: any) => typeof resp(t) === 'string' && resp(t).length === 1).slice(0, 1000);
  if (ts.length < 20) return null;
  return {
    game, app_version: String(s.meta.app_version ?? '').slice(0, 20), dataset_version: String(s.meta.dataset_version ?? '').slice(0, 40), n: ts.length,
    items: ts.map(item), responses: ts.map(resp).join('').toUpperCase(),
    phases: ts.map((t: any) => { const k = phases.indexOf(t.phase); return String(k < 0 ? 9 : k); }).join(''),
    rt: ts.map((t: any) => Math.max(0, Math.min(600000, Math.round((t.rt_ms ?? 0) / 10) * 10))),
  };
}

/** Sessions this browser holds for each game (all games share the matt115a.github.io origin). */
export function localSessions(): any[] {
  const out: any[] = [];
  const read = (k: string) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
  for (const k of ['prot.sessions', 'mask.sessions', 'bind.sessions']) { const a = read(k); if (a && typeof a === 'object') out.push(...Object.values(a)); }
  for (const k of ['nano.lastSession', 'prot.lastSession', 'mask.lastSession', 'bind.lastSession']) { const s = read(k); if (s && !out.some((o) => o?.meta?.session_id === s?.meta?.session_id)) out.push(s); }
  return out;
}

/** The games remember every session they play in `bioai.sessions`, so a player is one cumulative datapoint per game
 *  and dataset version however many times they play (see shared/bioai.ts). This rebuilds that merge locally, which is
 *  how your own sessions appear here whether or not you ever pressed Contribute. */
type Logged = Record<string, { at: number; c: Submission }>;
const MIN_ANSWERS = 20, MAX_ANSWERS = 1000;
const merge = (cs: Submission[]): Submission => ({
  ...cs[cs.length - 1], n: cs.reduce((a, x) => a + x.n, 0), items: cs.flatMap((x) => x.items), responses: cs.map((x) => x.responses).join(''),
  phases: cs.map((x) => x.phases).join(''), rt: cs.flatMap((x) => x.rt),
});

export function pooledSubmissions(): Submission[] {
  const read = <T,>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) ?? 'null') as T; } catch { return null; } };
  const logged: Logged = { ...(read<Logged>('bioai.pending') ?? {}), ...(read<Logged>('bioai.sessions') ?? {}) };
  const groups = new Map<string, Submission[]>();
  for (const [, e] of Object.entries(logged).sort((a, b) => a[1].at - b[1].at || a[0].localeCompare(b[0]))) {
    if (!e?.c?.game) continue;
    const k = `${e.c.game}|${e.c.dataset_version}`, g = groups.get(k) ?? [];
    if (g.reduce((a, x) => a + x.n, 0) + e.c.n <= MAX_ANSWERS) g.push(e.c);   // only ever grows at the end
    groups.set(k, g);
  }
  return [...groups.values()].filter((g) => g.reduce((a, x) => a + x.n, 0) >= MIN_ANSWERS).map(merge);
}

export function mySubmissions(game: GameKey): Submission[] {
  const mine = [...localSessions().map(fromSession), ...pooledSubmissions()].filter((x): x is Submission => !!x && x.game === game);
  // a cumulative datapoint contains its own earlier versions, so keep only the longest of any prefix chain
  return mine.filter((x) => !mine.some((y) => y !== x && extendsSubmission(y, x))).map((x) => ({ ...x, mine: true }));
}

/** How many of your own sessions this browser holds, across every game (deduped by id: a session can be both
 *  archived by its game and remembered for contribution). */
export function localSessionCount(): number {
  const read = <T,>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) ?? 'null') as T; } catch { return null; } };
  const ids = new Set<string>();
  for (const s of localSessions()) if (s?.meta?.session_id && !s.meta.simulated && s.trials?.length) ids.add(s.meta.session_id);
  for (const k of [...Object.keys(read<object>('bioai.pending') ?? {}), ...Object.keys(read<object>('bioai.sessions') ?? {})]) ids.add(k);
  return ids.size;
}
