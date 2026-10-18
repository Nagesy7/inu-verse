// President's Office treasury wording: the 'simulated — demo KIBBLE only' line only in ?demo=1; live wording says where real
// purchases go and that the office itself moves nothing (it's an information page). No 'no real money' wording.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'fs';
import { officeTreasuryNote, officeLedgerNote, OWNER_WALLET } from '../src/mall.js';
test('demo line only in demo mode; live wording is accurate', () => {
  assert.match(officeTreasuryNote(true), /simulated — demo KIBBLE only, no on-chain transfers/);
  const live = officeTreasuryNote(false); assert.doesNotMatch(live, /simulated|demo|no on-chain|no real money|not real/i);
  assert.match(live, /\$KIBBLE is live/); assert.match(live, /Phantom/); assert.match(live, /kibble-pay/); assert.match(live, /does not send or move any funds/);
  assert.equal(officeLedgerNote(true), null); assert.match(officeLedgerNote(false), /kibble-pay server ledger/);
  const main = fs.readFileSync('src/main.js', 'utf8'); assert.ok(!main.includes('(simulated — demo KIBBLE only, no on-chain transfers)'), 'no hard-coded demo line in the panel'); assert.match(main, /officeTreasuryNote\(DEMO\)/);
  assert.doesNotMatch(main, /no real money/i);
});
test('the treasury shown is the one kibble-pay pays into (mainnet config)', () => {
  const p = '/workspace/kibble-pay/config/mainnet.json'; if (!fs.existsSync(p)) return; assert.equal(JSON.parse(fs.readFileSync(p, 'utf8')).treasury.wallet, OWNER_WALLET);
});
