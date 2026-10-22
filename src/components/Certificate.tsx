import { useMemo, useRef, useState } from 'react';
import { downloadBlob } from '../lib/export';
import type { MyResult } from '../lib/mine';
import { type GameKey, TASKS } from '../lib/tasks';

const W = 1200, H = 630, Y = '#f2c230', FONT = "Inter, -apple-system, 'Helvetica Neue', Arial, sans-serif";
const TITLE: Record<GameKey, string> = { nanopore: 'Reading DNA by eye', mutations: 'Mutation effects by eye', seq: 'Protein sequence by eye · Sequence', struct: 'Protein sequence by eye · Structure', binders: 'Binders by eye' };
const SHORT: Record<GameKey, string> = { nanopore: 'Reading DNA', mutations: 'Mutation effects', seq: 'Sequence', struct: 'Structure', binders: 'Binders' };
const pct = (v: number) => `${Math.round(v * 100)}%`;
const NAME_KEY = 'bioai.certName';
const fit = (text: string, max: number, size: number) => Math.max(18, Math.min(size, (max / Math.max(1, text.length)) * 1.9));

/** Draw the certificate (SVG, fixed 1200×630) for one game or for every game played. */
function CertSvg({ rs, name, svgRef }: { rs: MyResult[]; name: string; svgRef: React.Ref<SVGSVGElement> }) {
  const one = rs.length === 1 ? rs[0] : null;
  const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const total = rs.reduce((a, r) => a + r.n, 0);
  const who = name.trim() || 'A BioAI by eye player';
  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" xmlns="http://www.w3.org/2000/svg" fontFamily={FONT} role="img" aria-label="Your BioAI by eye certificate">
      <rect width={W} height={H} rx={28} fill="#0e0e0d" />
      <rect x={18} y={18} width={W - 36} height={H - 36} rx={20} fill="none" stroke={Y} strokeOpacity={0.55} strokeWidth={2} />
      <path d={`M${W - 262} ${H - 92} L${W - 212} ${H - 92} L${W - 200} ${H - 140} L${W - 176} ${H - 140} L${W - 164} ${H - 70} L${W - 136} ${H - 70} L${W - 128} ${H - 120} L${W - 100} ${H - 120} L${W - 90} ${H - 96} L${W - 60} ${H - 96}`} fill="none" stroke={Y} strokeOpacity={0.22} strokeWidth={5} strokeLinejoin="round" />
      <text x={60} y={84} fill={Y} fontSize={20} fontWeight={700} letterSpacing={5}>BIOAI BY EYE · CERTIFICATE</text>
      <text x={W - 60} y={84} fill="#8a8980" fontSize={20} textAnchor="end">{month}</text>
      <text x={60} y={148} fill="#f4f4f0" fontSize={fit(who, 1080, 52)} fontWeight={750}>{who}</text>
      <text x={60} y={190} fill="#c3c2b7" fontSize={24}>{one ? <>took on the AI at <tspan fill="#f4f4f0" fontWeight={650}>{TITLE[one.key]}</tspan></> : <>took on biology's AI models in {rs.length} game{rs.length === 1 ? '' : 's'}</>}</text>
      {one ? (
        <g>
          <Stat x={60} y={260} big={pct(one.acc)} label={`score · ${one.n.toLocaleString()} questions`} accent />
          <Stat x={400} y={260} big={`${one.pubBeat} of ${one.pubOf}`} label="AI models beaten" note="published models only" />
          <g transform="translate(810 260)">
            <text y={30} fill="#8a8980" fontSize={20} letterSpacing={2}>THINKS MOST LIKE</text>
            <text y={86} fill="#f4f4f0" fontSize={fit(one.mostLike?.label ?? '–', 330, 46)} fontWeight={750}>{one.mostLike?.label ?? '–'}</text>
            {one.mostLike && <text y={122} fill="#8a8980" fontSize={19}>{one.mostLike.cite} · agreement κ {one.mostLike.kappa.toFixed(2)}</text>}
          </g>
        </g>
      ) : (
        <g transform="translate(60 236)">
          <text y={18} fill="#8a8980" fontSize={17} letterSpacing={2}>GAME</text>
          <text x={430} y={18} fill="#8a8980" fontSize={17} letterSpacing={2}>SCORE</text>
          <text x={560} y={18} fill="#8a8980" fontSize={17} letterSpacing={2}>AI BEATEN</text>
          <text x={730} y={18} fill="#8a8980" fontSize={17} letterSpacing={2}>THINKS MOST LIKE</text>
          {rs.map((r, i) => (
            <g key={r.key} transform={`translate(0 ${58 + i * 62})`}>
              <line x1={0} x2={W - 120} y1={-38} y2={-38} stroke="#2c2c29" />
              <text y={0} fill="#f4f4f0" fontSize={27} fontWeight={650}>{SHORT[r.key]}</text>
              <text y={0} x={250} fill="#8a8980" fontSize={19}>{r.n} questions</text>
              <text x={430} y={0} fill={Y} fontSize={30} fontWeight={750}>{pct(r.acc)}</text>
              <text x={560} y={0} fill="#f4f4f0" fontSize={27} fontWeight={650}>{r.pubBeat} of {r.pubOf}</text>
              <text x={730} y={0} fill="#f4f4f0" fontSize={fit(r.mostLike?.label ?? '–', 350, 26)} fontWeight={650}>{r.mostLike?.label ?? '–'}</text>
            </g>
          ))}
        </g>
      )}
      <text x={60} y={H - 52} fill="#c3c2b7" fontSize={21}>{one ? '' : `${total.toLocaleString()} questions answered · `}Can you beat biology's AI? <tspan fill={Y} fontWeight={650}>matt115a.github.io/BioAI_by_eye</tspan></text>
    </svg>
  );
}

