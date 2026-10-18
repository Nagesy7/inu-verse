# Arcade Districts (Verse side of verse-districts contract v2)

The new zone is `districts` ("Arcade Districts"). It is a 132x22 tile street, reached from the hub gate east of the Arcade hall (tile 62,57; sign "ARCADE DISTRICTS / EAST"). The shuttle stop at 61,58 opens fast travel.

| District id  | Name          | Tiles   | Doors |
|--------------|---------------|---------|-------|
| arcade-row   | Arcade Row    | 1-29    | 8 cabinet booths, all live |
| arena        | The Arena     | 30-50   | shiba-scuffle, LIVE |
| fud-field    | FUD Field     | 51-71   | fud-swarm, coming soon |
| stadium      | Stadium       | 72-93   | zoomie-goals, coming soon |
| parkour      | Parkour Park  | 94-112  | barkour, coming soon |
| race-park    | Race Park     | 113-130 | last-pup-standing, coming soon |

The whole street is one continuous road. Each district has its own kiosk (fast travel) and road signs. The west end of the road leads back to town.

## Gates (single table: `CABINETS` in `src/districts.js`)
- `live: true` means the door opens. Walking in or pressing A shows the cabinet panel, and Play navigates at top level.
- `live: false` means a shuttered door with SOON. The panel has no Play button.
- `name: null` means a generic label: "Cabinet N" on Arcade Row, or "<District> Cabinet" elsewhere.
- To open or name a cabinet when the Arcade Keeper pings, flip `live` and/or set `name` in that row. The tests check the ids against the contract.
- Arcade Row: kibble-chomp, bark-invaders, pup-crossing, bone-breaker and pips-big-bark carry their names. street-sniffer, paw-fu-tower and bone-digger are open with generic labels until they are named.

## Outbound / return
- `doorUrl(cab)` builds `https://inu-arcade.vercel.app/<id>?from=verse&district=<d>&spawn=door-<id>&return=<VERSE/?spawn=door-<id>&district=<d>>`.
- It can add an optional `wallet` (base58) and the lite profile `p`.
- The navigation is same-tab (`location.assign`). The `#enter-ov` overlay is shown, and `__noNav`/`__lastNav` act as test hooks.
- On boot, `parseReturn(location.search)` accepts only known district and cabinet ids. Then startGame drops the player in the hub at the gate, enters `districts` at spawn `door-<id>` (or `d-<district>`), and shows a "Welcome back from X!" toast.
- The Arcade return allowlist (`verse.js safeReturn`) only accepts https://inu-verse-tawny.vercel.app, not localhost. For a local test, either open `/?spawn=door-shiba-scuffle&district=arena` directly, or serve the prod origin from the local checkout inside a test browser. `scripts/districts-proof.mjs` does the latter.

## Messages (framed Arcade overlay)
- `arcadeMessage(e, origin)` accepts only the Arcade origin and a plain object.
- `inu-arcade:ready` sets the overlay bar label.
- `inu-arcade:exit`, `inu-arcade:close` and `inu:back-to-verse` close the overlay, and the Verse replies `inu:verse-closed`.
- `inu-arcade:score` is sanitised (integer, capped) and shown as a toast only while the overlay is open. It never touches Bones, $KIBBLE, prizes or saves.
- Toasts stack above the open overlay.

## Rendering
- Ground is baked in 16x16-tile chunks: `sceneChunk` in `src/sceneart.js` keeps an LRU of up to 24 chunks, and `__chunkBakes` counts the bakes. Only chunks on screen are drawn.
- Props are indexed per chunk and culled in x and y (`scenePropsIn`). NPCs are culled in x.
- Storefronts are baked once per night state at 2x (`src/districtart.js`), and baked again after the font loads.
- Reduced motion keeps the OPEN lights steady and the flags still.

## Proof / FPS
- `node scripts/districts-proof.mjs` writes `proof/districts-local-*`.
- `node scripts/districts-fps.mjs` writes `proof/districts-local-fps.json`.
