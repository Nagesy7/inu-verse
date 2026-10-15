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

## Community Hall (voting building)

Plan only. No code yet. The Community Hall is an in-world building where holders vote on proposals for the game.

### Proposal categories
- **Upgrade**: improve something that already exists.
- **Add**: a new feature, building, item or area.
- **Remove**: take something out.
- **Bug fix**: report a bug and prioritise its fix.

### Votes are advisory only
Results guide the roadmap but don't bind it. A governing council or the owner (Zachary) can veto any outcome. The game must say this clearly in the Hall, on every proposal, and on the results board.

Suggested in-game wording:
> **Community votes are advisory.** Your vote helps us decide what to build, but it is not binding. The Inu Verse council or the owner may veto any result. Voting is free, gives no rewards, and is not an investment or a game of chance.

Short banner version: "Advisory vote: the council or owner can veto results. Free to vote, no rewards."

### One vote per wallet (anti-sybil)
- Each vote is wallet-signed (SIWS session, the same as kibble-pay scores). The rule is one vote per wallet per proposal. Voters can change their vote while the proposal is open.
- Tradeoffs:
  - **Plain one-vote-per-wallet** is simple, but anyone can create new wallets and spam votes.
  - **A minimum holding check** (for example, holding at least X $KIBBLE or an Inu Verse item at a snapshot) raises the cost of sybil wallets. Its downside is that it ties voice to holdings. Keep the threshold low and flat: still one vote per wallet, never weighted by balance.
  - **A minimum wallet age or activity check** (for example, a wallet first seen over 14 days ago, or some play history) blocks fresh throwaway wallets but delays genuine new players.
  - **Per-holder dedupe** across linked wallets is stronger but harder and more privacy-invasive. Leave it for later, if it's ever needed.
  - Recommendation: one vote per wallet, plus a low minimum holding and a wallet age check at the proposal's snapshot. Flag clusters of suspicious wallets for moderators.

### Free and reward-free
- Voting is always free. There are no paid votes, no vote boosts, and nothing that can be bought to gain extra votes.
- Voting earns nothing: no tokens, no items, no prize entries, and no effect on any leaderboard or prize pool. This is consistent with the $KIBBLE rules in kibble-pay (cosmetics only, no paid entry, no random rewards). It keeps the Hall from looking like gambling or a security.

### Proposal queue and moderation
- Holders submit proposals with a title, a category, a description, and optionally a screenshot.
- Proposals go into a moderation queue. Moderators check them for spam, duplicates, abuse and scope, merge duplicates, and give a reason for every rejection. Once approved, a proposal opens for voting for a fixed window (for example, 7 days).
- A rate limit applies to proposals, for example one open proposal per wallet at a time.

### Public results board
- An in-Hall board and a web page show each proposal with its category, vote counts, the closing date, its status, and any council or owner note. Every veto must give a reason.

### Status tags
`Under review` (in moderation) → `Open` (voting) → `Accepted` / `Rejected` / `Vetoed` (with reason) → `Planned` → `Shipped`. Duplicates are tagged `Merged`.

### Phased outline
- **Phase 1: the Hall building and read-only board.** Build the Hall in-world, show the advisory disclaimer, and show council-posted proposals with status tags.
- **Phase 2: wallet-signed voting.** One vote per wallet with SIWS, the minimum holding and age checks, and live counts on the results board.
- **Phase 3: holder proposals and moderation.** The submission form, the moderation queue, rate limits, and duplicate merging.
- **Phase 4: council and owner tooling.** Veto and accept actions with a mandatory reason, the Planned and Shipped workflow linked to releases, and an audit log of decisions.

## Living World (vision)

Plan only. No code yet. Inu Verse is an Inu remix of the real world: a small living ecosystem of vehicles, buildings, characters and everyday life. The town should feel busy and believable even when no players are around.

### Vehicle roster
All names are original Inu names. No real brand or model names, and no near-copies of them. Existing store cars (Zoomie GT Coupe, Riviera Convertible, Comet Supercar, Gold Bone-mobile Limo) stay as they are.

