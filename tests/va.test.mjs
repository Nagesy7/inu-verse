import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanProps, withRef, track } from '../src/va.js';

const W = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
test('va: no wallets, CAs or free text in events', () => {
  assert.deepEqual(cleanProps({ door: 'kibblepay', via: 'walk', wallet: W, coin: W, name: 'Bob', from: 'a b <c>', n: 3 }), { door: 'kibblepay', via: 'walk', n: 3 });
});
test('va: UTM refs go before the hash', () => {
  assert.equal(withRef('https://cabal-meme-maker.vercel.app/', 'launch-hall') + '#leaderboard',
    'https://cabal-meme-maker.vercel.app/?utm_source=inu-verse&utm_medium=launch-hall&utm_campaign=funnel#leaderboard');
});
test('va: track is a no-op without window.va and sends clean data with it', () => {
  track('x', { a: 1 });
  const calls = []; globalThis.window = { va: (...a) => calls.push(a) };
  track('game_door', { door: 'kibblepay', wallet: W });
  delete globalThis.window;
  assert.deepEqual(calls, [['event', { name: 'game_door', data: { door: 'kibblepay' } }]]);
});
