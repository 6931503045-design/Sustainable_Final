// GET /api/qr?t=<token>  รูป QR ของล็อต (LINE ใช้เป็นรูปในข้อความ) — สร้างเฉพาะ token ของระบบเท่านั้น
import QRCode from 'qrcode';
import { fail } from './_lib/http.js';
import { openLot } from './_lib/token.js';

export async function GET(request) {
  const t = new URL(request.url).searchParams.get('t');
  if (!t || !openLot(t)) return fail('invalid token', 404);
  const png = await QRCode.toBuffer(t, { width: 720, margin: 3, errorCorrectionLevel: 'M', color: { dark: '#1d2b22' } });
  return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
}
