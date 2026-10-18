import { type ReactNode, useState } from 'react';
import { useLevel } from '../lib/level';
import { modelBlurb } from '../lib/models';
import { C, useWidth } from './charts';

const FONT = "Inter, -apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";
export const GROUP_COLOR = ['#f08a5d', '#5bc0be', '#b388eb', '#9ccc65', '#e57373'];
export const groupName = (j: number) => `Group ${'ABCDE'[j]}`;
export const MODEL_KIND_COLOR: Record<string, string> = { simple: '#9cc3e6', deep: '#199e70', classic: '#199e70', sota: '#3987e5', msa: '#c98500', plm: '#3987e5', structure: '#e87ba4', window: '#c98500', full: '#3987e5' };
const pct = (v: number) => `${Math.round(v * 100)}%`;

export function star(cx: number, cy: number, r: number, r2: number) {
  return Array.from({ length: 10 }, (_, i) => { const a = (Math.PI / 5) * i - Math.PI / 2, rr = i % 2 ? r2 : r; return `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`; }).join('') + 'Z';
}

type Hover = { key?: string; x: number; y: number; body: ReactNode } | null;

/** Floating explanation for whatever point is under the mouse (or was last tapped). */
function Tip({ hover, width }: { hover: Hover; width: number }) {
  if (!hover) return null;
  const w = Math.min(300, width - 8), left = Math.max(4, Math.min(width - w - 4, hover.x - w / 2));
  return <div className="tooltip tip-wrap" style={{ left, top: hover.y + 14, width: w }}>{hover.body}</div>;
}

/** Name, score, one-sentence explanation and citation for a model, at the reader's level. */
export function ModelTip({ name, label, kind, acc }: { name: string; label: string; kind: string; acc?: number }) {
  const level = useLevel();
  const b = modelBlurb(name, level);
  return (
    <>
      <div className="tt-head"><i className="sq" style={{ background: MODEL_KIND_COLOR[kind] ?? C.text2 }} /><b>{label}</b>{acc != null && Number.isFinite(acc) && <span className="tt-num">{pct(acc)}</span>}</div>
      {b && <div className="tt-text">{b.text} <span className="tt-cite">({b.cite})</span></div>}
    </>
  );
}

const personTip = (group: number | null, mine: boolean, acc?: number) => (
  <div className="tt-head"><i style={{ background: group == null ? '#8a8980' : GROUP_COLOR[group] }} /><b>{mine ? 'You' : group == null ? 'A contributor' : `Someone in ${groupName(group)}`}</b>{acc != null && <span className="tt-num">{pct(acc)}</span>}</div>
);

