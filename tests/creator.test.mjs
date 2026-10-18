import test from 'node:test'; import assert from 'node:assert/strict';
const { newGame } = await import('../src/game.js'); const C = await import('../src/creator.js'); const P = await import('../src/profile.js');
const { ensureFarm, tickFarm } = await import('../src/farm.js'); const { ensureJobs, finishJob } = await import('../src/jobs.js'); const REL = await import('../src/relations.js');
const deps = { ensureFarm, ensureJobs, ensureRel: REL.ensureRel };
const mk = (ch) => C.applyCreation(newGame({ name: 'T' }), { ...C.defaultChoices(), ...ch }, deps);
test('creator applies look, pronouns, trait, outfit, home and path', () => { const s = mk({ coat: '#3a2a22', pattern: 'mask', ears: 'floppy', tail: 'fluffy', markings: 'heart', size: 'large', eyeShape: 'sparkle', pronouns: 'she/her', trait: 'greenpaw', outfit: 'smart', home: 'farmhouse', path: 'farmer' });
  assert.equal(s.player.look.ears, 'floppy'); assert.equal(s.player.coat, 'dark'); assert.equal(s.player.pronouns, 'she/her'); assert.equal(s.wardrobe.equipped.top, 'suit_navy'); assert.ok(s.plots.p1 && s.plots.p1.style === 'farmhouse');
  assert.equal(s.farm.seeds.turnip, 10); assert.equal(s.farm.inv.egg, 2); const b = mk({ path: 'shopkeeper' }); assert.equal(b.bones, newGame({}).bones + 250); assert.equal(mk({ path: 'socialite' }).giftInv.bouquet, 2); assert.equal(mk({ path: 'worker' }).wardrobe.equipped.hat, 'cap_red');
  const bad = mk({ ears: 'wings', trait: 'cheater', home: 'castle' }); assert.equal(bad.player.look.ears, 'pointy'); assert.equal(bad.player.trait, 'hardworker'); assert.ok(bad.plots.p2); });
test('traits give small perks: job pay, crops, hearts, sales', () => {
  const hw = mk({ trait: 'hardworker' }), ch = mk({ trait: 'charmer' }); assert.ok(finishJob(hw, 'sweeper', { score: 60, maxCombo: 0 }, 0).perf > finishJob(ch, 'sweeper', { score: 60, maxCombo: 0 }, 0).perf);
  const gp = mk({ trait: 'greenpaw' }), ot = mk({ trait: 'hustler' }); for (const s of [gp, ot]) { s.farm.fields[0] = { crop: 'turnip', grown: 0, watered: 999 }; tickFarm(s, 30, { season: 'spring', rain: false }); } assert.ok(gp.farm.fields[0].grown > ot.farm.fields[0].grown);
  REL.ensureRel(ch); REL.ensureRel(hw); const n = Object.keys(ch.rel)[0]; REL.chat(ch, n, 1); REL.chat(hw, n, 1); assert.ok(ch.rel[n].pts > hw.rel[n].pts); });
test('legacy saves keep their look; salon restyle costs bones', () => { const old = newGame({ name: 'Old', coat: 'red' }); assert.equal(P.hasCustomLook(old), false); old.bones = 50; assert.equal(C.restyle(old, { coat: '#ffffff' }).ok, false); assert.equal(P.hasCustomLook(old), false);
  old.bones = 500; assert.ok(C.restyle(old, { coat: '#ffffff', tail: 'bob', name: 'Neo' }).ok); assert.equal(old.bones, 500 - C.SALON_PRICE); assert.equal(old.player.look.tail, 'bob'); assert.equal(old.player.name, 'Neo'); });
test('shared profile: versioned, wallet-keyed, outfit slots self-describing, local store round-trip', async () => { const s = mk({ outfit: 'street', trait: 'charmer' }); const p = P.profileFromState(s);
  assert.equal(p.v, 1); assert.ok(p.wallet); assert.equal(p.outfit.top.id, 'jacket_black'); assert.ok(p.outfit.top.c); assert.equal(p.trait, 'charmer');
  const mem = new Map(), ls = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) }; const st = P.localProfileStore(ls); await st.put(p); const back = await st.get(p.wallet); assert.equal(back.look.coat, p.look.coat); assert.ok([...mem.keys()][0].startsWith('inu.profile.v1:'));
  const kp = { signedIn: true, saved: null, async getProfile() { return this.saved; }, async saveProfile(x) { this.saved = { ...x, server: true }; return this.saved; } }; const ks = P.kibblePayProfileStore(kp, st); const r = await ks.put(p); assert.equal(r.server, true);
  // signed out: a background profile save stays local and never starts a Phantom sign-in (no unprompted sign request)
  let calls = 0; const out = { signedIn: false, async saveProfile() { calls++; throw new Error('would open Phantom'); } }; const r2 = await P.kibblePayProfileStore(out, st).put(p);
  assert.equal(calls, 0); assert.equal(r2.server, undefined); assert.equal((await st.get(p.wallet)).look.coat, p.look.coat); });
