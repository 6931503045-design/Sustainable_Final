// กติกาทางธุรกิจที่ใช้ร่วมกันทั้งหน้าเว็บ ข้อความ LINE และ API
// ⚠️ ตัวเลขทั้งหมดเป็น "ค่าสมมติสำหรับต้นแบบ" กลุ่มตกลงราคาจริงแล้วแก้ที่ไฟล์นี้ไฟล์เดียว

// 3 โหมด → 6 สินค้า (รหัส A/B/C และสีตรงกับโปสเตอร์และโมเดล 3D)
export const MODES = {
  pellet: { key: 'pellet', code: 'A', th: 'อัดเม็ด', en: 'Pellet', products: ['อาหารสัตว์อัดเม็ด', 'เชื้อเพลิงอัดเม็ด'], products_en: ['Feed pellets', 'Fuel pellets'], yield: 0.85, color: '#3f9b4b', minutesPer100kg: 60 },
  briquette: { key: 'briquette', code: 'B', th: 'อัดแท่ง', en: 'Briquette', products: ['แท่งเชื้อเพลิง'], products_en: ['Fuel briquettes'], yield: 0.8, color: '#e07b39', minutesPer100kg: 75, warmupMin: 15 },
  chop: { key: 'chop', code: 'C', th: 'สับ', en: 'Chop', products: ['วัสดุคลุมดิน', 'วัสดุเพาะเห็ด', 'วัตถุดิบทำปุ๋ยหมัก'], products_en: ['Mulch', 'Mushroom substrate', 'Compost feedstock'], yield: 0.95, color: '#3b82c4', minutesPer100kg: 15 },
};
export const modeLabel = (k) => `${MODES[k].code} · ${MODES[k].th}`;

// โหมดอัดเม็ดมีแม่พิมพ์ 2 ขนาด
export const PELLET_TYPES = { feed: 'อาหารสัตว์ (แม่พิมพ์เล็ก)', fuel: 'เชื้อเพลิง (แม่พิมพ์ใหญ่)' };
export const PELLET_TYPES_EN = { feed: 'Animal feed (small die)', fuel: 'Fuel (large die)' };

// วัตถุดิบ 4 ชนิด พร้อมราคารับซื้อ (บาท/กก. ที่ชั่งตอนรับเข้า)
export const RESIDUES = {
  corn: { th: 'ต้น ซัง และเปลือกข้าวโพด', en: 'Corn stalks, cobs & husks', buy: 1.0 },
  rice_straw: { th: 'ฟางและตอซังข้าว', en: 'Rice straw & stubble', buy: 1.2 },
  sugarcane_leaf: { th: 'ใบอ้อย', en: 'Sugarcane leaves', buy: 0.8 },
  orchard_branch: { th: 'กิ่งไม้ตัดแต่งสวน (ลำไย/ลิ้นจี่)', en: 'Orchard prunings (longan/lychee)', buy: 1.5 },
};
export const residueName = (k) => RESIDUES[k]?.th || k;

export const PURPOSES = {
  sell: 'ขายให้ไร่ไม่เผา (ได้เงิน)',
  self: 'แปรรูปแล้วรับกลับไปใช้เอง (จ่ายค่าบริการ)',
};
export const PURPOSES_EN = { sell: 'Sell to Rai Mai Phao (get paid)', self: 'Process & take it home (pay a service fee)' };

// ค่าบริการแปรรูปเมื่อรับกลับไปใช้เอง (บาท/กก.)
export const SERVICE_FEE = { pellet: 0.8, briquette: 1.0, chop: 0.3 };

// ความชื้น: ยิ่งแห้งยิ่งได้ราคาเต็ม
export const MOISTURE_MAX = 20; // % เกินนี้เครื่องไม่รับ
export const MOISTURE_TIERS = [
  { max: 15, factor: 1.0, th: 'แห้งดี (≤ 15%) ราคาเต็ม', en: 'Dry (≤ 15%): full price' },
  { max: 20, factor: 0.9, th: 'ค่อนข้างชื้น (15–20%) ลด 10%', en: 'Slightly damp (15–20%): −10%' },
];
export const moistureFactor = (m) => (MOISTURE_TIERS.find((t) => m <= t.max) || { factor: 0 }).factor;

