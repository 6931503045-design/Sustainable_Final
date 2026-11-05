// ใส่หมายเลข คำอธิบาย และระยะ ลงบนภาพจำลองบูธ → booth/output/booth_layout.png + booth_plan.png
// ใช้: node booth/booth_compose.mjs (จากโฟลเดอร์ blender/ หลังรัน booth_mockup.py)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'output');
const fontDir = path.resolve(here, '../node_modules/@fontsource/prompt/files');
const font = [400, 600, 700]
  .flatMap((w) => ['thai', 'latin'].map((s) => `@font-face{font-family:P;font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(`${fontDir}/prompt-${s}-${w}-normal.woff2`).toString('base64')})}`))
  .join('');
const img = (f) => `data:image/png;base64,${fs.readFileSync(path.join(out, f)).toString('base64')}`;
const meta = JSON.parse(fs.readFileSync(path.join(out, 'booth_points.json'), 'utf8'));
const G = '#2f6b3a', INK = '#1d2b22';

// หมายเลข → [จุด, ชื่อ, รายละเอียด]
const ITEMS = [
  ['monitor', 'จอคอม 22–24"', 'เปิดหน้า /present (สไลด์ + โมเดล 3D + flow) ตั้งให้เล่นวนเอง กรรมการกดเล่นเองได้'],
  ['board_left', 'ฟิวเจอร์บอร์ด ปีกซ้าย 30×90 ซม.', 'ปัญหา → ทางออก (เนื้อหาไว้ครึ่งบน เพราะจอบังครึ่งล่าง)'],
  ['board_center', 'ฟิวเจอร์บอร์ด กลาง 60×90 ซม.', 'Business Model Canvas + 3 โหมด A/B/C (ข้อมูลหลักสำหรับกรรมการ)'],
  ['board_right', 'ฟิวเจอร์บอร์ด ปีกขวา 30×90 ซม.', 'ผลกระทบ + ทีม 9 คน + QR เว็บไซต์'],
  ['model', 'โมเดลตู้พิมพ์ 3D (1:8 สูง ~22.5 ซม.)', 'วางบนแท่นหมุน ตรงกลางให้เด่น + ป้ายบอกสเกล ใช้คู่กับจุดชี้ชิ้นส่วนในเว็บ'],
  ['jars', 'ขวดตัวอย่าง 4 ขวด', 'เศษพืชดิบ → C สับ → A อัดเม็ด → B อัดแท่ง ให้คนหยิบดูได้'],
  ['tablet', 'แท็บเล็ต (หน้าจอตู้)', 'เปิด /kiosk ให้ผู้ชมลองสแกน QR → แปรรูป → ใบรับของเข้า LINE'],
  ['qr', 'ป้าย QR A5', 'สแกนเพิ่มเพื่อน LINE OA แล้วลองแจ้งขาย / เรียกรถ'],
  ['skirt', 'ผ้า/ไวนิลหน้าโต๊ะ 150×70 ซม.', 'โลโก้ + สโลแกน + QR "โหวตให้เรา" (มองเห็นจากทางเดิน)'],
];

const badge = (n, x, y, size = 46) =>
  `<div style="position:absolute;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;background:#e3b23c;border:4px solid ${INK};display:grid;place-items:center;font-weight:700;font-size:${size * 0.5}px;box-shadow:0 2px 8px #0006">${n}</div>`;

async function shot(page, w, h, body, file) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>${font}*{margin:0;box-sizing:border-box}body{width:${w}px;height:${h}px;position:relative;font-family:P,sans-serif;color:${INK};background:#f6f5ef;overflow:hidden}</style>${body}`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.decode()));
  });
  await page.screenshot({ path: path.join(out, file) });
  console.log('wrote', file);
}

// ---------------- ภาพมุมผู้ชม + คำอธิบาย
function layoutSheet() {
  const v = meta.view;
  const LW = 760;
  const W = v.width + LW, H = Math.max(v.height, 1000);
  const badges = ITEMS.map(([k], i) => badge(i + 1, v.points[k][0] * v.width, v.points[k][1] * v.height)).join('');
  const legend = ITEMS.map(
    ([, name, desc], i) => `<div style="display:flex;gap:16px;margin-bottom:16px">${`<div style="flex:none;width:44px;height:44px;border-radius:50%;background:#e3b23c;border:3px solid ${INK};display:grid;place-items:center;font-weight:700;font-size:22px">${i + 1}</div>`}
    <div><b style="font-size:24px">${name}</b><div style="font-size:19px;color:#3b4a40">${desc}</div></div></div>`,
  ).join('');
  return [
    W,
    H,
    `<img src="${img(v.image)}" style="position:absolute;left:0;top:0;width:${v.width}px;height:${v.height}px">${badges}
     <div style="position:absolute;left:${v.width}px;top:0;width:${LW}px;height:${H}px;padding:36px 40px;background:#fff">
       <div style="font-size:40px;font-weight:700;color:${G}">ร่างการจัดบูธ ไร่ไม่เผา</div>
       <div style="font-size:20px;color:#5f6f64;margin-bottom:24px">โต๊ะพับ 150 × 60 × 75 ซม. · มุมมองจากทางเดิน (กรรมการ/ผู้ชม)</div>
       ${legend}
     </div>`,
  ];
}

