// ทดสอบ API โดยจำลอง LINE Platform (ไม่ต้องมีบัญชี LINE จริง) — รัน: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.LOT_SECRET = 'test-secret';
process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test-token';
process.env.LINE_CHANNEL_SECRET = 'channel-secret';
process.env.LINE_LOGIN_CHANNEL_ID = '1234';
process.env.TECH_USER_ID = 'Utech';

const calls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  if (!url.startsWith('https://api.line.me')) return realFetch(url, opts);
  calls.push({ url, body: opts.body });
  if (url.endsWith('/oauth2/v2.1/verify')) {
    const idToken = new URLSearchParams(opts.body).get('id_token');
    return idToken === 'good' ? Response.json({ sub: 'Ufarmer', name: 'สมชาย ใจดี' }) : new Response('bad', { status: 400 });
  }
  return Response.json({});
};

const { POST: createLot } = await import('../api/lots.js');
const { POST: scan } = await import('../api/scan.js');
const { POST: receipt } = await import('../api/receipt.js');
const { POST: webhook } = await import('../api/webhook.js');
const { DELETE: eraseMe } = await import('../api/me.js');
const { GET: stats } = await import('../api/stats.js');
const { POST: maintenance } = await import('../api/maintenance.js');
const { GET: qr } = await import('../api/qr.js');
const { needsFlush, settle, maskName } = await import('../shared/rules.js');

