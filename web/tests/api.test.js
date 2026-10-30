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
const { needsFlush, settle, maskName, MACHINE } = await import('../shared/rules.js');
const { POST: registerDriver, GET: driverInfo } = await import('../api/drivers.js');
const { GET: listPickups, POST: pickupAction } = await import('../api/pickups.js');

const req = (path, data, headers = {}) =>
  new Request(`https://rmp.test/api/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(data) });
const lotBody = { residue: 'corn', estKg: 100, village: 'บ้านห้วยไคร้', purpose: 'sell', slot: new Date().toISOString(), consentAt: new Date().toISOString() };

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
  assert.equal(r.messages[0].type, 'flex');
  assert.match(r.messages[0].altText, /ราคารับซื้อ/);
  assert.ok(r.messages[0].quickReply.items.length >= 3);
});

test('แจ้งช่างผ่าน LINE', async () => {
  const res = await maintenance(req('maintenance', { machineId: 'RMP-01', hours: 190 }));
  assert.equal(res.status, 200);
  assert.equal(JSON.parse(calls.at(-1).body).to, 'Utech');
});

test('กติกาธุรกิจ', () => {
  assert.deepEqual(settle({ mode: 'chop', purpose: 'self', inputKg: 100, outputKg: 95 }), { gross: -30, pickupFee: 0, driverEarn: 0, amount: -30, savedKg: 100, pm25g: 800, yieldPct: 95 });
  // ขายฟาง 200 กก. ชื้น 17% (ลด 10%) เรียกรถ 10 กม.: 200×1.2×0.9 = 216, ค่ารถ 20+40+20 = 80
  const s2 = settle({ residue: 'rice_straw', purpose: 'sell', inputKg: 200, moisture: 17, pickupKm: 10 });
  assert.equal(s2.gross, 216);
  assert.equal(s2.pickupFee, 80);
  assert.equal(s2.driverEarn, 72);
  assert.equal(s2.amount, 136);
  assert.equal(needsFlush({ mode: 'briquette' }, { mode: 'pellet', pelletType: 'feed' }), true);
  assert.equal(needsFlush({ mode: 'pellet', pelletType: 'feed' }, { mode: 'pellet', pelletType: 'fuel' }), false);
  assert.equal(maskName('สมชาย ใจดี'), 'สมชาย ใ.');
});


const near = { lat: MACHINE.lat + 0.03, lng: MACHINE.lng - 0.02 };
const pickupBody = { ...lotBody, estKg: 200, delivery: 'pickup', loc: near, landmark: 'หลังวัด', phone: '0811111111' };
const get = (path) => new Request(`https://rmp.test/api/${path}`);

test('เรียกรถ: ต้องมีพิกัดและเบอร์ และไม่เกินรัศมี', async () => {
  assert.equal((await createLot(req('lots', { ...pickupBody, demo: true, loc: null }))).status, 400);
  assert.equal((await createLot(req('lots', { ...pickupBody, demo: true, phone: '12' }))).status, 400);
  assert.equal((await createLot(req('lots', { ...pickupBody, demo: true, loc: { lat: 18.79, lng: 98.98 } }))).status, 400); // เชียงใหม่ ไกลเกิน
});

test('ระบบรับของแบบ Grab: แจ้งคนขับ → รับงาน (กันรับซ้ำ) → รับของ → ชั่งที่ตู้ → จ่ายเกษตรกรและคนขับ', async () => {
  // คนขับ 2 คน (คนแรกใช้ LINE จริง)
  const realFetchLine = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).endsWith('/oauth2/v2.1/verify') && new URLSearchParams(opts.body).get('id_token') === 'driver') return Response.json({ sub: 'Udriver', name: 'บุญมี ขับดี' });
    return realFetchLine(url, opts);
  };
  const d1 = await (await registerDriver(req('drivers', { idToken: 'driver', vehicle: 'pickup', plate: 'บข 1234', phone: '0899999999', consentAt: 'x' }))).json();
  const d2 = await (await registerDriver(req('drivers', { demo: true, name: 'คนขับสอง', vehicle: 'etan', plate: 'กก 1', phone: '0822222222', consentAt: 'x' }))).json();
  assert.equal((await registerDriver(req('drivers', { demo: true, vehicle: 'ufo', plate: 'x', phone: '0811111111', consentAt: 'x' }))).status, 400);

  calls.length = 0;
  const lotRes = await (await createLot(req('lots', { ...pickupBody, idToken: 'good' }))).json();
  assert.ok(lotRes.quote.pickupFee > 0 && lotRes.quote.amount < lotRes.quote.gross);
  const mc = calls.find((c) => c.url.endsWith('/message/multicast'));
  assert.ok(mc, 'ต้องแจ้งคนขับที่ใช้ LINE');
  assert.deepEqual(JSON.parse(mc.body).to, ['Udriver']);

  // รายการงานสาธารณะไม่มีพิกัดจริง/เบอร์/QR
  const open = (await (await listPickups(get(`pickups?lat=${near.lat}&lng=${near.lng}`))).json()).pickups;
  const job = open.find((p) => p.lotId === lotRes.lot.id);
  assert.ok(job && job.fromYouKm < 1);
  assert.ok(!JSON.stringify(open).includes('0811111111') && !('lotToken' in job) && !('loc' in job));

  calls.length = 0;
  const acc = await pickupAction(req('pickups', { action: 'accept', lotId: job.lotId, driverToken: d1.driverToken }));
  const accOut = await acc.json();
  assert.equal(acc.status, 200);
  assert.equal(accOut.farmerNotified, true);
  assert.equal(accOut.pickup.farmerPhone, '0811111111');
  assert.ok(accOut.pickup.lotToken);
  assert.equal(JSON.parse(calls.find((c) => JSON.parse(c.body).to === 'Ufarmer').body).messages[0].altText.startsWith('มีคนขับรับงานแล้ว'), true);
  assert.equal((await pickupAction(req('pickups', { action: 'accept', lotId: job.lotId, driverToken: d2.driverToken }))).status, 409);
  assert.equal((await pickupAction(req('pickups', { action: 'picked', lotId: job.lotId, driverToken: d2.driverToken }))).status, 403);
  assert.equal((await pickupAction(req('pickups', { action: 'picked', lotId: job.lotId, driverToken: d1.driverToken }))).status, 200);

  const status = (await (await listPickups(get(`pickups?lot=${job.lotId}`))).json()).pickup;
  assert.equal(status.status, 'picked');
  assert.equal(status.driver.plate, 'บข 1234');

  const { lot } = await (await scan(req('scan', { token: accOut.pickup.lotToken }))).json();
  assert.equal(lot.driver.plate, 'บข 1234');
  calls.length = 0;
  const rec = await (await receipt(req('receipt', { token: accOut.pickup.lotToken, mode: 'chop', moisture: 12, outputKg: lot.receivedKg * 0.9 }))).json();
  assert.ok(rec.job.pickupFee > 0);
  assert.equal(rec.job.amount, Math.round((rec.job.gross - rec.job.pickupFee) * 100) / 100);
  const to = calls.map((c) => JSON.parse(c.body).to);
  assert.deepEqual(to.sort(), ['Udriver', 'Ufarmer']);

  const info = await (await driverInfo(get(`drivers?token=${encodeURIComponent(d1.driverToken)}`))).json();
  assert.equal(info.earned, rec.job.driverEarn);
  assert.equal(info.jobs[0].farmerPhone, null); // งานจบแล้วไม่เปิดเบอร์อีก
  globalThis.fetch = realFetchLine;
});
