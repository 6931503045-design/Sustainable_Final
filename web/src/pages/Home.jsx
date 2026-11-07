import { lazy, Suspense, useState } from 'react';
import { Footer, Link, Nav } from '../App.jsx';
import { MODES } from '../../shared/rules.js';
import { useT } from '../lib/i18n.jsx';
import { liffLink } from '../lib/line.js';
import ASSET from '../data/model-asset.json';

const ModelViewer = lazy(() => import('../components/ModelViewer.jsx'));

const STEPS = [
  ['📲', ['แจ้งขายผ่าน LINE', 'Sell via LINE'], ['ดูราคา เลือกนำมาเอง หรือเรียกรถคนในพื้นที่ไปรับถึงไร่ (แบบ Grab) ระบบส่ง QR เข้าแชต', 'Check prices, bring it yourself or book a local driver (Grab-style). A QR code arrives in the chat.']],
  ['🔍', ['สแกน QR ที่ตู้', 'Scan QR at the machine'], ['ระบบดึงน้ำหนักที่ชั่งตอนรับของ วัดความชื้น และถ่ายรูปเป็นหลักฐาน', 'The machine loads the lot, checks moisture and photographs the material as evidence.']],
  ['⚙️', ['เลือกโหมดแปรรูป', 'Choose a mode'], ['A อัดเม็ด / B อัดแท่ง / C สับ หรือระบบเลือกให้ตามคำสั่งซื้อ', 'A Pellet / B Briquette / C Chop, or auto-selected from buyer orders.']],
  ['🧾', ['ใบรับของเข้า LINE', 'Receipt in LINE'], ['น้ำหนักก่อน-หลัง ยอดเงิน และปริมาณที่ช่วยลดการเผา', 'Weight in/out, payment and how much burning was avoided.']],
];

export default function Home() {
  const t = useT();
  const [modelReady, setModelReady] = useState(false);
  return (
    <>
      <Nav />
      <main className="wrap">
        <section className="hero">
          <div>
            <p className="eyebrow">Sustainability & Social Responsibility Innovation Expo</p>
            {/* แบ่งเป็นวลีที่ไม่ตัดกลางคำ (ภาษาไทยไม่มีเว้นวรรค เบราว์เซอร์จะตัดผิดที่) */}
            <h1 className="hero-title">
              <span className="phrase">{t.k('hero.title1')}</span>
              <wbr /> <span className="phrase">{t.k('hero.title2')}</span>
              <wbr /> <span className="phrase">
                {t.k('hero.title3')}
                {t.lang === 'en' ? ' ' : ''}
                <span className="hl">{t.k('hero.titleHl')}</span>
              </span>
            </h1>
            <p className="lead">
              {t(
                'ตู้แปรรูปเศษวัสดุเกษตรอัจฉริยะ 3 in 1 สับ อัดเม็ด อัดแท่ง ในตู้เดียว ทุกครั้งที่ใช้ ระบบชั่ง ถ่ายรูป และส่งใบรับของเข้า LINE ของเกษตรกรอัตโนมัติ',
                'A smart 3-in-1 crop-residue processor: pellet, briquette and chop in one cabinet. Every run is weighed, photographed and a receipt is sent to the farmer’s LINE automatically.',
              )}
            </p>
            <div className="cta">
              {liffLink() ? (
                <a href={liffLink()} className="btn primary cta-main">
                  {t.k('hero.ctaLine')}
                </a>
              ) : (
                <Link to="/liff" className="btn primary cta-main">
                  {t.k('hero.ctaTry')}
                </Link>
              )}
              <Link to="/present" className="btn outline">
                {t.k('hero.ctaPresent')}
              </Link>
              <Link to="/prices" className="text-link">
                {t.k('hero.ctaPrices')} →
              </Link>
            </div>
          </div>
          {/* ภาพ poster อยู่ชั้นล่างตั้งแต่แรก (ไม่ถูกสร้างใหม่ตอนโค้ด 3D โหลดเสร็จ = ไม่มีจอว่าง ไม่กระตุก) แล้วซ่อนเมื่อโมเดลพร้อม */}
          <div className={`hero-visual ${modelReady ? 'model-ready' : ''}`}>
            <div className="mv-poster hero-poster" aria-hidden={modelReady}>
              <img src={ASSET.poster} alt={t.k('model.posterAlt')} width="675" height="900" fetchpriority="high" />
            </div>
            <Suspense
              fallback={
                <div className="viewer viewer-loading">
                  <div className="mv-progress" role="status">
                    <span className="mv-progress-pill">
                      <span className="mv-spinner" aria-hidden="true" />
                      {t.k('model.loading')}
                    </span>
                  </div>
                </div>
              }
            >
              <ModelViewer poster={false} onReady={() => setModelReady(true)} />
            </Suspense>
          </div>
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
      </main>
      <Footer />
    </>
  );
}
