// โทเคนของล็อต (อยู่ใน QR) เข้ารหัสด้วย AES-256-GCM
// QR จึงไม่เปิดเผย LINE userId ของเกษตรกร และปลอมแปลงไม่ได้
import crypto from 'node:crypto';

function key() {
  const secret = process.env.LOT_SECRET;
  if (!secret) throw new Error('LOT_SECRET is not set');
  return crypto.createHash('sha256').update(secret).digest();
}

export function sealLot(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

export function openLot(token) {
  try {
    const raw = Buffer.from(String(token), 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'));
  } catch {
    return null;
  }
}
