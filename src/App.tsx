import { useEffect, useState } from 'react';
import { Explore } from './components/Explore';
import { fetchSubmissions } from './lib/backend';
import { BACKEND_READY, SITE } from './lib/config';
import { localSessions } from './lib/submission';
import { type GameKey, TASKS } from './lib/tasks';

const GAMES = [
  { key: 'nanopore', title: 'Reading DNA by eye', url: `${SITE}/Nanopore_by_eye/`, ai: 'Dorado basecallers, a CNN and simple models', what: 'Read the base hidden in a raw nanopore current trace: real E. coli reads, including methylated DNA.', tasks: ['nanopore'] },
  { key: 'mutations', title: 'Mutation effects by eye', url: `${SITE}/Mutations_by_eye/`, ai: 'ESM, EVE, SaProt, VenusREM and 11 more', what: 'Decide whether a real amino-acid change damages a protein, from evolution, chemistry and the 3D structure.', tasks: ['mutations'] },
  { key: 'protseq', title: 'Protein sequence by eye', url: `${SITE}/Protein_sequence_by_eye/`, ai: 'ESM2 (4 sizes) and ProteinMPNN', what: 'Fill in a hidden amino acid from sequence alone (like ESM2) or from the 3D structure (like ProteinMPNN). Two games.', tasks: ['seq', 'struct'] },
] as const;

export default function App() {
  const [game, setGame] = useState<GameKey>('mutations');
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [local] = useState(() => localSessions().filter((s) => s?.trials?.length >= 20 && !s.meta?.simulated).length);
  useEffect(() => {
    if (!BACKEND_READY) return;
    for (const t of TASKS) fetchSubmissions(t.key).then((s) => setCounts((c) => ({ ...c, [t.key]: s.length }))).catch(() => setCounts((c) => ({ ...c, [t.key]: null })));
  }, []);
  return (
    <div className="hub">
      <header className="hero">
        <div className="hero-kicker">BioAI by eye</div>
        <h1>Do people reason like biology's AI models?</h1>
        <p className="hero-sub">Each game teaches you a task that a leading BioAI model was trained to do (read DNA from raw signal, judge mutations, fill in protein sequence),
          then scores you against those models on exactly the same items. Share your results anonymously, and this page dissects the patterns of human contributions: where
          people find the same answers as the AI, where they diverge, and whether convergent patterns of human reasoning emerge.</p>
        <div className="hero-cta"><a className="btn btn-primary" href="#games">Pick a game</a><a className="btn" href="#explore">Explore the results</a></div>
      </header>

      <section id="games" className="games">
        {GAMES.map((g) => (
          <a key={g.key} className="game-card" href={g.url}>
            <div className="game-title">{g.title}</div>
            <div className="game-what">{g.what}</div>
            <div className="game-ai"><span className="muted">Compared with</span> {g.ai}</div>
            <div className="game-foot">
              <span className="muted">{g.tasks.map((t) => counts[t]).some((c) => c != null) ? (() => { const n = g.tasks.reduce((a, t) => a + (counts[t] ?? 0), 0); return `${n} contribution${n === 1 ? '' : 's'}`; })() : BACKEND_READY ? '…' : 'contributions opening soon'}</span>
              <span className="game-play">Play →</span>
            </div>
          </a>
        ))}
      </section>

      <section id="explore" className="explore-wrap">
        <div className="explore-head">
          <h2>Explore: humans vs AI</h2>
          <div className="tabs">{TASKS.map((t) => <button key={t.key} className={`tab ${game === t.key ? 'active' : ''}`} onClick={() => setGame(t.key)}>{t.game}</button>)}</div>
        </div>
        <p className="muted explore-q">{TASKS.find((t) => t.key === game)!.question}{local ? ` · ${local} of your session${local === 1 ? '' : 's'} found in this browser` : ''}</p>
        <Explore game={game} counts={counts} />
      </section>

      <section className="privacy card">
        <h3 className="card-title">What "anonymous" means here</h3>
        <div className="privacy-grid">
          <div><b>Shared only if you press "Contribute anonymously"</b> on a game's results page. Nothing is uploaded otherwise.</div>
          <div><b>What's sent:</b> the game, its version, which items you answered, your answers, which part of the session each was in, and how long each took.</div>
          <div><b>What's not:</b> no name, email, account, IP address, device or browser details; the date is kept to the month. Your contribution can't be linked back to you.</div>
          <div><b>Changed your mind?</b> Your browser keeps a private token for each contribution; the results page has a <b>Withdraw</b> button that deletes it.</div>
        </div>
        <p className="note">This is a public science-communication project, not a clinical or formal research study. Everyone can see the anonymous datapoints that make up these charts.</p>
      </section>
      <footer className="note hub-foot">Games: <a href={`${SITE}/Nanopore_by_eye/`}>Nanopore</a> · <a href={`${SITE}/Mutations_by_eye/`}>Mutations</a> · <a href={`${SITE}/Protein_sequence_by_eye/`}>Protein sequence</a> · Source: <a href="https://github.com/Matt115A/BioAI_by_eye">github.com/Matt115A/BioAI_by_eye</a></footer>
    </div>
  );
}
