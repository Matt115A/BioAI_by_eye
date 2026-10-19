import { useEffect, useState } from 'react';
import { explore } from '../lib/explore';
import { useLevel } from '../lib/level';
import { mySubmissions } from '../lib/submission';
import { type GameKey, loadTask, TASKS } from '../lib/tasks';

interface Played { key: GameKey; acc: number; beat: number; of: number; best: string | null }
const pct = (v: number) => `${Math.round(v * 100)}%`;
const NAME: Record<GameKey, string> = { nanopore: 'Reading DNA', mutations: 'Mutation effects', seq: 'Sequence', struct: 'Structure' };

/** Your own sessions in this browser, across all four tasks: what you've played, how you did against the AI, and what to try next. */
export function Progress({ played }: { played: GameKey[] }) {
  const L = useLevel() === 'learner';
  const [results, setResults] = useState<Record<string, Played | null>>({});
  useEffect(() => {
    let on = true;
    for (const key of played) {
      const info = TASKS.find((t) => t.key === key)!;
      loadTask(key).then((task) => {
        const ex = explore(task, info, [], mySubmissions(key));
        if (!ex.you || !on) return;
        const you = ex.you.acc, ms = ex.models.filter((m) => Number.isFinite(m.acc));
        const beaten = ms.filter((m) => you > m.acc).sort((a, b) => b.acc - a.acc);
        setResults((r) => ({ ...r, [key]: { key, acc: you, beat: beaten.length, of: ms.length, best: beaten[0]?.label ?? null } }));
      }).catch(() => on && setResults((r) => ({ ...r, [key]: null })));
    }
    return () => { on = false; };
  }, [played]);
  if (!played.length) return null;
  const done = Object.values(results).filter((x): x is Played => !!x);
  const top = done.slice().sort((a, b) => b.beat / b.of - a.beat / a.of || b.beat - a.beat)[0];
  const next = TASKS.find((t) => !played.includes(t.key));
  return (
    <section className="progress card" aria-label="Your progress">
      <div className="progress-head">
        <div>
          <div className="progress-kicker">Your progress</div>
          <div className="progress-title">You've played {played.length} of {TASKS.length} games
            {top && <span className="muted"> · best: beat {top.beat} of {top.of} {L ? 'AI models' : 'models'} in {NAME[top.key]}</span>}</div>
        </div>
        {next && <a className="btn btn-primary progress-next" href={next.url}>Try {NAME[next.key]} next →</a>}
      </div>
      <div className="progress-tasks">
        {TASKS.map((t) => {
          const r = results[t.key], has = played.includes(t.key);
          return (
            <a key={t.key} className={`progress-task ${has ? 'played' : ''}`} href={has ? `#explore` : t.url} onClick={() => has && window.dispatchEvent(new CustomEvent('bioai:tab', { detail: t.key }))}>
              <div className="pt-name">{has ? '✓ ' : ''}{NAME[t.key]}</div>
              {!has ? <div className="pt-sub">Not played yet · <b>Play →</b></div>
                : !r ? <div className="pt-sub">{r === null ? 'Couldn\'t load the comparison' : 'Scoring…'}</div>
                : <>
                  <div className="pt-score">{pct(r.acc)}</div>
                  <div className="pt-bar" title={`beat ${r.beat} of ${r.of}`}><span style={{ width: `${(r.beat / Math.max(1, r.of)) * 100}%` }} /></div>
                  <div className="pt-sub">beat {r.beat} of {r.of}{r.best ? <>, including <b>{r.best}</b></> : ''}</div>
                </>}
            </a>
          );
        })}
      </div>
      <p className="note progress-note">From the sessions saved in this browser (your latest per game), scored on exactly the items you answered. Nothing here is uploaded.</p>
    </section>
  );
}
