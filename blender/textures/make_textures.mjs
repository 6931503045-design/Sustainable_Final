// สร้างภาพ texture ภาษาไทย (ป้าย/หน้าจอ) ด้วย Chromium เพราะ Blender จัดวางสระ/วรรณยุกต์ไทยเองไม่ได้
// ใช้: node textures/make_textures.mjs   (รันจากโฟลเดอร์ blender/)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // ใช้ Playwright ที่ติดตั้งในเครื่อง
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODES, PELLET_TYPES, RESIDUES, settle } from '../../web/shared/rules.js'; // ใช้รหัส/สี/ราคาเดียวกับเว็บ

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
        ${Object.values(MODES)
          .map((m, i) => `<div style="flex:1;border-radius:24px;background:${m.color};color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:6px;${i === 0 ? 'outline:8px solid #fff;' : ''}">
            <div style="font-size:44px;font-weight:700;background:#ffffffd9;color:${DARK};border-radius:12px;padding:0 18px">${m.code}</div>
            <div style="font-size:68px;font-weight:700;line-height:1.1">${m.th}</div><div style="font-size:24px;text-align:center;padding:0 10px">${m.products.join(' / ')}</div></div>`).join('')}
      </div>
    </div>`],
  brand_plate: [1600, 400, `
    <div style="width:1600px;height:400px;background:${GREEN};color:#fff;display:flex;align-items:center;gap:40px;padding:0 70px">
      <div style="width:250px;height:250px;border-radius:50%;background:${STRAW};display:flex;align-items:center;justify-content:center;font-size:150px">🌾</div>
      <div><div style="font-size:150px;font-weight:700;line-height:1.1">ไร่ไม่เผา</div>
      <div style="font-size:48px;opacity:.9">เครื่องแปรรูปเศษวัสดุเกษตรอัจฉริยะ 3 in 1</div></div>
    </div>`],
  ...Object.fromEntries(Object.values(MODES).map((m) => [`label_${m.key}`, [800, 240, label(m)]])),
  phone_line: [750, 1624, phoneLine()],
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

function label(m) {
  return `<div style="width:800px;height:240px;background:${m.color};color:#fff;display:flex;align-items:center;gap:40px;padding:0 40px;border:10px solid ${DARK}">
    <div style="width:170px;height:170px;border-radius:24px;background:#fff;color:${DARK};display:grid;place-items:center;font-size:140px;font-weight:700">${m.code}</div>
    <div style="font-size:120px;font-weight:700">${m.th}</div></div>`;
}

// หน้าจอมือถือ: ใบรับของในแชต LINE (ตัวเลขคำนวณจากกติกาเดียวกับระบบจริง)
function phoneLine() {
  const ex = { residue: 'corn', mode: 'pellet', pelletType: 'feed', purpose: 'sell', inputKg: 402.5, outputKg: 342.1, moisture: 13 };
  const q = settle({ ...ex, pickupKm: 5.1 });
  const b = (n) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';
  const img = path.resolve(here, '../output/receipt-pellet.jpg');
  const hero = fs.existsSync(img) ? `<img src="data:image/jpeg;base64,${fs.readFileSync(img).toString('base64')}" style="width:100%;height:330px;object-fit:cover;display:block">` : '';
  const r = (k, v, st = '') => `<div style="display:flex;justify-content:space-between;font-size:30px;padding:5px 0"><span style="color:#6b7280">${k}</span><span style="${st}">${v}</span></div>`;
  return `<div style="width:750px;height:1624px;background:#8cabd9;display:flex;flex-direction:column">
    <div style="height:110px"></div>
    <div style="background:#273246;color:#fff;font-size:36px;font-weight:600;padding:24px 34px;display:flex;gap:22px;align-items:center">‹ <span style="width:64px;height:64px;border-radius:50%;background:${GREEN};display:grid;place-items:center">🌾</span> ไร่ไม่เผา</div>
    <div style="padding:30px 34px;display:flex;gap:18px;align-items:flex-start">
      <div style="width:70px;height:70px;border-radius:50%;background:${GREEN};display:grid;place-items:center;font-size:40px;flex:none">🌾</div>
      <div style="background:#fff;border-radius:28px;overflow:hidden;width:560px;box-shadow:0 2px 6px #0002">
        <div style="background:${GREEN};color:#fff;padding:24px 28px"><div style="font-size:38px;font-weight:700">🧾 ใบรับของ ไร่ไม่เผา</div><div style="font-size:24px;opacity:.85">ล็อต LT-4821K · 14 พ.ย. 2569 10:42</div></div>
        ${hero}
        <div style="padding:20px 28px">
          ${r('วัตถุดิบ', RESIDUES[ex.residue].th)}
          ${r('โหมด', `A · อัดเม็ด · ${PELLET_TYPES.feed.split(' ')[0]}`, 'font-weight:700')}
          ${r('ก่อน → หลัง', `${ex.inputKg} → ${ex.outputKg} กก.`)}
          ${r('ความชื้น', `${ex.moisture}%`)}
          <div style="border-top:2px solid #eee;margin:10px 0"></div>
          ${r(`ค่าเศษพืช (${RESIDUES[ex.residue].buy} ฿/กก.)`, b(q.gross))}
          ${r('ค่ารถรับของ (5.1 กม.)', '- ' + b(q.pickupFee))}
          ${r('ยอดสุทธิที่ได้รับ', b(q.amount), `font-weight:700;color:${GREEN};font-size:36px`)}
          <div style="background:#eef6ef;border-radius:16px;padding:16px 20px;margin-top:14px;color:${GREEN};font-size:28px;font-weight:600">🌱 คุณช่วยลดการเผาได้ ${ex.inputKg} กก.<div style="font-size:22px;color:#4b5563;font-weight:400">≈ ลดฝุ่น PM2.5 ประมาณ ${q.pm25g} กรัม</div></div>
        </div>
      </div>
    </div>
  </div>`;
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
