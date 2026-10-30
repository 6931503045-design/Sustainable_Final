// ใส่ป้ายชื่อชิ้นส่วนภาษาไทยลงบนภาพ render (อ่านตำแหน่งจาก output/render_*.json ที่ build_model.py สร้าง)
// ใช้: node textures/annotate.mjs   (รันจากโฟลเดอร์ blender/)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../output');
const fontDir = path.resolve(here, '../node_modules/@fontsource/prompt/files');
const MARGIN = 500, GAP = 70;

function layout(points, h) {
  // วางป้ายเรียงตามแนวตั้ง ไม่ให้ซ้อนกัน
  const sorted = points.map((p) => ({ ...p, ly: p.y * h })).sort((a, b) => a.ly - b.ly);
  for (let i = 1; i < sorted.length; i++) sorted[i].ly = Math.max(sorted[i].ly, sorted[i - 1].ly + GAP);
  const over = sorted.length ? sorted.at(-1).ly - (h - 40) : 0;
  if (over > 0) sorted.forEach((p) => (p.ly -= over));
  return sorted;
}

const browser = await chromium.launch();
const page = await browser.newPage();
for (const f of fs.readdirSync(out).filter((n) => /^render_.*\.json$/.test(n))) {
  const meta = JSON.parse(fs.readFileSync(path.join(out, f), 'utf8'));
  const { width: w, height: h } = meta;
  const W = w + 2 * MARGIN;
  const left = layout(meta.points.filter((p) => p.x < 0.5), h);
  const right = layout(meta.points.filter((p) => p.x >= 0.5), h);
  const svg = [];
  const html = [];
  for (const [side, list] of [['l', left], ['r', right]]) {
    for (const p of list) {
      const px = MARGIN + p.x * w, py = p.y * h;
      const lx = side === 'l' ? MARGIN - 10 : MARGIN + w + 10;
      svg.push(`<polyline points="${lx},${p.ly} ${side === 'l' ? lx + 40 : lx - 40},${p.ly} ${px},${py}" fill="none" stroke="#1d2b22" stroke-width="3"/>
        <circle cx="${px}" cy="${py}" r="9" fill="#e3b23c" stroke="#1d2b22" stroke-width="3"/>`);
      html.push(`<div class="lbl" style="top:${p.ly - 26}px;${side === 'l' ? `right:${W - MARGIN + 18}px;text-align:right` : `left:${MARGIN + w + 18}px`}">${p.label}</div>`);
    }
  }
  await page.setViewportSize({ width: W, height: h });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    ${['thai', 'latin'].map((sub) => `@font-face{font-family:P;font-weight:600;src:url(data:font/woff2;base64,${fs.readFileSync(`${fontDir}/prompt-${sub}-600-normal.woff2`).toString('base64')})}`).join('')}
    *{margin:0}body{width:${W}px;height:${h}px;position:relative;background:#fff;font-family:P,sans-serif;overflow:hidden}
    img{position:absolute;left:${MARGIN}px;top:0;width:${w}px;height:${h}px}
    svg{position:absolute;inset:0}
    .lbl{position:absolute;max-width:${MARGIN - 40}px;font-size:34px;font-weight:600;color:#1d2b22;line-height:1.5;white-space:nowrap}
  </style></head><body><img src="data:image/png;base64,${fs.readFileSync(path.join(out, meta.image)).toString('base64')}">
  <svg width="${W}" height="${h}">${svg.join('')}</svg>${html.join('')}</body></html>`);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode())); });
  const target = path.join(out, meta.image.replace('.png', '_labeled.png'));
  await page.screenshot({ path: target });
  console.log('wrote', target);
}
await browser.close();