/** Each contributor is a dot (coloured by reasoning group); AI models are diamonds; you are the star. Labels appear on hover. */
export function StripPlot({ people, models, you, svgRef, domain }: {
  people: { acc: number; group: number | null; mine: boolean }[]; models: { name: string; label: string; acc: number; kind: string }[]; you: number | null;
  svgRef: React.RefObject<SVGSVGElement | null>; domain: [number, number];
}) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<Hover>(null);
  const ms = models.filter((m) => Number.isFinite(m.acc)).sort((a, b) => a.acc - b.acc);
  const pad = { l: 16, r: 16 }, top = 30;
  const X = (v: number) => pad.l + ((v - domain[0]) / (domain[1] - domain[0])) * (width - pad.l - pad.r);
  // diamonds that would touch stack into extra rows, so every model stays visible and hoverable
  const rowEnds: number[] = [];
  const placed = ms.map((m) => {
    const x = X(m.acc);
    let row = rowEnds.findIndex((end) => end < x - 13);
    if (row < 0) { row = rowEnds.length; rowEnds.push(0); }
    rowEnds[row] = x;
    return { ...m, x, y: top + row * 15 };
  });
  const laneY = top + Math.max(1, rowEnds.length) * 15 + 34, H = laneY + 34;
  const ticks = []; for (let t = Math.ceil(domain[0] * 10) / 10; t <= domain[1] + 1e-9; t += 0.1) ticks.push(Math.round(t * 10) / 10);
  // deterministic jitter so dots don't stack
  const jit = (i: number) => (((i * 2654435761) % 1000) / 1000 - 0.5) * 36;
  const show = (key: string, x: number, y: number, body: ReactNode) => setHover({ key, x, y, body });
  const toggle = (key: string, x: number, y: number, body: ReactNode) => setHover((h) => (h?.key === key ? null : { key, x, y, body }));
  return (
    <div className="chart-wrap" ref={wrap} onMouseLeave={() => setHover(null)}>
      <svg ref={svgRef} width={width} height={H} fontFamily={FONT}>
        {ticks.map((t) => <g key={t}><line x1={X(t)} x2={X(t)} y1={18} y2={H - 6} stroke={C.grid} /><text x={X(t)} y={12} textAnchor="middle" fill={C.muted} fontSize={11}>{pct(t)}</text></g>)}
        {people.map((p, i) => Number.isFinite(p.acc) && (
          <circle key={i} cx={X(p.acc)} cy={laneY + jit(i)} r={p.mine ? 6 : 4.5} fill={p.group == null ? '#8a8980' : GROUP_COLOR[p.group]} opacity={0.85} stroke={p.mine ? C.yellow : C.surface} strokeWidth={p.mine ? 2 : 1}
            onMouseEnter={() => show(`p${i}`, X(p.acc), laneY + jit(i), personTip(p.group, p.mine, p.acc))} onClick={() => toggle(`p${i}`, X(p.acc), laneY + jit(i), personTip(p.group, p.mine, p.acc))} />
        ))}
        {placed.map((m) => {
          const on = hover?.key === m.name, col = MODEL_KIND_COLOR[m.kind] ?? C.text2, body = <ModelTip {...m} />;
          return (
            <g key={m.name} className="hit" onMouseEnter={() => show(m.name, m.x, m.y, body)} onClick={() => toggle(m.name, m.x, m.y, body)}>
              <line x1={m.x} x2={m.x} y1={m.y + 6} y2={laneY + 20} stroke={col} strokeWidth={on ? 2 : 1} strokeDasharray="3 2" opacity={on ? 1 : 0.35} />
              <circle cx={m.x} cy={m.y} r={9} fill="transparent" />
              <path d={`M${m.x} ${m.y - 6} l6 6 l-6 6 l-6 -6 z`} fill={col} stroke={on ? C.text : C.surface} strokeWidth={on ? 1.5 : 1} />
            </g>
          );
        })}
        {you != null && Number.isFinite(you) && <g className="hit" onMouseEnter={() => show('you', X(you), laneY, personTip(null, true, you))}><path d={star(X(you), laneY, 11, 4.5)} fill={C.yellow} stroke={C.surface} strokeWidth={1.5} /></g>}
      </svg>
      <Tip hover={hover} width={width} />
    </div>
  );
}

/** 2D map of reasoning profiles: people (by group), AI models (diamonds), you (star). Labels appear on hover. */
export function MapPlot({ people, models, you, svgRef }: {
  people: { xy: { x: number; y: number } | null; group: number | null; mine: boolean }[]; models: { name: string; label: string; kind: string; xy: { x: number; y: number } | null }[];
  you: { x: number; y: number } | null; svgRef: React.RefObject<SVGSVGElement | null>;
}) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<Hover>(null);
  const H = Math.min(440, Math.max(300, width * 0.62)), pad = 30;
  const pts = [...people.map((p) => p.xy), ...models.map((m) => m.xy), you].filter((p): p is { x: number; y: number } => !!p);
  if (!pts.length) return <div ref={wrap} className="empty">Not enough contributors to draw the map yet.</div>;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((width - 2 * pad) / Math.max(1e-6, x1 - x0), (H - 2 * pad) / Math.max(1e-6, y1 - y0));
  const X = (x: number) => width / 2 + (x - (x0 + x1) / 2) * k;
  const Y = (y: number) => H / 2 - (y - (y0 + y1) / 2) * k;
  const show = (key: string, x: number, y: number, body: ReactNode) => setHover({ key, x, y, body });
  const toggle = (key: string, x: number, y: number, body: ReactNode) => setHover((h) => (h?.key === key ? null : { key, x, y, body }));
  return (
    <div className="chart-wrap" ref={wrap} onMouseLeave={() => setHover(null)}>
      <svg ref={svgRef} width={width} height={H} fontFamily={FONT}>
        {people.map((p, i) => p.xy && <circle key={i} className="hit" cx={X(p.xy.x)} cy={Y(p.xy.y)} r={p.mine ? 6.5 : 5} fill={p.group == null ? '#8a8980' : GROUP_COLOR[p.group]} opacity={0.8} stroke={p.mine ? C.yellow : C.surface} strokeWidth={p.mine ? 2 : 1}
          onMouseEnter={() => show(`p${i}`, X(p.xy!.x), Y(p.xy!.y), personTip(p.group, p.mine))} onClick={() => toggle(`p${i}`, X(p.xy!.x), Y(p.xy!.y), personTip(p.group, p.mine))} />)}
        {models.map((m) => {
          if (!m.xy) return null;
          const x = X(m.xy.x), y = Y(m.xy.y), on = hover?.key === m.name, body = <ModelTip {...m} />;
          return (
            <g key={m.name} className="hit" onMouseEnter={() => show(m.name, x, y, body)} onClick={() => toggle(m.name, x, y, body)}>
              <circle cx={x} cy={y} r={10} fill="transparent" />
              <path d={`M${x} ${y - 7} l7 7 l-7 7 l-7 -7 z`} fill={MODEL_KIND_COLOR[m.kind] ?? C.text2} stroke={on ? C.text : C.surface} strokeWidth={1.5} />
            </g>
          );
        })}
        {you && <g className="hit" onMouseEnter={() => show('you', X(you.x), Y(you.y), personTip(null, true))}><path d={star(X(you.x), Y(you.y), 12, 5)} fill={C.yellow} stroke={C.surface} strokeWidth={1.5} /></g>}
      </svg>
      <Tip hover={hover} width={width} />
    </div>
  );
}

