# Player trading (items only)

Players swap **items for items**. No Bones, no Pawmarks and no $KIBBLE are ever part of a trade, and no game holds or moves tokens.

## What can be traded

| Tradeable | Not tradeable |
|---|---|
| Wardrobe items bought with **Bones** at Fetch Fashion | Anything bought with **$KIBBLE**: Kibble Mall wardrobe, mall furniture, Maison Royale (royal/deco) sets |
| Furniture bought with **Bones**: the base shop and the Cosy Corner sets (cosy/modern) | President Inu visit drops |
| Items you received in a trade | Login-streak pins, plus prize, quest, season, burn, photo-week and starter cosmetics |
| | Shop interior props, pets, cars, homes, walls, floors, trophies, UGC items |

The save never recorded how an item was obtained, and some earned prizes share an id with Bones items (for example the quest prize `shades`). So trading counts **provenance**: only copies bought with Bones after trading shipped, or copies received in a trade, count (`state.trades.ok`). Everything already owned before trading stays untradeable. Furniture must be in storage, not placed in a home. Furniture received in a trade can't be sold back to the shop for Bones, otherwise a trade would become a Bones transfer.

## Flow

1. A player opens **Trades** from the players list (or taps **Trade** next to a player). This opens the Trading Post, where players who also have it open are listed. Players in your room are tagged *nearby*.
2. The player picks 1 to 4 items to give and 1 to 4 to get, then sends the offer. Both players see the same items.
3. Either side can change the offer. A change bumps the version, clears both confirmations and locks confirming for 3 s.
4. Each side confirms by **signing a plain-text message** in their wallet. This is a sign-message, never a transaction. The message lists the trade id, version, both sides' items, a one-time nonce and an expiry. If the session has lapsed, the client uses kibble-pay's shared in-flight sign-in. Each tap opens at most one wallet prompt.
5. When both sides have signed the same version, the server swaps **both items or neither**, under both traders' locks. It re-checks ownership against the server-side ledger (anti-dupe) and refuses replayed signatures.
6. Every step (offer, edit, confirm, done, cancel, refuse, expire, report, block) goes into the Paw Audit Bureau **item book**. This is a server-side hash-chained log in the same format as `src/sim/ledger.js`. Parties appear as opaque `player:t…` handles, and every entry moves 0.

Players can **cancel** at any point before the swap. **Report** files a reason with the Bureau, cancels any open trade and blocks the player. **Block** hides the player and cancels open trades with them.

## Limits and anti-abuse

- No trading with yourself (same wallet). If both sides confirm from the same network, the trade is refused (alt-account heuristic; this can affect households).
- New traders wait 1 hour after first opening the Trading Post before they can send or receive an offer.
- Max 3 open trades per player, 10 offers an hour, 10 completed trades a day, and 3 a day between the same two players (days are Australia/Sydney days).
- Per-action rate limits per wallet, plus a per-network cap of 120 requests a minute. Unconfirmed offers expire after 30 minutes.

## Server

`/api/home` op `"trade"` (`api/_lib/trades.js`). **No new Vercel function.** It needs a kibble-pay session (`Authorization: Bearer`) and reuses the same Upstash store. Bureau Check 9 (Cosmetics rule) red-teams the item gate and the item book.
