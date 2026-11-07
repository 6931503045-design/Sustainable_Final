// สร้าง favicon PNG (32/180/512) และภาพแชร์ og-image.png 1200x630 จาก public/favicon.svg + public/img/render-front.png
// ใช้: node scripts/make-brand-assets.cjs "$PWD"   (ต้องมี playwright + chromium ในเครื่อง)
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const web = process.argv[2];
const b64 = (f) => fs.readFileSync(path.join(web, f)).toString('base64');
const fonts = ['thai', 'latin'].flatMap((s) => [400, 700].map((w) => `@font-face{font-family:P;font-weight:${w};src:url(data:font/woff2;base64,${b64(`node_modules/@fontsource/prompt/files/prompt-${s}-${w}-normal.woff2`)}) format('woff2')}`)).join('');
const svg = fs.readFileSync(path.join(web, 'public/favicon.svg'), 'utf8');
const hero = b64('public/img/render-front.png');
(async () => {
  const br = await chromium.launch();
  const p = await br.newPage();
  for (const [size, out] of [[32, 'favicon-32.png'], [180, 'apple-touch-icon.png'], [512, 'icon-512.png']]) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<style>html,body{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`);
    await p.screenshot({ path: path.join(web, 'public', out), omitBackground: true });
  }
  await p.setViewportSize({ width: 1200, height: 630 });
  await p.setContent(`<style>${fonts}
  html,body{margin:0}body{width:1200px;height:630px;font-family:P;background:#f6f5ef;position:relative;overflow:hidden}
  .l{position:absolute;left:64px;top:70px;width:680px}
  .logo{display:flex;align-items:center;gap:14px;font-weight:700;font-size:34px;color:#2f6b3a}
  .logo svg{width:60px;height:60px}
  h1{font-size:60px;line-height:1.18;margin:36px 0 22px;color:#1d2b22;font-weight:700}
  h1 span{color:#e07b39}h1 i{font-style:normal;white-space:nowrap}
  p{font-size:27px;color:#3b4a40;margin:0;line-height:1.45}
  .chips{display:flex;gap:12px;margin-top:30px}
  .chips b{color:#fff;border-radius:99px;padding:6px 18px;font-size:22px}
  .bar{position:absolute;left:0;right:0;bottom:0;height:16px;background:linear-gradient(90deg,#2f6b3a,#6fbf73,#e3b23c,#e07b39)}
  .img{position:absolute;right:40px;top:30px;width:440px;height:570px;background:url(data:image/png;base64,${hero}) center/contain no-repeat}
  .glow{position:absolute;right:20px;top:60px;width:560px;height:520px;border-radius:50%;background:radial-gradient(#ffffff,#f6f5ef00 70%)}
  </style>
  <div class="glow"></div><div class="img"></div>
  <div class="l"><div class="logo">${svg}ไร่ไม่เผา</div>
  <h1><i>เปลี่ยนเศษพืชที่เคยเผา</i><br><i>ให้เป็น<span>รายได้</span></i></h1>
  <p>ตู้แปรรูปเศษวัสดุเกษตร 3 in 1 + LINE<br>แจ้งขาย เรียกรถไปรับถึงไร่ ลดการเผา</p>
  <div class="chips"><b style="background:#3f9b4b">A อัดเม็ด</b><b style="background:#e07b39">B อัดแท่ง</b><b style="background:#3b82c4">C สับ</b></div></div>
  <div class="bar"></div>`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(web, 'public/og-image.png') });
  await br.close();
})();
