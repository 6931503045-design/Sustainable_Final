// โหมดพรีเซนต์: สไลด์เต็มจอสำหรับจอใหญ่ที่บูธ (← → หรือปุ่ม, F = เต็มจอ) ใช้โมเดล/ราคา/ตัวเลขชุดเดียวกับระบบจริง
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link } from '../App.jsx';
import QR from '../components/QR.jsx';
import { MODES, PICKUP, RESIDUES, settle } from '../../shared/rules.js';
import { api, kg, local, thb } from '../lib/client.js';
import { LangToggle, useT } from '../lib/i18n.jsx';
import { seedJobs } from '../lib/seed.js';

const ModelViewer = lazy(() => import('../components/ModelViewer.jsx'));
const SEED = seedJobs();

function useImpact() {
  const [server, setServer] = useState([]);
  useEffect(() => {
    api('stats')
      .then((s) => setServer(s.jobs))
      .catch(() => {});
  }, []);
  return useMemo(() => {
    const seen = new Set();
    const jobs = [...server, ...local.get('jobs', []), ...SEED].filter((j) => !seen.has(j.id) && seen.add(j.id));
    const sum = (f) => jobs.reduce((s, j) => s + f(j), 0);
    return {
      runs: jobs.length,
      savedKg: sum((j) => j.savedKg),
      pm25kg: sum((j) => j.pm25g) / 1000,
      paid: sum((j) => Math.max(0, j.amount)),
      drivers: sum((j) => j.driverEarn || 0),
    };
  }, [server]);
}

function Slide({ children, className = '' }) {
  return <section className={`slide ${className}`}>{children}</section>;
}

