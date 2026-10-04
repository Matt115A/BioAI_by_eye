import { BACKEND_READY, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import type { Submission } from './submission';
import type { GameKey } from './tasks';

const headers = () => ({ apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` });

/** All contributions for a game (public view — no withdrawal hashes). */
export async function fetchSubmissions(game: GameKey): Promise<Submission[]> {
  if (!BACKEND_READY) return [];
  const out: Submission[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/public_submissions?game=eq.${game}&select=id,game,app_version,dataset_version,month,n,items,responses,phases,rt&order=id`, { headers: { ...headers(), Range: `${from}-${from + 999}` } });
    if (!r.ok) throw new Error(`contributions: HTTP ${r.status}`);
    const page = (await r.json()) as Submission[];
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}