function Stat({ x, y, big, label, accent, note }: { x: number; y: number; big: string; label: string; accent?: boolean; note?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <text y={30} fill="#8a8980" fontSize={20} letterSpacing={2}>{label.toUpperCase()}</text>
      <text y={124} fill={accent ? Y : '#f4f4f0'} fontSize={accent ? 104 : 84} fontWeight={800} letterSpacing={-2}>{big}</text>
      {note && <text y={160} fill="#8a8980" fontSize={18}>{note}</text>}
    </g>
  );
}

/** Render the SVG at full size to a PNG blob. */
function toPng(svg: SVGSVGElement): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(W)); clone.setAttribute('height', String(H));
  const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2;
      const ctx = c.getContext('2d')!; ctx.fillStyle = '#0e0e0d'; ctx.fillRect(0, 0, c.width, c.height); ctx.scale(2, 2); ctx.drawImage(img, 0, 0, W, H);   // no transparent corners when posted on light backgrounds
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('could not render the image'))), 'image/png');
    };
    img.onerror = () => reject(new Error('could not render the image'));
    img.src = src;
  });
}

/** Your certificate for one game, or all of them: preview, optional name, download or share. Made in this browser; nothing is uploaded. */
export function Certificate({ played, results }: { played: GameKey[]; results: Partial<Record<GameKey, MyResult | null>> }) {
  const ready = TASKS.map((t) => results[t.key]).filter((r): r is MyResult => !!r);
  const [choice, setChoice] = useState<GameKey | 'all'>('all');
  const [name, setName] = useState(() => { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } });
  const [msg, setMsg] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const rs = useMemo(() => (choice === 'all' ? ready : ready.filter((r) => r.key === choice)), [choice, ready]);
  if (!played.length || !ready.length) return null;
  const pick = rs.length ? choice : 'all', shown = rs.length ? rs : ready;
  const file = `bioai-by-eye_${pick}_certificate.png`;
  const text = shown.length === 1
    ? `I scored ${pct(shown[0].acc)} at ${TITLE[shown[0].key]} and beat ${shown[0].pubBeat} of ${shown[0].pubOf} published AI models${shown[0].mostLike ? `; I think most like ${shown[0].mostLike.label}` : ''}. Can you beat biology's AI?`
    : `I took on biology's AI models in ${shown.length} BioAI by eye games. Can you beat them?`;
  const canShare = typeof navigator !== 'undefined' && 'canShare' in navigator;
  const run = async (share: boolean) => {
    setMsg(null);
    try {
      const blob = await toPng(svg.current!);
      const f = new File([blob], file, { type: 'image/png' });
      if (share && navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: 'My BioAI by eye certificate', text: `${text} https://matt115a.github.io/BioAI_by_eye/` });
      else { downloadBlob(blob, file, 'image/png'); if (share) setMsg('Sharing images isn\'t supported in this browser, so it was downloaded instead.'); }
    } catch (e) { if ((e as Error)?.name !== 'AbortError') setMsg(String(e)); }
  };
  return (
    <section className="card cert" id="certificate" aria-label="Your certificate">
      <div className="cert-head">
        <div>
          <h3 className="card-title">Your BioAI by eye certificate</h3>
          <p className="card-sub">Your score, the published AI models you beat, and the AI you think most like, from your latest session in each game. Made in this browser; nothing is uploaded.</p>
        </div>
      </div>
      <div className="cert-controls">
        <div className="tabs cert-tabs">
          {ready.length > 1 && <button className={`tab ${pick === 'all' ? 'active' : ''}`} onClick={() => setChoice('all')}>All games</button>}
          {ready.map((r) => <button key={r.key} className={`tab ${pick === r.key || (ready.length === 1) ? 'active' : ''}`} onClick={() => setChoice(r.key)}>{SHORT[r.key]}</button>)}
        </div>
        <input className="cert-name" type="text" maxLength={40} placeholder="Name on the certificate (optional)" value={name}
          onChange={(e) => { setName(e.target.value); try { localStorage.setItem(NAME_KEY, e.target.value); } catch { /* not essential */ } }} />
      </div>
      <div className="cert-preview"><CertSvg rs={shown} name={name} svgRef={svg} /></div>
      <div className="cert-actions">
        <button className="btn btn-primary" onClick={() => run(false)}>↓ Download image</button>
        {canShare && <button className="btn" onClick={() => run(true)}>Share…</button>}
        <button className="btn" onClick={() => { navigator.clipboard?.writeText(`${text} https://matt115a.github.io/BioAI_by_eye/`).then(() => setMsg('Copied. Paste it with your image.'), () => setMsg('Couldn\'t copy in this browser.')); }}>Copy share text</button>
        {msg && <span className="muted cert-msg">{msg}</span>}
      </div>
    </section>
  );
}
