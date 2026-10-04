import { makeRng } from './rng';
import type { Submission } from './submission';
import type { TaskData, TaskInfo } from './tasks';

/**
 * Simulated contributors for previewing the hub before real data exist — clearly labelled in the UI, never uploaded,
 * never mixed with real contributions. Three made-up reasoning styles per task: each leans on a different model's logic
 * and has its own answer bias, and gets a bit better with practice.
 */
export function simulateContributors(task: TaskData, info: TaskInfo, n = 48, seed = 7): Submission[] {
  const rng = makeRng(seed);
  const ids = [...task.truth.keys()];
  const M = task.models.length;
  const styles = [0, Math.floor(M / 2), M - 1].map((m, k) => ({ model: m, bias: task.alphabet[(k * 7) % task.alphabet.length], pCopy: 0.25 + 0.15 * k }));
  const learnIdx = Math.max(0, info.phases.indexOf(info.openPhases[0] === 'pretest' ? 'learning' : info.openPhases[0]));
  const testIdx = info.phases.indexOf(info.testPhases[0]);
  return Array.from({ length: n }, (_, p) => {
    const st = styles[p % 3], len = 80 + Math.floor(rng() * 120);
    const items: number[] = [], seen = new Set<number>();
    while (items.length < len) { const id = ids[Math.floor(rng() * ids.length)]; if (!seen.has(id)) { seen.add(id); items.push(id); } }
    let responses = '', phases = '';
    items.forEach((id, i) => {
      const practice = Math.min(1, i / 120);
      const r = rng();
      const truth = task.truth.get(id)!, call = task.calls.get(id)![st.model];
      responses += r < st.pCopy + 0.15 * practice ? call : r < st.pCopy + 0.15 * practice + 0.1 ? truth : r < 0.75 ? st.bias : task.alphabet[Math.floor(rng() * task.alphabet.length)];
      phases += String(i < len * 0.75 ? learnIdx : testIdx);
    });
    return { game: task.key, app_version: 'sim', dataset_version: task.version, n: len, items, responses, phases, rt: items.map(() => 2000 + Math.round(rng() * 4000)), simulated: true };
  });
}
