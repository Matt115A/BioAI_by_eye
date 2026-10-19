import { useEffect, useState } from 'react';
import { explore } from './explore';
import { isCustom, MODEL_INFO } from './models';
import { mySubmissions } from './submission';
import { type GameKey, loadTask, TASKS } from './tasks';

/** Your latest session in one game, compared with the models on exactly the items you answered. */
export interface MyResult {
  key: GameKey;
  /** score (accuracy, or with family credit in the structure game) */
  acc: number;
  /** questions answered */
  n: number;
  /** all models, including ones built for the game */
  beat: number; of: number; best: string | null;
  /** published AI models only */
  pubBeat: number; pubOf: number;
  /** the published model whose answers agree with yours most, beyond chance (Cohen's κ) */
  mostLike: { name: string; label: string; kappa: number; cite: string } | null;
}

/** Results for each game you've played in this browser: undefined while loading, null if it couldn't be scored. */
export function useMyResults(played: GameKey[]) {
  const [results, setResults] = useState<Partial<Record<GameKey, MyResult | null>>>({});
  useEffect(() => {
    let on = true;
    for (const key of played) {
      const info = TASKS.find((t) => t.key === key)!;
      loadTask(key).then((task) => {
        const ex = explore(task, info, [], mySubmissions(key));
        if (!on) return;
        if (!ex.you) { setResults((r) => ({ ...r, [key]: null })); return; }
        const you = ex.you, ms = ex.models.filter((m) => Number.isFinite(m.acc)), pub = ms.filter((m) => !isCustom(m.name));
        const beaten = ms.filter((m) => you.acc > m.acc).sort((a, b) => b.acc - a.acc);
        const like = pub.map((m) => ({ name: m.name, label: m.label, kappa: you.profile[m.index], cite: MODEL_INFO[m.name]?.cite ?? '' }))
          .filter((m) => Number.isFinite(m.kappa)).sort((a, b) => b.kappa - a.kappa)[0] ?? null;
        setResults((r) => ({ ...r, [key]: { key, acc: you.acc, n: you.n, beat: beaten.length, of: ms.length, best: beaten[0]?.label ?? null,
          pubBeat: pub.filter((m) => you.acc > m.acc).length, pubOf: pub.length, mostLike: like } }));
      }).catch(() => on && setResults((r) => ({ ...r, [key]: null })));
    }
    return () => { on = false; };
  }, [played]);
  return results;
}
