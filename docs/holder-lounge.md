# $KIBBLE Holder Lounge

Walkable holder room **east of the free Trainer Gate** (Inu Quest portal). The portal stays free for everyone; only the lounge is $KIBBLE-gated.

## Gate
- Hold ≥ Mall VIP bar (`HOLDER_THRESHOLD_U` in `fly5.js`, currently 1M $KIBBLE UI) **or** any Kennel hold-streak tier (Pup+).
- Demo (`?demo=1`) uses simulated `state.kibble`. Live uses on-chain balance via the wallet pill.
- Deep link: `?open=lounge` (also `holder`, `holderlounge`).

## Six features
1. **Silhouette gallery** — evolved stage outlines + evo chains from Quest companion bridge / party save. Honest empty states.
2. **Night watch** — lounge lighting follows hub `dayPhase`; pane lists dusk/night encounter tips for routes the player has walked (Quest tables, not a new product).
3. **Rival board** — REX / `rivalStory` (Quest step4): last beat, badge count, next rematch tease. Stubs gracefully if save bridge empty.
4. **Kennel seats** — sit with holders; party of six on display; Bones read-only (never cash out).
5. **Lore hearth** — Waghire founding myth plaques (listen / heartbeat / bridge) mirrored from Quest intro.
6. **Cosmetic rack** — Quest `$KIBBLE` looks + paw trail from Kibble Pay only. No creatures/stats/pay-to-win.

## Files
- `src/lounge.js` — pure logic + Quest save parse (read-only)
- `src/loungeui.js` — board UI
- `src/scenes.js` — `lounge` interior + `DOOR_SCENES`
- `src/world.js` — building past Trainer Gate
- `src/main.js` — gate on enter + panel
- `tests/lounge.test.mjs`

## Economy firewall
Bones never cash out. $KIBBLE cosmetics only. Fee splits / wallet names unchanged. No Mememon. No writes to `inu-quest` cloud save.
