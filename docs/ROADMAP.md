# Inu Verse Roadmap

## Materials / Building Store

Plan only. No code yet.

### Rules
1. **Default materials look real.** Out of the box, buildings use realistic textures: real wood grain, natural stone, painted render, roof tiles, glass. No flat coloured bricks and no brick tiling on every surface.
2. **Holders buy materials to grow their building.** Holders buy materials in the store to enlarge their building or add extra rooms.
3. **The material sets the build type.** The material you buy decides how that part is built: wood, brick, stone, render, timber-frame, glass and so on. A brick pack builds a brick extension. A stone pack builds a stone one.
4. **Custom colour requests.** Players can request a custom colour (render, paint, roof or trim) through the store.
5. **Cosmetic and ownership only.** These purchases never affect any prize competition. This follows the $KIBBLE rules in `kibble-pay/README.md` ("What $KIBBLE can buy"):
   - (a) "$KIBBLE buys cosmetic items only. No purchase may ever improve the chance of winning a prize."
   - (c) "No loot boxes or random paid rewards anywhere, and no paid entry to any prize competition."
   - Building size, rooms and materials must never feed into scores, quests, or the combined prize board (`config/games.json`).

### Phased build outline
- **Phase 1: realistic default textures.** Replace coloured-brick defaults with lifelike wood, stone, render and roof materials in a shared material library. Remove brick spam.
- **Phase 2: store catalog and purchase.** Add the material pack items to `kibble-pay/config/items.json`, using fee-inclusive prices and `inu-verse:` ids. Wire them into the Inu Verse store. Record ownership per wallet.
- **Phase 3: expansions and rooms.** Size expansions and room add-ons. The owned material pack picks the build type for each new section.
- **Phase 4: custom colour requests.** A store item for a custom colour request. The player picks a colour, the item is reviewed or validated, then applied to the chosen surfaces. No random outcomes.

### Catalog item types needed
| Type | Example id | Notes |
|---|---|---|
| Material pack (per type) | `inu-verse:mat-wood`, `mat-brick`, `mat-stone`, `mat-render`, `mat-timberframe`, `mat-glass` | Unlocks that build type for expansions or re-skins |
| Room add-on | `inu-verse:room-bedroom`, `room-kitchen`, `room-studio`, `room-garage` | Adds a room. Built in an owned material |
| Size expansion | `inu-verse:expand-s`, `expand-m`, `expand-l`, `expand-floor` | Larger footprint or an extra storey |
| Custom colour request | `inu-verse:colour-request` | One request per purchase, fixed price |
| Roof/trim finish (optional) | `inu-verse:roof-slate`, `roof-terracotta` | Purely visual |

### Fit with existing kibble-pay items
`config/items.json` already sells cosmetic Inu Verse items: `car-*`, `pet-*`, `furn-*` (furniture), `store-*`, `mall-*`, `look-*`, `skin-*` and others. They all use the `<game>:<item>` id format with fee-inclusive prices, and the catalog is regenerated with `npm run catalog`. The new `mat-*`, `room-*`, `expand-*` and `colour-request` items follow the same pattern. They fit next to `furn-*`: furniture fills rooms, and these items build the rooms. They are fixed-price direct purchases, never loot boxes, and they never count toward any prize.
