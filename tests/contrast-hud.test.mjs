// Contrast of the colours this milestone actually paints. Gold text on cream fails and is not used
// for drawer or HUD labels. Ratios are WCAG relative luminance, checked here rather than taken from the spec.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

function lin(c) {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrast(a, b) {
  const L1 = lum(a), L2 = lum(b);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

test('drawer and HUD text pairs clear AA and gold is not the cream-panel text', () => {
  const pairs = [
    ['#f6e7b8', '#121a36', 'cream on navy HUD'],
    ['#3f2715', '#fff6e4', 'brown on cream drawer'],
    ['#5d3a1a', '#fff6e4', 'header brown on cream'],
    ['#0c1022', '#d4a640', 'ink on gold wallet button'],
  ];
  for (const [fg, bg, name] of pairs) assert.ok(contrast(fg, bg) >= 4.5, `${name} ${contrast(fg, bg).toFixed(2)}`);
  assert.ok(contrast('#d4a640', '#fff6e4') < 3, 'gold on cream must stay unused');
  assert.match(css, /#drawer \.dr-card\{background:#fff6e4;color:#3f2715/);
  assert.match(css, /#drawer \.dr-head,#drawer h4\{color:#5d3a1a\}/);
  assert.doesNotMatch(css, /#drawer \.dr-card\{[^}]*color:var\(--gold/);
  assert.match(css, /#drawer \.dr-zoom small\{[^}]*color:#5d3a1a\}/);
});

test('onboarding stays the existing 18 steps', () => {
  const g = readFileSync(new URL('../src/guide.js', import.meta.url), 'utf8');
  const block = g.slice(g.indexOf('export const TOUR'), g.indexOf('export function stepPlace'));
  assert.equal((block.match(/title:/g) || []).length, 18);
});
