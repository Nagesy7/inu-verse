# Weekly Pool Board and login streaks

## Weekly Pool Board (src/poolboard.js)
This builds on the existing Pools Monument and the City Board "Prize Pools" tab, and the Kibble Bank "Prize pool board" button now leads there. Nothing is duplicated.
- **Pools Monument.** The plaque shows live kibble-pay pools (`globalThis.__livePools`), with the local sim as a fallback. There is a walk-up "Weekly Boards" plaza board to its left. Walking up to it opens City Board → Prize Pools.
- **Board rows:** Top Farmer, Top Business, Meme Brawl, Street Sniffer, Kibble Chomp, Inu Score.
  - Top Farmer / Top Business: the in-game Bones pools from this town's sim, labelled as such.
  - Meme Brawl / Street Sniffer / Kibble Chomp: the leader and entry count come from `/api/game?action=scores&game=<id>&pool=weekly`. kibble-pay keeps one shared weekly $KIBBLE pool, not one per game, so the pool figure shows "not available".
  - Inu Score: players and leader from `/api/inu-score?board=1`. Its pool figure also shows "not available".
- **Shared weekly pool:** `/api/pools` → `pools.weekly.accruedBaseUnits`.
- **Wallet:** "Kennel Chest", with a short address and a Solscan link from `prize.prizeWallet`. If that is missing it falls back to the wallets.js constant.
- **Last updated:** shown in Sydney time. The cache lasts 60 s.
- **Failed sources** show "not available", never a number. Tests ban gambling words.

## Login streaks (src/loginstreak.js, src/streakui.js, src/streakart.js; server: kibble-pay api/_lib/loginstreak.js)
- **Days** are Australia/Sydney calendar days, midnight to midnight.
- **Signed in with a wallet:** `POST kibble-pay /api/game?action=streak` needs a SIWS Bearer session, and the wallet comes from the token. The server rules:
  - It counts once per wallet per Sydney day, using server time. The client sends no date.
  - There is a 10 s per-wallet rate limit.
  - A missed day restarts the count at 1.
  - The record is also kept in the save, which syncs to the wallet cloud save.
- **No wallet:** "Device-only". The streak is counted on this device's clock and labelled that way on the HUD chip, the profile card and the Streak tab.
- **Migration.** The old device streak (fly5 `streak.count`, counted in in-game days) carries over once.
  - It is capped at the real Sydney days since 15 Oct 2026, when that streak launched. The server applies the same cap once per wallet.
  - Example: 12 in-game days → 5 real days on 19 Oct.
- **Rewards** are cosmetic pins only, with original pixel art: 7 Bronze Paw, 30 Silver Bone, 90 Golden Sun, 180 Sakura Crown. You can wear one on your Shiba (in the world), and it shows on the profile card and the HUD chip. They give no Bones and no $KIBBLE.
- **Pins count wallet-verified days only** (President Inu's rule): the wallet's pins are exactly the list kibble-pay returns for that wallet. A device-only streak still counts and shows on the device, labelled "device-only", but earns no pins; pins a device earned before this rule stay on that device as device-only and never carry over onto a wallet. The one-time capped migration is unchanged, and so is the in-game daily Bones claim.
- **The in-game daily Bones claim** (fly5, one per in-game day) is unchanged. It is shown separately in the Streak tab.
