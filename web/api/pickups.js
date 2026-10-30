// GET  /api/pickups?lat=&lng=   งานที่ยังไม่มีคนรับ (เรียงตามระยะจากคนขับ) — ไม่มีพิกัดจริง/เบอร์โทร
// GET  /api/pickups?lot=LT-xxx  สถานะงานรับของของล็อต (ให้เกษตรกรดู)
// POST /api/pickups {action: accept|picked|release, lotId, driverToken}
import { distanceKm } from '../shared/rules.js';
import { acceptedMessage, cancelledMessage, jobDetailForDriver, pickedMessage } from './_lib/flex.js';
import { body, fail, json } from './_lib/http.js';
import { lineConfigured, push } from './_lib/line.js';
import { driverView, getDriverByToken, getPickup, publicPickup, savePickup, setStatus } from './_lib/pickup.js';
import { kvDel, kvSetNX, listItems } from './_lib/store.js';
import { openLot } from './_lib/token.js';

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  if (q.get('lot')) {
    const p = await getPickup(q.get('lot'));
    return p ? json({ pickup: publicPickup(p) }) : fail('ไม่พบงานรับของ', 404);
  }
  const here = q.get('lat') && q.get('lng') ? { lat: Number(q.get('lat')), lng: Number(q.get('lng')) } : null;
  const ids = await listItems('pickups', 300);
  const open = [];
  for (const id of ids) {
    const p = await getPickup(id);
    if (p?.status !== 'open') continue;
    const pub = publicPickup(p);
    pub.fromYouKm = here && pub.approx ? distanceKm(here, pub.approx) : null;
    open.push(pub);
  }
  open.sort((a, b) => (a.fromYouKm ?? a.distanceKm) - (b.fromYouKm ?? b.distanceKm));
  return json({ pickups: open });
}

/** แจ้งเจ้าของล็อตผ่าน LINE (ถ้าเป็นผู้ใช้ LINE จริง) */
async function notifyFarmer(p, message) {
  const uid = openLot(p.lotToken)?.uid;
  if (!uid || !lineConfigured()) return false;
  try {
    await push(uid, [message]);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

async function notifyDriver(driver, message) {
  const uid = driver.uidSealed && openLot(driver.uidSealed)?.uid;
  if (!uid || !lineConfigured()) return;
  await push(uid, [message]).catch((e) => console.error(e));
}

export async function POST(request) {
  const b = await body(request);
  const driver = await getDriverByToken(b.driverToken);
  if (!driver) return fail('กรุณาสมัครเป็นคนขับก่อน', 401);
  const p = await getPickup(b.lotId);
  if (!p) return fail('ไม่พบงานนี้', 404);
  const lockKey = `pickup-lock:${p.lotId}`;

  if (b.action === 'accept') {
    if (p.status !== 'open') return fail('งานนี้มีคนรับไปแล้ว', 409);
    if (!(await kvSetNX(lockKey, driver.id))) return fail('งานนี้มีคนรับไปแล้ว', 409); // กันกดรับพร้อมกัน
    setStatus(p, 'accepted', { driver: { id: driver.id, name: driver.name, vehicle: driver.vehicle, plate: driver.plate, phone: driver.phone } });
    await savePickup(p);
    const farmerNotified = await notifyFarmer(p, acceptedMessage(p));
    await notifyDriver(driver, jobDetailForDriver(driverView(p)));
    return json({ pickup: driverView(p), farmerNotified });
  }

  if (p.driver?.id !== driver.id) return fail('งานนี้ไม่ใช่ของคุณ', 403);

  if (b.action === 'picked') {
    if (p.status !== 'accepted') return fail('สถานะงานไม่ถูกต้อง', 409);
    setStatus(p, 'picked');
    await savePickup(p);
    const farmerNotified = await notifyFarmer(p, pickedMessage(p));
    return json({ pickup: driverView(p), farmerNotified });
  }

  if (b.action === 'release') {
    if (p.status !== 'accepted') return fail('ยกเลิกได้เฉพาะก่อนรับของ', 409);
    setStatus(p, 'open', { driver: null });
    await savePickup(p);
    await kvDel(lockKey);
    await notifyFarmer(p, cancelledMessage(p, 'คนขับยกเลิกงาน ระบบกำลังหาคนขับใหม่ให้'));
    return json({ pickup: publicPickup(p) });
  }

  return fail('action ไม่ถูกต้อง');
}
