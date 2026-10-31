import { lazy, Suspense } from 'react';
import { Link, Nav } from '../App.jsx';
import { MODES, PM25_G_PER_KG } from '../../shared/rules.js';
import { useT } from '../lib/i18n.jsx';
import { liffLink } from '../lib/line.js';

const ModelViewer = lazy(() => import('../components/ModelViewer.jsx'));

const STEPS = [
  ['📲', ['แจ้งขายผ่าน LINE', 'Sell via LINE'], ['ดูราคา เลือกนำมาเอง หรือเรียกรถคนในพื้นที่ไปรับถึงไร่ (แบบ Grab) ระบบส่ง QR เข้าแชต', 'Check prices, bring it yourself or book a local driver (Grab-style). A QR code arrives in the chat.']],
  ['🔍', ['สแกน QR ที่ตู้', 'Scan QR at the machine'], ['ระบบดึงน้ำหนักที่ชั่งตอนรับของ วัดความชื้น และถ่ายรูปเป็นหลักฐาน', 'The machine loads the lot, checks moisture and photographs the material as evidence.']],
  ['⚙️', ['เลือกโหมดแปรรูป', 'Choose a mode'], ['A อัดเม็ด / B อัดแท่ง / C สับ หรือระบบเลือกให้ตามคำสั่งซื้อ', 'A Pellet / B Briquette / C Chop, or auto-selected from buyer orders.']],
  ['🧾', ['ใบรับของเข้า LINE', 'Receipt in LINE'], ['น้ำหนักก่อน-หลัง ยอดเงิน และปริมาณที่ช่วยลดการเผา', 'Weight in/out, payment and how much burning was avoided.']],
];

export default function Home() {
  const t = useT();
  return (
    <>
      <Nav />
      <main className="wrap">
        <section className="hero">
          <div>
            <p className="eyebrow">Sustainability & Social Responsibility Innovation Expo</p>
            <h1>
              {t('เปลี่ยนเศษพืชที่เคยเผา', 'Turn crop waste that used to be burned')}
              <br />
              {t('ให้เป็น', 'into ')}
              <span className="hl">{t('รายได้', 'income')}</span>
            </h1>
            <p className="lead">
              {t(
                'ตู้แปรรูปเศษวัสดุเกษตรอัจฉริยะ 3 in 1 สับ อัดเม็ด อัดแท่ง ในตู้เดียว ทุกครั้งที่ใช้ ระบบชั่ง ถ่ายรูป และส่งใบรับของเข้า LINE ของเกษตรกรอัตโนมัติ',
                'A smart 3-in-1 crop-residue processor: pellet, briquette and chop in one cabinet. Every run is weighed, photographed and a receipt is sent to the farmer’s LINE automatically.',
              )}
            </p>
            <div className="cta">
              <Link to="/present" className="btn primary">
                ▶ {t('เริ่มพรีเซนต์', 'Start presentation')}
              </Link>
              {liffLink() ? (
                <a href={liffLink()} className="btn">
                  {t('เปิดใน LINE: แจ้งขาย / เรียกรถ', 'Open in LINE: sell / book pickup')}
                </a>
              ) : (
                <Link to="/liff" className="btn">
                  {t('ลองแจ้งเศษพืช', 'Try selling residue')}
                </Link>
              )}
              <Link to="/prices" className="btn">
                {t('ราคารับซื้อ', 'Buy prices')}
              </Link>
            </div>
          </div>
          <Suspense fallback={<div className="viewer skeleton">{t('กำลังโหลดโมเดล 3D…', 'Loading 3D model…')}</div>}>
            <ModelViewer />
          </Suspense>
        </section>

        <section>
          <h2>{t('เศษพืช 4 ชนิด → 3 โหมด → สินค้า 6 แบบ', '4 residues → 3 modes → 6 products')}</h2>
          <div className="grid3">
            {Object.values(MODES).map((m) => (
              <div className="card mode" key={m.key} style={{ borderTopColor: m.color }}>
                <h3>
                  <span className="code" style={{ background: m.color }}>
                    {m.code}
                  </span>{' '}
                  {t.pick(m)}
                </h3>
                <ul className="tight">
                  {t.pick(m, 'products').map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <small>{t(`ได้ผลผลิตประมาณ ${Math.round(m.yield * 100)}% ของน้ำหนักวัตถุดิบ*`, `Yield about ${Math.round(m.yield * 100)}% of input weight*`)}</small>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>{t('ใช้งานอย่างไร', 'How it works')}</h2>
          <ol className="steps">
            {STEPS.map(([icon, title, desc]) => (
              <li key={icon}>
                <span className="icon">{icon}</span>
                <b>{t(...title)}</b>
                <p>{t(...desc)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="card note">
          <b>* {t('ความโปร่งใสของตัวเลข', 'About the numbers')}</b>
          <p>
            {t(
              `นี่คือต้นแบบสำหรับนำเสนอ ตัวเลขสเปก ราคา ผลผลิต และค่าประมาณ PM2.5 (${PM25_G_PER_KG} กรัม ต่อเศษพืช 1 กก. ที่ไม่ถูกเผา) เป็นค่าสมมติ ต้องทดสอบจริงและอ้างอิงงานวิจัยก่อนใช้งาน`,
              `This is a presentation prototype. Specs, prices, yields and the PM2.5 estimate (${PM25_G_PER_KG} g per kg of residue not burned) are assumptions to be tested and referenced before real use.`,
            )}
          </p>
          <Link to="/privacy">{t('นโยบายความเป็นส่วนตัว (PDPA)', 'Privacy policy (PDPA)')}</Link>
        </section>
      </main>
    </>
  );
}
