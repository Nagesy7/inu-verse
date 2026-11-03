import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const start = css.indexOf('/* HUD fix (phone landscape');
const block = css.slice(start, css.indexOf('\n}\n', start) + 3);
const rule = (sel) => { const i = block.indexOf(' ' + sel + '{'); assert.ok(i >= 0, 'missing rule ' + sel); return block.slice(i, block.indexOf('}', i)); };
const px = (s, re) => { const m = s.match(re); assert.ok(m, 'no match ' + re); return +m[1]; };
// phone landscape geometry (844x390): prompt sits at safe-top + 54px on coarse screens, ~42px tall; HUD row ends at ~52px;
// joystick / A-B pad occupy the bottom 150px.
const W = 844, H = 390, PROMPT_TOP = 8 + 54, PROMPT_H = 42, PAD_TOP = H - 150;

test('hud fix block targets phone landscape only', () => {
  assert.ok(start > 0);
  assert.match(block, /@media \(orientation:landscape\) and \(max-height:500px\)\{/);
});

test('ticker drops below the prompt row and its list stays above the stick', () => {
  const r = rule('body.inworld #feed-tick');
  const top = 8 + px(r, /\+ (\d+)px\)!important/);
  assert.ok(top >= PROMPT_TOP + PROMPT_H - 8, 'ticker top ' + top + ' must clear prompt');
  const list = rule('body.inworld #feed-tick .ft-list');
  const maxH = H - px(list, /100vh - (\d+)px/) - 36 - 150;
  assert.ok(top + 36 + maxH <= PAD_TOP + 8, 'ticker list must stay above the joystick');
  assert.ok(px(r, /min\((\d+)px/) <= 224, 'ticker narrow enough to leave the centre to toasts');
});

test('toasts sit below the prompt, between ticker and wallet, newest 2 only', () => {
  const r = rule('body.inworld #toast');
  assert.ok(8 + px(r, /\+ (\d+)px\)/) >= PROMPT_TOP + PROMPT_H - 8);
  const side = Math.max(px(r, /max\((\d+)px,24vw/), 0.24 * W + 24);
  assert.ok(side >= 224 && W - side <= 676, 'toast column clears ticker (left) and wallet/action pad (right)');
  assert.match(block, /#toast \.toast:nth-last-child\(n\+3\)\{display:none\}/);
});

test('crier banner also moves off the prompt, and toasts step down while it shows', () => {
  const r = rule('body.inworld #crier-banner');
  assert.ok(8 + px(r, /\+ (\d+)px\)/) >= PROMPT_TOP + PROMPT_H - 8);
  assert.match(block, /:has\(#crier-banner\.show\) #toast\{top:calc\(max\(8px,env\(safe-area-inset-top\)\) \+ 156px\)\}/);
});
