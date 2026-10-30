// POST /api/lots  ลงทะเบียนเศษพืช (จาก LIFF) → คืน QR token + ส่ง QR เข้า LINE
// GET  /api/lots  รายการคิว (ข้อมูลที่ปิดบังชื่อแล้ว)
import { MODES, PURPOSES, RESIDUES, maskName } from '../shared/rules.js';
import { lotMessage } from './_lib/flex.js';
import { body, fail, json, originOf } from './_lib/http.js';
import { lineConfigured, push, verifyIdToken } from './_lib/line.js';
import { newLotId, publicLot, uidHash } from './_lib/lot.js';
import { listItems, persistent, pushItem } from './_lib/store.js';
import { sealLot } from './_lib/token.js';

export async function GET() {
  return json({ persistent, lots: await listItems('lots', 100) });
}

export async function POST(request) {
  const b = await body(request);
  const estKg = Number(b.estKg);
  if (!RESIDUES[b.residue]) return fail('ชนิดเศษพืชไม่ถูกต้อง');
  if (!PURPOSES[b.purpose]) return fail('วัตถุประสงค์ไม่ถูกต้อง');
  if (!(estKg > 0 && estKg <= 5000)) return fail('น้ำหนักต้องอยู่ระหว่าง 1–5000 กก.');
  if (b.wantMode && !MODES[b.wantMode]) return fail('โหมดไม่ถูกต้อง');
  if (!b.consentAt) return fail('ต้องยินยอมตามนโยบายความเป็นส่วนตัวก่อน', 403);

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
    wantMode: b.purpose === 'self' ? b.wantMode || null : null,
    village: String(b.village || '').slice(0, 80),
    slot: b.slot || null,
    name: maskName(user.name),
    demo: !user.userId,
    createdAt: new Date().toISOString(),
  };
  const token = sealLot({ ...lot, uid: user.userId, n: user.name });
  await pushItem('lots', { ...lot, owner: uidHash(user.userId), consentAt: b.consentAt });

  let pushed = false;
  let pushError;
  if (user.userId && lineConfigured()) {
    try {
      await push(user.userId, [lotMessage(lot, `${originOf(request)}/api/qr?t=${token}`)]);
      pushed = true;
    } catch (e) {
      pushError = e.message;
    }
  }
  return json({ lot: publicLot(lot), token, pushed, pushError });
}
