import { SITE } from '../lib/config';

/** "For educators": a lesson-plan template for a small-group university session on BioAI models. */

const GAME = {
  nanopore: { name: 'Reading DNA by eye', url: `${SITE}/Nanopore_by_eye/` },
  mutations: { name: 'Mutation effects by eye', url: `${SITE}/Mutations_by_eye/` },
  binders: { name: 'Binders by eye', url: `${SITE}/Binders_by_eye/` },
  protseq: { name: 'Protein sequence by eye', url: `${SITE}/Protein_sequence_by_eye/` },
};

const PLAN: { time: string; title: string; body: string; tip?: string }[] = [
  { time: '0-10 min', title: 'Hook: make a prediction',
    body: 'Open the BioAI by eye home page on the screen. Ask the group: "For each of these four jobs, do you think a trained human could match the AI?" Students write down a guess for each game (better, similar or worse than the best model). Keep the guesses; you come back to them at the end.' },
  { time: '10-35 min', title: 'Play: one game per pair',
    body: 'Split the group into pairs (or threes) and give each pair one game, so that all four are covered. Everyone plays on the Learner level for about 20 minutes, on a laptop or a phone. While they play, each pair writes down the clues they start to rely on: what makes them say "damaging", "real interface", "C" or "leucine"?',
    tip: 'No accounts, sign-ups or installs are needed. Progress is saved in the browser, so students can stop and carry on later.' },
  { time: '35-50 min', title: 'Compare: you vs the models',
    body: 'Each pair opens their results page (or presses Your stats on the game\'s start page) and finds three things: their accuracy against each model, whether they improved during the session (the learning curve), and which model their answers agree with most. Then each pair explains to the room, in two minutes, how the models in their game were trained (see "How the models learn" below).' },
  { time: '50-65 min', title: 'Probe the limits',
    body: 'Discuss where the models fail and why, using the questions for each game below. Push the group from "the AI got it wrong" towards "what in its training data or objective made this hard?" Good threads: data leakage and training cutoffs, distribution shift, and the difference between a model trained on the task and a model applied outside its training context.' },
  { time: '65-80 min', title: 'Where these models are used',
    body: 'Connect each game to real applications (see "Where these models have been used" below). Ask each pair to pick one application and judge it: what would happen if the model made the mistakes they saw today? Who checks the model\'s output, and how?' },
  { time: '80-90 min', title: 'Wrap up',
    body: 'Return to the predictions from the start. What surprised people? Finish with an exit ticket: one sentence each on how a BioAI model is trained, one thing it does well, and one limitation that matters in practice.' },
];

const MODELS: { game: keyof typeof GAME; how: string; questions: string[] }[] = [
  { game: 'nanopore',
    how: 'Basecallers such as Dorado are neural networks trained with supervision on nanopore reads whose true sequence is known. The fast, hac and sup versions trade speed for accuracy. Chemical modifications such as methylated cytosine change the current, so they are a known source of error unless the model is trained on them.',
    questions: ['Why does methylated DNA confuse both you and simpler models?', 'What would happen to a basecaller trained only on one organism, or one chemistry?', 'Why might speed matter as much as accuracy in a real sequencing run?'] },
  { game: 'mutations',
    how: 'Zero-shot variant effect predictors are not trained on the lab measurements they are tested on. Some (EVmutation, EVE) learn from alignments of related sequences; protein language models (ESM-1v, SaProt and others) learn by predicting hidden amino acids across millions of natural proteins. They score a mutation by how "natural" the change looks.',
    questions: ['Why would evolution be a good guide to whether a mutation is damaging, and when is it a poor one?', 'The measurements here are fitness, activity, stability or expression. Should one score predict all of them?', 'What does "zero-shot" buy you, and what do you miss out on?'] },
  { game: 'binders',
    how: 'Boltz-2 predicts the 3D structure of complexes, trained on experimental structures from the PDB up to a cutoff date. The game only uses complexes released after that cutoff, so the model cannot have memorised them. ProteinMPNN, trained to design sequences for a given backbone, is used here to score how well the sequence fits the interface.',
    questions: ['Why does it matter that the test complexes were released after the training cutoff?', 'The decoys keep the real pose but scramble the interface. What could a model notice that a human cannot, and vice versa?', 'Is "does this complex form?" the same question as "how tightly does it bind?"'] },
  { game: 'protseq',
    how: 'ESM2 is trained by hiding about 15% of the amino acids in millions of natural sequences and learning to predict them (masked language modelling). ProteinMPNN does the reverse of folding: given a backbone structure, predict the sequence. Both tasks are what the two games ask you to do.',
    questions: ['Why does a bigger ESM2 model do better, and is there a limit?', 'Which amino acids are easy to guess from structure, and which are nearly impossible? Why?', 'How can a model trained only to fill in blanks end up useful for design?'] },
];

