// POST /api/scan  ตู้สแกน QR → ถอดรหัสล็อต + น้ำหนักที่ชั่งตอนรับของ
import { body, fail, json } from './_lib/http.js';
import { publicLot, receivedKg } from './_lib/lot.js';
import { openLot } from './_lib/token.js';

export async function POST(request) {
  const { token } = await body(request);
  const lot = openLot(token);
  if (!lot) return fail('QR ไม่ถูกต้องหรือไม่ใช่ของระบบไร่ไม่เผา', 404);
  return json({ lot: { ...publicLot(lot), receivedKg: receivedKg(lot), hasLine: Boolean(lot.uid) } });
}
