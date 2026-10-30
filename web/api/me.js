// DELETE /api/me  สิทธิ์ขอลบข้อมูล (Right to erasure ตาม PDPA): ลบล็อตและงานทั้งหมดของผู้ใช้
import { body, fail, json } from './_lib/http.js';
import { verifyIdToken } from './_lib/line.js';
import { uidHash } from './_lib/lot.js';
import { removeWhere } from './_lib/store.js';

export async function DELETE(request) {
  const { idToken } = await body(request);
  const user = idToken && (await verifyIdToken(idToken));
  if (!user) return fail('ยืนยันตัวตน LINE ไม่สำเร็จ', 401);
  const owner = uidHash(user.userId);
  const lots = await removeWhere('lots', (x) => x.owner === owner);
  const jobs = await removeWhere('jobs', (x) => x.owner === owner);
  return json({ deleted: { lots, jobs } });
}
