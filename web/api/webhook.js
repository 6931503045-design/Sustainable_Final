// POST /api/webhook  รับ event จาก LINE (ตั้ง URL นี้ใน LINE Developers > Messaging API > Webhook URL)
import { fail, json } from './_lib/http.js';
import { reply, validSignature } from './_lib/line.js';

const liff = () => process.env.LIFF_URL || 'https://liff.line.me/';

const quick = {
  items: [
    { type: 'action', action: { type: 'uri', label: 'แจ้งเศษพืช', uri: liff() } },
    { type: 'action', action: { type: 'message', label: 'วิธีใช้ตู้', text: 'วิธีใช้' } },
    { type: 'action', action: { type: 'message', label: 'ราคารับซื้อ', text: 'ราคา' } },
  ],
};

function answer(text = '') {
  if (/ราคา/.test(text))
    return 'ราคารับซื้อ (ต่อ กก. ที่รับเข้า, ค่าสมมติต้นแบบ)\n• สับ 0.60 บาท\n• อัดเม็ด 1.00 บาท\n• อัดแท่ง 1.20 บาท\n\nถ้ารับกลับไปใช้เอง มีค่าบริการ 0.30 / 0.80 / 1.00 บาท ตามลำดับ';
  if (/วิธี|ใช้/.test(text))
    return 'วิธีใช้ตู้ไร่ไม่เผา\n1) กด "แจ้งเศษพืช" แล้วเลือกเวลานัด\n2) ระบบส่ง QR มาในแชตนี้\n3) ที่ตู้ ให้สแกน QR เลือกโหมด\n4) รอรับใบรับของพร้อมยอดเงินในแชตนี้ ✅\n\n⚠️ เศษพืชต้องแห้ง (ความชื้นไม่เกิน 20%)';
  return 'สวัสดีครับ 🌾 ไร่ไม่เผา ช่วยเปลี่ยนเศษพืชเป็นรายได้ แทนการเผา\nเลือกเมนูด้านล่างได้เลย';
}

export async function POST(request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get('x-line-signature'))) return fail('bad signature', 401);
  const { events = [] } = JSON.parse(raw || '{}');
  await Promise.all(
    events
      .filter((e) => e.replyToken && (e.type === 'follow' || (e.type === 'message' && e.message.type === 'text')))
      .map((e) => reply(e.replyToken, [{ type: 'text', text: answer(e.message?.text), quickReply: quick }]).catch((err) => console.error(err))),
  );
  return json({ ok: true });
}
