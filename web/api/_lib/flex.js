// ข้อความ Flex ที่ส่งเข้า LINE
import { MODES, PELLET_TYPES, PURPOSES, RESIDUES } from '../../shared/rules.js';

const GREEN = '#2f6b3a';

const row = (label, value, bold = false, color) => ({
  type: 'box',
  layout: 'horizontal',
  contents: [
    { type: 'text', text: label, size: 'sm', color: '#6b7280', flex: 4 },
    { type: 'text', text: String(value), size: 'sm', align: 'end', flex: 6, wrap: true, weight: bold ? 'bold' : 'regular', ...(color ? { color } : {}) },
  ],
});

const header = (title, sub) => ({
  type: 'box',
  layout: 'vertical',
  backgroundColor: GREEN,
  paddingAll: '16px',
  contents: [
    { type: 'text', text: title, color: '#ffffff', weight: 'bold', size: 'lg' },
    { type: 'text', text: sub, color: '#d7ead9', size: 'xs' },
  ],
});

const liffButton = (label) =>
  process.env.LIFF_URL ? { type: 'box', layout: 'vertical', contents: [{ type: 'button', style: 'primary', color: GREEN, action: { type: 'uri', label, uri: process.env.LIFF_URL } }] } : undefined;

const fmtSlot = (iso) => (iso ? new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }) : '-');

export function lotMessage(lot, qrUrl) {
  return {
    type: 'flex',
    altText: `ลงทะเบียนล็อต ${lot.id} แล้ว นำ QR นี้ไปสแกนที่ตู้`,
    contents: {
      type: 'bubble',
      header: header('🌾 ลงทะเบียนเศษพืชแล้ว', `ล็อต ${lot.id}`),
      hero: { type: 'image', url: qrUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'fit', backgroundColor: '#ffffff' },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'text', text: 'แสดง QR นี้ที่หน้าตู้ "ไร่ไม่เผา"', weight: 'bold', wrap: true },
          { type: 'separator', margin: 'md' },
          row('ชนิด', RESIDUES[lot.residue] || lot.residue),
          row('น้ำหนักประมาณ', `${lot.estKg} กก.`),
          row('ต้องการ', PURPOSES[lot.purpose] || lot.purpose),
          row('นัดเวลา', fmtSlot(lot.slot)),
        ],
      },
      footer: liffButton('ดูล็อตของฉัน'),
    },
  };
}

export function receiptMessage(job, heroUrl) {
  const m = MODES[job.mode];
  const paid = job.amount >= 0;
  return {
    type: 'flex',
    altText: `ใบรับของ ล็อต ${job.lotId}: ${m.th} ${job.outputKg} กก. ${paid ? 'ได้รับ' : 'ค่าบริการ'} ${Math.abs(job.amount)} บาท`,
    contents: {
      type: 'bubble',
      header: header('🧾 ใบรับของ ไร่ไม่เผา', `ล็อต ${job.lotId} · ${new Date(job.at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`),
      hero: heroUrl ? { type: 'image', url: heroUrl, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' } : undefined,
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          row('โหมด', job.mode === 'pellet' && job.pelletType ? `${m.th} · ${PELLET_TYPES[job.pelletType]}` : m.th, true),
          row('น้ำหนักก่อนแปรรูป', `${job.inputKg} กก.`),
          row('น้ำหนักหลังแปรรูป', `${job.outputKg} กก.`),
          row('ความชื้น', `${job.moisture}%`),
          { type: 'separator', margin: 'md' },
          row(paid ? 'ยอดเงินที่ได้รับ' : 'ค่าบริการ', `${Math.abs(job.amount).toFixed(2)} บาท`, true, paid ? GREEN : '#b45309'),
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
      footer: liffButton('ดูประวัติและรายได้'),
    },
  };
}

export function maintenanceMessage(m) {
  return {
    type: 'flex',
    altText: `แจ้งเตือนบำรุงรักษาตู้ ${m.machineId}`,
    contents: {
      type: 'bubble',
      header: header('🔧 ถึงรอบบำรุงรักษา', `ตู้ ${m.machineId}`),
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          row('ชั่วโมงทำงานสะสม', `${m.hours} ชม.`),
          ...m.items.map((t) => ({ type: 'text', text: `• ${t}`, size: 'sm', wrap: true })),
        ],
      },
    },
  };
}
