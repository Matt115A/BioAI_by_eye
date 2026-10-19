import { useEffect, useState } from 'react';
import { Explore } from './components/Explore';
import { Progress } from './components/Progress';
import { fetchSubmissions } from './lib/backend';
import { BACKEND_READY, SITE } from './lib/config';
import { initialLevel, type Level, LevelContext, saveLevel } from './lib/level';
import { fromSession, localSessions } from './lib/submission';
import { type GameKey, TASKS } from './lib/tasks';

type ByLevel = { learner: string; expert: string };

const HERO: Record<Level, { title: string; sub: string; cta: string }> = {
  learner: {
    title: 'What can AI in biology do?',
    sub: 'AI models now read DNA as it streams through a sensor, predict which mutations will break a protein, and fill in missing pieces of proteins. Each game teaches you one of these jobs in a few minutes, then puts you head to head with the real AI on exactly the same puzzles. No biology background needed: everything you need is taught in the game.',
    cta: 'See how people compare',
  },
  expert: {
    title: "Do people reason like biology's AI models?",
    sub: "Three games built on tasks that leading BioAI models are trained or benchmarked on: nanopore basecalling, zero-shot variant effect prediction and masked residue prediction. Players are trained in-game, then scored on the identical items the models were. Contributed sessions are profiled by agreement with each model (Cohen's κ) and answer tendencies, then clustered to ask whether human strategies converge, and onto which model.",
    cta: 'Explore the data',
  },
};

const GAMES: { key: string; title: string; url: string; tasks: GameKey[]; what: ByLevel; ai: ByLevel }[] = [
  {
    key: 'nanopore', title: 'Reading DNA by eye', url: `${SITE}/Nanopore_by_eye/`, tasks: ['nanopore'],
    what: { learner: 'DNA can be read by pulling it through a tiny pore and measuring the electric current. AI turns that wiggly signal into the letters A, C, G and T. Learn to read it yourself.',
      expert: 'Call the base under a highlighted stretch of raw nanopore current, from real E. coli reads, including methylated DNA.' },
    ai: { learner: 'the AI inside real nanopore sequencers, plus simpler models', expert: 'Dorado fast, hac and sup, a 1D CNN and three simple baselines' },
  },
  {
    key: 'mutations', title: 'Mutation effects by eye', url: `${SITE}/Mutations_by_eye/`, tasks: ['mutations'],
    what: { learner: 'Change one amino acid and a protein might keep working, or break. AI can predict which without running an experiment, but even the best AI can make mistakes! Learn the clues, then make the call.',
      expert: 'Damaging or tolerated? Single substitutions from 10 ProteinGym deep mutational scans, judged from the MSA, the AlphaFold2 structure and residue chemistry.' },
    ai: { learner: '15 models, from a simple lookup table to the best AI today', expert: '11 zero-shot predictors (EVmutation and EVE to ESM-1v, SaProt, ProSST, S3F and VenusREM) and 4 baselines' },
  },
  {
    key: 'protseq', title: 'Protein sequence by eye', url: `${SITE}/Protein_sequence_by_eye/`, tasks: ['seq', 'struct'],
    what: { learner: "Protein language AIs learn by filling in a hidden amino acid, a bit like predictive text. Try it from the nearby sequence, or from the protein's 3D shape. Two games.",
      expert: '20-way masked residue prediction, either from the 10 flanking residues or from the local backbone alone (no side chains, virtual Cβ).' },
    ai: { learner: 'ESM2 at four sizes, and ProteinMPNN', expert: 'ESM2 8M to 650M (window and full context) and ProteinMPNN' },
  },
];

