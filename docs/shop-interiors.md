# Shop interiors (cosmetic)

Leased business lots (`src/biz.js`) now have an inside. Each shop type has its own themed props and a free starter layout with counters, shelves, display cases, seating, lighting and themed props:

| biz.js type | theme |
|---|---|
| bakery | Bread Counter, Cake Display Case, Loaf Rack, Brick Oven, Café Table, Flour Sacks |
| cafe | Espresso Bar, Espresso Machine, Pastry Case, Mug Shelf, Table for Two, Velvet Armchair, Bean Sacks |
| flower | Wrapping Counter, Flower Buckets, Plant Shelf, Bloom Cooler, Potting Bench, Watering Can |
| boutique (fashion/general) | Boutique Counter, Clothes Rail, Folded Shelf, Bow Case, Long Mirror, Shiba Mannequin, Pink Pouf |
| groomer (pet store) | Front Desk, Bubble Tub, Grooming Table, Pet Supply Shelf, Treat Jar Case, Fur Dryer, Pup Bed Display |
| stand | Market Counter, Produce Crates, Jar Shelf, Egg & Milk Cooler, Weighing Scale, Apple Barrel, Hay Bale Seat |

Every theme also gets the shared props: Pendant Lamp, Reading Lamp, Shop Plant, Round Stool, Waiting Bench, Paw Till, Chalkboard Menu and Entry Runner.

* **Enter:** open the lot panel and tap **Enter & arrange** (your shop) or **Step inside** (Hana's, Taro's and Kiki's NPC shops, which are read-only).
* **Editor (touch-friendly):** tap a storeroom item, then a floor cell to place it. Tap a placed prop to Move, ↻ Rotate (R on a keyboard) or Remove it (it goes back to the storeroom). **Starter layout** restores the default. The doorway mat always stays clear. On phone landscape the editor uses the existing build side panel.
* **Bigger Shelves** (existing upgrade): also raises the prop limit, 24 + 8 per level. Its stock-capacity rule is unchanged.
* **Window Display** (existing upgrade): from level 1, passers-by see your arranged layout through the storefront window (a small cached canvas). Its appeal rule is unchanged.
* **Buying props:** Bones sets (Theme Fittings Set 120, Cosy Corner Set 80) are a Bones sink only. Optional $KIBBLE props (Kibble Chandelier 20000, Golden Shiba Statue 30000) go through the same Kibble Pay `wallet().purchaseSync` flow as the storefront looks. The catalog id is `inu-verse:iprop-<id>`, the player signs in Phantom, and the game never holds funds. $KIBBLE props belong to the player (`s.biz.kprops`) and go back to them if the shop closes.
* **Income:** props never change shop income. `biz.js` never reads the interior. `tests/interiors.test.mjs` runs a whole trading day with and without props and expects identical results.
* **Sync:** the owner's layout is published as `{v, lot, type, name, shelves, items:[[id,x,y,rot]]}` to `/api/home` (`op:"shop"`). The shop id is `"s"` plus your home-share id, and the owner key is your home-share key. The server accepts only the owner: the shop's own key hash, or the published home's key hash so nobody can pre-claim the id. It also checks that every prop is a known prop for that theme, and that the layout is on the grid, has no overlaps, keeps the door clear and stays within the cap for that Bigger Shelves level. Size caps are 2 KB for the layout and 4 KB for the body. Rate limits are one save per shop per 3 s and one per IP per second. Visitors open it from the multiplayer list (**Visit shop**) and fetch it on entry; the realtime relay is not changed.
* **Rendering:** walls, floor, props and lamp light are drawn once to an offscreen layer (`createShopLayer`). It is redrawn only on edit, resize or move-pick (`layer.redraws`, tested). Each frame is one blit plus the live selection and shopkeeper.

The shop lease itself lives in the player's save, so the server ties ownership to the player's share key, not to a server-side lease record.

Kibble Pay: the two `$KIBBLE` props need catalog lines in `kibble-pay` (`inu-verse:iprop-kb_chandelier`, `inu-verse:iprop-kb_statue`). Until then buying them returns the wallet's normal "unavailable" message and nothing is charged.
