// POST /api/drivers  สมัครเป็นคนขับรับของ (คนในพื้นที่) → driverToken
// GET  /api/drivers?token=  ข้อมูลคนขับของตัวเอง + งานที่รับไว้
import crypto from 'node:crypto';
import { VEHICLES, maskName } from '../shared/rules.js';
import { body, fail, json } from './_lib/http.js';
import { verifyIdToken } from './_lib/line.js';
import { uidHash } from './_lib/lot.js';
import { PHONE_RE, driverView, getDriverByToken, getPickup, publicDriver, saveDriver } from './_lib/pickup.js';
import { listItems } from './_lib/store.js';
import { sealLot } from './_lib/token.js';

export async function GET(request) {
  const d = await getDriverByToken(new URL(request.url).searchParams.get('token'));
  if (!d) return fail('ไม่พบข้อมูลคนขับ', 404);
  const ids = await listItems('pickups', 300);
  const mine = [];
  for (const id of ids) {
    const p = await getPickup(id);
    if (p?.driver?.id === d.id) mine.push(['accepted', 'picked'].includes(p.status) ? driverView(p) : { ...driverView(p), loc: null, farmerPhone: null, lotToken: null });
  }
  const earned = mine.filter((p) => p.status === 'done').reduce((s, p) => s + p.driverEarn, 0);
  return json({ driver: publicDriver(d), jobs: mine, earned });
}

export async function POST(request) {
  const b = await body(request);
  if (!VEHICLES[b.vehicle]) return fail('กรุณาเลือกประเภทรถ');
  if (!PHONE_RE.test(String(b.phone || ''))) return fail('เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)');
  if (!String(b.plate || '').trim()) return fail('กรุณากรอกทะเบียนรถ');
  if (!b.consentAt) return fail('ต้องยินยอมตามนโยบายความเป็นส่วนตัวก่อน', 403);

  let user = { userId: null, name: String(b.name || 'คนขับทดลอง').slice(0, 60) };
  if (b.idToken) {
    user = await verifyIdToken(b.idToken);
    if (!user) return fail('ยืนยันตัวตน LINE ไม่สำเร็จ', 401);
  } else if (!b.demo) {
    return fail('ต้องเข้าสู่ระบบด้วย LINE', 401);
  }

  // คนเดิมสมัครซ้ำ = อัปเดตข้อมูลเดิม
  const owner = uidHash(user.userId);
  const id = owner ? `DR-${owner.slice(0, 6).toUpperCase()}` : `DR-${crypto.randomInt(100000, 999999)}`;
  const driver = {
    id,
    name: maskName(user.name),
    vehicle: b.vehicle,
    plate: String(b.plate).trim().slice(0, 20),
    phone: b.phone,
    village: String(b.village || '').slice(0, 80),
    uidSealed: user.userId ? sealLot({ uid: user.userId }) : null,
    owner,
    demo: !user.userId,
    active: true,
    consentAt: b.consentAt,
    createdAt: new Date().toISOString(),
  };
  await saveDriver(driver);
  return json({ driver: publicDriver(driver), driverToken: sealLot({ driverId: id }) });
}
