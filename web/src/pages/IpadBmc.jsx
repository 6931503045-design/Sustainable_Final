// หน้าสำหรับ iPad ตั้งที่บูธ: Business Model Canvas เต็มจอ (แนวนอน)
import BMC from '../components/BMC.jsx';
import useLockScroll from '../lib/useLockScroll.js';
import IpadBar from '../components/IpadBar.jsx';
import { useT } from '../lib/i18n.jsx';

const SDGS = [
  [3, '#4C9F38', 'สุขภาพดี', 'Good health'],
  [8, '#A21942', 'งานและรายได้', 'Decent work'],
  [12, '#BF8B2E', 'ผลิต-บริโภคอย่างรับผิดชอบ', 'Responsible production'],
  [13, '#3F7E44', 'รับมือโลกร้อน', 'Climate action'],
];

export default function IpadBmc() {
  const t = useT();
  useLockScroll();
  return (
    <div className="ipad ipad-bmc">
      <IpadBar title="Business Model Canvas" />
      <BMC large />
      <footer className="ipad-sdg" aria-label="SDGs">
        {SDGS.map(([n, c, th, en]) => (
          <span key={n} style={{ background: c }}>
            <b>{n}</b> {t(th, en)}
          </span>
        ))}
        <small>{t('ตัวเลขเป็นค่าประมาณของต้นแบบ', 'Figures are prototype estimates')}</small>
      </footer>
    </div>
  );
}
