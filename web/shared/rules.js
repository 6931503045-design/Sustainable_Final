// กติกาทางธุรกิจที่ใช้ร่วมกันทั้งหน้าเว็บและ API
// ⚠️ ตัวเลขทั้งหมดเป็น "ค่าสมมติสำหรับต้นแบบ" ต้องทดสอบ/อ้างอิงจริงก่อนใช้งาน

export const MODES = {
  chop: { key: 'chop', th: 'สับ', product: 'วัสดุคลุมดิน / เพาะเห็ด / ทำปุ๋ยหมัก', yield: 0.95, color: '#6fbf73', minutesPer100kg: 15 },
  pellet: { key: 'pellet', th: 'อัดเม็ด', product: 'อาหารสัตว์ / เชื้อเพลิงอัดเม็ด', yield: 0.85, color: '#e3b23c', minutesPer100kg: 60 },
  briquette: { key: 'briquette', th: 'อัดแท่ง', product: 'แท่งเชื้อเพลิง', yield: 0.8, color: '#e07b39', minutesPer100kg: 75, warmupMin: 15 },
};

// โหมดอัดเม็ดมีแม่พิมพ์ 2 ขนาด
export const PELLET_TYPES = { feed: 'อาหารสัตว์ (แม่พิมพ์เล็ก)', fuel: 'เชื้อเพลิง (แม่พิมพ์ใหญ่)' };

export const RESIDUES = {
  corn_cob: 'ซังข้าวโพด',
  corn_husk: 'เปลือกข้าวโพด',
  corn_stalk: 'ต้นข้าวโพด',
  rice_straw: 'ฟางข้าว',
  other: 'เศษพืชแห้งอื่น ๆ',
};

export const PURPOSES = {
  sell: 'ขายให้ผู้รับซื้อ (ได้เงิน)',
  self: 'แปรรูปแล้วรับกลับไปใช้เอง (จ่ายค่าบริการ)',
};

// บาท ต่อ กก. วัตถุดิบที่รับเข้า
export const PRICES = {
  chop: { buy: 0.6, fee: 0.3 },
  pellet: { buy: 1.0, fee: 0.8 },
  briquette: { buy: 1.2, fee: 1.0 },
};

export const MOISTURE_MAX = 20; // % เกินนี้เครื่องไม่รับ
export const PM25_G_PER_KG = 8; // กรัม PM2.5 ต่อเศษพืช 1 กก. ที่ถูกเผา (ค่าประมาณ ต้องอ้างอิงงานวิจัยก่อนใช้)
export const SERVICE_HOURS = 200; // ชั่วโมงทำงานต่อรอบบำรุงรักษา (ใบมีด/แม่พิมพ์)

export function round(n, d = 1) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/** คำนวณผลการแปรรูปหนึ่งครั้ง: amount > 0 = เกษตรกรได้รับ, < 0 = เกษตรกรจ่ายค่าบริการ */
export function settle({ mode, purpose, inputKg, outputKg }) {
  const p = PRICES[mode];
  if (!p) throw new Error('unknown mode');
  const amount = purpose === 'sell' ? inputKg * p.buy : -inputKg * p.fee;
  return {
    amount: round(amount, 2),
    savedKg: round(inputKg, 1),
    pm25g: Math.round(inputKg * PM25_G_PER_KG),
    yieldPct: Math.round((outputKg / inputKg) * 100),
  };
}

/** ต้องเดินเครื่องเปล่าไล่วัตถุดิบเก่าไหม (จากเชื้อเพลิง → อาหารสัตว์) */
export function needsFlush(prev, next) {
  if (!prev || !next) return false;
  const isFuel = (j) => j.mode === 'briquette' || (j.mode === 'pellet' && j.pelletType === 'fuel');
  return isFuel(prev) && next.mode === 'pellet' && next.pelletType === 'feed';
}

/** ซ่อนชื่อบางส่วนก่อนแสดงในที่สาธารณะ (PDPA: เก็บ/แสดงเท่าที่จำเป็น) */
export function maskName(name = '') {
  const [first, last] = name.trim().split(/\s+/);
  if (!first) return 'ไม่ระบุชื่อ';
  return last ? `${first} ${[...last][0]}.` : first;
}