const req = (path, data, headers = {}) =>
  new Request(`https://rmp.test/api/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(data) });
const lotBody = { residue: 'corn_cob', estKg: 100, village: 'บ้านห้วยไคร้', purpose: 'sell', slot: new Date().toISOString(), consentAt: new Date().toISOString() };

beforeEach(() => {
  calls.length = 0;
});

test('ต้องยินยอม PDPA และยืนยันตัวตนก่อนลงทะเบียน', async () => {
  assert.equal((await createLot(req('lots', { ...lotBody, consentAt: undefined, demo: true }))).status, 403);
  assert.equal((await createLot(req('lots', lotBody))).status, 401);
  assert.equal((await createLot(req('lots', { ...lotBody, idToken: 'bad' }))).status, 401);
  assert.equal((await createLot(req('lots', { ...lotBody, estKg: -5, demo: true }))).status, 400);
});

test('ลงทะเบียนผ่าน LINE → push QR เข้าแชต และ QR ไม่มี userId ที่อ่านได้', async () => {
  const res = await createLot(req('lots', { ...lotBody, idToken: 'good' }));
  const out = await res.json();
  assert.equal(res.status, 200);
  assert.equal(out.pushed, true);
  assert.equal(out.lot.name, 'สมชาย ใ.');
  assert.ok(!Buffer.from(out.token, 'base64url').toString('latin1').includes('Ufarmer'));
  const pushCall = calls.find((c) => c.url.endsWith('/message/push'));
  const msg = JSON.parse(pushCall.body);
  assert.equal(msg.to, 'Ufarmer');
  assert.match(msg.messages[0].contents.hero.url, /^https:\/\/rmp\.test\/api\/qr\?t=/);
  const png = await qr(new Request(msg.messages[0].contents.hero.url));
  assert.equal(png.headers.get('content-type'), 'image/png');
});

test('ตู้สแกน → แปรรูป → ส่งใบรับของเข้า LINE; กันซ้ำและกันความชื้นเกิน', async () => {
  const { token } = await (await createLot(req('lots', { ...lotBody, idToken: 'good' }))).json();
  const { lot } = await (await scan(req('scan', { token }))).json();
  assert.ok(lot.receivedKg > 90 && lot.receivedKg < 110);
  assert.equal(lot.uid, undefined);

  const wet = await receipt(req('receipt', { token, mode: 'chop', moisture: 25, outputKg: 50 }));
  assert.equal(wet.status, 422);
  const tooHeavy = await receipt(req('receipt', { token, mode: 'chop', moisture: 12, outputKg: lot.receivedKg + 1 }));
  assert.equal(tooHeavy.status, 400);

  calls.length = 0;
  const ok = await receipt(req('receipt', { token, mode: 'pellet', pelletType: 'feed', moisture: 12, outputKg: lot.receivedKg * 0.85 }));
  const out = await ok.json();
  assert.equal(ok.status, 200);
  assert.equal(out.pushed, true);
  assert.equal(out.job.amount, Math.round(lot.receivedKg * 1.0 * 100) / 100);
  assert.equal(JSON.parse(calls[0].body).to, 'Ufarmer');

  assert.equal((await receipt(req('receipt', { token, mode: 'chop', moisture: 12, outputKg: 10 }))).status, 409);
  assert.equal((await scan(req('scan', { token: token.slice(0, -2) + 'xx' }))).status, 404);
});

test('ล็อตทดลองไม่ส่งข้อความ LINE', async () => {
  const { token, pushed } = await (await createLot(req('lots', { ...lotBody, demo: true, purpose: 'self', wantMode: 'briquette' }))).json();
  assert.equal(pushed, false);
  const out = await (await receipt(req('receipt', { token, mode: 'briquette', moisture: 14, outputKg: 70 }))).json();
  assert.equal(out.pushed, false);
  assert.ok(out.job.amount < 0); // รับกลับเอง = จ่ายค่าบริการ
  assert.equal(calls.filter((c) => c.url.includes('/message/')).length, 0);
});

test('Dashboard ไม่เปิดเผย owner/userId และลบข้อมูลตามคำขอได้', async () => {
  const before = await (await stats()).json();
  assert.ok(before.jobs.length > 0);
  assert.ok(before.jobs.every((j) => !('owner' in j)));
  assert.ok(!JSON.stringify(before).includes('Ufarmer'));
  const del = await (await eraseMe(new Request('https://rmp.test/api/me', { method: 'DELETE', body: JSON.stringify({ idToken: 'good' }) }))).json();
  assert.ok(del.deleted.lots >= 1 && del.deleted.jobs >= 1);
  const after = await (await stats()).json();
  assert.ok(after.jobs.every((j) => j.demo));
});

test('webhook ตรวจลายเซ็น และตอบกลับ', async () => {
  const raw = JSON.stringify({ events: [{ type: 'message', replyToken: 'r1', message: { type: 'text', text: 'ราคา' } }] });
  const bad = await webhook(new Request('https://rmp.test/api/webhook', { method: 'POST', body: raw, headers: { 'x-line-signature': 'nope' } }));
  assert.equal(bad.status, 401);
  const sig = crypto.createHmac('sha256', 'channel-secret').update(raw).digest('base64');
  const ok = await webhook(new Request('https://rmp.test/api/webhook', { method: 'POST', body: raw, headers: { 'x-line-signature': sig } }));
  assert.equal(ok.status, 200);
  const r = JSON.parse(calls.find((c) => c.url.endsWith('/message/reply')).body);
  assert.match(r.messages[0].text, /ราคารับซื้อ/);
});

test('แจ้งช่างผ่าน LINE', async () => {
  const res = await maintenance(req('maintenance', { machineId: 'RMP-01', hours: 190 }));
  assert.equal(res.status, 200);
  assert.equal(JSON.parse(calls.at(-1).body).to, 'Utech');
});

test('กติกาธุรกิจ', () => {
  assert.deepEqual(settle({ mode: 'chop', purpose: 'self', inputKg: 100, outputKg: 95 }), { amount: -30, savedKg: 100, pm25g: 800, yieldPct: 95 });
  assert.equal(needsFlush({ mode: 'briquette' }, { mode: 'pellet', pelletType: 'feed' }), true);
  assert.equal(needsFlush({ mode: 'pellet', pelletType: 'feed' }, { mode: 'pellet', pelletType: 'fuel' }), false);
  assert.equal(maskName('สมชาย ใจดี'), 'สมชาย ใ.');
});
