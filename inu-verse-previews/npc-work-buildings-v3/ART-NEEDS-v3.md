# ART-NEEDS v3

Inu Art Studio v1.2 (sha256 `0d239b10fd0ee9b3e179c16b52af04f7ae696522ce831b15e6c026d72980464e`) supplied the sawmill, bakery and scrap yard, plus drop-in v1.1 tweaks. The preview draws those files. No placeholder buildings remain.

## Now in game

| Workplace | Footprint | Door, one row south | Work layer |
|---|---|---|---|
| Sawmill | 5×4, native 80×64, world 160×128 | lot +(2, 4) | `work-saw.png` 4× 68×36 at +(12, 48), world 136×72 |
| Bakery | 5×4, native 80×64, world 160×128 | lot +(4, 4) | `work-knead.png` 4× 50×28 and `oven-door.png` 2 states, at +(12, 46), world 100×56 |
| Scrap yard | 6×4, native 96×64, world 192×128 | lot +(3, 4) | `work-sort.png` and `work-press.png` 4× 88×46 at +(8, 24), world 176×92. `press-idle.png` whenever the press loop is not playing |
| Tailor | 5×4 | lot +(4, 4) | v1.1 tweaks: `tailor-shop.png` and `work-sew.png` ship together, plus cut, mannequins and racks |
| Mechanic | 5×4, unchanged lot | door (30, 6) | v1.1 interior, with tweaked `work-creeper.png` drawn before the car |

Fill props, separate from the loops: log pile (0/1/3/6), plank stack (0/1/3/5), bread tray (empty/full), broken heap (0–3), parts crate, scrap bale. Flour sacks use `props/flour-sack.png`, one sprite per sack still in stock.

Carry overlays in use: plank, cloth bolt, coat, broken item, scrap bale, bread loaf. Logs use the existing log prop scaled in the hands. There is no `carry-log.png` in v1.2.

## Not requested

Nothing else is blocking the preview. A dedicated `carry-log.png` (48×60, anchor 24,44) would match the other carries. A one-loaf tray, beside the three-loaf full tray, would match this preview's single bake. The oven stays a shut/open switch.
