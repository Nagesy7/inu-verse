# Inu Quest companions in Inu Verse

These are optional, purely cosmetic followers taken from the player's Inu Quest party. The contract is `/workspace/inu-shared/companion-bridge.md` (v1).

## What players see

- **Drawer › Me › Companion** opens the picker.
  - It shows the party: up to 6 Inu, each with its form line and level.
  - It also shows Wren Wanderly and Biscuit. They stay locked, with their hint, until the player beats Wren in Inu Quest.
  - The toggle reads **Summon** or **Send home**. Tapping a card picks that buddy and summons it.
- The chosen companion trails the player along their recent path, about 30 px behind, or 56 px when a Verse pet is also out.
  - Movement uses exponential smoothing, capped at 280 px/s.
  - It snaps back beside the player after doors or zone hops.
  - It shows in world mode only. It is hidden while driving.
- Reactions appear as pixel bubbles, in this priority order, each with its own cooldown:
  1. another companion nearby (heart)
  2. water (splash)
  3. the café door (cup)
  4. rain (leaf umbrella)
  5. night while idle (zz)
- Reduced motion turns off the hop, the walk bob and the bubble bob.
- When there is nothing to show, the picker says why and does not ask the player to sign in. This covers no session, no party, offline, and a bridge failure or timeout. No follower is drawn.
- If a sprite fails to load, a generic pixel pup tinted with the coat trait is drawn instead. This is what you see locally, because CORS is set for production only.

## Read-only guarantee

- `src/companions.js` → `loadCompanions` returns `null` with no `kp.session` or when offline, and does not load the bridge.
- Otherwise it imports `https://inu-quest.vercel.app/companions/v1/bridge.js` with an 8 s timeout. It calls `readCompanions(readOnlyKp(K.kp))`, then re-sanitizes the result:
  - schema and minReader are checked;
  - ids and kinds must be known;
  - sprites must sit under `.../companions/v1/`;
  - names are cleaned;
  - only colour and word traits are kept.
- `readOnlyKp` is a frozen object holding only `session` and a `cloudLoad` limited to `inu-quest`. The bridge cannot reach `cloudSave`, the wallet or any other game.
- The choice `{on, id, line}` lives in the **Verse** save (`state.companion` in `inuverse.save.v1`). The form line is kept so the same buddy stays chosen after it evolves.
- `tests/companions.test.mjs` proves that no write happens. It also scans `src/` for `cloudSave('inu-quest')` or a PUT to `save?game=inu-quest`.
- No Bones, $KIBBLE, prize, economy or stats are read or granted.

## Multiplayer sync (light)

- **id + form** ride in the existing look message as `pl.look.cpi` and `pl.look.cpf`, for example `inu-0` and `fernshiba`. That message is sent only when it changes, and at most once every 5 s.
  - The deployed worker's `cleanLook` already relays these word keys.
  - Remote clients rebuild the sprite URL from the form id. Sheets and stats are never sent.
  - `setLook` strips the keys before the custom-profile check, so a default pup stays a default pup.
- **Position**: an optional whole-pixel offset from the owner, `cx`/`cy` clamped to ±96. It rides the existing ~9 Hz state frame (`cleanState` / `pushSnap`) and only counts as a change when it moves by more than 2 px.
- Remote followers are pooled, one per visible remote with a companion, and pruned when the remote leaves or sends the companion home. They are culled with the view.
- ⚠ **The live realtime worker needs a redeploy** (`realtime/`, Cloudflare) before `cx`/`cy` are relayed. Until then the server drops the unknown fields, and remote clients fall back to simulating the follow locally from the owner's path. That is nearly identical. id and form already work against the live worker.

## Dev / proof

- `?companions=fixture|fixture-wren|none` works on localhost and 127.0.0.1 only. It loads `tests/fixtures/companions-*.json` instead of the bridge.
- Run `node scripts/companions-proof.mjs` with a static server on :8721 and `wrangler dev` on :8787. It writes `proof/companions-local-*`.
  - The "prodsprites" shots proxy the production sprite PNGs in the test browser and add ACAO.
  - The "fallback" shot loads the sprites for real.
