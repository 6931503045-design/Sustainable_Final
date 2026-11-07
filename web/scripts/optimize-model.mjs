// บีบอัดโมเดล 3D + ทำภาพ poster แล้วตั้งชื่อไฟล์ตาม hash (cache แบบ immutable ได้ปลอดภัย)
// ใช้: npm run model:optimize   (ค่าเริ่มต้นอ่าน ../blender/output/rai_mai_phao.glb และ render_front.png)
//
// ขั้นตอน (gltf-transform ทีละคำสั่ง ไม่ใช้ `optimize` เพราะมันรวมวัสดุที่ชื่อต่างแต่ค่าเหมือนกัน
// ทำให้วัสดุผนังตู้ที่ใช้ทำ X-ray หายไป):
//   dedup --materials false → prune → webp → draco
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.resolve(root, process.argv[2] || '../blender/output/rai_mai_phao.glb');
const posterSrc = path.resolve(root, process.argv[3] || '../blender/output/render_front.png');
const outDir = path.join(root, 'public/model');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rmp-model-'));
const npx = (pkg, args) => execFileSync('npx', ['-y', pkg, ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
const G = '@gltf-transform/cli@4.1.1';

const steps = [
  ['dedup', '--materials', 'false'],
  ['prune'],
  ['webp'],
  ['draco'],
];
let cur = src;
steps.forEach(([cmd, ...flags], i) => {
  const next = path.join(tmp, `step${i}.glb`);
  npx(G, [cmd, cur, next, ...flags]);
  cur = next;
});

// poster: ภาพนิ่งของตู้ (WebP โปร่งใส สูง 900px) แสดงระหว่างโหลดโมเดล
const posterTmp = path.join(tmp, 'poster.webp');
npx('sharp-cli@5.1.0', ['-i', posterSrc, '-o', posterTmp, '--quality', '80', 'resize', '675', '900', '--fit', 'inside']);

const hash = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 10);
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) if (/^(rai_mai_phao|poster)[.-]/.test(f)) fs.rmSync(path.join(outDir, f));
const glbName = `rai_mai_phao.${hash(cur)}.glb`;
const posterName = `poster.${hash(posterTmp)}.webp`;
fs.copyFileSync(cur, path.join(outDir, glbName));
fs.copyFileSync(posterTmp, path.join(outDir, posterName));

// ตัวถอดรหัส Draco (มากับ three.js) เก็บไว้ในโฟลเดอร์ที่มีเวอร์ชันกำกับ จะได้ cache แบบ immutable ได้
const threeVer = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/three/package.json'), 'utf8')).version;
const dracoDir = path.join(outDir, `draco-${threeVer}`);
if (!fs.existsSync(dracoDir)) {
  for (const f of fs.readdirSync(outDir)) if (f.startsWith('draco-')) fs.rmSync(path.join(outDir, f), { recursive: true });
  fs.mkdirSync(dracoDir);
  for (const f of ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js'])
    fs.copyFileSync(path.join(root, 'node_modules/three/examples/jsm/libs/draco/gltf', f), path.join(dracoDir, f));
}

const asset = { glb: `/model/${glbName}`, poster: `/model/${posterName}`, draco: `/model/draco-${threeVer}/` };
fs.writeFileSync(path.join(root, 'src/data/model-asset.json'), `${JSON.stringify(asset, null, 2)}\n`);
const kb = (f) => `${Math.round(fs.statSync(f).size / 1024)} KB`;
console.log(`glb    ${kb(src)} → ${kb(cur)}  ${asset.glb}`);
console.log(`poster ${kb(posterSrc)} → ${kb(posterTmp)}  ${asset.poster}`);
fs.rmSync(tmp, { recursive: true });
