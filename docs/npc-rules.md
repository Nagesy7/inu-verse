# Inu Verse NPC rules: the $KIBBLE town mood

Source of truth: `src/npcvoices.js` (RULES, VOICES). In game: tap the Kibble statue or The Daily Bone, then **How the town talks**. Tests: `tests/npcvoices.test.mjs` keeps this file, the in-game card and the code in sync and bans market talk.

## Rules

1. **One town mood.** Every NPC reacts to the same live $KIBBLE town mood (Zoomies, Happy, Chill, Grumpy, Doghouse). It changes only after two readings in a row agree, so it never flickers.
2. **Own voice.** Each pup has a personality and its own lines for every mood. The town's official mood lines are shared out, one per pup.
3. **Daily line cap.** Each pup says at most its daily cap of mood lines per calendar day (Mochi 4, Kuro 2, Hana 3, Taro 5, Yuzu 3, Goma 2), and at most one per visit. After that they go back to ordinary small talk.
4. **The crier.** Crier Barkley announces a mood change once. He does not repeat it when you come back.
5. **No market talk.** Nobody in town tells you to trade, promises prices, or gives price levels. Mood is weather, not advice. Not financial advice.
6. **Preview.** Adding ?mood=happy (or another mood) to the address previews a mood. It is labelled preview and is not live data.

## The pups

| NPC | Voice | Daily cap | Style |
|---|---|---|---|
| Mochi | Bubbly snack-lover | 4 | Talks fast, loves treats, ends most sentences with a bark of joy. |
| Kuro | Stoic night watcher | 2 | Few words, calm and dry. Never hurries, never panics. |
| Hana | Gentle garden poet | 3 | Speaks softly in little images: petals, clouds, tea. |
| Taro | Pun-loving joker | 5 | Cannot resist a dog pun. Groans are a compliment. |
| Yuzu | Peppy fitness coach | 3 | Turns everything into a walk, a stretch or a game of fetch. |
| Goma | Sleepy old-timer | 2 | Has seen it all, tells you so, then dozes off mid-story. |
| Crier Barkley | Town crier | one per mood change | Rings his bell and calls out the town mood, once per mood change. Never repeats himself on a page visit. |

## Line pools

Each pup has three of its own lines per mood plus one of the official mood lines from the brief (dealt out in NPC order, so every official line is still used). A pup never says the same line twice in a row.

## Banned in all town copy

buy, sell/sold, "pump it", moon, dump, price levels or targets (for example a dollar figure or a multiple), guarantees and profit talk. Enforced by `tests/kibblemood.test.mjs` and `tests/npcvoices.test.mjs`.

## Daily cap details

- Counted per pup per calendar day on the player's device (localStorage key `inuverse.npc.lines`).
- Also at most one mood line per pup per visit (page load).
- When a pup hits its cap it goes back to ordinary small talk (weather, time of day), never more mood lines.

Not financial advice. The town mood is for fun only.
