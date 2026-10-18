// Stream reveal (/reveal): fixed published manifest, hash-checked, schedule first, step-by-step, never random.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto';
import * as RV from '../src/reveal.js';
import { bannedIn } from '../src/kibblemood.js';
const M = JSON.parse(fs.readFileSync('reveal/manifest.json', 'utf8')), H = fs.readFileSync('reveal/manifest.sha256', 'utf8').trim();
test('published hash matches the items (node crypto and the page\'s WebCrypto path agree)', async () => {
  const canon = RV.canonicalItems(M.items); assert.equal(crypto.createHash('sha256').update(canon).digest('hex'), H); assert.equal(await RV.sha256Hex(canon, crypto.webcrypto.subtle), H);
  const tampered = structuredClone(M.items); tampered[0].name = 'Other'; assert.notEqual(await RV.sha256Hex(RV.canonicalItems(tampered), crypto.webcrypto.subtle), H); });
test('manifest is valid: steps in order, every item is a real Inu Verse cosmetic with its in-game name', () => {
  assert.deepEqual(RV.checkManifest(M), []); assert.ok(RV.checkManifest({ v: 1, items: [{ step: 2, id: 'nope', name: 'x' }] }).length >= 2); });
test('schedule first, then one reveal per step; order is only the manifest order; no randomness anywhere', () => {
  const v0 = RV.viewModel(M, 0); assert.equal(v0.cards.filter((c) => c.revealed).length, 0); assert.deepEqual(v0.cards.map((c) => c.id), M.items.map((i) => i.id));
  const v3 = RV.viewModel(M, 3, '2026-10-20T19:00:00+11:00'); assert.deepEqual(v3.cards.map((c) => c.revealed), M.items.map((_, i) => i < 3)); assert.equal(v3.cards[2].current, true);
  assert.equal(v3.cards[1].at - v3.cards[0].at, M.intervalMin * 60_000); assert.equal(RV.viewModel(M, 1).cards[0].at, null, 'no invented stream time');
  assert.equal(RV.clampStep(99, M), M.items.length); assert.equal(RV.clampStep(-3, M), 0); assert.equal(RV.clampStep('x', M), 0);
  for (const f of ['src/reveal.js', 'reveal/index.html']) assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /Math\.random|crypto\.getRandomValues|shuffle/i, f);
  assert.deepEqual(bannedIn(JSON.stringify(M) + fs.readFileSync('reveal/index.html', 'utf8').replace(/<style>[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, '')), []); });
test('OBS-friendly page: big type, chroma/clear background options, keyboard stepping, help can hide', () => {
  const h = fs.readFileSync('reveal/index.html', 'utf8'); for (const k of ['obs-green', 'obs-clear', 'ArrowRight'.toLowerCase(), 'nohelp', 'min(5.4vw,10vh)']) assert.ok(h.includes(k), k); });
