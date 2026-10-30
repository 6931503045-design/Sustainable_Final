// POST /api/receipt  ตู้แปรรูปเสร็จ → คำนวณยอดเงิน บันทึกงาน และส่งใบรับของเข้า LINE ของเจ้าของล็อต
import { MODES, MOISTURE_MAX, PELLET_TYPES, round, settle } from '../shared/rules.js';
import { receiptMessage } from './_lib/flex.js';
import { body, fail, json, originOf } from './_lib/http.js';
import { lineConfigured, push } from './_lib/line.js';
import { receivedKg, uidHash } from './_lib/lot.js';
import { listItems, pushItem } from './_lib/store.js';
import { openLot } from './_lib/token.js';

export async function POST(request) {
  const b = await body(request);
  const lot = openLot(b.token);
  if (!lot) return fail('QR ไม่ถูกต้อง', 404);
  if (!MODES[b.mode]) return fail('โหมดไม่ถูกต้อง');
  if (b.mode === 'pellet' && !PELLET_TYPES[b.pelletType]) return fail('กรุณาเลือกชนิดแม่พิมพ์อัดเม็ด');
  const moisture = Number(b.moisture);
  if (!(moisture >= 0 && moisture <= 100)) return fail('ค่าความชื้นไม่ถูกต้อง');
  if (moisture > MOISTURE_MAX) return fail(`ความชื้น ${moisture}% เกิน ${MOISTURE_MAX}% เครื่องไม่รับวัตถุดิบ`, 422);

  const inputKg = receivedKg(lot);
  const outputKg = round(Number(b.outputKg), 1);
  if (!(outputKg > 0 && outputKg <= inputKg)) return fail('น้ำหนักสินค้าที่ชั่งได้ไม่สมเหตุสมผล');

  const done = await listItems('jobs', 500);
  if (done.some((j) => j.lotId === lot.id)) return fail('ล็อตนี้แปรรูปไปแล้ว', 409);

  const job = {
    id: `JB-${Date.now().toString(36).toUpperCase()}`,
    lotId: lot.id,
    machineId: String(b.machineId || 'RMP-01').slice(0, 20),
    village: lot.village,
    name: lot.name,
    residue: lot.residue,
    purpose: lot.purpose,
    mode: b.mode,
    pelletType: b.mode === 'pellet' ? b.pelletType : null,
    moisture: round(moisture, 1),
    inputKg,
    outputKg,
    ...settle({ mode: b.mode, purpose: lot.purpose, inputKg, outputKg }),
    demo: !lot.uid,
    at: new Date().toISOString(),
  };
  await pushItem('jobs', { ...job, owner: uidHash(lot.uid) });

  let pushed = false;
  let pushError;
  if (lot.uid && lineConfigured()) {
    try {
      await push(lot.uid, [receiptMessage(job, `${originOf(request)}/img/receipt-${job.mode}.jpg`)]);
      pushed = true;
    } catch (e) {
      pushError = e.message;
    }
  }
  return json({ job, pushed, pushError });
}
