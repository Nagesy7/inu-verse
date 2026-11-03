import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// regression: a trailing // comment once swallowed the prompt-hide + keys.clear() in openPanel
test('openPanel still hides the prompt and clears held keys (no code after a // comment)', () => {
  const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const line = src.split('\n').find((l) => l.startsWith('function openPanel('));
  const i = src.indexOf(line), body = src.slice(i, i + 600).split('\n')[1];
  const code = body.replace(/\/\*.*?\*\//g, '').split('//')[0];
  assert.match(code, /\$\('#prompt'\)\.hidden = true;/);
  assert.match(code, /keys\.clear\(\);/);
  assert.match(code, /mpPop\.hidden = true/);
});
