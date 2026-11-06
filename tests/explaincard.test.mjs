import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as X from '../src/explaincard.js';

const brief = readFileSync('/workspace/briefs/kibble-bones-vs-kibble-explainer-card-2026-10-29.md', 'utf8');

test('copy v1.1 matches the ship-ready brief (title, 3-sentence body, dismiss, tooltips, booth one-liner)', () => {
  assert.ok(brief.includes('**Status:** **ship-ready v1.1**'));
  assert.equal(X.TITLE, 'Bones & $KIBBLE');
  assert.ok(brief.includes(X.BODY));
  assert.ok(brief.includes('**Dismiss:** Got it'));
  assert.equal(X.DISMISS, 'Got it');
  assert.equal(X.DONT_SHOW, 'Don’t show again');
  assert.ok(brief.includes(X.BOOTH_LINE.replace('Bones (play money)', '**Bones** (play money)')));
  assert.equal(X.TOOLTIPS.bones, 'Play currency. Earn in Verse. Never cash out.');
  assert.equal(X.TOOLTIPS.kibble, 'Cosmetics only. You sign in your wallet. Not a prize boost.');
  assert.equal(X.TOOLTIPS.rent, 'Bones lease. Cosmetic only. Cabinets free.');
  assert.ok(brief.includes(X.TOOLTIPS.bones));
  assert.ok(brief.includes(X.TOOLTIPS.kibble));
  assert.ok(brief.includes(X.TOOLTIPS.rent));
});

test('card HTML is the primary card: footer Prize Rules · Terms, no swap CTA, optional booth one-liner', () => {
  const html = X.cardHtml();
  assert.match(html, /<h2>Bones &amp; \$KIBBLE<\/h2>/);
  assert.ok(html.includes(X.BODY.replace(/&/g, '&amp;')));
  assert.match(html, />Got it</);
  assert.match(html, /Don’t show again|Don.t show again/);
  assert.match(html, /prize-rules\.html/);
  assert.match(html, />Prize Rules</);
  assert.match(html, /terms\.html/);
  assert.match(html, />Terms</);
  assert.ok(!html.includes(X.BOOTH_LINE));
  assert.ok(!/swap|Demo only|buy now/i.test(html));
  const lease = X.cardHtml({ booth: true });
  assert.ok(lease.includes(X.BOOTH_LINE));
  for (const w of X.BANNED) {
    const hay = (X.BODY + X.BOOTH_LINE + X.TITLE + Object.values(X.TOOLTIPS).join(' ')).toLowerCase();
    if (w === 'cash out Bones') assert.ok(!hay.includes('cash out bones'));
    else assert.ok(!hay.includes(w.toLowerCase()), w);
  }
});

test('don’t-show-again is per save; bank first-open and first-lease are independent one-shots', () => {
  const s = {};
  assert.equal(X.shouldShow(s, 'bank'), true);
  assert.equal(X.shouldShow(s, 'lease'), true);
  X.dismiss(s, { place: 'bank' });
  assert.equal(X.shouldShow(s, 'bank'), false);
  assert.equal(X.shouldShow(s, 'lease'), true);
  X.dismiss(s, { place: 'lease', hideAgain: true });
  assert.equal(X.shouldShow(s, 'lease'), false);
  assert.equal(X.shouldShow(s, 'bank'), false);
  assert.equal(s.explainCard.hide, true);
});
