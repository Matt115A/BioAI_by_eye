import { useState } from 'react';
import { C, useWidth } from './charts';

const FONT = "Inter, -apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";
export const GROUP_COLOR = ['#f08a5d', '#5bc0be', '#b388eb', '#9ccc65', '#e57373'];
export const groupName = (j: number) => `Group ${'ABCDE'[j]}`;
export const MODEL_KIND_COLOR: Record<string, string> = { simple: '#9cc3e6', deep: '#199e70', classic: '#199e70', sota: '#3987e5', msa: '#c98500', plm: '#3987e5', structure: '#e87ba4', window: '#c98500', full: '#3987e5' };
const pct = (v: number) => `${Math.round(v * 100)}%`;

export function star(cx: number, cy: number, r: number, r2: number) {
  return Array.from({ length: 10 }, (_, i) => { const a = (Math.PI / 5) * i - Math.PI / 2, rr = i % 2 ? r2 : r; return `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`; }).join('') + 'Z';
}

/** Each contributor is a dot (coloured by reasoning group); AI models are labelled ticks; you are the star. */
export function StripPlot({ people, models, you, svgRef, domain }: {
  people: { acc: number; group: number | null; mine: boolean }[]; models: { label: string; acc: number; kind: string }[]; you: number | null;
  svgRef: React.RefObject<SVGSVGElement | null>; domain: [number, number];
}) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const ms = models.filter((m) => Number.isFinite(m.acc)).sort((a, b) => a.acc - b.acc);
  const pad = { l: 16, r: 16 }, laneY = 64;
  const X = (v: number) => pad.l + ((v - domain[0]) / (domain[1] - domain[0])) * (width - pad.l - pad.r);
  // labels: each goes in the first row where it doesn't overlap a neighbour (rows stack downwards)
  const rowEnds: number[] = [];
  const placed = ms.map((m) => {
    const text = `${m.label} ${pct(m.acc)}`, w = text.length * 6.3 + 10, x = X(m.acc);
    const left = Math.max(2, Math.min(width - w - 2, x - w / 2));
    let row = rowEnds.findIndex((end) => end < left);
    if (row < 0) { row = rowEnds.length; rowEnds.push(0); }
    rowEnds[row] = left + w;
    return { ...m, text, left, w, row };
  });
  const H = laneY + 60 + Math.max(1, rowEnds.length) * 15;
  const ticks = []; for (let t = Math.ceil(domain[0] * 10) / 10; t <= domain[1] + 1e-9; t += 0.1) ticks.push(Math.round(t * 10) / 10);
  // deterministic jitter so dots don't stack
  const jit = (i: number) => (((i * 2654435761) % 1000) / 1000 - 0.5) * 40;
  return (
    <div className="chart-wrap" ref={wrap}>
      <svg ref={svgRef} width={width} height={H} fontFamily={FONT}>
        {ticks.map((t) => <g key={t}><line x1={X(t)} x2={X(t)} y1={18} y2={laneY + 28} stroke={C.grid} /><text x={X(t)} y={12} textAnchor="middle" fill={C.muted} fontSize={11}>{pct(t)}</text></g>)}
        {people.map((p, i) => Number.isFinite(p.acc) && (
          <circle key={i} cx={X(p.acc)} cy={laneY + jit(i)} r={p.mine ? 6 : 4.5} fill={p.group == null ? '#8a8980' : GROUP_COLOR[p.group]} opacity={0.85} stroke={p.mine ? C.yellow : C.surface} strokeWidth={p.mine ? 2 : 1}>
            <title>{`${p.group == null ? 'Contributor' : groupName(p.group)}${p.mine ? ' (you)' : ''}: ${pct(p.acc)}`}</title>
          </circle>
        ))}
        {placed.map((m) => {
          const ly = laneY + 52 + m.row * 15;
          return (
            <g key={m.label} onMouseEnter={() => setHover(m.label)} onMouseLeave={() => setHover(null)}>
              <line x1={X(m.acc)} x2={X(m.acc)} y1={laneY - 28} y2={ly - 4} stroke={MODEL_KIND_COLOR[m.kind] ?? C.text2} strokeWidth={hover === m.label ? 2.5 : 1.5} strokeDasharray="3 2" />
              <path d={`M${X(m.acc)} ${laneY - 32} l5 6 l-5 6 l-5 -6 z`} fill={MODEL_KIND_COLOR[m.kind] ?? C.text2} />
              <text x={m.left + m.w / 2} y={ly + 6} textAnchor="middle" fill={hover === m.label ? C.text : C.text2} fontSize={11}>{m.text}</text>
            </g>
          );
        })}
        {you != null && Number.isFinite(you) && <g><path d={star(X(you), laneY, 11, 4.5)} fill={C.yellow} stroke={C.surface} strokeWidth={1.5} /><text x={X(you)} y={laneY - 16} textAnchor="middle" fill={C.yellow} fontSize={12} fontWeight={700}>you</text></g>}
      </svg>
    </div>
  );
}

