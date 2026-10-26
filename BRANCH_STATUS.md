# Branch status: `feat/text-chat`

**Status:** reviewable · tip `f5ab828` · **not** merged to `master` · **do not** deploy to production from this branch alone without review.

## Purpose
Primary **text chat bar** in multiplayer + stronger light moderation (`src/multiplayer.js`, `src/mpshared.js`). Actions/emotes stay secondary; Send path filters + logs.

## What's done
- Primary chat bar Send path with light moderation / sanitise.
- Tests in `tests/multiplayer.test.mjs` — **15/15 passing** on this tip (includes "primary chat bar" case).
- Small realtime README note.

## What's left
- Rebase onto current `master` (master is **5 commits ahead**: SIWS wallet pill + creator UI + warm hub styling). Low file overlap (chat/mp only) → **low–medium** conflict risk.
- Product/UX pass on phone HUD with the new bar.
- Optional live MP proof via `scripts/chat-proof.mjs` against a realtime server.

## How to preview
```bash
git checkout feat/text-chat
# or use worktree: /workspace/inu-verse-chat
npm test                 # or: node --test tests/multiplayer.test.mjs
npm run serve            # http://localhost:8642/
# Multiplayer needs realtime URL from /api/config (wss) or ?mp=<wss>
# Solo still loads; chat bar UI visible when MP connects.
```
No build step. See also `realtime/README.md`.

## Merge risk vs `master`
**Low–medium.** One unique commit; touches only MP/chat files. Prefer rebase onto master then PR. Do **not** force-push; do **not** merge without Zachary's order. Suggested merge **after** SIWS pill (already on master) and **before or independent of** `hub-launch-hall` façades/hall.
