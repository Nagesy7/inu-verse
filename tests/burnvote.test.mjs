import test from 'node:test';
import assert from 'node:assert/strict';
import { voteNoticeHtml, DISCLAIMER } from '../src/burnvote.js';

test('vote notice html escapes and links hub', () => {
  const html = voteNoticeHtml({
    title: 'Next <script> classroom',
    leading: 'Theme A',
    sharePct: 40,
    softCapUi: '5000',
    maxVotes: 3,
    hub: 'https://kibble-pay.vercel.app/inu/tech#vote-sec',
    disclaimer: DISCLAIMER,
  });
  assert.match(html, /burn-to-vote/);
  assert.match(html, /Next &lt;script&gt; classroom/);
  assert.match(html, /kibble-pay\.vercel\.app\/inu\/tech#vote-sec/);
  assert.match(html, /Never redirects auto-burn/i);
});

test('empty notice is empty string', () => {
  assert.equal(voteNoticeHtml(null), '');
});