const USES: { area: string; text: string }[] = [
  { area: 'Sequencing in the field', text: 'Portable nanopore sequencers, with neural-network basecalling, have been used for genomic surveillance during outbreaks such as Ebola and SARS-CoV-2, and can read DNA methylation directly from native DNA.' },
  { area: 'Clinical genetics', text: 'Variant effect predictors are used to help prioritise variants of uncertain significance in human genes. They are supporting evidence alongside clinical and experimental data, and are not able to provide a diagnosis.' },
  { area: 'Protein engineering', text: 'Language-model and evolutionary scores are used to choose which mutations to test when engineering enzymes and antibodies, cutting down the number of experiments.' },
  { area: 'De novo protein design', text: 'ProteinMPNN is a standard step in design pipelines (for example with RFdiffusion) that have produced new binders and enzymes that were then made and tested in the lab. Computational protein design and structure prediction shared the 2024 Nobel Prize in Chemistry.' },
  { area: 'Drug discovery', text: 'Structure prediction for complexes (AlphaFold3, Boltz-2 and others) is used to model how proteins, antibodies and small molecules interact, and to triage candidates before lab work.' },
];

export function Educators() {
  return (
    <div className="edu">
      <div className="edu-bar">
        <a className="edu-back" href="#">← Back to BioAI by eye</a>
        <button className="btn edu-print" onClick={() => window.print()}>Print / save as PDF</button>
      </div>
      <header className="edu-head">
        <div className="edu-kicker">For educators</div>
        <h1>Teaching BioAI with BioAI by eye</h1>
        <p className="hero-sub">A lesson-plan template for a small-group session (about 4 to 12 students) for university biotechnology students. The aim is a practical understanding of BioAI models: how they are trained, what they can do, where they fall short, and where they are used.</p>
        <div className="edu-meta">
          <div><b>Level</b><span>Undergraduate or Master's</span></div>
          <div><b>Length</b><span>90 minutes</span></div>
          <div><b>Group</b><span>4-12 students, in pairs or threes</span></div>
          <div><b>You need</b><span>One laptop or phone per group; a projector</span></div>
        </div>
      </header>

      <section className="card">
        <h3 className="card-title">Learning objectives</h3>
        <p className="card-sub">By the end of the session, students should be able to:</p>
        <ol className="edu-list">
          <li>Explain, in plain terms, how at least two BioAI models are trained (supervised and self-supervised examples) and what data they learn from.</li>
          <li>Describe what these models can do, using their own head-to-head results as evidence.</li>
          <li>Identify specific limitations, such as training cutoffs and leakage, distribution shift, and the gap between a benchmark and a real application.</li>
          <li>Give real examples of where these models have been used, and judge the extent to which a human can check their output.</li>
        </ol>
      </section>

      <section className="card">
        <h3 className="card-title">Before the session</h3>
        <ul className="edu-list">
          <li>Play each game yourself for 10 minutes, so you know what students will see.</li>
          <li>Optional pre-reading: the blog posts on the home page, one per game.</li>
          <li>Decide whether students will press <b>Contribute anonymously</b> at the end. It is optional and anonymous, and students can withdraw later; say so up front.</li>
        </ul>
      </section>

      <section className="card">
        <h3 className="card-title">Session plan</h3>
        <div className="edu-plan">{PLAN.map((p) => (
          <div key={p.title} className="edu-step">
            <div className="edu-time">{p.time}</div>
            <div><b>{p.title}</b><p>{p.body}</p>{p.tip && <p className="note">{p.tip}</p>}</div>
          </div>
        ))}</div>
      </section>

      <section className="card">
        <h3 className="card-title">How the models learn, and questions for discussion</h3>
        <p className="card-sub">One block per game, for the "Compare" and "Probe the limits" steps.</p>
        <div className="edu-models">{MODELS.map((m) => (
          <div key={m.game} className="edu-model">
            <a className="edu-game" href={GAME[m.game].url} target="_blank" rel="noreferrer">{GAME[m.game].name} →</a>
            <p>{m.how}</p>
            <ul className="edu-list">{m.questions.map((q) => <li key={q}>{q}</li>)}</ul>
          </div>
        ))}</div>
      </section>

      <section className="card">
        <h3 className="card-title">Where these models have been used</h3>
        <div className="edu-uses">{USES.map((u) => <div key={u.area}><b>{u.area}</b><p>{u.text}</p></div>)}</div>
      </section>

      <section className="card">
        <h3 className="card-title">Adapting the session</h3>
        <ul className="edu-list">
          <li><b>One hour:</b> skip the hook, play for 15 minutes, and merge "Compare" and "Probe the limits" into one 25-minute discussion.</li>
          <li><b>More advanced groups:</b> switch the games to the <b>Expert</b> level, which gives the datasets, model versions and decoy design in full.</li>
          <li><b>Data analysis follow-up:</b> every results page can download the session as CSV or JSON. Students can plot their own learning curve, or compare their answers with a model item by item.</li>
          <li><b>Assessment idea:</b> a short written piece choosing one application and arguing how much it should rely on the model, using evidence from the game.</li>
        </ul>
      </section>
    </div>
  );
}