// ระบบรับของถึงที่ (แบบ Grab): คนในพื้นที่ขับรถไปรับ ได้ค่าจ้าง ไร่ไม่เผาหักค่าแพลตฟอร์ม
export const PICKUP = {
  base: 20, // บาท/งาน
  perKm: 4, // บาท/กม. (ระยะทางถนนโดยประมาณ)
  perKg: 0.1, // บาท/กก.
  driverShare: 0.9, // คนขับได้ 90% ที่เหลือเป็นค่าแพลตฟอร์ม
  maxKm: 30,
  roadFactor: 1.3, // ระยะถนน ≈ ระยะเส้นตรง × 1.3
};
export const VEHICLES = {
  pickup: { th: 'รถกระบะ', en: 'Pickup truck', capacityKg: 800 },
  etan: { th: 'รถอีแต๋น / รถไถเดินตามพ่วง', en: 'Farm tractor with trailer', capacityKg: 1000 },
  moto: { th: 'มอเตอร์ไซค์พ่วงข้าง', en: 'Motorcycle with sidecar', capacityKg: 150 },
};

// ที่ตั้งตู้ต้นแบบ (สมมติ: ลานตากชุมชน อ.แม่จัน เชียงราย)
export const MACHINE = { id: 'RMP-01', th: 'ลานตากชุมชนบ้านห้วยไคร้', en: 'Huai Khrai community drying yard', lat: 20.146, lng: 99.852 };

export const PM25_G_PER_KG = 8; // กรัม PM2.5 ต่อเศษพืช 1 กก. ที่ถูกเผา (ค่าประมาณ ต้องอ้างอิงงานวิจัยก่อนใช้)
export const SERVICE_HOURS = 200; // ชั่วโมงทำงานต่อรอบบำรุงรักษา (ใบมีด/แม่พิมพ์)

export function round(n, d = 1) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function distanceKm(a, b = MACHINE) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return round(2 * R * Math.asin(Math.sqrt(h)) * PICKUP.roadFactor, 1);
}

export function pickupFee(km, kg) {
  const fee = Math.round(PICKUP.base + km * PICKUP.perKm + kg * PICKUP.perKg);
  return { fee, driver: round(fee * PICKUP.driverShare, 2), platform: round(fee * (1 - PICKUP.driverShare), 2) };
}

/**
 * คำนวณยอดเงินหนึ่งครั้ง (ใช้ทั้งใบเสนอราคาก่อนส่งของ และใบรับของจริง)
 * amount > 0 = ไร่ไม่เผาจ่ายเกษตรกร, < 0 = เกษตรกรจ่ายค่าบริการ
 */
export function settle({ residue, mode, purpose, inputKg, outputKg, moisture = 0, pickupKm = null }) {
  const gross = purpose === 'sell' ? inputKg * (RESIDUES[residue]?.buy ?? 0) * moistureFactor(moisture) : -inputKg * SERVICE_FEE[mode];
  const pick = pickupKm == null ? null : pickupFee(pickupKm, inputKg);
  return {
    gross: round(gross, 2),
    pickupFee: pick ? pick.fee : 0,
    driverEarn: pick ? pick.driver : 0,
    amount: round(gross - (pick ? pick.fee : 0), 2),
    savedKg: round(inputKg, 1),
    pm25g: Math.round(inputKg * PM25_G_PER_KG),
    yieldPct: outputKg ? Math.round((outputKg / inputKg) * 100) : null,
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

/** ปัดพิกัดเหลือ ~1 กม. สำหรับแสดงก่อนคนขับรับงาน */
export const coarse = ({ lat, lng }) => ({ lat: round(lat, 2), lng: round(lng, 2) });
