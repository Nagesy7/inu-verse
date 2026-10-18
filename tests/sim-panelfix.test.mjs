// Minor fix (a): on phones the kibble-pay Connect Wallet pill hides while a panel/overlay is open, and only then.
import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
test('style.css hides only #inu-wallet-btn, only while #panel/#places/#mapfull are open, only on touch/short screens', () => { const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  const rule = css.match(/@media \(pointer:coarse\),\(max-height:500px\)\{([^{}]*inu-wallet-btn[^{}]*)\{visibility:hidden;pointer-events:none\}\}/); assert.ok(rule, 'rule present');
  for (const o of ['#panel', '#places', '#mapfull']) assert.ok(rule[1].includes(`body:has(${o}:not([hidden])) #inu-wallet-btn`), o); assert.ok(!/#inu-wallet[\s,{]/.test(rule[1]), 'pop-ups (inside #inu-wallet) are untouched'); });
