// POST /api/scan  ตู้สแกน QR → ถอดรหัสล็อต + น้ำหนักที่ชั่งตอนรับของ (+ ข้อมูลคนขับ ถ้าเรียกรถมา)
import { body, fail, json } from './_lib/http.js';
import { publicLot, receivedKg } from './_lib/lot.js';
import { getPickup } from './_lib/pickup.js';
import { openLot } from './_lib/token.js';

export async function POST(request) {
  const { token } = await body(request);
  const lot = openLot(token);
  if (!lot?.id) return fail('QR ไม่ถูกต้องหรือไม่ใช่ของระบบไร่ไม่เผา', 404);
  const p = lot.delivery === 'pickup' ? await getPickup(lot.id) : null;
  const driver = p?.driver && ['accepted', 'picked'].includes(p.status) ? { name: p.driver.name, plate: p.driver.plate } : null;
  return json({ lot: { ...publicLot(lot), receivedKg: receivedKg(lot), hasLine: Boolean(lot.uid), driver } });
}