| Class | Inu names |
|---|---|
| Supercars | Howler X, Fetchfire RS, Moonbark Hyper |
| Luxury cars | Velvet Paw Sedan, Grand Kennel Tourer, Silkcoat Saloon |
| Pickup trucks | Mudpaw Ute, Digger Dually |
| Delivery trucks | Parcel Pup Box Truck, Kibble Hauler |
| Semi truck | Big Bone Long-Hauler |
| Fire truck | Rescue Station Hose Hound (ladder and pumper) |
| Scooters | Zippaw Scoot, Vesp-Inu Glide |
| Motorbikes | Growler 500, Tailwind Tourer, Dirt Digger MX |
| Buses | Pack Bus (city), Wag-Wag School Bus, Double-Decker Doggo |
| Taxis | Pawcab, Night Fetch Cab |
| Vans | Campout Van, Snack Van, Tradie Pup Van |
| Ice-cream truck | Mr Scoops Pupsicle Truck |
| Boats | Splashpaw Runabout, Harbour Hound Ferry, Lazy Tail Sailboat, Dock Dog Tug |
| Bikes | Pedal Pup Cruiser, Trail Tail MTB, Tandem Twin-Tail |
| Others | Barkline Tram, Park Ranger Buggy, Paw-Patrol Cruiser, Vet Ambulance |

### Ambient life
- **NPC pups with daily routines:** home → work, school or shops → park → home, following a day and night cycle with jobs to match (barista, vet, ranger, driver).
- **Traffic:** cars, buses on routes, taxis picking up pups, boats in the harbour, bikes in the lanes, and the fire truck heading out on staged callouts.
- **Deliveries:** parcel vans and kibble haulers visiting shops, plus the ice-cream truck's jingle route in summer.
- **Weather and seasons:** rain, wind, fog and storms. Seasonal palettes include autumn leaves, winter frost and summer beach crowds, and seasonal events follow them.
- **Wildlife:** birds, possums, ducks on the pond, fish and dolphins in the bay, and butterflies in the gardens.
- **Shops open and close:** opening hours with lights on and off, signs that flip between OPEN and CLOSED, and quiet streets at night.

### New real-world buildings
- Hospital and vet clinic (Paws & Claws Vet), with an ambulance bay
- School (Good Boy Academy), with buses at drop-off and pick-up
- Police and ranger station (Pup Patrol HQ / Ranger Lodge)
- Train station (Barkline Central), with a commuter train loop
- Beach, with a surf club, kiosk and lifeguard tower
- Gym (Fetch Fitness)
- These join the existing Rescue Station (home of the Hose Hound fire truck) and the shops and mall.

### Ties to the Materials Store and Community Hall
- **Realistic materials:** new buildings use the realistic default materials from the Materials / Building Store section (wood grain, stone, render, glass), not coloured bricks. Holder buildings can match their neighbours.
- **Votes choose what comes next:** holders use the Community Hall's "Add" category to vote on which building or vehicle class comes next. The result is advisory and can be vetoed, as in the Community Hall section.
- **Expansions:** owned material packs could later reskin a holder's garage or boat shed.

### Vehicles are cosmetic only
Vehicles are cosmetic and ownership only, with no effect on any prize. This follows kibble-pay `README.md`, "What $KIBBLE can buy", rule (a): "$KIBBLE buys cosmetic items only. No purchase may ever improve the chance of winning a prize." Rule (c) adds no loot boxes or random paid rewards. Owned vehicles never give speed or score advantages in any prize-eligible activity. New vehicles join `config/items.json` as `inu-verse:car-*` and similar fixed-price items.

