// สร้างรูป Rich menu (2500x1686) สำหรับอัปโหลดใน LINE Official Account Manager
// ใช้: node scripts/make-richmenu.mjs  → ../docs/line/richmenu.png
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const fonts = path.resolve(here, '../node_modules/@fontsource/prompt/files');
// Rich menu แบบใหญ่ 2×2 (2500×1686) — เทมเพลต "ใหญ่ 4 ช่อง" ใน LINE OA Manager
const cells = [
  ['🌾', 'ขาย / เรียกรถรับ', 'แจ้งเศษพืช + รับ QR', '#2f6b3a', '#fff'],
  ['💰', 'ราคารับซื้อ', 'ตาราง + คำนวณรายได้', '#e3b23c', '#1d2b22'],
  ['🧾', 'ล็อตของฉัน', 'สถานะรถ / QR / สิทธิ์ PDPA', '#3b82c4', '#fff'],
  ['🛻', 'ขับรถรับของ', 'คนในพื้นที่ รับงาน ได้ค่าจ้าง', '#e07b39', '#1d2b22'],
];
const html = `<!doctype html><meta charset="utf-8"><style>
${[400, 700].flatMap((w) => ['thai', 'latin'].map((sub) => `@font-face{font-family:P;font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(`${fonts}/prompt-${sub}-${w}-normal.woff2`).toString('base64')})}`)).join('')}
*{margin:0}body{width:2500px;height:1686px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;font-family:P}
div{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;border:4px solid #ffffff55}
i{font-style:normal;font-size:220px}b{font-size:140px;font-weight:700;line-height:1.2}span{font-size:64px;opacity:.85}</style>
${cells.map(([i, t, s, bg, fg]) => `<div style="background:${bg};color:${fg}"><i>${i}</i><b>${t}</b><span>${s}</span></div>`).join('')}`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 2500, height: 1686 } });
await p.setContent(html);
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: path.resolve(here, '../../docs/line/richmenu.png') });
await b.close();
console.log('wrote docs/line/richmenu.png');
