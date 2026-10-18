import type { Level } from './level';

/** One sentence per model and level, plus a short citation. Keyed by the model's dataset name. */
interface Blurb { learner: string; expert: string; cite: string }

const GAME = 'built for this game';
export const MODEL_INFO: Record<string, Blurb> = {
  // Reading DNA by eye (nanopore)
  level: { learner: 'Only looks at how high the signal is and how much it wobbles, the simplest strategy there is.', expert: "Logistic regression on the highlighted stretch's mean current and spread.", cite: GAME },
  knn: { learner: 'Finds the 25 most similar signals it has seen before and lets them vote.', expert: 'k-nearest neighbours (k = 25) over 60,000 labelled windows.', cite: GAME },
  logreg: { learner: 'A simple formula that weighs every point of the signal in a straight-line way.', expert: 'Linear logistic regression on the whole window of current.', cite: GAME },
  cnn: { learner: 'A small neural network trained on 200,000 examples, seeing only the same window you see.', expert: 'Small 1D convolutional network trained on ~200k windows; sees only the displayed window.', cite: GAME },
  fast: { learner: 'The quick version of the AI that reads DNA on real nanopore sequencers.', expert: 'Dorado fast basecaller (v5.2.0), a lightweight model that sees the whole read.', cite: 'Oxford Nanopore, Dorado' },
  hac: { learner: 'The high-accuracy version of the AI that reads DNA on real nanopore sequencers.', expert: 'Dorado high-accuracy basecaller (v5.2.0); sees the whole read.', cite: 'Oxford Nanopore, Dorado' },
  sup: { learner: 'The most accurate DNA-reading AI from the sequencer maker, the current state of the art.', expert: 'Dorado super-accuracy basecaller (v5.2.0), the state of the art; sees the whole read.', cite: 'Oxford Nanopore, Dorado' },
  // Mutation effects by eye (ProteinGym)
  blosum62: { learner: 'A lookup table of how often one amino acid swaps for another in nature.', expert: 'BLOSUM62 substitution score for the wild-type to mutant pair, with no protein context.', cite: 'Henikoff & Henikoff 1992' },
  conservation: { learner: 'Calls a change damaging if the spot never changes across related proteins.', expert: 'Weighted column conservation in the MSA (80% identity reweighting).', cite: GAME },
  mut_frequency: { learner: 'Asks whether related proteins already carry the new amino acid at that spot.', expert: 'Reweighted frequency of the mutant residue in the MSA column.', cite: GAME },
  feature_model: { learner: 'A simple model given exactly the clues shown to you in the game.', expert: "Gradient boosting on the player's cues (MSA frequencies, BLOSUM62, physicochemical deltas, RSA, packing, pLDDT).", cite: GAME },
  Site_Independent: { learner: 'Learns which amino acids each spot accepts from related proteins, one spot at a time.', expert: 'Independent-sites model fitted to the MSA, with no coupling between positions.', cite: 'Hopf et al 2017' },
  EVmutation: { learner: 'Learns from related proteins which pairs of spots change together.', expert: 'Potts model with pairwise couplings fitted to the MSA.', cite: 'Hopf et al 2017' },
  GEMME: { learner: 'Uses the family tree of related proteins to judge how unusual a change is.', expert: 'Global epistatic model using conservation along the phylogenetic tree.', cite: 'Laine et al 2019' },
  EVE_ensemble: { learner: 'A deep generative AI trained on one protein family to spot changes evolution would reject.', expert: 'Bayesian VAE trained per family on the MSA (ensemble of seeds).', cite: 'Frazer et al 2021' },
  TranceptEVE_L: { learner: 'Combines a large protein language AI with family-specific evolutionary data.', expert: 'Tranception L autoregressive transformer combined with an EVE family prior.', cite: 'Notin et al 2022' },
  ESM1v_ensemble: { learner: 'A protein language AI trained on millions of sequences, used to score changes without any training on this task.', expert: 'ESM-1v masked language model, zero-shot masked-marginal scoring (5-model ensemble).', cite: 'Meier et al 2021' },
  ESM2_650M: { learner: 'A large protein language AI that learned the grammar of proteins from 65 million sequences.', expert: 'ESM2 650M masked language model, zero-shot masked-marginal scoring.', cite: 'Lin et al 2023' },
  SaProt_650M_AF2: { learner: 'A protein language AI that reads the 3D shape alongside the sequence.', expert: 'Structure-aware PLM over residue plus Foldseek 3Di tokens, on AlphaFold2 structures.', cite: 'Su et al 2024' },
  'ProSST-2048': { learner: 'A protein AI that reads the sequence together with a coded summary of the 3D structure.', expert: 'Transformer over sequence and quantised local-structure tokens (2048-token codebook).', cite: 'Li et al 2024' },
  S3F_MSA: { learner: 'Combines a protein language AI, the 3D surface and related proteins.', expert: 'Sequence-structure-surface multi-scale model built on ESM2, with MSA augmentation.', cite: 'Zhang et al 2024' },
  VenusREM: { learner: 'A leading AI that adds related proteins to a structure-aware language model.', expert: 'Retrieval-enhanced structure-aware PLM that conditions on homologous sequences.', cite: 'Tan et al 2024' },
  // Protein sequence by eye (masked residues)
  always: { learner: 'Always guesses leucine, the most common amino acid, to show the score you get by guessing.', expert: 'Constant prediction of the most frequent residue in the learning set (L).', cite: GAME },
  corpus_window: { learner: 'A simple model trained on 27,000 examples, seeing the same 10 neighbours you see.', expert: 'Logistic regression on the 10-residue window, trained on ~27k sites from held-out ProteinGym structures.', cite: GAME },
  corpus_struct: { learner: 'A simple model trained on 27,000 examples, using the same 3D clues you see.', expert: 'Gradient boosting on the structure-game cues, trained on ~27k sites from held-out ProteinGym structures.', cite: GAME },
  ...esm2('w', 'only the same 10 neighbours you see', 'on the 11-residue window shown to the player'),
  ...esm2('f', 'the whole protein', 'on the full sequence with only the site masked'),
  mpnn_bb: { learner: 'An AI that designs proteins from 3D shape, given only the backbone around the spot.', expert: 'ProteinMPNN v_48_020, site decoded first: p(aa | backbone only).', cite: 'Dauparas et al 2022' },
  mpnn: { learner: 'An AI that designs proteins from 3D shape, given the backbone and all the other amino acids.', expert: 'ProteinMPNN v_48_020, site decoded last: p(aa | backbone + all other residues).', cite: 'Dauparas et al 2022' },
};

function esm2(suffix: string, learnerCtx: string, expertCtx: string): Record<string, Blurb> {
  return Object.fromEntries(['8', '35', '150', '650'].map((n) => [`esm${n}_${suffix}`, {
    learner: `A protein language AI with ${n} million parameters, reading ${learnerCtx}.`,
    expert: `ESM2 ${n}M masked-token prediction ${expertCtx}.`,
    cite: 'Lin et al 2023',
  }]));
}

export function modelBlurb(name: string, level: Level) {
  const b = MODEL_INFO[name];
  return b ? { text: b[level], cite: b.cite } : null;
}
