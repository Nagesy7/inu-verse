# Inu Verse — side branch status

Generated for Zachary (review / merge planning). **No feature merges** in this commit — docs only.  
Do **not** deploy side branches to `inu-verse-tawny.vercel.app` production without an explicit go-ahead.

Legend: **done** = reviewable & status written · **landed** = already in `master` history · **open** = diverged, needs merge decision.

| Item | Ref | Status | One-liner |
|------|-----|--------|-----------|
| Launch Hall (`hub-launch-hall`) | `origin/hub-launch-hall` @ `d365047` | **open** / reviewable | Wallet-only `/hall.html` + stacked façades; 2 feature commits ahead of merge-base, **5 behind** master (SIWS pill etc.). `BRANCH_STATUS.md` on branch. Pushed. |
| Building façades | tip of `hub-launch-hall` (`31be440`) | **open** / reviewable | Typed silhouettes + function colors (`src/facadeart.js`). Lives on `hub-launch-hall` only (not a separate branch). Tests 8/8. |
| Text chat (`feat/text-chat`) | `origin/feat/text-chat` @ `3771955` (feature `f5ab828`) | **open** / reviewable | Primary MP text chat bar + light moderation. Tests 15/15. `BRANCH_STATUS.md` pushed. Low–medium merge risk. |
| Good Boy Academy | on `master` @ `8d5d642` | **landed** | Classroom, Dean Barkley, quizzes, Bones. `docs/academy.md`, `src/academy.js`. **No side branch.** |
| Café / Diner Dash rebuild | on `master` (`d974e64`…`cf4b42f`) | **landed** | Local `cafe` tip was stale (`2a3918d`); Diner Dash zones + consumables already on master. `BRANCH_STATUS.md` on local `cafe` only (not pushed — tracks master). |
| Ambient | local `ambient` (hist. `9c8a200`) | **landed** | On master. Local tip + `BRANCH_STATUS.md` only; **do not push** (tracks `origin/master`). |
| Companions | local `companions` (hist. `93b6bab`) | **landed** | On master. Same as ambient. See `docs/companions.md`. |
| Districts | local `districts` (hist. `ff8cc2c`) | **landed** | On master. See `docs/districts.md`. |
| Districts polish | local `districts-polish` (hist. `1c661b0`) | **landed** | On master (minimap / facade title polish). Related to districts. |
| Trading | local `trading` (hist. `f0b3928`) | **landed** | On master. See `docs/trading.md`. |

## Decisions needed from Zachary

1. **Merge order for open branches:** suggest `feat/text-chat` first (small, MP-only), then `hub-launch-hall` (rebase onto master — expect conflicts in hub/wallet UI after SIWS pill). Or cherry-pick **façades only** (`31be440`) if wallet-only hall should wait.
2. **Preview hosting:** local `npm run serve` is enough for review; create a **non-production** Vercel preview alias only if you want shareable links — never promote these tips to `inu-verse-tawny` without review.
3. **Cleanup:** local `ambient` / `companions` / `districts` / `districts-polish` / `trading` / `cafe` branches (and worktrees under `/workspace/iv-*`) can be deleted after you confirm; they are not distinct remotes.
4. **Academy:** already on master — any Phase 1b (Practice Launch sandbox) is future work per `docs/academy.md`, not a side branch.

## How to preview (cheat sheet)

```bash
# Open features (diverged)
git fetch && git checkout hub-launch-hall   # hall.html + façades; see BRANCH_STATUS.md
git checkout feat/text-chat                 # or worktree /workspace/inu-verse-chat

# Everything already landed
git checkout master
npm test
npm run serve   # http://localhost:8642/
```

## Remotes note

Only distinct feature remotes today: `origin/hub-launch-hall`, `origin/feat/text-chat` (plus `master`, `feat/siws-wallet-pill`, `verified`). Landed feature names are **local-only** historical tips.

Copy also kept for hub reading: `kibble-pay/docs/INU_VERSE_SIDE_BRANCHES.md`.
