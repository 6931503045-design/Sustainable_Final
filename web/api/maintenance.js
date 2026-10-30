// POST /api/maintenance  แจ้งเตือนรอบบำรุงรักษาไปยัง LINE ของช่าง (TECH_USER_ID)
import { maintenanceMessage } from './_lib/flex.js';
import { body, fail, json } from './_lib/http.js';
import { lineConfigured, push } from './_lib/line.js';

const ITEMS = ['ตรวจใบมีดสับ (สึกจากซิลิกาในเศษพืช)', 'ตรวจลูกกลิ้งและแม่พิมพ์อัดเม็ด', 'ตรวจเกลียวอัดและขดลวดความร้อน', 'เทถุงฝุ่น / ตรวจตะแกรง'];

export async function POST(request) {
  const b = await body(request);
  const to = process.env.TECH_USER_ID;
  if (!to || !lineConfigured()) return fail('ยังไม่ได้ตั้งค่า TECH_USER_ID / LINE token', 503);
  const m = { machineId: String(b.machineId || 'RMP-01').slice(0, 20), hours: Number(b.hours) || 0, items: ITEMS };
  try {
    await push(to, [maintenanceMessage(m)]);
  } catch (e) {
    return fail(e.message, 502);
  }
  return json({ pushed: true });
}
