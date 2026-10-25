import test from 'node:test'; import assert from 'node:assert/strict';
import { originAllowed, applyCors } from '../api/_lib/cors.js';
import fs from 'node:fs';

test('hub + local origins allowed; random denied', () => {
  assert.equal(originAllowed('https://kibble-pay.vercel.app'), true);
  assert.equal(originAllowed('https://kibble-pay-abc123.vercel.app'), true);
  assert.equal(originAllowed('https://inu-verse-tawny.vercel.app'), true);
  assert.equal(originAllowed('http://localhost:5173'), true);
  assert.equal(originAllowed('https://evil.example'), false);
});

test('OPTIONS preflight answered with ACAO', async () => {
  const res = { headers: {}, statusCode: 0, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end() { this.ended = true; } };
  const done = applyCors({ method: 'OPTIONS', headers: { origin: 'https://kibble-pay.vercel.app' } }, res);
  assert.equal(done, true); assert.equal(res.statusCode, 204);
  assert.equal(res.headers['access-control-allow-origin'], 'https://kibble-pay.vercel.app');
});

test('hall.html + hallmain.js exist', () => {
  assert.ok(fs.existsSync('hall.html'));
  assert.ok(fs.existsSync('src/hallmain.js'));
  assert.match(fs.readFileSync('src/hallmain.js', 'utf8'), /bootHall/);
  assert.match(fs.readFileSync('src/launchui.js', 'utf8'), /apiBase/);
});