/** 2D map of reasoning profiles: people (by group), AI models (diamonds), you (star). */
export function MapPlot({ people, models, you, svgRef }: {
  people: { xy: { x: number; y: number } | null; group: number | null; mine: boolean }[]; models: { label: string; kind: string; xy: { x: number; y: number } | null }[];
  you: { x: number; y: number } | null; svgRef: React.RefObject<SVGSVGElement | null>;
}) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const H = Math.min(440, Math.max(300, width * 0.62)), pad = 30;
  const pts = [...people.map((p) => p.xy), ...models.map((m) => m.xy), you].filter((p): p is { x: number; y: number } => !!p);
  if (!pts.length) return <div ref={wrap} className="empty">Not enough contributors to draw the map yet.</div>;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((width - 2 * pad - 90) / Math.max(1e-6, x1 - x0), (H - 2 * pad) / Math.max(1e-6, y1 - y0));
  const X = (x: number) => pad + 45 + (x - (x0 + x1) / 2) * k + (width - 2 * pad - 90) / 2;
  const Y = (y: number) => H / 2 - (y - (y0 + y1) / 2) * k;
  return (
    <div className="chart-wrap" ref={wrap}>
      <svg ref={svgRef} width={width} height={H} fontFamily={FONT}>
        {people.map((p, i) => p.xy && <circle key={i} cx={X(p.xy.x)} cy={Y(p.xy.y)} r={p.mine ? 6.5 : 5} fill={p.group == null ? '#8a8980' : GROUP_COLOR[p.group]} opacity={0.8} stroke={p.mine ? C.yellow : C.surface} strokeWidth={p.mine ? 2 : 1} />)}
        {models.map((m) => m.xy && <path key={m.label} d={`M${X(m.xy.x)} ${Y(m.xy.y) - 7} l7 7 l-7 7 l-7 -7 z`} fill={MODEL_KIND_COLOR[m.kind] ?? C.text2} stroke={C.surface} strokeWidth={1.5} />)}
        {placeLabels(models.filter((m) => m.xy).map((m) => ({ x: X(m.xy!.x), y: Y(m.xy!.y), text: m.label })), width, H).map((l) => (
          <g key={l.text}>
            {l.leader && <line x1={l.px} y1={l.py} x2={l.x} y2={l.y} stroke="#55554f" strokeWidth={0.8} />}
            <text x={l.x} y={l.y} dy="0.35em" textAnchor={l.anchor} fill={C.text2} fontSize={11}>{l.text}</text>
          </g>
        ))}
        {you && <g><path d={star(X(you.x), Y(you.y), 12, 5)} fill={C.yellow} stroke={C.surface} strokeWidth={1.5} /><text x={X(you.x)} y={Y(you.y) - 16} textAnchor="middle" fill={C.yellow} fontSize={12} fontWeight={700}>you</text></g>}
      </svg>
    </div>
  );
}

