import { useLevel } from '../lib/level';
import type { MyResult } from '../lib/mine';
import { type GameKey, TASKS } from '../lib/tasks';

const pct = (v: number) => `${Math.round(v * 100)}%`;
export const NAME: Record<GameKey, string> = { nanopore: 'Reading DNA', mutations: 'Mutation effects', seq: 'Sequence', struct: 'Structure', binders: 'Binders' };

/** Your own sessions in this browser, across all tasks: what you've played, how you did against the AI, and what to try next. */
export function Progress({ played, results }: { played: GameKey[]; results: Partial<Record<GameKey, MyResult | null>> }) {
  const L = useLevel() === 'learner';
  if (!played.length) return null;
  const done = Object.values(results).filter((x): x is MyResult => !!x);
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
        <div className="progress-actions"><a className="btn progress-cert" href="#certificate">Get your certificate</a>{next && <a className="btn btn-primary progress-next" href={next.url}>Try {NAME[next.key]} next →</a>}</div>
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
