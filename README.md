# Inu Verse (prototype)
Cosy hub world for the Inu games network. Vanilla JS ES modules + canvas, no build step. All art procedural.
- `npm test` — headless logic tests (node:test)
- `npm run serve` then `npm run proof` — Playwright proof, screenshots in proof/
Launch Hall features the real $KIBBLE (Token-2022 `4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump`, live DexScreener stats), sends players to pump.fun to launch their own coin, and lists player coins registered via `api/coins.js` (creator verified from pump.fun's on-chain bonding curve; needs Upstash env `UPSTASH_REDIS_REST_URL/TOKEN` or `KV_REST_API_URL/TOKEN`, optional `ADMIN_TOKEN`, `SOLANA_RPC`). **No-extension launch** (Launch your coin tab): Sign in with Google/Apple (Phantom embedded wallet) or the Phantom extension, top up, then launch on pump.fun with one tap; the server only builds unsigned transactions and the mint key is generated in the browser. See `docs/noext-launch.md` (env: `PHANTOM_APP_ID`, `PINATA_JWT`, `SOLANA_RPC`). The old simulator is the clearly labelled **Practice** tab. The game never creates, holds or signs tokens.

## Newer systems
- Reference art: `scripts/extract_art.py` crops the user's own art into `assets/*.png` (6 coat Shibas, 6 fashion previews, 5 relabelled buildings; casino words replaced with shop words/paws).
- Packs (`src/packs.js`): local simulation, backend-ready verbs; Kibble Cup – Season 1 (preview).
- Ambient life (`src/ambient.js`, `src/audio.js`): day/night (12 min), rain/petals, wildlife, street life, emotes (G / 1-5), pet (E), ball (T), bork (B), mute (M), photo mode (P), mailbox.
- Kibble Mall district (`src/mall.js`, `src/leaderboards.js`): demo $KIBBLE luxury shop owned by President Inu; transparent 2% fee (1% owner, 0.25/0.5/0.25% daily/weekly/monthly skill-based prize pools); exact integer micro-unit split; `OWNER_WALLET` placeholder for later on-chain settlement.

## $KIBBLE town mood (Kibble Mood NPCs)
- `GET /api/kibble-mood` (`api/kibble-mood.js`): `{ price, change1h, change24h, mood, updatedAt, source, stale }`. DexScreener → pump.fun coins-v2 → on-chain pump.fun bonding curve via the server RPC (`api/_lib/rpc.js`, key never leaves the server). Cached 60 s in Upstash `kibble:mood`; price samples in `kibble:mood:hist` give a 1h/24h change when a source has none (null until enough history → "chill").
- Moods (`src/kibblemood.js`, also served by kibble-pay as `/kibble-mood.js`): smoothed = 0.75×1h + 0.25×24h; Zoomies ≥ +15 %, Happy ≥ +3 %, Chill, Grumpy ≤ −3 %, Doghouse ≤ −15 %. A new mood must hold for 2 consecutive refreshes. `?mood=zoomies|happy|chill|grumpy|doghouse` forces a mood (dev/proof).
- Plaza (`src/moodworld.js`): Kibble statue (glows by mood; tap for price, 24h change, CA + copy, "not financial advice"), Crier Barkley (announces each mood change once), The Daily Bone newsstand, fire pit, banners, weather overlay, NPC lines from the brief (max one per NPC per visit). Copy never says buy/sell/pump it/moon/dump or gives price targets (`tests/kibblemood.test.mjs`).

## Clean Launch badge
Every Launch Hall board coin and $KIBBLE gets a Clean Launch badge (Launch Hall → $KIBBLE / Coin board). Tap it to see the proof.
The checks are real on-chain reads through the server RPC (`api/_lib/clean.js`, `GET /api/coins?clean=<mint,...>`):
- mint and freeze authority
- dev (creator) % and top-10 wallet %, both shown on the badge face
- dev balance drop
- first-slot bundles/snipes
- creator fee split published + locked (pump.fun fee-sharing config, admin revoked)
- liquidity

A check that can't run is "unknown" and nothing is guessed. PASS needs every check verified, fee split included, so an unknown caps the badge at WARN.
Results are cached 30 min per coin in Upstash (`launchhall:clean:<mint>`), and at most 2 fresh checks run per request.

## Kibble Kennel look (cosmetics only)
Tiers come from kibble-pay `GET /api/kennel?wallet=` (contract: `/workspace/inu-shared/kennel-api.md`; owner: the Inu Empires keeper).
Inu Verse only reads it and shows the result on the pup:
- a tier name tag
- an Alpha paw-print aura
- a Top Dog gold aura and golden name

The plaza **Kennel wall** lists Top Dogs once the API publishes them. Errors and 404s show nothing.
Other players see a tier only when the realtime server verified their wallet. The tier is self-reported in the look message, so it's cosmetic.
Use `?kennel=pup|guard|alpha|top` to preview (labelled PREVIEW, never sent to others). You can toggle it at the Kennel wall.
NPC personalities and the line rules are in `docs/npc-rules.md`.
