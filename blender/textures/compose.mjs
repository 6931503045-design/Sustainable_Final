// ประกอบภาพสำหรับโปสเตอร์จากผล render (รันหลัง build_model.py --render)
//   output/render_dims_labeled.png  ภาพบอกขนาด 85 × 180 × 60 ซม. + แถบระดับความสูง
//   output/render_hero.png          ตู้ + มือถือโชว์ใบรับของ LINE
// ใช้: node textures/compose.mjs   (รันจากโฟลเดอร์ blender/)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../output');
const fontDir = path.resolve(here, '../node_modules/@fontsource/prompt/files');
const font = [400, 600, 700]
  .flatMap((w) => ['thai', 'latin'].map((sub) => `@font-face{font-family:P;font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(`${fontDir}/prompt-${sub}-${w}-normal.woff2`).toString('base64')})}`))
  .join('');
const img = (f) => `data:image/png;base64,${fs.readFileSync(path.join(out, f)).toString('base64')}`;
const INK = '#1d2b22';
const BANDS = [
  ['0–30 ซม.', 'ถาดรับ 3 ช่อง + ตาชั่ง'],
  ['30–85 ซม.', 'A อัดเม็ด · C ช่องตรง · B อัดแท่ง'],
  ['85–100 ซม.', 'ลิ้นสลับทาง'],
  ['100–140 ซม.', 'เครื่องสับ (Hammer mill)'],
  ['140–180 ซม.', 'ช่องป้อน + หน้าจอ + สแกน QR'],
];

async function shot(page, w, h, body, file) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${font}*{margin:0;box-sizing:border-box}body{font-family:P,sans-serif;width:${w}px;height:${h}px;position:relative;overflow:hidden;color:${INK}}</style></head><body>${body}</body></html>`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.decode()));
  });
  await page.screenshot({ path: path.join(out, file) });
  console.log('wrote', file);
}

function dims() {
  const meta = JSON.parse(fs.readFileSync(path.join(out, 'render_dims.json'), 'utf8'));
  const { dim_front: f, dim_side: s } = meta.views;
  const H = meta.height;
  const L = 470; // ที่ว่างซ้ายสำหรับป้ายแถบ
  const top = 90;
  const fx = L, sx = L + f.width + 200;
  const W = sx + s.width + 220;
  const total = top + H + 150;
  const P = (v, p, ox) => [ox + p[0] * v.width, top + p[1] * H];
  const zs = f.z.map((p) => P(f, p, fx));
  const svg = [];
  const html = [];
  const line = (x1, y1, x2, y2, st = '') => svg.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="3" ${st}/>`);
  const tick = (x, y, horiz) => (horiz ? line(x, y - 14, x, y + 14) : line(x - 14, y, x + 14, y));
  // แถบระดับความสูง (ด้านหน้า)
  const bx = L - 40;
  zs.forEach(([x, y]) => line(bx - 10, y, x + f.width * 0.86, y, 'stroke-dasharray="10 8" stroke-opacity=".45"'));
  line(bx, zs[0][1], bx, zs.at(-1)[1]);
  zs.forEach(([, y]) => tick(bx, y, false));
  const ys = BANDS.map((_, i) => (zs[i][1] + zs[i + 1][1]) / 2);
  for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - 78); // กันป้ายแถบแคบซ้อนกัน
  BANDS.forEach(([h, t], i) => {
    const y = ys[i];
    html.push(`<div style="position:absolute;right:${W - bx + 22}px;top:${y - 34}px;text-align:right;line-height:1.2"><b style="font-size:30px">${h}</b><div style="font-size:24px">${t}</div></div>`);
  });
  // ความกว้าง 85 ซม.
  const [w1, w2] = f.w.map((p) => P(f, p, fx));
  const wy = w1[1] + 60;
  line(w1[0], wy, w2[0], wy);
  tick(w1[0], wy, true);
  tick(w2[0], wy, true);
  html.push(`<div style="position:absolute;left:${(w1[0] + w2[0]) / 2 - 100}px;width:200px;text-align:center;top:${wy + 8}px;font-size:34px;font-weight:700">85 ซม.</div>`);
  // ด้านข้าง: สูง 180 / ลึก 60
  const [s0, s1] = s.z.map((p) => P(s, p, sx));
  const hx = sx + s.width * Math.max(s.d[0][0], s.d[1][0]) + 60;
  line(hx, s0[1], hx, s1[1]);
  tick(hx, s0[1], false);
  tick(hx, s1[1], false);
  html.push(`<div style="position:absolute;left:${hx + 18}px;top:${(s0[1] + s1[1]) / 2 - 24}px;font-size:34px;font-weight:700">180 ซม.</div>`);
  const [d1, d2] = s.d.map((p) => P(s, p, sx));
  line(d1[0], wy, d2[0], wy);
  tick(d1[0], wy, true);
  tick(d2[0], wy, true);
  html.push(`<div style="position:absolute;left:${(d1[0] + d2[0]) / 2 - 100}px;width:200px;text-align:center;top:${wy + 8}px;font-size:34px;font-weight:700">60 ซม.</div>`);
  const title = (x, w, t) => html.push(`<div style="position:absolute;left:${x}px;width:${w}px;top:24px;text-align:center;font-size:32px;font-weight:600">${t}</div>`);
  title(fx, f.width, 'ด้านหน้า (มองทะลุ)');
  title(sx, s.width, 'ด้านข้าง');
  return [
    W,
    total,
    `<div style="position:absolute;inset:0;background:#fff"></div>
     <img src="${img(f.image)}" style="position:absolute;left:${fx}px;top:${top}px;width:${f.width}px;height:${H}px">
     <img src="${img(s.image)}" style="position:absolute;left:${sx}px;top:${top}px;width:${s.width}px;height:${H}px">
     <svg width="${W}" height="${total}" style="position:absolute;inset:0">${svg.join('')}</svg>${html.join('')}`,
  ];
}

function hero() {
  const W = 2000, H = 1400;
  return [
    W,
    H,
    `<div style="position:absolute;inset:0;background:radial-gradient(circle at 35% 45%,#ffffff,#e8eee5)"></div>
     <img src="${img('render_front.png')}" style="position:absolute;left:60px;top:40px;height:1340px">
     <img src="${img('render_phone.png')}" style="position:absolute;left:1060px;top:170px;height:1150px">
     <svg width="${W}" height="${H}" style="position:absolute;inset:0"><path d="M820 520 C 950 420, 1050 420, 1170 470" fill="none" stroke="#2f6b3a" stroke-width="8" stroke-dasharray="18 12"/><polygon points="1170,445 1205,480 1160,495" fill="#2f6b3a"/></svg>
     <div style="position:absolute;left:1180px;top:60px;width:760px">
       <div style="font-size:64px;font-weight:700;line-height:1.15">ชั่งเสร็จ<br><span style="color:#2f6b3a">ใบรับของเด้งเข้า LINE</span></div>
       <div style="font-size:30px;margin-top:10px;color:#3b4a40">รูปสินค้า · น้ำหนักก่อน/หลัง · ค่ารถ · ยอดเงินสุทธิ · ลดการเผากี่ กก.</div>
     </div>`,
  ];
}

const browser = await chromium.launch();
const page = await browser.newPage();
if (fs.existsSync(path.join(out, 'render_dims.json'))) await shot(page, ...dims(), 'render_dims_labeled.png');
if (fs.existsSync(path.join(out, 'render_phone.png'))) await shot(page, ...hero(), 'render_hero.png');
await browser.close();
