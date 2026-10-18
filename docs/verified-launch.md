# Verified Launch badge + town crier news

Opt-in only. A creator ticks **Opt in to the Verified Launch badge** in the Launch Hall create flow (`src/launchui.js`, `#nx-verified`)
or in *Register a coin you launched* on the Coin board (`#reg-verified`; works for an already-registered coin too, creator only).
Coins that did not opt in show **nothing** (no badge, no fail).

## The four checks (server-side, `api/_lib/verified.js`, Solana RPC via `api/_lib/rpc.js`)

| check | pass when | data source |
|---|---|---|
| (a) authorities | mint authority AND freeze authority are both `null` | `getAccountInfo(mint, jsonParsed)` |
| (b) fee split | **1st source, on-chain:** the pump.fun SharingConfig PDA `["sharing-config", mint]` of the Pump Fees program `pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ` ($KIBBLE: `D81SsjvoeEXFxjQgEGLTcG5cnT6dYJXk1XE2Nh9eHzM8`, checked in a test). If it exists its shares must add up to 100% and match the expected split ($KIBBLE: the published 40/35/25 in `src/wallets.js`; other coins: the creator's declaration if any), else **fail with the difference**. **2nd source, only if that account does not exist:** a declaration signed by the coin's **on-chain** pump.fun creator (read live from the bonding curve, never hardcoded), shown as **"Published by creator — not enforced on-chain"**. Bad signature, a signer that is not the on-chain creator, or a split that differs from the published one fails. | `getAccountInfo(SharingConfig)`, bonding curve, stored declaration |
| (c) no snipes | **no wallet other than the creator picked up tokens in slots S..S+4**, where S is the slot of the coin's first bonding-curve transaction (creation). `SNIPE_SLOTS = 5` = the creation slot + the next 4, about 2 seconds | `getSignaturesForAddress(bonding curve)` back to creation (max 5 pages = 5,000 txs) + `getTransaction` for every successful tx in the window (max 60) |
| (d) top 10 | each of the 10 largest holders (by owner) has **under 1%** of supply, excluding the pump.fun bonding curve and pump AMM / Raydium pool vaults | `getTokenLargestAccounts` (20 largest accounts) + owners + owner programs |

Badge only if all four pass. Any check that cannot be read is `unknown` and shown as **COULDN'T CHECK**; it never counts as a pass.

Wording on a pass is exactly `Verified Launch: checks passed at <time>` (viewer's local time with a zone label, e.g. `18 Oct, 11:45 pm AEDT`).

## Re-check schedule (fits the Vercel free plan: no cron)

Lazy re-check with a TTL in Upstash. `GET /api/coins?verified=<mints>` returns the stored record `launchhall:verified:v1:<mint>`;
if it is older than **15 minutes** it is recomputed on that request (max 2 coins per request, lock `launchhall:verifiedlock:<mint>`, 120 s).
The board asks on every view, so a shown badge is never more than one TTL old while anyone is looking. Results:

* pass → `verified` (`passedAt` updated)
* definite fail after a pass → `revoked`, with `revokedAt` (first failing re-check) and `revokeReason` (failing check + data)
* fail, never passed → `not_passed`
* couldn't check → a verified coin keeps its last pass for up to 24 h (with a note), then shows "couldn't check"

The snipe result is about the past, so once it is definite (and the window is at least 90 s old) it is stored for good in
`launchhall:verified:snipe:v1:<mint>`; later re-checks skip that history walk.

## Town crier announcements

When a coin is verified for the first time, the server adds it to the Upstash set `launchhall:crier:announced` (SADD → dedupe:
once per coin, ever, even after a revoke and re-pass) and queues it. `GET /api/coins?news=1` releases at most **one** queued item
per **10 minutes** (gate `launchhall:crier:gate`, SET NX EX 600) into `launchhall:crier:news` (last 10).
The client polls every 2 minutes, shows each id once per device (localStorage) and at most one headline per 90 s:
Crier Barkley's speech bubble + a Daily Bone headline banner with a pump.fun link, and a newspaper card + ticker on the Coin board.
One crier bell sound (`crierBell`, own audio gate, 20 s cooldown), so sounds never stack.

## Data-source limits

* `getTokenLargestAccounts` returns the 20 largest token accounts; an owner spreading under-1% across many small accounts outside
  that list would not be summed.
* Coins with more than 5,000 bonding-curve transactions before their first check cannot reach the creation slot: snipes shows
  "couldn't check" (opt in at launch so the first check runs early; the settled result is then stored).
* A sniper using a second wallet the creator controls is a non-creator wallet and fails the check; a creator buying through
  the create transaction itself (Opening swap) is not a snipe.
* Free RPC tiers may rate-limit; that shows as "couldn't check", never a pass.

## Preview fixtures

`?verifiedpreview=1` adds three labelled **TEST FIXTURE** coins (verified, revoked, not opted in) and one fixture news item, for
screenshots only. Proof: `proof/verified-*` from `scripts/verified-proof.mjs`.

## $KIBBLE fee split + named wallets

The one constants module is `src/wallets.js` (also used by `api/`):

| name | address | role |
|---|---|---|
| President's Vault | `BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ` | creator share · President Inu's treasury |
| Kennel Chest | `Akk3DdxeRRLZABfpkFKYoDBk6Zim5wNLRYemNFjv56fn` | community pool · prize pool wallet · **the $KIBBLE on-chain pump.fun creator** |
| Bone Vault | `Bv35NAj1XvfSGrQKpHHw29ojZmY4NYyUZr7rwXpPhW8Y` | dev wallet. "Bone Vault receives the 25% dev share for hosting, tools and art, with part of it seeding the next Inu project after Inu Verse." |

Official split: 40% Kennel Chest (community pool) · 35% President's Vault (creator) · 25% Bone Vault (dev wallet). Every screen shows
the name, a short address (`BzLY…NGJ`) and a Solscan link. Copy next to the split: "How $KIBBLE creator fees are shared, published
for transparency. This is not a payout promise to holders and there are no returns."

## Creator signing (opt-in + split declaration, one signature)

`https://inu-verse-tawny.vercel.app/?kibblesign=1` opens Launch Hall → $KIBBLE with the creator card (`src/kibblesign.js`). The creator
connects Phantom, the page checks the connected wallet against the on-chain creator from `GET /api/coins?declare=<mint>`, and
**Sign once in Phantom** calls `signMessage` (a message, not a transaction: no funds move, no fee). `POST /api/coins {action:"declare"}`
rebuilds the exact text (`src/declaration.js`), checks the ed25519 signature (`api/_lib/declaration.js`), that the signer is the
on-chain creator, that it was signed in the last 10 minutes, and ($KIBBLE) that the split is the published one; then stores
`launchhall:declaration:<mint>`, opts the coin in (`launchhall:verifiedoptin:<mint>` for $KIBBLE) and clears the cached result so
the next board view re-checks. There is deliberately **no** flow here for creating pump.fun's on-chain fee-sharing config.
