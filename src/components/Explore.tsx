import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchSubmissions } from '../lib/backend';
import { BACKEND_READY } from '../lib/config';
import { explore } from '../lib/explore';
import { MIN_FOR_CLUSTERS } from '../lib/analysis';
import { mySubmissions, type Submission } from '../lib/submission';
import { type GameKey, loadTask, type TaskData, taskInfo } from '../lib/tasks';
import { C, Card, Legend, LineChart } from './charts';
import { GROUP_COLOR, groupName, MapPlot, MODEL_KIND_COLOR, RankBars, StripPlot } from './Plots';

const pct = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '–' : `${Math.round(v * 100)}%`);
const KIND_TEXT: Record<string, string> = { simple: 'simple model', deep: 'deep learning', classic: 'classic MSA', sota: 'state of the art', msa: 'deep MSA', plm: 'protein language model', structure: 'structure-aware', window: 'ESM2 · same window', full: 'ESM2 · whole protein' };

export function Explore({ game, counts }: { game: GameKey; counts: Record<string, number | null> }) {
  const info = taskInfo(game);
  const [task, setTask] = useState<TaskData | null>(null);
  const [real, setReal] = useState<Submission[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    setTask(null); setReal(null); setErr(null);
    Promise.all([loadTask(game), fetchSubmissions(game).catch((e) => { if (on) setErr(String(e)); return []; })])
      .then(([t, subs]) => { if (on) { setTask(t); setReal(subs.filter((s) => s.dataset_version === t.version)); } })
      .catch((e) => on && setErr(String(e)));
    return () => { on = false; };
  }, [game]);
  const mine = useMemo(() => mySubmissions(game), [game]);
  const ex = useMemo(() => (task && real ? explore(task, info, real, mine) : null), [task, real, info, mine]);
  const refs = { strip: useRef<SVGSVGElement>(null), map: useRef<SVGSVGElement>(null), agree: useRef<SVGSVGElement>(null), curve: useRef<SVGSVGElement>(null) };
  if (err && !task) return <div className="card empty">Couldn't load this task: {err}</div>;
  if (!ex || !task) return <div className="card empty pulse">Loading {info.game.toLowerCase()} data…</div>;
  const best = ex.models.reduce((b, m) => (m.acc > b.acc ? m : b), ex.models[0]);
  const accs = ex.persons.map((p) => p.acc).filter(Number.isFinite);
  const med = accs.length ? [...accs].sort((a, b) => a - b)[Math.floor(accs.length / 2)] : NaN;
  const lo = Math.max(0, Math.floor(Math.min(...accs, ...ex.models.map((m) => m.acc).filter(Number.isFinite), ex.you?.acc ?? 1) * 10) / 10 - 0.05);
  const kinds = [...new Set(ex.models.map((m) => m.kind))];
  return (
    <div className="explore">
      <div className="data-banner">
        {!BACKEND_READY ? <>Contributions aren't switched on.</>
          : ex.nPeople === 0 ? <><b>No contributions yet for this task.</b> Be the first: <a href={info.url}>play {info.game.toLowerCase()}</a> and press <b>Contribute anonymously</b> on your results page.{ex.you ? ' Meanwhile, your own session is compared with the AI models below.' : ''}</>
          : <><b>{ex.nPeople} {ex.nPeople === 1 ? 'person has' : 'people have'} contributed</b> · anonymous datapoints from people who chose to share.{ex.nPeople < MIN_FOR_CLUSTERS ? ` Groups of people who reason alike appear at ${MIN_FOR_CLUSTERS}.` : ''}</>}
      </div>
      <div className="kpis">
        <div className="kpi"><div className="kpi-label">Contributors</div><div className="kpi-value">{ex.nPeople}</div><div className="kpi-sub">{ex.nTrials.toLocaleString()} answers</div></div>
        <div className="kpi"><div className="kpi-label">Typical human</div><div className="kpi-value">{pct(med)}</div><div className="kpi-sub">median accuracy</div></div>
        <div className="kpi"><div className="kpi-label">Best AI on the same items</div><div className="kpi-value">{pct(best?.acc)}</div><div className="kpi-sub">{best?.label}</div></div>
        <div className="kpi you"><div className="kpi-label">You</div><div className="kpi-value">{ex.you ? pct(ex.you.acc) : '–'}</div><div className="kpi-sub">{ex.you ? (ex.you.group != null ? `reasons like ${groupName(ex.you.group)}` : 'your latest session') : <a href={info.url}>play to see where you land</a>}</div></div>
      </div>

      <Card title="How people and AI stack up" svgRef={refs.strip} exportName={`${game}_stack_up`}
        sub={<>Each dot is one person's accuracy (all their answers), coloured by reasoning group. Diamonds are AI models, scored on exactly the same items as the people.{ex.you ? ' The star is you.' : ''}</>}>
        <Legend items={[...ex.groups.map((g) => ({ name: groupName(g.index), color: GROUP_COLOR[g.index] })), ...kinds.map((k) => ({ name: KIND_TEXT[k] ?? k, color: MODEL_KIND_COLOR[k] ?? C.text2, square: true }))]} />
        <StripPlot svgRef={refs.strip} domain={[lo, 1]} you={ex.you?.acc ?? null} people={ex.persons.map((p) => ({ acc: p.acc, group: p.group, mine: p.mine }))} models={ex.models.map((m) => ({ label: m.label, acc: m.acc, kind: m.kind }))} />
      </Card>

      <div className="grid2">
        <Card title="The reasoning map" svgRef={refs.map} exportName={`${game}_reasoning_map`}
          sub="People placed by how they reason, not how well: which models' answers they agree with (beyond chance) and which answers they lean towards. Close together = similar logic. AI models are placed on the same axes.">
          <MapPlot svgRef={refs.map} you={ex.you?.xy ?? null} people={ex.persons.map((p) => ({ xy: p.xy, group: p.group, mine: p.mine }))} models={ex.models.map((m) => ({ label: m.label, kind: m.kind, xy: m.xy }))} />
        </Card>
        <Card title="Groups of people who reason alike" sub={ex.groups.length ? `Found by clustering everyone's reasoning profile (k-means, ${ex.groups.length} groups, silhouette ${ex.silhouette?.toFixed(2)}). Anonymous: a group is just people whose answers follow similar logic.` : `Groups appear once at least ${MIN_FOR_CLUSTERS} people have contributed.`}>
          <div className="groups">
            {ex.groups.map((g) => (
              <div key={g.index} className={`group-card ${ex.you?.group === g.index ? 'is-you' : ''}`} style={{ ['--g' as string]: GROUP_COLOR[g.index] }}>
                <div className="group-head"><span className="group-dot" /><b>{groupName(g.index)}</b><span className="muted">{g.size} {g.size === 1 ? 'person' : 'people'} · {pct(g.acc)} accuracy</span>{ex.you?.group === g.index && <span className="you-tag">you{ex.you.contributed ? '' : ' (if you contribute)'}</span>}</div>
                <div className="group-body">{g.logic[0].toUpperCase() + g.logic.slice(1)}; {g.traitText}.</div>
              </div>
            ))}
            {!ex.groups.length && <div className="empty">Not enough contributors yet.</div>}
          </div>
          {ex.you && ex.groups.length > 0 && !ex.you.contributed && <p className="note">Your latest {info.game.toLowerCase()} session reasons like <b>{groupName(ex.you.group!)}</b>. To join it, open the game's results page and press <b>Contribute anonymously</b>.</p>}
        </Card>
      </div>

      <div className="grid2">
        {ex.nPeople === 0 && ex.you ? (
          <Card title="Who do you think like?" svgRef={refs.agree} exportName={`${game}_agreement_you`} sub="Agreement beyond chance (Cohen's κ) between your latest session's answers and each model's, on the same items. Once people contribute, this compares everyone.">
            <RankBars svgRef={refs.agree} rows={task.models.map((m, k) => ({ label: m.label, value: ex.you!.profile[k], color: MODEL_KIND_COLOR[m.kind] ?? C.text2 })).sort((a, b) => b.value - a.value)} />
          </Card>
        ) : (
          <Card title="Who do people think like?" svgRef={refs.agree} exportName={`${game}_agreement`}
            sub="Average agreement beyond chance (Cohen's κ) between people's answers and each model's, on the same items. The dashed line is how much people agree with each other.">
            {ex.nPeople ? <RankBars svgRef={refs.agree} rows={ex.agreement.map((m) => ({ label: m.label, value: m.kappa, color: MODEL_KIND_COLOR[m.kind] ?? C.text2 }))}
              refLine={Number.isFinite(ex.human.kappa) ? { value: ex.human.kappa, label: `human ↔ human κ ${ex.human.kappa.toFixed(2)}` } : undefined} /> : <div className="empty">Appears once someone contributes.</div>}
          </Card>
        )}
        <Card title="How fast do people learn?" svgRef={refs.curve} exportName={`${game}_learning`} sub="Average accuracy in blocks of 20 answers, across everyone who got that far (band: middle half of people). Dashed: the best AI model on the same items.">
          {ex.curve.length < 2 ? <div className="empty">Appears once at least two people have contributed.</div> : <LineChart svgRef={refs.curve} height={260} yDomain={[0, 1]} yFormat={(v) => `${Math.round(v * 100)}%`} xLabel="Answer number" yLabel="Accuracy"
            refLines={best && Number.isFinite(best.acc) ? [{ y: best.acc, label: best.label, at: 'end' }] : []}
            series={[
              { name: 'upper quartile', color: '#5a5a54', points: ex.curve.map((p) => ({ x: p.x, y: p.hi })), dash: '2 3' },
              { name: 'lower quartile', color: '#5a5a54', points: ex.curve.map((p) => ({ x: p.x, y: p.lo })), dash: '2 3' },
              { name: 'Average person', color: C.text, points: ex.curve.map((p) => ({ x: p.x, y: p.y })), width: 2.5, dots: true },
            ]} />}
        </Card>
      </div>
      <p className="note">{counts[game] != null ? `${counts[game]} contributions stored for this task.` : ''} Profiles use only the trials where every answer was allowed. Data version {task.version}.</p>
    </div>
  );
}