// ---------------- แปลนด้านบน + ภาพด้านหน้า พร้อมระยะ
function planSheet() {
  const t = meta.top, f = meta.front;
  const PAD = 60, GAP = 80, TITLE = 110;
  const W = PAD * 2 + t.width + GAP + f.width, H = TITLE + Math.max(t.height, f.height) + 140;
  const fx = PAD + t.width + GAP;
  const P = (v, p, ox) => [ox + p[0] * v.width, TITLE + p[1] * v.height];
  const svg = [];
  const html = [];
  const dim = (a, b, label, offX, offY, vertical = false) => {
    const [x1, y1] = [a[0] + offX, a[1] + offY], [x2, y2] = [b[0] + offX, b[1] + offY];
    svg.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="3" marker-start="url(#a)" marker-end="url(#a)"/>`);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    html.push(`<div style="position:absolute;left:${mx + (vertical ? 14 : -90)}px;top:${my + (vertical ? -20 : 8)}px;width:${vertical ? 'auto' : '180px'};text-align:center;font-weight:700;font-size:26px;background:#f6f5efcc;padding:0 6px">${label}</div>`);
  };
  // แปลน: ยาว 150 / ลึก 60
  dim(P(t, t.dims.table_l[0], PAD), P(t, t.dims.table_l[1], PAD), '150 ซม.', 0, 50);
  dim(P(t, t.dims.table_d[0], PAD), P(t, t.dims.table_d[1], PAD), '60 ซม.', 40, 0, true);
  // ด้านหน้า: สูงโต๊ะ 75 / บอร์ด 90
  dim(P(f, f.dims.table_h[0], fx), P(f, f.dims.table_h[1], fx), '75 ซม.', 70, 0, true);
  dim(P(f, f.dims.board_h[0], fx), P(f, f.dims.board_h[1], fx), '90 ซม. (ขอบบน ~165 ซม.)', 70, 0, true);
  const tb = ITEMS.map(([k], i) => {
    const [x, y] = P(t, t.points[k], PAD);
    return k === 'skirt' ? '' : badge(i + 1, x, y, 40);
  }).join('');
  const [, ty] = P(t, t.dims.table_l[0], PAD);
  const [, by] = P(t, t.dims.table_d[1], PAD);
  return [
    W,
    H,
    `<div style="position:absolute;left:${PAD}px;top:28px;font-size:38px;font-weight:700;color:${G}">แปลนบูธ (มองจากด้านบน)</div>
     <div style="position:absolute;left:${fx}px;top:28px;font-size:38px;font-weight:700;color:${G}">ด้านหน้า</div>
     <img src="${img(t.image)}" style="position:absolute;left:${PAD}px;top:${TITLE}px;width:${t.width}px;height:${t.height}px;border-radius:12px">
     <img src="${img(f.image)}" style="position:absolute;left:${fx}px;top:${TITLE}px;width:${f.width}px;height:${f.height}px;border-radius:12px">
     <svg width="${W}" height="${H}" style="position:absolute;inset:0"><defs><marker id="a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${INK}"/></marker></defs>${svg.join('')}</svg>
     ${html.join('')}${tb}
     <div style="position:absolute;left:${PAD}px;width:${t.width}px;top:${ty + 110}px;text-align:center;font-size:28px;font-weight:600;color:#b45309">⬇ ฝั่งทางเดิน: กรรมการ / ผู้ชม ⬇</div>
     <div style="position:absolute;left:${PAD}px;width:${t.width}px;top:${by - 70}px;text-align:center;font-size:24px;color:${INK}"><span style="background:#ffffffd9;padding:4px 14px;border-radius:8px">⬆ ด้านหลังโต๊ะ: ทีมยืนประจำ 2–3 คน + วางปลั๊กพ่วง / คอมใต้โต๊ะ ⬆</span></div>`,
  ];
}

const browser = await chromium.launch();
const page = await browser.newPage();
await shot(page, ...layoutSheet(), 'booth_layout.png');
await shot(page, ...planSheet(), 'booth_plan.png');
await browser.close();
