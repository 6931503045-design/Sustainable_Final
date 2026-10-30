// แถบแจ้งว่ายังไม่ได้เชื่อม LINE พร้อมสาเหตุ และปุ่มเปิดในแอป LINE
import { liffLink } from '../lib/line.js';

export default function DemoNotice({ session, path = '' }) {
  if (session.mode !== 'demo') return null;
  const link = liffLink(path);
  return (
    <div className="card demo-notice">
      <b>โหมดทดลอง: ยังไม่ได้เชื่อม LINE</b> (ใช้งานได้ แต่ไม่ส่งข้อความเข้าแชต)
      <p className="hint">สาเหตุ: {session.reason}</p>
      {link && (
        <a className="btn primary" href={link}>
          เปิดในแอป LINE
        </a>
      )}
    </div>
  );
}
