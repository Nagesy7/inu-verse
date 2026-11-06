import { test } from 'node:test'; import assert from 'node:assert'; import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
test('740x360: minimap shrinks under max-height 370 so it clears the A button', () => {
  assert.match(css, /@media \(orientation:landscape\) and \(max-height:370px\)\{body\.mm-on\.inworld #minimap\{width:72px;height:79px\}\}/);
});
test('phone landscape: chat bar starts right of the legal footer (left >= 200px, no centring transform)', () => {
  const mp = readFileSync(new URL('../src/multiplayer.js', import.meta.url), 'utf8');
  assert.match(mp, /@media \(max-height:500px\)\{#mp-chat\{width:min\(380px,calc\(100vw - 350px\)\);left:max\(200px,calc\(50% - 190px\)\);transform:none;/);
});

test('phone landscape 430px and shorter: explainer / growth cards shrink so they stay readable', () => {
  assert.match(css, /@media \(orientation:landscape\) and \(max-height:430px\)\{/);
  assert.match(css, /\.explain-card p/);
  assert.match(css, /body\.short \.explain-card p/);
});
