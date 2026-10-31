// แถบแจ้งว่ายังไม่ได้เชื่อม LINE พร้อมสาเหตุ และปุ่มเปิดในแอป LINE
import { useT } from '../lib/i18n.jsx';
import { liffLink } from '../lib/line.js';

export default function DemoNotice({ session, path = '' }) {
  const t = useT();
  if (session.mode !== 'demo') return null;
  const link = liffLink(path);
  return (
    <div className="card demo-notice">
      <b>{t('โหมดทดลอง: ยังไม่ได้เชื่อม LINE', 'Demo mode: not connected to LINE')}</b>{' '}
      {t('(ใช้งานได้ แต่ไม่ส่งข้อความเข้าแชต)', '(everything works, but no chat messages are sent)')}
      <p className="hint">
        {t('สาเหตุ', 'Reason')}: {session.reason}
      </p>
      {link && (
        <a className="btn primary" href={link}>
          {t('เปิดในแอป LINE', 'Open in the LINE app')}
        </a>
      )}
    </div>
  );
}
