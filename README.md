# Inu Verse (prototype)
Cosy hub world for the Inu games network. Vanilla JS ES modules + canvas, no build step. All art procedural.
- `npm test` — headless logic tests (node:test)
- `npm run serve` then `npm run proof` — Playwright proof, screenshots in proof/
Launch Hall is a **simulation only** (demo $KIBBLE, no blockchain, no real money). Phantom button is a placeholder.

## Newer systems
- Reference art: `scripts/extract_art.py` crops the user's own art into `assets/*.png` (6 coat Shibas, 6 fashion previews, 5 relabelled buildings; casino words replaced with shop words/paws).
- Packs (`src/packs.js`): local simulation, backend-ready verbs; Kibble Cup – Season 1 (preview).
- Ambient life (`src/ambient.js`, `src/audio.js`): day/night (12 min), rain/petals, wildlife, street life, emotes (G / 1-5), pet (E), ball (T), bork (B), mute (M), photo mode (P), mailbox.
- Kibble Mall district (`src/mall.js`, `src/leaderboards.js`): demo $KIBBLE luxury shop owned by President Inu; transparent 2% fee (1% owner, 0.25/0.5/0.25% daily/weekly/monthly skill-based prize pools); exact integer micro-unit split; `OWNER_WALLET` placeholder for later on-chain settlement.
