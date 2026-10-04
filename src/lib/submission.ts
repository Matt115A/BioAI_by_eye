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
  for (const k of ['prot.sessions', 'mask.sessions']) { const a = read(k); if (a && typeof a === 'object') out.push(...Object.values(a)); }
  for (const k of ['nano.lastSession', 'prot.lastSession', 'mask.lastSession']) { const s = read(k); if (s && !out.some((o) => o?.meta?.session_id === s?.meta?.session_id)) out.push(s); }
  return out;
}

export function mySubmissions(game: GameKey): Submission[] {
  return localSessions().map(fromSession).filter((x): x is Submission => !!x && x.game === game).map((x) => ({ ...x, mine: true }));
}
