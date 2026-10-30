// POST /api/webhook  รับ event จาก LINE (ตั้ง URL นี้ใน LINE Developers > Messaging API > Webhook URL)
import { priceMessage } from './_lib/flex.js';
import { fail, json } from './_lib/http.js';
import { reply, validSignature } from './_lib/line.js';

const liff = () => process.env.LIFF_URL || 'https://liff.line.me/';

const quick = {
  items: [
    { type: 'action', action: { type: 'uri', label: 'ขาย / เรียกรถรับ', uri: liff() } },
    { type: 'action', action: { type: 'message', label: 'ราคารับซื้อ', text: 'ราคา' } },
    { type: 'action', action: { type: 'message', label: 'วิธีใช้', text: 'วิธีใช้' } },
    { type: 'action', action: { type: 'uri', label: 'สมัครขับรถรับของ', uri: `${liff()}/driver` } },
  ],
};

function answer(text = '') {
  if (/ราคา/.test(text)) return priceMessage();
  if (/คนขับ|ขับรถ|รับงาน/.test(text))
    return { type: 'text', text: `🛻 อยากมีรายได้เสริม? สมัครเป็นคนขับรับเศษพืชในหมู่บ้าน\nกดรับงานใกล้บ้าน ได้ค่าจ้างตามระยะทางและน้ำหนัก\n${liff()}/driver` };
  if (/วิธี|ใช้/.test(text))
    return {
      type: 'text',
      text: 'วิธีขายเศษพืชให้ไร่ไม่เผา\n1) กด "ขาย / เรียกรถรับ" กรอกชนิดและน้ำหนัก\n2) เลือกนำมาเองที่ตู้ หรือเรียกรถคนในพื้นที่ไปรับ\n3) ได้ QR ในแชตนี้ (ถ้าเรียกรถ คนขับจะใช้ QR นี้ที่ตู้)\n4) ชั่งที่ตู้ แล้วรับใบรับของพร้อมยอดเงินในแชตนี้ ✅\n\n⚠️ ต้องแห้ง ความชื้นไม่เกิน 20%',
    };
  return { type: 'text', text: 'สวัสดีครับ 🌾 ไร่ไม่เผา รับซื้อเศษพืชแทนการเผา มีรถคนในพื้นที่ไปรับถึงไร่\nเลือกเมนูด้านล่างได้เลย' };
}

export async function POST(request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get('x-line-signature'))) return fail('bad signature', 401);
  const { events = [] } = JSON.parse(raw || '{}');
  await Promise.all(
    events
      .filter((e) => e.replyToken && (e.type === 'follow' || (e.type === 'message' && e.message.type === 'text')))
      .map((e) => reply(e.replyToken, [{ ...answer(e.message?.text), quickReply: quick }]).catch((err) => console.error(err))),
  );
  return json({ ok: true });
}