### Phased outline
- **Phase 1: ambient basics.** Day and night cycle, NPC pups with simple routines, background traffic using the existing cars, and shop open and close hours.
- **Phase 2: vehicle roster.** Add the vehicle classes above as ambient traffic first, then as cosmetic store items. Rescue Station fire truck callouts and the ice-cream truck route.
- **Phase 3: new buildings.** The vet/hospital, school, police/ranger station, train station, beach and gym, built with realistic materials. The Community Hall vote decides the order.
- **Phase 4: weather, seasons and wildlife.** Weather states, seasonal palettes and events, and animal life.
- **Phase 5: deeper ecosystem.** Deliveries linked to shops, bus, train and ferry routes, and NPC jobs tied to buildings.

## City Layout Restructure (later phase)

Plan only. No code changes yet. Images:
- `proof/city-layout-current.png`, rendered from `src/world.js` `MAP` and the building data. Numbers on it are path steps from spawn, from `findPath`.
- `proof/city-layout-proposed.png`, a sketch of the proposed layout.

### Current layout (from `src/world.js`)
- **Shape:** the map is 64×106 tiles of 32 px each, laid out as one tall north-to-south strip. Spawn is at tile (31, 23), near the north end on the main avenue.
- **Roads:** three east-west streets (rows 20, 31 and 42) and one north-south avenue (column 31, rows 6–45). The avenue does not continue south of row 45. The whole Mall district and the farmland have plaza and walkways only, with no roads.
- **North (rows 1–18):** Market Row (Shiba Sips Café, Paws & Pillows, Fetch Fashion, Launch Hall, Zoomies Motors), the stall plaza, the clubhouse and a pond. Everything here is 8–38 steps from spawn.
- **Middle (rows 24–39):** a row of 8 player plots, 4 NPC homes and a large pond. Large patches of grass in between are dead space.
- **South (rows 46–79):** the Kibble Mall district. It is one large 50×34 plaza holding the Mall, five specialty shops, the Bank, the Arcade, the Rescue Station and Trainer Gate, the Leaderboards Hall, the forecourt, the fountain, the statue and the President's Office. The Kibble Mall, President Inu's flagship, is 81 steps from spawn. That is the most important store and it's off-centre.
- **Far south (rows 80–104):** the park and chapel, then the farmland (fields, barn, farmers market, crafting station, pen, orchard and farm lane lots). These are 92–123 steps from spawn.
- **Problems:**
  - Key places sit at the opposite end from spawn. The Mall is 81 steps away and the barn and craft station are around 120.
  - On a phone, getting there means a long vertical scroll and drag.
  - There is no fast travel and almost no signage.
  - The road grid stops at the Mall, so the south half has no readable streets.
  - Dead grass sits between the homes and the plots.
  - About 1,970 of the 6,784 tiles (29%) are plain grass.

