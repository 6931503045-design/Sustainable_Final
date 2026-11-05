// ภาพร่างสิ่งพิมพ์ในบูธ (ฟิวเจอร์บอร์ด 3 ทบ, ผ้าหน้าโต๊ะ, ป้าย QR) ใช้เป็น texture ในภาพจำลองบูธ
// และใช้เป็น "ต้นแบบ" ให้ทีมออกแบบไปทำไฟล์พิมพ์จริง · ใช้: node booth/make_booth_textures.mjs (จากโฟลเดอร์ blender/)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODES, RESIDUES } from '../../web/shared/rules.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const QRCode = createRequire(path.resolve('../web/package.json'))('qrcode');

const here = path.dirname(fileURLToPath(import.meta.url));
const tex = path.join(here, 'tex');
const fontDir = path.resolve(here, '../node_modules/@fontsource/prompt/files');
const SITE = process.env.SITE_URL || 'https://rai-mai-phao.vercel.app';
const font = [400, 600, 700]
  .flatMap((w) => ['thai', 'latin'].map((s) => `@font-face{font-family:P;font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(`${fontDir}/prompt-${s}-${w}-normal.woff2`).toString('base64')})}`))
  .join('');
const img = (f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
const out = path.resolve(here, '../output');
const qr = await QRCode.toDataURL(SITE, { width: 600, margin: 1, color: { dark: '#1d2b22' } });
const G = '#2f6b3a', S = '#e3b23c', INK = '#1d2b22';
const head = (t, c = G) => `<div style="background:${c};color:#fff;font-weight:700;font-size:56px;padding:18px 30px;border-radius:20px">${t}</div>`;

const panels = {
  // ปีกซ้าย 30×90 ซม.
  board_left: [600, 1800, `
    <div style="padding:34px;display:flex;flex-direction:column;gap:26px;height:100%;background:#f6f5ef">
      ${head('ปัญหา', '#b45309')}
      <div style="font-size:40px;line-height:1.45">🔥 เผาเศษพืชหลังเก็บเกี่ยว<br>😷 ฝุ่น PM2.5 ทั้งจังหวัด<br>💸 เศษพืช "ไม่มีราคา"</div>
      <div style="background:#fff;border:3px dashed #b45309;border-radius:16px;padding:16px;font-size:30px;color:#b45309">📌 ใส่ตัวเลขฝุ่น/จุดความร้อนจริง + แหล่งอ้างอิง</div>
      ${head('ทางออก')}
      <div style="font-size:38px;line-height:1.4">ตู้แปรรูป 3 in 1 + ระบบ LINE<br>รับซื้อ + รถคนในชุมชนไปรับถึงไร่</div>
      <img src="${img(path.join(out, 'render_front.png'))}" style="width:100%;flex:1;object-fit:contain">
    </div>`],
  // แผงกลาง 60×90 ซม. — Business Model Canvas
  board_center: [1200, 1800, `
    <div style="padding:34px;height:100%;display:flex;flex-direction:column;gap:20px;background:#fff">
      <div style="display:flex;align-items:center;gap:20px"><div style="font-size:90px">🌾</div><div><div style="font-size:84px;font-weight:700;color:${G};line-height:1">ไร่ไม่เผา</div><div style="font-size:34px">Business Model Canvas</div></div></div>
      <div style="flex:1;display:grid;gap:12px;grid-template-columns:repeat(5,1fr);grid-template-rows:1fr 1fr .7fr;grid-template-areas:'kp ka vp cr cs' 'kp kr vp ch cs' 'co co co re re';font-size:24px;line-height:1.35">
        ${[
          ['kp', 'พันธมิตรหลัก', 'วิสาหกิจชุมชน · อบต. · มฟล. · ฟาร์มเห็ด สหกรณ์โคนม โรงอบลำไย · คนขับในพื้นที่'],
          ['ka', 'กิจกรรมหลัก', 'รับซื้อ แปรรูป ขาย · ดูแล LINE · ซ่อมบำรุง'],
          ['kr', 'ทรัพยากรหลัก', 'ตู้ 3 in 1 · ระบบ LINE · เครือข่ายคนขับ'],
          ['vp', 'คุณค่าที่ส่งมอบ', 'เศษพืชมีราคา ไม่ต้องเผา · รถไปรับถึงไร่ · วัตถุดิบตรวจสอบได้ · อากาศสะอาด'],
          ['cr', 'ความสัมพันธ์', 'LINE OA · ใบรับของโปร่งใส · Dashboard'],
          ['ch', 'ช่องทาง', 'LINE OA · ลานตากชุมชน · ผู้ใหญ่บ้าน'],
          ['cs', 'กลุ่มลูกค้า', 'เกษตรกรผู้ขาย · ผู้ซื้อสินค้า 6 แบบ · คนขับ'],
          ['co', 'ต้นทุน', 'ตู้ · ไฟฟ้า (+โซลาร์) · รับซื้อวัตถุดิบ · ซ่อมบำรุง · แรงงาน'],
          ['re', 'รายได้', 'ขายสินค้า 6 แบบ · ค่าบริการแปรรูป · ค่าแพลตฟอร์ม 10%'],
        ].map(([a, h, b]) => `<div style="grid-area:${a};border:3px solid ${a === 'vp' ? '#e07b39' : G};border-radius:14px;padding:12px"><b style="font-size:28px;color:${a === 'vp' ? '#e07b39' : G}">${h}</b><div>${b}</div></div>`).join('')}
      </div>
      <div style="display:flex;gap:12px">${Object.values(MODES).map((m) => `<div style="flex:1;background:${m.color};color:#fff;border-radius:14px;padding:12px 16px;font-size:28px"><b>${m.code} ${m.th}</b><br><span style="font-size:22px">${m.products.join(' · ')}</span></div>`).join('')}</div>
    </div>`],
  // ปีกขวา 30×90 ซม.
  board_right: [600, 1800, `
    <div style="padding:34px;display:flex;flex-direction:column;gap:24px;height:100%;background:#f6f5ef">
      ${head('ผลกระทบ')}
      <div style="font-size:36px;line-height:1.5">🧑‍🤝‍🧑 รายได้เกษตรกร + คนขับ<br>🌏 ลดเผา ลด PM2.5<br>💰 ขายสินค้า 6 แบบ</div>
      <div style="font-size:28px;color:#5f6f64">วัตถุดิบ: ${Object.values(RESIDUES).map((r) => r.th).join(' · ')}</div>
      ${head('ทีม', S)}
      <div style="font-size:28px;line-height:1.6;color:#5f6f64">📌 รูป + ชื่อ + หน้าที่ 9 คน</div>
      <div style="flex:1"></div>
      <div style="background:#fff;border-radius:20px;padding:20px;text-align:center"><img src="${qr}" style="width:80%"><div style="font-size:34px;font-weight:700">สแกนลองใช้จริง</div></div>
    </div>`],
  // ผ้าหน้าโต๊ะ 150×70 ซม.
  skirt: [2400, 1120, `
    <div style="height:100%;background:linear-gradient(135deg,${G},#1f4a28);color:#fff;display:flex;align-items:center;gap:70px;padding:0 110px">
      <div style="flex:1"><div style="font-size:240px;font-weight:700;line-height:1">🌾 ไร่ไม่เผา</div>
      <div style="font-size:78px;margin-top:20px">เปลี่ยนเศษพืชที่เคยเผา ให้เป็นรายได้</div>
      <div style="font-size:58px;margin-top:30px;color:${S};font-weight:600">🗳️ ชอบโปรเจกต์นี้ โหวตให้เราด้วยนะ!</div></div>
      <div style="background:#fff;border-radius:40px;padding:34px;text-align:center"><img src="${qr}" style="width:520px"><div style="color:${INK};font-size:54px;font-weight:700">สแกนลองใช้</div></div>
    </div>`],
  // ป้ายตั้งโต๊ะ A5
  qr_stand: [740, 1050, `
    <div style="height:100%;background:#fff;border:16px solid ${G};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:30px;text-align:center">
      <div style="font-size:64px;font-weight:700;color:${G}">ลองขายเศษพืช</div><div style="font-size:40px">ผ่าน LINE ได้เลย</div>
      <img src="${qr}" style="width:80%"><div style="font-size:34px;color:#5f6f64">เพิ่มเพื่อน · แจ้งขาย · เรียกรถ</div>
    </div>`],
  // ป้ายใต้โมเดล
  model_tag: [900, 300, `
    <div style="height:100%;background:#fff;border:10px solid ${INK};display:flex;flex-direction:column;justify-content:center;padding:0 40px">
      <div style="font-size:64px;font-weight:700">โมเดลพิมพ์ 3D · 1:8</div><div style="font-size:40px">ตู้จริง 85 × 180 × 60 ซม. · 3 โหมด A B C</div>
    </div>`],
};

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, [w, h, body]] of Object.entries(panels)) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>${font}*{margin:0;box-sizing:border-box}body{width:${w}px;height:${h}px;font-family:P,sans-serif;color:${INK};overflow:hidden}</style>${body}`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.decode()));
  });
  await page.screenshot({ path: path.join(tex, `${name}.png`) });
  console.log('wrote', name);
}
await browser.close();
