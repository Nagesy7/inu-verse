import { test } from 'node:test'; import assert from 'node:assert'; import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
test('740x360: minimap shrinks under max-height 370 so it clears the A button', () => {
  assert.match(css, /@media \(orientation:landscape\) and \(max-height:370px\)\{body\.mm-on\.inworld #minimap\{width:72px;height:79px\}\}/);
});