### Proposed changes: Kibble Mall at the centre
- **President Inu's Kibble Mall becomes the centre of the map** and the hub landmark. A Mall Plaza surrounds it, with the fountain, the President Inu statue and signposts. Spawn moves to the Mall Plaza.
- **Districts radiate out from the Mall** in six wedges:
  - North: Market Row
  - North-east: Arcade and game doors (Arcade, Rescue Station, Trainer Gate)
  - South-east: Luxury and Finance (Bank, Luxury Autos, Designer, Jewelers)
  - South: Civic (President's Office, Leaderboards Hall, Community Hall, and later the vet and school)
  - South-west: Park and Farm
  - North-west: Homes and Plots
- **Readable road grid:** six radial avenues leave the Mall Plaza, joined by an inner ring road and an outer ring road. Every district gets a road, including the farm, which currently has none.
- **Shorter walks:** every key building should be about 40 steps or fewer from the Mall. The specialty Mall shops sit on the inner ring.
- **Signage:** district name signs, a signpost at each avenue mouth on the plaza, labels for key buildings on the minimap, and floating labels above building doors.
- **Fast travel:** a stop in each district (the gold markers on the sketch), and every stop has a "Back to Mall" option. On a phone, a single tap opens a district list. Fast travel is free and purely convenience, with no prize effect.
- **Phone accessibility:** a minimap you can tap to jump to a location, larger tap targets on doors, and a "Take me to…" button for key buildings that uses the existing `findPath` with auto-walk.
- **Reuse dead space:** fill the empty grass with the new Living World buildings and more plots.

### Phased outline
1. **Signage, minimap labels and "Take me to…".** No changes to the map.
2. **Fast travel stops and a Mall return option.**
3. **Rebuild the map** around the Kibble Mall hub (radial avenues, ring roads, district wedges). Migrate saves, remapping plot and home coordinates.
4. **Fill districts** with Living World buildings that use realistic materials.

## Player Offers & Trading

Plan only. No code yet.

### How Bones work today (from the code)
- `src/game.js`: new players start with `START_BONES = 500`. Bones are earned through play (shifts, jobs, farm and so on). They are spent on plots (`PLOT_COST` 300), furniture and home upgrades, and selling an item back refunds 50% (`SELL_BACK`).
- State is saved client-side in localStorage (`src/save.js`, `inuverse.save.v1`).
- `swapBonesToKibble` converts Bones to *demo* KIBBLE only. `src/wallet.js` says: "Real $KIBBLE never comes from play."
- Bones are free and never cashed out, so they are the default trading currency. Because they live client-side, player-to-player trading needs a **server-authoritative Bones ledger and inventory first**. Otherwise saves could be edited to fake balances.

### Offers (Bones, default)
- **Who and what:** any player can make an offer to the owner of a plot or owned item: cars, outfits, furniture, holder buildings and expansions.
- **Owner responses:** accept, decline or counter. Counters can go back and forth, with a limit of 5 rounds.
- **Expiry:** offers expire after a set time (default 72 h). On expiry, decline or withdrawal, the escrowed Bones are returned automatically.
- **Escrow:** the offered Bones are locked in escrow when the offer is made. On accept, the server transfers the item and releases the Bones in one atomic transaction, so both sides happen or neither does. No partial trades.
- **Trade history:** a per-player log, plus a public item provenance list that shows past owners and prices.
- **Safety:**
  - Players can block other players.
  - Anti-spam limits: maximum open offers per player (for example 10), maximum offers per target per day, and a minimum offer floor (for example 10% of the item's list value) to stop lowball spam.
  - A cooldown on re-offering after a decline.
  - Players can report trades, and owners can mute all offers.
- **Not tradeable:** items tied to prize eligibility, such as the Weekly Quest Chain reward (`inu-verse:quest-chain-reward`), leaderboard titles and season badges. Also excluded: anything whose transfer could move a leaderboard position or score. These items are soulbound.

### $KIBBLE offers (optional later phase). Needs Zachary's decision and a legal check.
**Flag:** do not build this until you've signed off and had Australian legal advice. It would create a real-value secondary market, which brings:
- scam and phishing risk
- possible financial-services or AUSTRAC implications
- GST, income and capital gains tax questions for sellers
- consumer-law refund duties

The kibble-pay README already asks for legal advice before taking real money.
- **Approach:** an on-chain escrow program or a PDA vault. The buyer's $KIBBLE is locked on-chain. Ownership transfers and the release are settled atomically and verified by the server, using the same Solana Pay and verification flow as kibble-pay. The seller never receives funds before the transfer.
- **Fee option:** a small marketplace fee, for example 1–2%, to the treasury. If any share goes to the prize pool fee, it must be fee-inclusive like `config/items.json` pricing.
- **Prize rules:** trading must never touch prize odds. This follows the kibble-pay "What $KIBBLE can buy" rules:
  - (a) cosmetics only: "No purchase may ever improve the chance of winning a prize."
  - (c) no loot boxes, no random paid rewards, and no paid entry to any prize competition.
  - Traded items stay cosmetic, and prize-eligible items stay untradeable.

### Phased outline
1. **Server-authoritative Bones ledger and inventory**, with save migration.
2. **Bones offers:** make, accept and decline, with escrow, expiry and atomic transfer.
3. **Counters, trade history and provenance, block and anti-spam limits, reporting.**
4. **Optional: $KIBBLE offers through on-chain escrow** with a marketplace fee. Only after your decision and the legal check.
