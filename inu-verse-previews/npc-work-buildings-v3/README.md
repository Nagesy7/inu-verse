# NPC workplaces v3 (preview only)

Branch `cursor/npc-work-buildings-eb75`. Do not merge it and do not promote it. Nothing here writes `inuverse.save.v1`, Bones, or $KIBBLE. The preview save is `inuverse.preview.npcwork.v1`. Open it with `?npcwork=1`.

## Why the map grew south

The three candidate tailor lots each sat on flowers or were tight against something already built. Zachary said to expand rather than cram. The town stays 64 by 106. Sixteen rows were added to the south (`MAP_H` 122). `(0,0)` and every old `(x, y)` stay put.

The new street is row 113, the row under each new footprint, which is where the art puts the doors. A spur at x=52 joins that street to the farm walk. The only legacy tiles that changed are the join:

| tile | was | now |
|---|---|---|
| (52, 104) | grass | walk |
| (52, 105) | border tree | walk |

Every other tile in the original 64×106 matches the live town hash `160103ee7669ccba0c95572ac9d543d889f037653d361b61996ad8c9b32d2296`. A test reloads an old save and checks the player is still on the same pixel. The minimap uses `MAP_W` and `MAP_H`, so the new rows are on the map. The round joystick and the single TEST chip are unchanged.

## Workplaces

| place | where | who | what you see |
|---|---|---|---|
| Lumber Yard | (50, 96) 6×4, existing grass | Timber | chops; the log pile is the count |
| Sawmill | (6, 109) 5×4, new | Saw | one delivered log becomes one plank |
| Mechanic | (28, 2) 5×4, existing grass | Wrench | bay: lift, bonnet, creeper, wheel, down, fixed, car leaves. The SHORT 1 PLANK sign fills from the sawmill, not from the yard |
| Scrap yard | (40, 109) 6×4, new | Bolt | sort, then press. `press-idle` shows whenever the press loop is not playing. One scrap bale, then the mechanic uses it |
| Tailor | (16, 109) 5×4, new | Stitch | cloth bolt, sew, cut, bare mannequin to dressed, coat onto the rack. Test item only |
| Bakery | (28, 109) 5×4, new | Crumb | knead, then the oven door opens. Two flour sacks to start. One loaf is eaten and that meal starts the next shift |

Doors, one row south of the footprint: sawmill +(2, 4), tailor +(4, 4), bakery +(4, 4), scrap +(3, 4).

Live Saw, Crumb, Bolt, Stitch and Wrench are hidden while their loop plays and shown again when it ends. Crumb stays visible while the oven door is only the shut/open switch. Wrench is hidden on the bonnet, creeper and wheel frames.

Art is Inu Art Studio v1.2, including the v1.1 tweaks. `tailor-shop.png` and `work-sew.png` ship together. `ART-NEEDS-v3.md` lists what is in and the two optional extras (a carry-log sheet, a one-loaf tray).

## Conservation

- 1 log at the sawmill = 1 plank. Timber only chops. The day saws one log for the sign and leaves three in the yard. Sawing the rest yields three more planks and then stops.
- Flour starts at 2. One loaf is baked and eaten. Baking the last sack stops. No further loaf appears.
- One cloth bolt becomes one coat on the rack. A second pass does not mint another.
- The repaired tool and the broken leftover become one scrap bale. Scrap does not appear without that press.
- Dawn still issues up to 40 test chits under a cap of 160. That rate is unbalanced and local. It is not Bones and not $KIBBLE.

## Phone, at 390×844

- **Needle.** Stitch reads at the machine, vest and paws clear. The 3px needle is a thin dark tick by the needle head. At this size it flickers more than it reads as a plunge.
- **Creeper.** The vest, arm and gold board sit in the open past the car's nose. The head stays under the car. It reads as a dog under the car, not a separate face.
- **Sawmill log.** With Porter stood off the bay, the infeed log is a short brown bar under the metal guard. It is smaller than Saw and easy to miss, but it is there on the bench while MILL reads 1.
- **Crumb.** Cream coat and a tall white cap sit on a pale wall. The orange vest and the ink outline keep him readable as the baker. The cap is the weak part.
- **Scrap bale.** On the back fence the strapped bale is a small grey box on the corrugation, easy to take for a vent. On the press frames the platen and the squashed bale read as a machine.

Porter's delivery still is at the mechanic, on the tile in front of the SHORT 1 PLANK sign, with the plank across his chest. He is not at the lounge.

## Tests

Full suite, one run, after the map expansion and the chains: 930 passed, 0 failed, 2 skipped. The workplace tests cover path tiles, 1:1 sawing, flour and cloth exhaustion, no second mint, the car leaving on the road, and an old save loading onto the same coordinates.

## Rollback

This branch is the preview. Live `276e094` is untouched until someone merges. To drop the preview, delete `src/npcbuildings.js`, `src/npcwork.js`, `tests/npcbuildings.test.mjs`, `tests/npcwork.test.mjs`, `assets/npcwork/`, and the hooks in `src/main.js` and `style.css`, and restore `src/world.js` and `tests/portals.test.mjs`.

## Limits

- Client only. No server authority.
- The 40-a-dawn test chits are unbalanced and local.
- Safari was not checked.
- The coat is not a wardrobe grant.
