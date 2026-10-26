# Branch status: `hub-launch-hall`

**Status:** reviewable · **not** merged to `master` · **do not** deploy to `inu-verse-tawny.vercel.app` production from this branch alone without review.

## Purpose
Two stacked features on this tip:

1. **Launch Hall (wallet-only hub)** — `f273386`  
   Standalone `/hall.html` + `src/hallmain.js` for the Inu hub: Launch Hall UI without the full Verse world / title screen / SIWS session. Wallet connect only when launching or registering.

2. **Building façades** — `31be440` (tip)  
   Typed silhouettes + function color-coding for outdoor buildings and shops (`src/facadeart.js`, wired in `render.js` / `doorart.js` / mall+shop cards). Proof screenshots under `proof/bldg-after-*`.

## What's done
- Wallet-only hall entrypoint (`hall.html`, `src/hallmain.js`); CORS hall test.
- Façade art module + tests (`tests/facades.test.mjs`, `tests/cors-hall.test.mjs`) — **8/8 passing** on this tip.
- Local proof PNGs for façades (desktop + phone).

## What's left
- Rebase / merge-order decision vs current `master` (master is **5 commits ahead**: SIWS wallet pill merge + creator UI collapse + warm hub styling). Expect conflicts in `src/main.js` / `style.css` / Launch Hall wallet wiring.
- Product call: keep façades on this branch vs cherry-pick façades onto `master` separately from wallet-only hall.
- Live Vercel preview (non-production alias) if Zachary wants visual review beyond local serve — **not** production `inu-verse-tawny`.

## How to preview
```bash
git checkout hub-launch-hall
npm test                 # or: node --test tests/facades.test.mjs tests/cors-hall.test.mjs
npm run serve            # http://localhost:8642/
# Full Verse world (façades): open index.html
# Wallet-only Launch Hall:   open /hall.html
```
No build step (vanilla ES modules). Optional: Playwright proofs in `scripts/` (existing building/launch proofs).

## Merge risk vs `master`
**Medium.** Branch tip `31be440`; diverged — 2 commits unique, 5 behind master. Overlap likely in hub/create/landing UI and wallet connect paths after SIWS pill landed on master. Prefer rebase onto master (or merge master in) on a review PR; do **not** force-push; do **not** merge without Zachary's order.

## Related
- Façades commit lives **only** on this branch tip (not on `master` / `feat/text-chat`).
- Good Boy Academy / Diner Dash café rebuild already on `master` (not unique to this branch).
