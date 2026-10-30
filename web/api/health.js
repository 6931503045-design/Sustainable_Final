// GET /api/health  ตรวจว่าตั้งค่าตัวแปรครบไหม (ตอบแค่ true/false ไม่เปิดเผยค่าจริง)
import { json } from './_lib/http.js';
import { persistent } from './_lib/store.js';

export async function GET() {
  const has = (k) => Boolean(process.env[k]);
  const checks = {
    LOT_SECRET: has('LOT_SECRET'),
    LINE_CHANNEL_ACCESS_TOKEN: has('LINE_CHANNEL_ACCESS_TOKEN'),
    LINE_CHANNEL_SECRET: has('LINE_CHANNEL_SECRET'),
    LINE_LOGIN_CHANNEL_ID: has('LINE_LOGIN_CHANNEL_ID'),
    LIFF_URL: has('LIFF_URL'),
    VITE_LIFF_ID: has('VITE_LIFF_ID'),
    TECH_USER_ID: has('TECH_USER_ID'),
    database_persistent: persistent,
  };
  const missing = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
  return json({ ok: missing.length === 0, checks, missing, note: 'แก้ตัวแปรใน Vercel แล้วต้อง Redeploy' });
}