/** Horizontal bars with labels on the left. */
export function RankBars({ rows, svgRef, format = (v) => v.toFixed(2), refLine }: { rows: { label: string; value: number; color: string; bold?: boolean; tip?: ReactNode }[]; svgRef: React.RefObject<SVGSVGElement | null>; format?: (v: number) => string; refLine?: { value: number; label: string } }) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const rowH = 24, labelW = Math.min(260, width * 0.42), top = 6, H = top + rows.length * rowH + (refLine ? 22 : 8);
  const vals = rows.map((r) => r.value).filter(Number.isFinite);
  const lo = Math.min(0, ...vals, refLine?.value ?? 0), hi = Math.max(0.1, ...vals, refLine?.value ?? 0);
  const X = (v: number) => labelW + ((v - lo) / (hi - lo)) * Math.max(10, width - labelW - 50);
  const [hover, setHover] = useState<Hover>(null);
  return (
    <div className="chart-wrap" ref={wrap} onMouseLeave={() => setHover(null)}>
      <svg ref={svgRef} width={width} height={H} fontFamily={FONT}>
        <line x1={X(0)} x2={X(0)} y1={top - 2} y2={top + rows.length * rowH} stroke={C.axis} />
        {rows.map((r, i) => {
          const y = top + i * rowH, v = Number.isFinite(r.value) ? r.value : 0;
          return (
            <g key={r.label + i} className={r.tip ? 'hit' : undefined} onMouseEnter={() => r.tip && setHover({ key: r.label, x: labelW, y: y + rowH / 2, body: r.tip })}
              onClick={() => r.tip && setHover((h) => (h?.key === r.label ? null : { key: r.label, x: labelW, y: y + rowH / 2, body: r.tip }))}>
              <rect x={0} y={y} width={width} height={rowH} fill={hover?.key === r.label ? C.grid : 'transparent'} data-export-hide />
              <text x={labelW - 8} y={y + rowH / 2} dy="0.35em" textAnchor="end" fill={r.bold ? C.text : C.text2} fontSize={12.5} fontWeight={r.bold ? 700 : 400}>{r.label}</text>
              <rect x={Math.min(X(0), X(v))} y={y + 5} width={Math.abs(X(v) - X(0))} height={rowH - 10} rx={3} fill={r.color} />
              <text x={Math.max(X(0), X(v)) + 6} y={y + rowH / 2} dy="0.35em" fill={C.text} fontSize={12}>{Number.isFinite(r.value) ? format(r.value) : '–'}</text>
            </g>
          );
        })}
        {refLine && Number.isFinite(refLine.value) && <g><line x1={X(refLine.value)} x2={X(refLine.value)} y1={top - 2} y2={top + rows.length * rowH + 4} stroke={C.yellow} strokeDasharray="4 3" /><text x={X(refLine.value)} y={H - 4} textAnchor="middle" fill={C.yellow} fontSize={11}>{refLine.label}</text></g>}
      </svg>
      <Tip hover={hover} width={width} />
    </div>
  );
}
