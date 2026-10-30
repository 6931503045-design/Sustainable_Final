// DELETE /api/me  สิทธิ์ขอลบข้อมูล (Right to erasure ตาม PDPA): ลบล็อต งาน งานรับของ และข้อมูลคนขับของผู้ใช้
import { body, fail, json } from './_lib/http.js';
import { verifyIdToken } from './_lib/line.js';
import { uidHash } from './_lib/lot.js';
import { driverKey, pickupKey } from './_lib/pickup.js';
import { kvDel, kvGet, listItems, removeWhere } from './_lib/store.js';

export async function DELETE(request) {
  const { idToken } = await body(request);
  const user = idToken && (await verifyIdToken(idToken));
  if (!user) return fail('ยืนยันตัวตน LINE ไม่สำเร็จ', 401);
  const owner = uidHash(user.userId);

  const myLots = (await listItems('lots', 500)).filter((x) => x.owner === owner).map((x) => x.id);
  for (const id of myLots) await kvDel(pickupKey(id));
  await removeWhere('pickups', (id) => myLots.includes(id));
  const lots = await removeWhere('lots', (x) => x.owner === owner);
  const jobs = await removeWhere('jobs', (x) => x.owner === owner);

  let drivers = 0;
  for (const id of await listItems('drivers', 500)) {
    const d = await kvGet(driverKey(id));
    if (d?.owner === owner) {
      await kvDel(driverKey(id));
      drivers++;
    }
  }
  if (drivers) await removeWhere('drivers', (id) => id === `DR-${owner.slice(0, 6).toUpperCase()}`);
  return json({ deleted: { lots, jobs, drivers } });
}