/** Horizontal bars with labels on the left. */
export function RankBars({ rows, svgRef, format = (v) => v.toFixed(2), refLine }: { rows: { label: string; value: number; color: string; bold?: boolean }[]; svgRef: React.RefObject<SVGSVGElement | null>; format?: (v: number) => string; refLine?: { value: number; label: string } }) {
  const [wrap, width] = useWidth<HTMLDivElement>();
  const rowH = 24, labelW = Math.min(260, width * 0.42), top = 6, H = top + rows.length * rowH + (refLine ? 22 : 8);
  const vals = rows.map((r) => r.value).filter(Number.isFinite);
  const lo = Math.min(0, ...vals, refLine?.value ?? 0), hi = Math.max(0.1, ...vals, refLine?.value ?? 0);
  const X = (v: number) => labelW + ((v - lo) / (hi - lo)) * Math.max(10, width - labelW - 50);
  return (
    <div className="chart-wrap" ref={wrap}>
      <svg ref={svgRef} width={width} height={H} fontFamily={FONT}>
        <line x1={X(0)} x2={X(0)} y1={top - 2} y2={top + rows.length * rowH} stroke={C.axis} />
        {rows.map((r, i) => {
          const y = top + i * rowH, v = Number.isFinite(r.value) ? r.value : 0;
          return (
            <g key={r.label + i}>
              <text x={labelW - 8} y={y + rowH / 2} dy="0.35em" textAnchor="end" fill={r.bold ? C.text : C.text2} fontSize={12.5} fontWeight={r.bold ? 700 : 400}>{r.label}</text>
              <rect x={Math.min(X(0), X(v))} y={y + 5} width={Math.abs(X(v) - X(0))} height={rowH - 10} rx={3} fill={r.color} />
              <text x={Math.max(X(0), X(v)) + 6} y={y + rowH / 2} dy="0.35em" fill={C.text} fontSize={12}>{Number.isFinite(r.value) ? format(r.value) : '–'}</text>
            </g>
          );
        })}
        {refLine && Number.isFinite(refLine.value) && <g><line x1={X(refLine.value)} x2={X(refLine.value)} y1={top - 2} y2={top + rows.length * rowH + 4} stroke={C.yellow} strokeDasharray="4 3" /><text x={X(refLine.value)} y={H - 4} textAnchor="middle" fill={C.yellow} fontSize={11}>{refLine.label}</text></g>}
      </svg>
    </div>
  );
}

/** Greedy label placement around points (right, left, above, below, then further out with a leader line). */
function placeLabels(pts: { x: number; y: number; text: string }[], W: number, H: number) {
  type Box = { x: number; y: number; w: number; h: number };
  const taken: Box[] = pts.map((p) => ({ x: p.x - 7, y: p.y - 7, w: 14, h: 14 }));
  const hit = (b: Box) => b.x < 0 || b.x + b.w > W || b.y < 0 || b.y + b.h > H || taken.some((t) => b.x < t.x + t.w && b.x + b.w > t.x && b.y < t.y + t.h && b.y + b.h > t.y);
  return pts.map((p) => {
    const w = p.text.length * 6.2 + 4, h = 13;
    const cands: [number, number, 'start' | 'end' | 'middle', boolean][] = [];
    for (const r of [0, 1, 2, 3]) {
      const d = 10 + r * 14;
      cands.push([p.x + d, p.y, 'start', r > 0], [p.x - d, p.y, 'end', r > 0], [p.x, p.y - d - 2, 'middle', r > 0], [p.x, p.y + d + 2, 'middle', r > 0],
        [p.x + d, p.y - d, 'start', true], [p.x + d, p.y + d, 'start', true], [p.x - d, p.y - d, 'end', true], [p.x - d, p.y + d, 'end', true]);
    }
    const box = ([x, y, a]: [number, number, string, boolean]): Box => ({ x: a === 'start' ? x : a === 'end' ? x - w : x - w / 2, y: y - h / 2, w, h });
    const pick = cands.find((c) => !hit(box(c))) ?? cands[0];
    taken.push(box(pick));
    return { text: p.text, x: pick[0], y: pick[1], anchor: pick[2], leader: pick[3], px: p.x, py: p.y };
  });
}
