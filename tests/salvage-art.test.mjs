import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SALVAGE_DRAW, SALVAGE_ART_FILES, GROVE_ART_FILES, salvageSheet, carryingSalvage, binFleck } from '../src/groveview.js';
import { seedGrove } from '../src/grove.js';

const HASH = {
  'ume-lantern-broken.png': '9cb6c58d1feccdf4bef64076f8e4dd9ac5099fbb4ba43745091990d800ee1e18',
  'ume-lantern-fixed.png': 'a4d25ffd1b598f6f',
  'ume-lantern-placed.png': '79581dbb040073f3',
  'riku-crate-broken.png': 'd2a5e41bf41828ae',
  'riku-crate-fixed.png': '5b3baa2d930afabd',
  'riku-crate-placed.png': '819f7dde4d2325ab',
  'koko-cushion-broken.png': '63eabfa124a79d17',
  'koko-cushion-fixed.png': '069e36f818b1c1a6',
  'koko-cushion-placed.png': '12bb4b4522b22113',
  'scrap-bin.png': 'f63046f786e818f4',
};

test('salvage sheets follow state and stay hidden while carried or scrapped', () => {
  const s = seedGrove();
  const lantern = s.salvage.items[0];
  const crate = s.salvage.items[1];
  const cushion = s.salvage.items[2];
  lantern.state = 'incoming';
  assert.equal(salvageSheet(lantern, false), 'ume-lantern-broken');
  lantern.state = 'broken';
  assert.equal(salvageSheet(lantern, false), 'ume-lantern-broken');
  lantern.state = 'restored';
  assert.equal(salvageSheet(lantern, false), 'ume-lantern-fixed');
  s.salvageJob = { itemId: lantern.id, phase: 'carry', kind: 'donate' };
  assert.equal(carryingSalvage(s, lantern), true);
  assert.equal(salvageSheet(lantern, true), null);
  crate.state = 'delivered';
  assert.equal(salvageSheet(crate, false), 'riku-crate-placed');
  cushion.state = 'donated';
  assert.equal(salvageSheet(cushion, false), 'koko-cushion-placed');
  cushion.state = 'scrapped';
  assert.equal(salvageSheet(cushion, false), null);
  assert.equal(SALVAGE_DRAW.world[0], 32);
  assert.equal(SALVAGE_DRAW.world[1], 24);
  assert.equal(SALVAGE_DRAW.scale, 2);
  assert.equal(SALVAGE_DRAW.placedNudge.gift, 20);
  assert.equal(SALVAGE_DRAW.placedNudge.shed, 28);
  assert.equal(SALVAGE_DRAW.placedNudge.porch, 28);
  assert.equal(SALVAGE_DRAW.placedSortAhead, 1);
  assert.match(fs.readFileSync('src/groveview.js', 'utf8'), /\$\{NOTE\} · \$\{SCRIP\}/);
  assert.equal(GROVE_ART_FILES.length, 13);
  assert.equal(SALVAGE_ART_FILES.length, 10);
});

test('the bin fleck stays tied to the stool scrap, not a salvage item', () => {
  const s = seedGrove();
  assert.equal(binFleck(s), false);
  s.salvage.items[0].state = 'scrapped';
  s.salvage.items[0].scrapped = 1;
  assert.equal(binFleck(s), false);
  s.scrap = 1;
  assert.equal(binFleck(s), true);
  s.scrap = 0;
  s.stool.state = 'scrapped';
  assert.equal(binFleck(s), true);
});

test('the ten salvage pngs are 16 by 12 and match the studio hashes', async () => {
  const { createHash } = await import('node:crypto');
  for (const name of SALVAGE_ART_FILES) {
    const buf = fs.readFileSync(`assets/grove/${name}.png`);
    assert.equal(buf.readUInt32BE(16), 16, name);
    assert.equal(buf.readUInt32BE(20), 12, name);
    const hash = createHash('sha256').update(buf).digest('hex');
    const expect = HASH[`${name}.png`];
    assert.ok(hash.startsWith(expect), `${name} ${hash}`);
  }
});