export default function Present() {
  const t = useT();
  const impact = useImpact();
  const [i, setI] = useState(() => Number(window.location.hash.slice(1)) || 0);
  const site = window.location.origin;
  const example = settle({ residue: 'corn', purpose: 'sell', inputKg: 400, moisture: 13, pickupKm: 5 });

  const slides = [
    <Slide key="title" className="title">
      <div>
        <p className="eyebrow">Sustainability & Social Responsibility Innovation Expo · 2302103</p>
        <h1>🌾 {t('ไร่ไม่เผา', 'Rai Mai Phao')}</h1>
        <p className="big">{t('เปลี่ยนเศษพืชที่เคยเผา ให้เป็นรายได้ของชุมชน', 'Turning crop waste that used to be burned into community income')}</p>
        <p>{t('ตู้แปรรูปเศษวัสดุเกษตรอัจฉริยะ 3 in 1 + ระบบ LINE รับซื้อและเรียกรถแบบ Grab', 'A smart 3-in-1 residue processor + a LINE system for buying and Grab-style pickups')}</p>
      </div>
      <div className="qr-box">
        <QR value={site} size={220} />
        <small>{t('สแกนเพื่อลองใช้จริง', 'Scan to try it live')}</small>
      </div>
    </Slide>,

    <Slide key="problem">
      <h2>{t('ปัญหา: ฤดูฝุ่นเชียงราย', 'The problem: Chiang Rai’s haze season')}</h2>
      <div className="cols">
        <ul className="points">
          <li>{t('หลังเก็บเกี่ยว เกษตรกรเผาต้น ซัง เปลือกข้าวโพด และฟาง เพราะถูกและเร็วที่สุด', 'After harvest, farmers burn corn stalks, cobs, husks and straw because it is the cheapest and fastest option')}</li>
          <li>{t('ควันเป็นต้นเหตุสำคัญของ PM2.5 ช่วงต้นปี กระทบสุขภาพคนทั้งจังหวัด', 'The smoke is a major source of PM2.5 early in the year, affecting the health of the whole province')}</li>
          <li>{t('ต้นทุนนี้ตกกับสังคม ไม่ใช่ผู้เผา = Negative externality (M1)', 'Society pays this cost, not the burner — a negative externality (Module 1)')}</li>
          <li>{t('เกษตรกรไม่มีทางเลือกที่คุ้มกว่า เพราะเศษพืช "ไม่มีราคา"', 'Farmers have no better option because residue has no market value')}</li>
        </ul>
        <div className="callout">
          <b>{t('ไอเดียหลัก', 'Key idea')}</b>
          <p className="big">{t('ทำให้เศษพืช "มีราคา" แล้วการเผาจะไม่คุ้ม', 'Give residue a price, and burning stops making sense')}</p>
          <small className="hint">{t('📌 ใส่ตัวเลขจริง (จุดความร้อน/ค่า PM2.5) พร้อมแหล่งอ้างอิง เช่น Air4Thai, GISTDA', '📌 Add real hotspot/PM2.5 figures with sources, e.g. Air4Thai, GISTDA')}</small>
        </div>
      </div>
    </Slide>,

    <Slide key="machine" className="machine">
      <div className="side">
        <h2>{t('ตู้ 3 in 1', 'The 3-in-1 cabinet')}</h2>
        <p>{t('85 × 180 × 60 ซม. จัดชั้นตามแรงโน้มถ่วง วัตถุดิบไหลลงเอง', '85 × 180 × 60 cm, stacked so material flows down by gravity')}</p>
        <ul className="points small">
          <li>{t('กดตัวเลขบนโมเดลเพื่อดูว่าแต่ละชิ้นทำอะไร มีไว้ทำไม', 'Tap a number on the model to see what each part does and why')}</li>
          <li>{t('กด "ดู flow การทำงาน" เพื่อดูวัตถุดิบวิ่งผ่านตู้ เลือกโหมด A / B / C ได้', 'Press "Show workflow" to watch material move through the cabinet — choose A / B / C')}</li>
          <li>{t('X-ray / แยกชิ้น ดูโครงสร้างภายใน', 'X-ray / Exploded to see inside')}</li>
        </ul>
      </div>
      <Suspense fallback={<div className="viewer skeleton">…</div>}>
        <ModelViewer tall />
      </Suspense>
    </Slide>,

    <Slide key="products">
      <h2>{t('เศษพืช 4 ชนิด → 3 โหมด → สินค้า 6 แบบ', '4 residues → 3 modes → 6 products')}</h2>
      <div className="cols three">
        <div className="card">
          <h3>{t('วัตถุดิบ', 'Inputs')}</h3>
          <ul className="tight">
            {Object.values(RESIDUES).map((r) => (
              <li key={r.th}>{t.pick(r)}</li>
            ))}
          </ul>
        </div>
        {Object.values(MODES).map((m) => (
          <div className="card" key={m.key} style={{ borderTop: `8px solid ${m.color}` }}>
            <h3>
              <span className="code" style={{ background: m.color }}>
                {m.code}
              </span>{' '}
              {t.pick(m)}
            </h3>
            <ul className="tight">
              {t.pick(m, 'products').map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Slide>,

    <Slide key="line">
      <h2>{t('ระบบ LINE: ขาย · เรียกรถ · ใบรับของ', 'LINE system: sell · book pickup · receipt')}</h2>
      <div className="cols three">
        <div className="card">
          <h3>👩‍🌾 {t('เกษตรกร', 'Farmer')}</h3>
          <ol className="tight">
            <li>{t('ดูราคา + คำนวณรายได้', 'Check prices + calculate income')}</li>
            <li>{t('แจ้งขาย: นำมาเอง หรือเรียกรถ', 'Sell: drop off or book a pickup')}</li>
            <li>{t('ได้ QR ในแชต + ติดตามรถ', 'Get a QR in chat + track the driver')}</li>
            <li>{t('ได้ใบรับของพร้อมยอดเงิน', 'Receive a receipt with payment')}</li>
          </ol>
        </div>
        <div className="card">
          <h3>🛻 {t('คนขับในชุมชน (แบบ Grab)', 'Local driver (Grab-style)')}</h3>
          <ol className="tight">
            <li>{t('ได้แจ้งเตือนงานใหม่ใกล้บ้าน', 'Get notified of nearby jobs')}</li>
            <li>{t('กดรับงาน (ใครก่อนได้ก่อน)', 'Accept (first come, first served)')}</li>
            <li>{t('นำทาง + โทรหาเจ้าของ', 'Navigate + call the owner')}</li>
            <li>{t(`ส่งที่ตู้ ได้ ${Math.round(PICKUP.driverShare * 100)}% ของค่ารถ`, `Deliver and keep ${Math.round(PICKUP.driverShare * 100)}% of the fee`)}</li>
          </ol>
        </div>
        <div className="card">
          <h3>🖥️ {t('ตู้ + Dashboard', 'Machine + dashboard')}</h3>
          <ol className="tight">
            <li>{t('สแกน QR วัดความชื้น', 'Scan QR, check moisture')}</li>
            <li>{t('แปรรูป ชั่ง ถ่ายรูป', 'Process, weigh, photograph')}</li>
            <li>{t('คำนวณเงินที่ server', 'Payment calculated server-side')}</li>
            <li>{t('ผลกระทบขึ้น Dashboard', 'Impact shown on the dashboard')}</li>
          </ol>
        </div>
      </div>
      <p className="center-text">
        {t('ตัวอย่าง: ขายข้าวโพด 400 กก. เรียกรถ 5 กม.', 'Example: sell 400 kg of corn residue, 5 km pickup')} → {t('ค่าเศษพืช', 'value')} {thb(example.gross)} − {t('ค่ารถ', 'pickup')} {thb(example.pickupFee)} ={' '}
        <b className="good">
          {t('เกษตรกรได้', 'farmer gets')} {thb(example.amount)}
        </b>{' '}
        · {t('คนขับได้', 'driver gets')} {thb(example.driverEarn)}
      </p>
      <p className="center-text">
        <Link to="/prices" className="btn">
          💰 {t('ราคา', 'Prices')}
        </Link>{' '}
        <Link to="/liff" className="btn">
          👩‍🌾 {t('ลองเป็นเกษตรกร', 'Try as farmer')}
        </Link>{' '}
        <Link to="/liff/driver" className="btn">
          🛻 {t('ลองเป็นคนขับ', 'Try as driver')}
        </Link>{' '}
        <Link to="/kiosk" className="btn">
          🖥️ {t('หน้าจอตู้', 'Kiosk')}
        </Link>
      </p>
    </Slide>,

    <Slide key="impact">
      <h2>{t('ผลกระทบ (People · Planet · Profit)', 'Impact (People · Planet · Profit)')}</h2>
      <div className="cols four">
        <div className="stat-big">
          <b>{kg(impact.savedKg)}</b>
          <span>{t('เศษพืชที่ไม่ถูกเผา', 'residue not burned')}</span>
        </div>
        <div className="stat-big">
          <b>{kg(impact.pm25kg)}</b>
          <span>{t('PM2.5 ที่ลดได้ (ประมาณ)', 'PM2.5 avoided (est.)')}</span>
        </div>
        <div className="stat-big">
          <b>{thb(impact.paid)}</b>
          <span>{t('รายได้เกษตรกร', 'paid to farmers')}</span>
        </div>
        <div className="stat-big">
          <b>{thb(impact.drivers)}</b>
          <span>{t('รายได้คนขับในชุมชน', 'earned by local drivers')}</span>
        </div>
      </div>
      <div className="cols three">
        <div className="card">
          <h3>🧑‍🤝‍🧑 People</h3>
          <p>{t('รายได้ใหม่ให้เกษตรกรและคนขับในหมู่บ้าน ลดผลกระทบต่อสุขภาพ', 'New income for farmers and village drivers; better health')}</p>
        </div>
        <div className="card">
          <h3>🌏 Planet</h3>
          <p>{t('ลดการเผา ลด PM2.5 เศษพืชกลับเป็นปุ๋ย อาหารสัตว์ และเชื้อเพลิง (Circular economy)', 'Less burning and PM2.5; residue becomes fertiliser, feed and fuel (circular economy)')}</p>
        </div>
        <div className="card">
          <h3>💰 Profit</h3>
          <p>{t('ขายสินค้า 6 แบบ + ค่าบริการแปรรูป + ค่าแพลตฟอร์มจากค่ารถ', 'Sales of 6 products + processing fees + platform fee on pickups')}</p>
        </div>
      </div>
      <p className="hint center-text">
        {t('รวมข้อมูลจำลองสำหรับนำเสนอ · SDG 3, 8, 12, 13', 'Includes sample data for the presentation · SDG 3, 8, 12, 13')} ·{' '}
        <Link to="/dashboard">Dashboard</Link>
      </p>
    </Slide>,

    <Slide key="bmc">
      <h2>Business Model Canvas</h2>
      <div className="bmc">
        {[
          ['kp', t('พันธมิตรหลัก', 'Key partners'), t('วิสาหกิจชุมชน · อบต./ผู้ใหญ่บ้าน · มฟล. · ฟาร์มเห็ด สหกรณ์โคนม โรงอบลำไย · คนขับในพื้นที่', 'Community enterprises · local government · MFU · mushroom farms, dairy co-ops, longan dryers · local drivers')],
          ['ka', t('กิจกรรมหลัก', 'Key activities'), t('รับซื้อ แปรรูป ขาย · ดูแลแพลตฟอร์ม LINE · บำรุงรักษาตู้', 'Buy, process, sell · run the LINE platform · maintain machines')],
          ['kr', t('ทรัพยากรหลัก', 'Key resources'), t('ตู้ 3 in 1 · ระบบ LINE + ข้อมูล · เครือข่ายคนขับ · แบรนด์ "ไร่ไม่เผา"', '3-in-1 machine · LINE system + data · driver network · brand')],
          ['vp', t('คุณค่าที่ส่งมอบ', 'Value propositions'), t('เกษตรกร: เศษพืชมีราคา ไม่ต้องเผา รถไปรับถึงไร่ · ผู้ซื้อ: วัตถุดิบสม่ำเสมอ ตรวจสอบได้ · ชุมชน: อากาศสะอาด', 'Farmers: residue earns money, pickup at the farm · Buyers: consistent, traceable supply · Community: clean air')],
          ['cr', t('ความสัมพันธ์กับลูกค้า', 'Customer relationships'), t('LINE OA · ใบรับของโปร่งใส · Dashboard สาธารณะ', 'LINE OA · transparent receipts · public dashboard')],
          ['ch', t('ช่องทาง', 'Channels'), t('LINE OA + ริชเมนู · ลานตากชุมชน · ผู้ใหญ่บ้าน/อบต.', 'LINE OA + rich menu · community drying yard · village leaders')],
          ['cs', t('กลุ่มลูกค้า', 'Customer segments'), t('เกษตรกรผู้ขายเศษพืช · ผู้รับซื้อสินค้า 6 แบบ · คนขับ (ผู้ให้บริการ)', 'Farmers selling residue · buyers of 6 products · drivers (service providers)')],
          ['cost', t('โครงสร้างต้นทุน', 'Cost structure'), t('ตู้และติดตั้ง · ไฟฟ้า (+โซลาร์) · ค่ารับซื้อวัตถุดิบ · ซ่อมบำรุง · แรงงาน', 'Machine & install · electricity (+solar) · residue purchases · maintenance · labour')],
          ['rev', t('รายได้', 'Revenue streams'), t('ขายสินค้า 6 แบบ · ค่าบริการแปรรูป · ค่าแพลตฟอร์ม 10% จากค่ารถ', 'Sales of 6 products · processing fees · 10% platform fee on pickups')],
        ].map(([k, h, body]) => (
          <div key={k} className={`bmc-${k}`}>
            <b>{h}</b>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </Slide>,

    <Slide key="course">
      <h2>{t('เชื่อมกับเนื้อหาวิชา', 'Course modules applied')}</h2>
      <div className="cols two">
        <ul className="points small">
          <li>
            <b>M1</b> {t('Externality → ทำให้เศษพืชมีราคา, SDGs', 'Externality → put a price on residue, SDGs')}
          </li>
          <li>
            <b>M2</b> {t('วางแผนคิว รอบบำรุงรักษา บทบาททีม', 'Queue planning, maintenance cycles, team roles')}
          </li>
          <li>
            <b>M3</b> {t('เครื่องหมายการค้า "ไร่ไม่เผา", ลิขสิทธิ์ซอฟต์แวร์และโมเดล 3D', 'Trademark, copyright on software and 3D model')}
          </li>
          <li>
            <b>M4</b> {t('PDPA: consent แยก, เข้ารหัส QR, ซ่อนชื่อ, ลบข้อมูลได้', 'PDPA: separate consent, encrypted QR, masked names, erasure')}
          </li>
          <li>
            <b>M5</b> {t('Triple Bottom Line บน Dashboard', 'Triple Bottom Line on the dashboard')}
          </li>
        </ul>
        <ul className="points small">
          <li>
            <b>M6</b> {t('สื่อสารสองภาษา ใช้ง่ายสำหรับชุมชน', 'Bilingual, community-friendly communication')}
          </li>
          <li>
            <b>M7</b> {t('ตัวเลขทุกตัวติดป้ายค่าประมาณ + อ้างอิง', 'Every number is labelled as an estimate + cited')}
          </li>
          <li>
            <b>M8–9</b> {t('LINE OA เป็นช่องทางหลัก, platform สองฝั่งแบบ Grab', 'LINE OA as the channel, a two-sided Grab-style platform')}
          </li>
          <li>
            <b>M10</b> {t('Social enterprise วัดผลกระทบได้จริงทุกครั้งที่ใช้', 'A social enterprise with measurable impact on every run')}
          </li>
        </ul>
      </div>
    </Slide>,

    <Slide key="thanks" className="title">
      <div>
        <h1>{t('ขอบคุณครับ/ค่ะ', 'Thank you')}</h1>
        <p className="big">{t('ลองใช้ระบบจริงได้เลย แล้วอย่าลืมโหวตให้เรา 🌾', 'Try the live system — and please vote for us 🌾')}</p>
        <p>
          <Link to="/" className="btn">
            {t('หน้าเว็บหลัก', 'Main site')}
          </Link>{' '}
          <Link to="/dashboard" className="btn">
            Dashboard
          </Link>
        </p>
      </div>
      <div className="qr-box">
        <QR value={site} size={240} />
        <small>{site.replace(/^https?:\/\//, '')}</small>
      </div>
    </Slide>,
  ];

  const n = slides.length;
  const goTo = (k) => setI(Math.max(0, Math.min(n - 1, k)));

  useEffect(() => {
    window.history.replaceState(null, '', `#${i}`);
  }, [i]);

  useEffect(() => {
    const onHash = () => setI(Number(window.location.hash.slice(1)) || 0);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) goTo(i + 1);
      if (['ArrowLeft', 'PageUp'].includes(e.key)) goTo(i - 1);
      if (e.key === 'f') document.documentElement.requestFullscreen?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="present">
      <div className="present-bar">
        <Link to="/" className="brand">
          🌾 {t('ไร่ไม่เผา', 'Rai Mai Phao')}
        </Link>
        <div className="row">
          <LangToggle />
          <button type="button" className="chip" onClick={() => document.documentElement.requestFullscreen?.()}>
            ⛶ {t('เต็มจอ', 'Fullscreen')}
          </button>
        </div>
      </div>
      {slides[i]}
      <div className="present-nav">
        <button type="button" className="btn" onClick={() => goTo(i - 1)} disabled={i === 0} aria-label={t('ก่อนหน้า', 'Previous')}>
          ◀
        </button>
        <div className="flow-dots">
          {slides.map((_, k) => (
            <i key={k} className={k === i ? 'on' : k < i ? 'done' : ''} onClick={() => goTo(k)} />
          ))}
        </div>
        <button type="button" className="btn primary" onClick={() => goTo(i + 1)} disabled={i === n - 1} aria-label={t('ถัดไป', 'Next')}>
          ▶
        </button>
      </div>
    </div>
  );
}
