// ระบบรับของถึงที่ (แบบ Grab): ข้อมูลคนขับและงานรับของ
import { VEHICLES, coarse, maskName } from '../../shared/rules.js';
import { kvGet, kvSet, listItems, pushItem } from './store.js';
import { openLot, sealLot } from './token.js';

export const PHONE_RE = /^0\d{8,9}$/;

// ---------------- คนขับ
export const driverKey = (id) => `driver:${id}`;

export async function getDriverByToken(token) {
  const t = openLot(token);
  if (!t?.driverId) return null;
  return kvGet(driverKey(t.driverId));
}

export const publicDriver = (d) => ({ id: d.id, name: d.name, vehicle: d.vehicle, vehicleTh: VEHICLES[d.vehicle]?.th, plate: d.plate, village: d.village, demo: d.demo });

/** LINE userId ของคนขับที่ใช้ LINE จริง (ไว้ส่งแจ้งงานใหม่) */
export async function driverLineIds(limit = 50) {
  const ids = await listItems('drivers', 200);
  const out = [];
  for (const id of ids) {
    const d = await kvGet(driverKey(id));
    const uid = d?.uidSealed && openLot(d.uidSealed)?.uid;
    if (uid && d.active !== false) out.push(uid);
    if (out.length >= limit) break;
  }
  return out;
}

export async function saveDriver(d) {
  const isNew = !(await kvGet(driverKey(d.id)));
  await kvSet(driverKey(d.id), d);
  if (isNew) await pushItem('drivers', d.id);
}

// ---------------- งานรับของ (key = รหัสล็อต)
export const pickupKey = (lotId) => `pickup:${lotId}`;
export const getPickup = (lotId) => kvGet(pickupKey(lotId));
export const savePickup = (p) => kvSet(pickupKey(p.lotId), p);

export async function createPickup(lot, token, extra) {
  const p = {
    lotId: lot.id,
    status: 'open',
    residue: lot.residue,
    estKg: lot.estKg,
    purpose: lot.purpose,
    village: lot.village,
    slot: lot.slot,
    distanceKm: lot.distanceKm,
    fee: extra.fee,
    driverEarn: extra.driverEarn,
    farmerName: lot.name,
    landmark: extra.landmark,
    locSealed: sealLot(extra.loc),
    phoneSealed: extra.phone ? sealLot({ phone: extra.phone }) : null,
    lotToken: token,
    demo: lot.demo,
    createdAt: new Date().toISOString(),
    history: [{ status: 'open', at: new Date().toISOString() }],
  };
  await savePickup(p);
  await pushItem('pickups', lot.id);
  return p;
}

export function setStatus(p, status, extra = {}) {
  Object.assign(p, extra, { status });
  p.history = [...(p.history || []), { status, at: new Date().toISOString() }];
  return p;
}

/** ข้อมูลที่ทุกคนเห็นได้ (ก่อนรับงาน): ไม่มีพิกัดจริง เบอร์โทร หรือ QR */
export function publicPickup(p) {
  const loc = openLot(p.locSealed);
  return {
    lotId: p.lotId,
    status: p.status,
    residue: p.residue,
    estKg: p.estKg,
    village: p.village,
    slot: p.slot,
    distanceKm: p.distanceKm,
    fee: p.fee,
    driverEarn: p.driverEarn,
    farmerName: p.farmerName,
    approx: loc ? coarse(loc) : null,
    driver: p.driver ? { name: p.driver.name, vehicleTh: VEHICLES[p.driver.vehicle]?.th, plate: p.driver.plate } : null,
    history: p.history,
    demo: p.demo,
  };
}

/** ข้อมูลเต็มสำหรับคนขับที่รับงานนี้แล้วเท่านั้น */
export function driverView(p) {
  return {
    ...publicPickup(p),
    loc: openLot(p.locSealed),
    landmark: p.landmark,
    farmerPhone: p.phoneSealed ? openLot(p.phoneSealed)?.phone : null,
    lotToken: p.lotToken,
  };
}

export const maskedDriverName = (name) => maskName(name);
