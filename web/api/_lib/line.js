// เรียก LINE Platform: ตรวจ ID token จาก LIFF, ส่ง push/reply message, ตรวจลายเซ็น webhook
import crypto from 'node:crypto';

const API = 'https://api.line.me';

export const lineConfigured = () => Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);

/** ตรวจ ID token ที่ได้จาก liff.getIDToken() แล้วคืน { userId, name } */
export async function verifyIdToken(idToken) {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!clientId) throw new Error('LINE_LOGIN_CHANNEL_ID is not set');
  const res = await fetch(`${API}/oauth2/v2.1/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { userId: data.sub, name: data.name || '' };
}

async function call(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE ${path} ${res.status}: ${text}`);
  }
}

export const push = (to, messages) => call('/v2/bot/message/push', { to, messages });
/** ส่งถึงหลายคนพร้อมกัน (สูงสุด 500 คน/ครั้ง) — นับโควตาตามจำนวนผู้รับ */
export const multicast = (to, messages) => (to.length ? call('/v2/bot/message/multicast', { to: to.slice(0, 500), messages }) : Promise.resolve());
export const reply = (replyToken, messages) => call('/v2/bot/message/reply', { replyToken, messages });

export function validSignature(rawBody, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  const given = Buffer.from(signature, 'base64');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
