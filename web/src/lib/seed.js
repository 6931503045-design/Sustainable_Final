// ข้อมูลจำลองสำหรับ Dashboard ตอนเดโม (ติดป้าย "ข้อมูลจำลอง" ทุกครั้งที่แสดง)
import { MODES, round, settle } from '../../shared/rules.js';

const VILLAGES = ['บ้านป่าซางนาเงิน', 'บ้านห้วยไคร้', 'บ้านแม่จันหลวง', 'บ้านสันกลาง', 'บ้านดอยฮาง'];
const NAMES = ['สมชาย ใ.', 'บุญมี ศ.', 'อาเจ๊ะ ม.', 'นวล ค.', 'จะลอ ย.', 'ประเสริฐ ท.', 'มาลี ส.', 'อายี แ.'];
const MODE_KEYS = Object.keys(MODES);

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export function seedJobs(days = 21) {
  const r = rng(42);
  const out = [];
  const now = Date.now();
  for (let i = 0; i < 46; i++) {
    const mode = MODE_KEYS[Math.floor(r() * 3)];
    const purpose = r() < 0.7 ? 'sell' : 'self';
    const inputKg = round(40 + r() * 260, 1);
    const outputKg = round(inputKg * MODES[mode].yield * (0.97 + r() * 0.05), 1);
    out.push({
      id: `SEED-${i}`,
      lotId: `LT-${1000 + i}`,
      name: NAMES[Math.floor(r() * NAMES.length)],
      village: VILLAGES[Math.floor(r() * VILLAGES.length)],
      mode,
      pelletType: mode === 'pellet' ? (r() < 0.5 ? 'feed' : 'fuel') : null,
      purpose,
      moisture: round(9 + r() * 9, 1),
      inputKg,
      outputKg,
      ...settle({ mode, purpose, inputKg, outputKg }),
      at: new Date(now - (days - (i / 46) * days) * 86400000).toISOString(),
      seed: true,
    });
  }
  return out.reverse();
}

export const SEED_MACHINE_HOURS = 176; // ชั่วโมงทำงานตั้งต้นของตู้ทดลอง (ใกล้ถึงรอบ 200 ชม. เพื่อโชว์การแจ้งเตือน)
