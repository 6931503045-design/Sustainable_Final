// POST /api/lots  ลงทะเบียนเศษพืช (จาก LIFF) → คืน QR token + ส่ง QR เข้า LINE
//                 ถ้าเลือก "เรียกรถไปรับ" จะสร้างงานรับของ และแจ้งคนขับในพื้นที่
// GET  /api/lots  รายการคิว (ข้อมูลที่ปิดบังชื่อแล้ว)
import { MODES, PICKUP, PURPOSES, RESIDUES, distanceKm, maskName, pickupFee, settle } from '../shared/rules.js';
import { lotMessage, newJobMessage } from './_lib/flex.js';
import { body, fail, json, originOf } from './_lib/http.js';
import { lineConfigured, multicast, push, verifyIdToken } from './_lib/line.js';
import { newLotId, publicLot, uidHash } from './_lib/lot.js';
import { PHONE_RE, createPickup, driverLineIds } from './_lib/pickup.js';
import { listItems, persistent, pushItem } from './_lib/store.js';
import { sealLot } from './_lib/token.js';

export async function GET() {
  return json({ persistent, lots: (await listItems('lots', 100)).map(({ owner, consentAt, ...l }) => l) });
}

export async function POST(request) {
  const b = await body(request);
  const estKg = Number(b.estKg);
  if (!RESIDUES[b.residue]) return fail('ชนิดเศษพืชไม่ถูกต้อง');
  if (!PURPOSES[b.purpose]) return fail('วัตถุประสงค์ไม่ถูกต้อง');
  if (!(estKg > 0 && estKg <= 5000)) return fail('น้ำหนักต้องอยู่ระหว่าง 1–5000 กก.');
  if (b.purpose === 'self' && !MODES[b.wantMode]) return fail('กรุณาเลือกโหมดที่ต้องการ');
  if (!b.consentAt) return fail('ต้องยินยอมตามนโยบายความเป็นส่วนตัวก่อน', 403);

  const pickup = b.delivery === 'pickup';
  let km = null;
  if (pickup) {
    const lat = Number(b.loc?.lat);
    const lng = Number(b.loc?.lng);
    if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180) || (!lat && !lng)) return fail('กรุณาแชร์ตำแหน่งกองเศษพืช');
    km = distanceKm({ lat, lng });
    if (km > PICKUP.maxKm) return fail(`อยู่ไกลเกิน ${PICKUP.maxKm} กม. ยังไม่มีบริการรับในพื้นที่นี้`);
    if (!PHONE_RE.test(String(b.phone || ''))) return fail('กรุณากรอกเบอร์โทรให้คนขับติดต่อ (เช่น 0812345678)');
  }

  let user = { userId: null, name: String(b.name || 'ผู้ใช้ทดลอง').slice(0, 60) };
  if (b.idToken) {
    user = await verifyIdToken(b.idToken);
    if (!user) return fail('ยืนยันตัวตน LINE ไม่สำเร็จ กรุณาเปิดใหม่จาก LINE', 401);
  } else if (!b.demo) {
    return fail('ต้องเข้าสู่ระบบด้วย LINE', 401);
  }

  const lot = {
    id: newLotId(),
    residue: b.residue,
    estKg: Math.round(estKg * 10) / 10,
    purpose: b.purpose,
    wantMode: b.purpose === 'self' ? b.wantMode : null,
    delivery: pickup ? 'pickup' : 'self',
    distanceKm: km,
    village: String(b.village || '').slice(0, 80),
    slot: b.slot || null,
    name: maskName(user.name),
    demo: !user.userId,
    createdAt: new Date().toISOString(),
  };
  const token = sealLot({ ...lot, uid: user.userId, n: user.name });
  const quote = settle({ residue: lot.residue, mode: lot.wantMode, purpose: lot.purpose, inputKg: lot.estKg, pickupKm: km });
  await pushItem('lots', { ...lot, owner: uidHash(user.userId), consentAt: b.consentAt });

  let pickupRec = null;
  if (pickup) {
    const f = pickupFee(km, lot.estKg);
    pickupRec = await createPickup(lot, token, {
      fee: f.fee,
      driverEarn: f.driver,
      loc: { lat: Number(b.loc.lat), lng: Number(b.loc.lng) },
      landmark: String(b.landmark || '').slice(0, 120),
      phone: b.phone,
    });
  }

  let pushed = false;
  let pushError;
  if (lineConfigured()) {
    try {
      if (user.userId) {
        await push(user.userId, [lotMessage(lot, `${originOf(request)}/api/qr?t=${token}`, quote)]);
        pushed = true;
      }
      if (pickupRec && !lot.demo) await multicast(await driverLineIds(), [newJobMessage(pickupRec)]);
    } catch (e) {
      pushError = e.message;
    }
  }
  return json({ lot: publicLot(lot), token, quote, pushed, pushError });
}
