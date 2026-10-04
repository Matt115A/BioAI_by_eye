# BioAI by eye

**Do people reason like biology's AI models?** A hub for three games that teach a task a leading BioAI model was trained to do, and score
players against those models on identical items:

- [Reading DNA by eye](https://matt115a.github.io/Nanopore_by_eye/): nanopore basecalling (vs Dorado, a CNN, simple models)
- [Mutation effects by eye](https://matt115a.github.io/Mutations_by_eye/): ProteinGym variant effects (vs ESM, EVE, SaProt, VenusREM…)
- [Protein sequence by eye](https://matt115a.github.io/Protein_sequence_by_eye/): masked residues from sequence (vs ESM2) or structure (vs ProteinMPNN)

Players can **contribute a session anonymously** from each game's results page. The hub then shows, per task:

- how people and models stack up (everyone scored on the same items)
- a map of reasoning profiles (agreement with each model + answer tendencies), with people, models and you
- groups of people who reason alike (k-means on profiles, k chosen by silhouette), described by the model they follow and their tendencies
- who people think like (κ with each model vs κ between people), and how fast people learn

Your own sessions are read straight from this browser (all sites share the `matt115a.github.io` origin), whether or not you contribute.
Groups of people who reason alike appear once a task has 8 contributors; until then the hub shows whatever real data exist.

## Privacy

Nothing is uploaded without pressing **Contribute anonymously**. A contribution holds the game, app/dataset versions, item ids, answers, the
session part of each answer and response times — no name, account, IP, device or browser details; the date is stored to the month. The browser
keeps a random token so the contributor can withdraw; the database stores only its SHA-256.

## Backend (Supabase)

`supabase/schema.sql` creates an append-only `submissions` table with row-level security: the public key can insert rows, read a public view
without withdrawal hashes, and call `withdraw(token)`. Set the project URL and public anon key at build time:

```bash
VITE_BIOAI_URL=https://<project>.supabase.co VITE_BIOAI_KEY=<anon key> npm run deploy
```

`shared/` holds the contribution module and results card used (identically) by each game.

```bash
npm install && npm run dev
npm test
```
