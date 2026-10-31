import { Nav } from '../App.jsx';
import { useT } from '../lib/i18n.jsx';
import { CONSENT_VERSION } from './Farmer.jsx';

const ROWS = [
  [['ชื่อ LINE, LINE user ID', 'LINE name, LINE user ID'], ['ยืนยันตัวตน ส่ง QR และใบรับของ', 'Identify you, send QR and receipts'], ['สัญญา (Contract) + ความยินยอม', 'Contract + consent']],
  [['หมู่บ้าน ชนิด/น้ำหนักเศษพืช เวลานัด', 'Village, residue type/weight, booking time'], ['จัดคิว คำนวณยอดเงิน', 'Scheduling and payment'], ['สัญญา (Contract)', 'Contract']],
  [
    ['ตำแหน่งกองเศษพืช เบอร์โทร จุดสังเกต (เมื่อเรียกรถ)', 'Pile location, phone, landmark (pickups)'],
    ['ให้คนขับไปรับได้ (เปิดให้เฉพาะคนขับที่รับงานนั้น ก่อนรับงานเห็นแค่พิกัดคร่าว ๆ ~1 กม.)', 'Let the driver collect (only the accepting driver sees it; before that only an approximate ~1 km location)'],
    ['สัญญา (Contract) + ความยินยอม', 'Contract + consent'],
  ],
  [['คนขับ: ชื่อ LINE เบอร์โทร ทะเบียนรถ ประเภทรถ', 'Drivers: LINE name, phone, plate, vehicle type'], ['จับคู่งาน แจ้งงานใหม่ และให้เกษตรกรเจ้าของงานติดต่อได้', 'Match jobs, notify new jobs, let the farmer contact them'], ['สัญญา (Contract) + ความยินยอม', 'Contract + consent']],
  [['รูปถ่ายวัตถุดิบ/สินค้าที่ตู้', 'Photos of input/output at the machine'], ['หลักฐานการซื้อขาย', 'Proof of transaction'], ['ประโยชน์โดยชอบด้วยกฎหมาย (ประเมิน LIA แล้ว)', 'Legitimate interest (LIA done)']],
  [['สถิติรวมแบบไม่ระบุตัวตน', 'Anonymous aggregate statistics'], ['Dashboard ผลกระทบสาธารณะ', 'Public impact dashboard'], ['ไม่เป็นข้อมูลส่วนบุคคล (ซ่อนชื่อบางส่วน)', 'Not personal data (names masked)']],
];

export default function Privacy() {
  const t = useT();
  return (
    <>
      <Nav />
      <main className="wrap narrow card prose">
        <h1>{t('นโยบายความเป็นส่วนตัว (ต้นแบบ)', 'Privacy policy (prototype)')}</h1>
        <p>
          {t('ฉบับ', 'Version')} {CONSENT_VERSION} · {t('จัดทำตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)', 'under Thailand’s Personal Data Protection Act B.E. 2562 (PDPA)')}
        </p>
        <h2>{t('ผู้ควบคุมข้อมูล', 'Data controller')}</h2>
        <p>{t('โครงการ "ไร่ไม่เผา" (ต้นแบบในรายวิชา 2302103 มหาวิทยาลัยแม่ฟ้าหลวง)', 'The "Rai Mai Phao" project (prototype for course 2302103, Mae Fah Luang University)')}</p>
        <h2>{t('ข้อมูลที่เก็บและฐานทางกฎหมาย', 'Data collected and lawful basis')}</h2>
        <table>
          <tbody>
            <tr>
              <th>{t('ข้อมูล', 'Data')}</th>
              <th>{t('วัตถุประสงค์', 'Purpose')}</th>
              <th>{t('ฐาน', 'Basis')}</th>
            </tr>
            {ROWS.map((r) => (
              <tr key={r[0][1]}>
                {r.map((c) => (
                  <td key={c[1]}>{t(...c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <h2>{t('การปกป้องข้อมูล', 'Safeguards')}</h2>
        <ul>
          <li>{t('QR ของล็อตเข้ารหัส (AES-256-GCM) ไม่มี LINE user ID ที่อ่านได้', 'Lot QR codes are encrypted (AES-256-GCM); no readable LINE user ID')}</li>
          <li>{t('ฐานข้อมูลไม่เก็บ LINE user ID ตรง ๆ เก็บเป็นค่าแฮชเพื่อใช้ลบข้อมูลตามคำขอ', 'The database stores a hash, not the raw LINE user ID, to support erasure requests')}</li>
          <li>{t('หน้า Dashboard แสดงชื่อแบบย่อ เช่น "สมชาย ใ."', 'The dashboard shows masked names, e.g. "Somchai J."')}</li>
        </ul>
        <h2>{t('สิทธิ์ของคุณ', 'Your rights')}</h2>
        <p>
          {t(
            'สิทธิ์ได้รับแจ้ง เข้าถึง ขอรับข้อมูล (portability) แก้ไข คัดค้าน ลบ และระงับการใช้ข้อมูล ใช้สิทธิ์ได้ที่แท็บ "สิทธิ์ของฉัน" ในหน้า LINE หรือแจ้งผ่านแชต การถอนความยินยอมทำได้ง่ายเท่ากับตอนให้ความยินยอม',
            'Rights to be informed, access, portability, rectification, objection, erasure and restriction. Use the "Rights" tab in LINE or message us. Withdrawing consent is as easy as giving it.',
          )}
        </p>
        <h2>{t('ระยะเวลาเก็บ', 'Retention')}</h2>
        <p>{t('เก็บตลอดระยะเวลาที่ใช้บริการ และลบภายใน 30 วันหลังขอลบ เว้นแต่ต้องเก็บรายการซื้อขายตามกฎหมายบัญชี/ภาษี', 'Kept while you use the service and deleted within 30 days of a request, except transactions required by accounting/tax law.')}</p>
      </main>
    </>
  );
}
