// สร้างภาพ texture ภาษาไทย (ป้าย/หน้าจอ) ด้วย Chromium เพราะ Blender จัดวางสระ/วรรณยุกต์ไทยเองไม่ได้
// ใช้: node textures/make_textures.mjs   (รันจากโฟลเดอร์ blender/)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // ใช้ Playwright ที่ติดตั้งในเครื่อง
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const fontDir = path.resolve(here, '../node_modules/@fontsource/prompt/files');
// ฝังฟอนต์เป็น data URL (หน้า about:blank โหลดไฟล์ file:// ไม่ได้)
const font = (w) => ['thai', 'latin'].map((sub) => `@font-face{font-family:P;font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(`${fontDir}/prompt-${sub}-${w}-normal.woff2`).toString('base64')})}`).join('');
const base = `${font(400)}${font(600)}${font(700)}
*{margin:0;box-sizing:border-box}body{font-family:P,sans-serif;overflow:hidden}`;

const GREEN = '#2f6b3a', STRAW = '#e3b23c', DARK = '#1d2b22';

const textures = {
  screen_ui: [1200, 800, `
    <div style="width:1200px;height:800px;background:linear-gradient(160deg,#10261a,#1b4029);color:#fff;padding:36px 44px;display:flex;flex-direction:column;gap:22px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:54px;font-weight:700">🌾 ไร่ไม่เผา</div>
        <div style="font-size:30px;opacity:.8">ล็อต #LT-0142 · สมชาย ใจดี</div>
      </div>
      <div style="display:flex;gap:22px;font-size:30px">
        <div style="flex:1;background:#ffffff1a;border-radius:18px;padding:18px 24px">น้ำหนักรับเข้า<br><b style="font-size:56px">48.6 กก.</b></div>
        <div style="flex:1;background:#ffffff1a;border-radius:18px;padding:18px 24px">ความชื้น<br><b style="font-size:56px;color:#8fe39a">13% ✓</b></div>
      </div>
      <div style="font-size:32px;opacity:.85">เลือกโหมดแปรรูป</div>
      <div style="display:flex;gap:22px;flex:1">
        ${[['สับ', '#6fbf73', 'วัสดุคลุมดิน / เพาะเห็ด'], ['อัดเม็ด', STRAW, 'อาหารสัตว์ / เชื้อเพลิง'], ['อัดแท่ง', '#e07b39', 'แท่งเชื้อเพลิง']]
          .map(([t, c, s], i) => `<div style="flex:1;border-radius:24px;background:${c};color:${DARK};display:flex;flex-direction:column;justify-content:center;align-items:center;${i === 1 ? 'outline:8px solid #fff;' : ''}">
            <div style="font-size:72px;font-weight:700">${t}</div><div style="font-size:26px">${s}</div></div>`).join('')}
      </div>
    </div>`],
  brand_plate: [1600, 400, `
    <div style="width:1600px;height:400px;background:${GREEN};color:#fff;display:flex;align-items:center;gap:40px;padding:0 70px">
      <div style="width:250px;height:250px;border-radius:50%;background:${STRAW};display:flex;align-items:center;justify-content:center;font-size:150px">🌾</div>
      <div><div style="font-size:150px;font-weight:700;line-height:1.1">ไร่ไม่เผา</div>
      <div style="font-size:48px;opacity:.9">เครื่องแปรรูปเศษวัสดุเกษตรอัจฉริยะ 3 in 1</div></div>
    </div>`],
  label_chop: [800, 240, label('สับ', '#6fbf73', 'CHOP')],
  label_pellet: [800, 240, label('อัดเม็ด', STRAW, 'PELLET')],
  label_briquette: [800, 240, label('อัดแท่ง', '#e07b39', 'BRIQUETTE')],
  warning: [800, 1000, `
    <div style="width:800px;height:1000px;background:#ffd21f;border:36px solid #111;padding:36px;color:#111;display:flex;flex-direction:column;gap:26px">
      <div style="font-size:110px;font-weight:700;text-align:center">⚠ คำเตือน</div>
      ${['ห้ามล้วงมือเข้าช่องป้อน', 'ฝุ่นพืชติดไฟได้ ห้ามสูบบุหรี่', 'เกลียวอัดแท่งร้อน ห้ามสัมผัส', 'เปิดฝา = เครื่องหยุดทันที', 'สวมแว่นและหน้ากากกันฝุ่น']
        .map((t) => `<div style="font-size:44px;font-weight:600;border-bottom:4px solid #111;padding-bottom:12px">• ${t}</div>`).join('')}
    </div>`],
  door_label: [1000, 300, `
    <div style="width:1000px;height:300px;background:#fff;border:14px solid ${GREEN};color:${DARK};display:flex;flex-direction:column;justify-content:center;align-items:center">
      <div style="font-size:72px;font-weight:700">ประตูซ่อมบำรุง</div>
      <div style="font-size:42px">ตัดไฟและล็อกก่อนเปิดทุกครั้ง</div>
    </div>`],
  estop_ring: [600, 600, `
    <div style="width:600px;height:600px;border-radius:50%;background:#ffd21f;display:flex;align-items:flex-end;justify-content:center;padding-bottom:40px">
      <div style="font-size:70px;font-weight:700;color:#111">หยุดฉุกเฉิน</div>
    </div>`],
};

function label(th, color, en) {
  return `<div style="width:800px;height:240px;background:${color};color:${DARK};display:flex;align-items:center;justify-content:space-between;padding:0 50px;border:10px solid ${DARK}">
    <div style="font-size:120px;font-weight:700">${th}</div><div style="font-size:54px;font-weight:600;opacity:.75">${en}</div></div>`;
}

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, [w, h, body]] of Object.entries(textures)) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${base}</style></head><body>${body}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(here, `${name}.png`), omitBackground: name === 'estop_ring' });
  console.log('wrote', name);
}
await browser.close();
