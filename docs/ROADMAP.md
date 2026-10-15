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
