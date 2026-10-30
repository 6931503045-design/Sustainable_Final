import crypto from 'node:crypto';

/** แฮชของ userId ไว้ค้นหาเพื่อลบข้อมูลตามคำขอ (ไม่เก็บ userId ตรง ๆ) */
export const uidHash = (uid) =>
  uid ? crypto.createHmac('sha256', process.env.LOT_SECRET || '').update(uid).digest('hex').slice(0, 24) : null;

export const newLotId = () => `LT-${crypto.randomInt(1000, 9999)}${String.fromCharCode(65 + crypto.randomInt(0, 26))}`;

/**
 * น้ำหนักที่ชั่งตอนรับของ (ต้นแบบ: จำลองจากน้ำหนักที่เกษตรกรแจ้ง ±8% แบบคงที่ต่อล็อต)
 * ระบบจริงจะได้ค่าจากตาชั่งที่จุดรับของ
 */
export function receivedKg(lot) {
  const h = crypto.createHash('sha256').update(lot.id).digest();
  const factor = 0.92 + (h[0] / 255) * 0.16;
  return Math.round(lot.estKg * factor * 10) / 10;
}

/** ข้อมูลล็อตที่เปิดเผยได้ (ตัด userId และชื่อเต็มออก) */
export const publicLot = ({ uid, n, ...rest }) => rest;
