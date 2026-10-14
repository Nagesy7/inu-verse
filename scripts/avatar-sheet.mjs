import { chromium } from 'playwright';
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 900, height: 420 } }); await p.goto(process.env.URL || 'http://localhost:8643/');
await p.evaluate(async () => { const { drawInuAvatar } = await import('/src/vendor/inu-avatar.js'); document.body.innerHTML = '<canvas id=c width=900 height=420 style="background:#24305c"></canvas>'; const c = document.getElementById('c').getContext('2d');
  const looks = [{}, { coat: '#3a2a22', pattern: 'mask', markings: 'star', ears: 'floppy', tail: 'fluffy', eyeShape: 'sparkle', eyeColor: '#3a6ad8' }, { coat: '#ffffff', pattern: 'spots', ears: 'tall', tail: 'straight', markings: 'heart', size: 'small' }, { coat: '#d9673a', pattern: 'saddle', ears: 'folded', tail: 'bob', eyeShape: 'sleepy', markings: 'blaze', size: 'large' }];
  const outfit = { top: { id: 'jacket_black', kind: 'jacket', c: '#202026', accent: '#e3b341' }, hat: { id: 'cap_red', kind: 'cap', c: '#c8282e' } };
  looks.forEach((L, i) => ['down', 'right', 'up', 'left'].forEach((f, j) => drawInuAvatar(c, { look: L, outfit: i % 2 ? outfit : {} }, 60 + j * 55 + (i % 2) * 450, 190 + Math.floor(i / 2) * 200, { scale: 2.5, face: f }))); });
await p.screenshot({ path: '' + (process.env.OUT || 'proof/avatar-sheet.png') + '' }); await b.close();
