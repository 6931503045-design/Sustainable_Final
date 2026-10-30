// ข้อความ Flex ที่ส่งเข้า LINE
import { MACHINE, MODES, MOISTURE_TIERS, PELLET_TYPES, PICKUP, PURPOSES, RESIDUES, SERVICE_FEE, VEHICLES, modeLabel, residueName } from '../../shared/rules.js';

const GREEN = '#2f6b3a';
const baht = (n) => `${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;

const row = (label, value, bold = false, color) => ({
  type: 'box',
  layout: 'horizontal',
  contents: [
    { type: 'text', text: label, size: 'sm', color: '#6b7280', flex: 5 },
    { type: 'text', text: String(value), size: 'sm', align: 'end', flex: 6, wrap: true, weight: bold ? 'bold' : 'regular', ...(color ? { color } : {}) },
  ],
});
const sep = { type: 'separator', margin: 'md' };
const note = (text) => ({ type: 'text', text, size: 'xxs', color: '#9ca3af', wrap: true, margin: 'md' });

const header = (title, sub, bg = GREEN) => ({
  type: 'box',
  layout: 'vertical',
  backgroundColor: bg,
  paddingAll: '16px',
  contents: [
    { type: 'text', text: title, color: '#ffffff', weight: 'bold', size: 'lg', wrap: true },
    ...(sub ? [{ type: 'text', text: sub, color: '#ffffffcc', size: 'xs', wrap: true }] : []),
  ],
});

const button = (label, uri, primary = true) => ({ type: 'button', style: primary ? 'primary' : 'secondary', color: primary ? GREEN : undefined, height: 'sm', action: { type: 'uri', label, uri } });
const footer = (...buttons) => {
  const list = buttons.filter(Boolean);
  return list.length ? { type: 'box', layout: 'vertical', spacing: 'sm', contents: list } : undefined;
};
const liff = (path = '') => (process.env.LIFF_URL ? `${process.env.LIFF_URL}${path}` : null);
const liffButton = (label, path) => liff(path) && button(label, liff(path));
const mapsUrl = ({ lat, lng }) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
const fmtSlot = (iso) => (iso ? new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }) : '-');
const bubble = (altText, contents) => ({ type: 'flex', altText, contents: { type: 'bubble', ...contents } });

// ---------------------------------------------------------------- ราคารับซื้อ
export function priceMessage() {
  return bubble('ราคารับซื้อเศษพืช ไร่ไม่เผา', {
    header: header('💰 ราคารับซื้อเศษพืช', 'บาท ต่อ กก. (ชั่งที่ตู้) · ราคาสมมติต้นแบบ'),
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        ...Object.values(RESIDUES).map((r) => row(r.th, `${r.buy.toFixed(2)} ฿`, true, GREEN)),
        sep,
        { type: 'text', text: 'ความชื้น', weight: 'bold', size: 'sm', margin: 'md' },
        ...MOISTURE_TIERS.map((t) => ({ type: 'text', text: `• ${t.th}`, size: 'xs', wrap: true })),
        { type: 'text', text: '• เกิน 20% ตู้ไม่รับ (นำไปตากก่อน)', size: 'xs', wrap: true },
        sep,
        { type: 'text', text: 'รับกลับไปใช้เอง (ค่าบริการ/กก.)', weight: 'bold', size: 'sm', margin: 'md' },
        ...Object.values(MODES).map((m) => row(modeLabel(m.key), `${SERVICE_FEE[m.key].toFixed(2)} ฿`)),
        sep,
        { type: 'text', text: '🛻 เรียกรถไปรับถึงไร่', weight: 'bold', size: 'sm', margin: 'md' },
        { type: 'text', text: `${PICKUP.base} ฿ + ${PICKUP.perKm} ฿/กม. + ${PICKUP.perKg} ฿/กก. (หักจากยอดขาย) รัศมี ${PICKUP.maxKm} กม.`, size: 'xs', wrap: true },
      ],
    },
    footer: footer(liffButton('คำนวณราคา / แจ้งขาย', '?tab=price')),
  });
}

// ---------------------------------------------------------------- เกษตรกร: ลงทะเบียนล็อต
export function lotMessage(lot, qrUrl, quote) {
  const pickup = lot.delivery === 'pickup';
  return bubble(`ลงทะเบียนล็อต ${lot.id} แล้ว`, {
    header: header(pickup ? '🛻 ส่งคำขอรถไปรับแล้ว' : '🌾 ลงทะเบียนเศษพืชแล้ว', `ล็อต ${lot.id}`),
    hero: { type: 'image', url: qrUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'fit', backgroundColor: '#ffffff' },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        { type: 'text', text: pickup ? 'กำลังหาคนขับในพื้นที่ จะแจ้งเมื่อมีคนรับงาน (QR นี้คนขับจะใช้ที่ตู้)' : `นำเศษพืชไปที่ ${MACHINE.th} แล้วแสดง QR นี้ที่ตู้`, weight: 'bold', wrap: true, size: 'sm' },
        sep,
        row('ชนิด', residueName(lot.residue)),
        row('น้ำหนักประมาณ', `${lot.estKg} กก.`),
        row('ต้องการ', PURPOSES[lot.purpose]),
        row(pickup ? 'วันเวลาให้ไปรับ' : 'นัดเวลา', fmtSlot(lot.slot)),
        ...(quote
          ? [
              sep,
              row(lot.purpose === 'sell' ? 'ค่าเศษพืช (ประมาณ)' : 'ค่าบริการ (ประมาณ)', baht(Math.abs(quote.gross))),
              ...(pickup ? [row(`ค่ารถ (${lot.distanceKm} กม.)`, `- ${baht(quote.pickupFee)}`)] : []),
              row(quote.amount >= 0 ? 'คาดว่าจะได้รับ' : 'คาดว่าต้องจ่าย', baht(Math.abs(quote.amount)), true, GREEN),
              note('ยอดจริงคิดจากน้ำหนักที่ชั่งและความชื้นที่ตู้'),
            ]
          : []),
      ],
    },
    footer: footer(liffButton('ดูล็อตของฉัน', '?tab=lots')),
  });
}

// ---------------------------------------------------------------- ใบรับของ
export function receiptMessage(job, heroUrl) {
  const m = MODES[job.mode];
  const paid = job.amount >= 0;
  return bubble(`ใบรับของ ล็อต ${job.lotId}: ${paid ? 'ได้รับ' : 'ค่าบริการ'} ${baht(Math.abs(job.amount))}`, {
    header: header('🧾 ใบรับของ ไร่ไม่เผา', `ล็อต ${job.lotId} · ${new Date(job.at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`),
    hero: heroUrl ? { type: 'image', url: heroUrl, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' } : undefined,
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        row('วัตถุดิบ', residueName(job.residue)),
        row('โหมด', job.mode === 'pellet' && job.pelletType ? `${modeLabel(job.mode)} · ${PELLET_TYPES[job.pelletType]}` : `${m.code} · ${m.th}`, true),
        row('น้ำหนักก่อนแปรรูป', `${job.inputKg} กก.`),
        row('น้ำหนักหลังแปรรูป', `${job.outputKg} กก.`),
        row('ความชื้น', `${job.moisture}%`),
        sep,
        row(job.purpose === 'sell' ? `ค่าเศษพืช (${RESIDUES[job.residue]?.buy} ฿/กก.)` : 'ค่าบริการแปรรูป', baht(Math.abs(job.gross))),
        ...(job.pickupFee ? [row(`ค่ารถรับของ${job.driverName ? ` (${job.driverName})` : ''}`, `- ${baht(job.pickupFee)}`)] : []),
        row(paid ? 'ยอดสุทธิที่ได้รับ' : 'ยอดที่ต้องชำระ', baht(Math.abs(job.amount)), true, paid ? GREEN : '#b45309'),
        {
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          paddingAll: '10px',
          cornerRadius: '8px',
          backgroundColor: '#eef6ef',
          contents: [
            { type: 'text', text: `🌱 คุณช่วยลดการเผาได้ ${job.savedKg} กก.`, size: 'sm', weight: 'bold', color: GREEN, wrap: true },
            { type: 'text', text: `≈ ลดฝุ่น PM2.5 ประมาณ ${job.pm25g} กรัม (ค่าประมาณ)`, size: 'xs', color: '#4b5563', wrap: true },
          ],
        },
      ],
    },
    footer: footer(liffButton('ดูประวัติและรายได้', '?tab=lots')),
  });
}

// ---------------------------------------------------------------- ระบบรับของ (คนขับ)
export function newJobMessage(p) {
  return bubble(`งานรับของใหม่ ${p.estKg} กก. ค่าจ้าง ${baht(p.driverEarn)}`, {
    header: header('🛻 งานรับของใหม่', `${p.village} · ห่างตู้ ${p.distanceKm} กม.`, '#e07b39'),
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        row('เศษพืช', residueName(p.residue)),
        row('น้ำหนักประมาณ', `${p.estKg} กก.`),
        row('ให้ไปรับ', fmtSlot(p.slot)),
        row('ค่าจ้างของคุณ', baht(p.driverEarn), true, GREEN),
        note('ใครกดรับก่อนได้งาน พิกัดและเบอร์โทรจะแสดงหลังรับงาน'),
      ],
    },
    footer: footer(liffButton('ดูงานและกดรับ', '/driver')),
  });
}

export function acceptedMessage(p) {
  const v = VEHICLES[p.driver.vehicle]?.th || p.driver.vehicle;
  return bubble(`มีคนขับรับงานแล้ว: ${p.driver.name}`, {
    header: header('✅ มีคนขับรับงานแล้ว', `ล็อต ${p.lotId}`),
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [row('คนขับ', p.driver.name, true), row('รถ', `${v} ${p.driver.plate}`), row('จะไปรับ', fmtSlot(p.slot)), note('กรุณาเตรียมเศษพืชให้แห้ง มัดหรือใส่กระสอบไว้ เพื่อขนได้เร็ว')],
    },
    footer: footer(p.driver.phone && button(`โทรหาคนขับ ${p.driver.phone}`, `tel:${p.driver.phone}`)),
  });
}

export function pickedMessage(p) {
  return bubble(`คนขับรับเศษพืชแล้ว กำลังนำไปที่ตู้`, {
    header: header('📦 รับเศษพืชแล้ว', `ล็อต ${p.lotId}`),
    body: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: `${p.driver.name} กำลังนำไปแปรรูปที่ ${MACHINE.th} ใบรับของจะส่งมาในแชตนี้เมื่อชั่งเสร็จ`, wrap: true, size: 'sm' }] },
  });
}

export function cancelledMessage(p, reason) {
  return { type: 'text', text: `⚠️ ล็อต ${p.lotId}: ${reason}` };
}

export function jobDetailForDriver(p) {
  return bubble(`รายละเอียดงาน ล็อต ${p.lotId}`, {
    header: header('📍 งานของคุณ', `ล็อต ${p.lotId} · ${p.village}`, '#e07b39'),
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        row('เจ้าของ', p.farmerName),
        row('จุดสังเกต', p.landmark || '-'),
        row('น้ำหนักประมาณ', `${p.estKg} กก.`),
        row('ค่าจ้างของคุณ', baht(p.driverEarn), true, GREEN),
        note('ส่งของที่ตู้แล้วให้แสดง QR ของงานนี้ (ในหน้าคนขับ) ที่หน้าจอตู้'),
      ],
    },
    footer: footer(p.loc && button('เปิดแผนที่', mapsUrl(p.loc)), p.farmerPhone && button(`โทร ${p.farmerPhone}`, `tel:${p.farmerPhone}`, false), liffButton('เปิดหน้าคนขับ', '/driver')),
  });
}

export function driverPaidMessage(job) {
  return bubble(`ได้รับค่าจ้าง ${baht(job.driverEarn)}`, {
    header: header('💵 ส่งของสำเร็จ', `ล็อต ${job.lotId}`),
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [row('น้ำหนักที่ส่ง', `${job.inputKg} กก.`), row('ค่าจ้างของคุณ', baht(job.driverEarn), true, GREEN), note('ขอบคุณที่ช่วยให้เศษพืชไม่ถูกเผา 🌱')],
    },
  });
}

export function maintenanceMessage(m) {
  return bubble(`แจ้งเตือนบำรุงรักษาตู้ ${m.machineId}`, {
    header: header('🔧 ถึงรอบบำรุงรักษา', `ตู้ ${m.machineId}`),
    body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [row('ชั่วโมงทำงานสะสม', `${m.hours} ชม.`), ...m.items.map((t) => ({ type: 'text', text: `• ${t}`, size: 'sm', wrap: true }))] },
  });
}