export default function App() {
  const [level, setLevelState] = useState<Level>(initialLevel);
  const setLevel = (l: Level) => { setLevelState(l); saveLevel(l); };
  const [game, setGame] = useState<GameKey>('mutations');
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [local] = useState(() => localSessions().filter((s) => s?.trials?.length >= 20 && !s.meta?.simulated).length);
  /** the tasks you've played in this browser (sessions with at least 20 answers), in hub order */
  const [played] = useState<GameKey[]>(() => { const got = new Set(localSessions().map(fromSession).filter(Boolean).map((s) => s!.game)); return TASKS.map((t) => t.key).filter((k) => got.has(k)); });
  useEffect(() => { const h = (e: Event) => setGame((e as CustomEvent<GameKey>).detail); window.addEventListener('bioai:tab', h); return () => window.removeEventListener('bioai:tab', h); }, []);
  useEffect(() => {
    if (!BACKEND_READY) return;
    for (const t of TASKS) fetchSubmissions(t.key).then((s) => setCounts((c) => ({ ...c, [t.key]: s.length }))).catch(() => setCounts((c) => ({ ...c, [t.key]: null })));
  }, []);
  const hero = HERO[level];
  return (
    <LevelContext.Provider value={level}>
      <div className="hub">
        <nav className="topbar">
          <span className="brand">BioAI by eye</span>
          <div className="level-toggle" role="radiogroup" aria-label="Explanation level">
            {(['learner', 'expert'] as const).map((l) => (
              <button key={l} role="radio" aria-checked={level === l} className={level === l ? 'on' : ''} onClick={() => setLevel(l)}>{l === 'learner' ? 'Learner' : 'Expert'}</button>
            ))}
          </div>
        </nav>

        <header className="hero">
          <h1>{hero.title}</h1>
          <p className="hero-sub">{hero.sub}</p>
          <div className="hero-cta"><a className="btn btn-primary" href="#games">Pick a game</a><a className="btn" href="#explore">{hero.cta}</a></div>
        </header>

        <Progress played={played} />

        <section id="games" className="games">
          {GAMES.map((g, i) => {
            const known = g.tasks.map((t) => counts[t]).some((c) => c != null), n = g.tasks.reduce((a, t) => a + (counts[t] ?? 0), 0);
            return (
              <a key={g.key} className="game-card" href={g.url}>
                <div className="game-num">0{i + 1}</div>
                <div className="game-title">{g.title}</div>
                <div className="game-what">{g.what[level]}</div>
                <div className="game-ai"><span className="muted">You vs</span> {g.ai[level]}</div>
                <div className="game-foot">
                  <span className="muted">{known ? `${n} contribution${n === 1 ? '' : 's'}` : BACKEND_READY ? '…' : 'contributions opening soon'}</span>
                  <span className="game-play">Play →</span>
                </div>
              </a>
            );
          })}
        </section>

        <section id="explore" className="explore-wrap">
          <div className="explore-head">
            <h2>{level === 'learner' ? 'How do people compare with the AI?' : 'Humans vs models'}</h2>
            <div className="tabs">{TASKS.map((t) => <button key={t.key} className={`tab ${game === t.key ? 'active' : ''}`} onClick={() => setGame(t.key)}>{t.game}</button>)}</div>
          </div>
          <p className="muted explore-q">{TASKS.find((t) => t.key === game)!.question}{local ? ` · ${local} of your session${local === 1 ? '' : 's'} found in this browser` : ''}</p>
          <Explore game={game} counts={counts} playedAny={played.length > 0} />
        </section>

        <section className="privacy card">
          <h3 className="card-title">What "anonymous" means here</h3>
          <div className="privacy-grid">
            <div><b>Shared only if you press "Contribute anonymously"</b> on a game's results page. Nothing is uploaded otherwise.</div>
            <div><b>What's sent:</b> the game and its version, the items you answered, your answers, which part of the session each was in, and how long each took.</div>
            <div><b>What's not:</b> no name, email, account, IP address, device or browser details. The date is kept to the month.</div>
            <div><b>Changed your mind?</b> The results page has a <b>Withdraw</b> button that deletes your contribution.</div>
          </div>
          <p className="note">A public science-communication project, not a clinical or formal research study. Everyone can see the anonymous datapoints behind these charts.</p>
        </section>
        <footer className="note hub-foot">Games: <a href={`${SITE}/Nanopore_by_eye/`}>Nanopore</a> · <a href={`${SITE}/Mutations_by_eye/`}>Mutations</a> · <a href={`${SITE}/Protein_sequence_by_eye/`}>Protein sequence</a> · Source: <a href="https://github.com/Matt115A/BioAI_by_eye">github.com/Matt115A/BioAI_by_eye</a></footer>
      </div>
    </LevelContext.Provider>
  );
}
