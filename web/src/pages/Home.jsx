import { lazy, Suspense } from 'react';
import { Link, Nav } from '../App.jsx';
import { MODES, PM25_G_PER_KG } from '../../shared/rules.js';

const ModelViewer = lazy(() => import('../components/ModelViewer.jsx'));

const STEPS = [
  ['📲', 'แจ้งเศษพืชผ่าน LINE', 'เลือกชนิด น้ำหนัก และเวลานัด ระบบส่ง QR ของล็อตเข้าแชต'],
  ['🔍', 'สแกน QR ที่ตู้', 'ระบบดึงน้ำหนักที่ชั่งตอนรับของ วัดความชื้น และถ่ายรูปเป็นหลักฐาน'],
  ['⚙️', 'เลือกโหมดแปรรูป', 'สับ / อัดเม็ด / อัดแท่ง หรือระบบเลือกให้ตามคำสั่งซื้อ'],
  ['🧾', 'ใบรับของเข้า LINE', 'น้ำหนักก่อน-หลัง ยอดเงิน และปริมาณที่ช่วยลดการเผา'],
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="wrap">
        <section className="hero">
          <div>
            <p className="eyebrow">Sustainability & Social Responsibility Innovation Expo</p>
            <h1>
              เปลี่ยนเศษพืชที่เคยเผา
              <br />
              ให้เป็น<span className="hl">รายได้</span>
            </h1>
            <p className="lead">
              ตู้แปรรูปเศษวัสดุเกษตรอัจฉริยะ 3 in 1 สับ อัดเม็ด อัดแท่ง ในตู้เดียว ทุกครั้งที่ใช้ ระบบชั่ง ถ่ายรูป และส่งใบรับของเข้า LINE ของเกษตรกรอัตโนมัติ
            </p>
            <div className="cta">
              <Link to="/liff" className="btn primary">
                ลองแจ้งเศษพืช
              </Link>
              <Link to="/dashboard" className="btn">
                ดู Dashboard ผลกระทบ
              </Link>
            </div>
          </div>
          <Suspense fallback={<div className="viewer skeleton">กำลังโหลดโมเดล 3D…</div>}>
            <ModelViewer />
          </Suspense>
        </section>

        <section>
          <h2>3 โหมดในตู้เดียว</h2>
          <div className="grid3">
            {Object.values(MODES).map((m) => (
              <div className="card mode" key={m.key} style={{ borderTopColor: m.color }}>
                <h3>{m.th}</h3>
                <p>{m.product}</p>
                <small>ได้ผลผลิตประมาณ {Math.round(m.yield * 100)}% ของน้ำหนักวัตถุดิบ*</small>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>ใช้งานอย่างไร</h2>
          <ol className="steps">
            {STEPS.map(([icon, t, d]) => (
              <li key={t}>
                <span className="icon">{icon}</span>
                <b>{t}</b>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="card note">
          <b>* ความโปร่งใสของตัวเลข</b>
          <p>
            นี่คือต้นแบบสำหรับนำเสนอ ตัวเลขสเปก ราคา ผลผลิต และค่าประมาณ PM2.5 ({PM25_G_PER_KG} กรัม ต่อเศษพืช 1 กก. ที่ไม่ถูกเผา) เป็นค่าสมมติ ต้องทดสอบจริงและอ้างอิงงานวิจัยก่อนใช้งาน
          </p>
          <Link to="/privacy">นโยบายความเป็นส่วนตัว (PDPA)</Link>
        </section>
      </main>
    </>
  );
}
