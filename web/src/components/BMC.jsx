// Business Model Canvas ใช้ร่วมกันระหว่างหน้า /present และหน้า iPad /ipad/bmc
import { useT } from '../lib/i18n.jsx';

export default function BMC({ large = false }) {
  const t = useT();
  const items = [
    ['kp', t('พันธมิตรหลัก', 'Key partners'), t('วิสาหกิจชุมชน · อบต./ผู้ใหญ่บ้าน · มฟล. · ฟาร์มเห็ด สหกรณ์โคนม โรงอบลำไย · คนขับในพื้นที่', 'Community enterprises · local government · MFU · mushroom farms, dairy co-ops, longan dryers · local drivers')],
    ['ka', t('กิจกรรมหลัก', 'Key activities'), t('รับซื้อ แปรรูป ขาย · ดูแลแพลตฟอร์ม LINE · บำรุงรักษาตู้', 'Buy, process, sell · run the LINE platform · maintain machines')],
    ['kr', t('ทรัพยากรหลัก', 'Key resources'), t('ตู้ 3 in 1 · ระบบ LINE + ข้อมูล · เครือข่ายคนขับ · แบรนด์ "ไร่ไม่เผา"', '3-in-1 machine · LINE system + data · driver network · brand')],
    ['vp', t('คุณค่าที่ส่งมอบ', 'Value propositions'), t('เกษตรกร: เศษพืชมีราคา ไม่ต้องเผา รถไปรับถึงไร่ · ผู้ซื้อ: วัตถุดิบสม่ำเสมอ ตรวจสอบได้ · ชุมชน: อากาศสะอาด', 'Farmers: residue earns money, pickup at the farm · Buyers: consistent, traceable supply · Community: clean air')],
    ['cr', t('ความสัมพันธ์กับลูกค้า', 'Customer relationships'), t('LINE OA · ใบรับของโปร่งใส · Dashboard สาธารณะ', 'LINE OA · transparent receipts · public dashboard')],
    ['ch', t('ช่องทาง', 'Channels'), t('LINE OA + ริชเมนู · ลานตากชุมชน · ผู้ใหญ่บ้าน/อบต.', 'LINE OA + rich menu · community drying yard · village leaders')],
    ['cs', t('กลุ่มลูกค้า', 'Customer segments'), t('เกษตรกรผู้ขายเศษพืช · ผู้รับซื้อสินค้า 6 แบบ · คนขับ (ผู้ให้บริการ)', 'Farmers selling residue · buyers of 6 products · drivers (service providers)')],
    ['cost', t('โครงสร้างต้นทุน', 'Cost structure'), t('ตู้และติดตั้ง (~2 แสนบาท/ตู้) · ไฟฟ้า (+โซลาร์) · ค่ารับซื้อวัตถุดิบ · ซ่อมบำรุง · แรงงาน · กองทุนช่วยค่ารถ', 'Machine & install (~200,000 THB each) · electricity (+solar) · residue purchases · maintenance · labour · pickup support fund')],
    ['rev', t('รายได้', 'Revenue streams'), t('ขายสินค้า 6 แบบ · ค่าบริการแปรรูป · ค่าแพลตฟอร์ม 10% จากค่ารถ', 'Sales of 6 products · processing fees · 10% platform fee on pickups')],
  ];
  return (
    <div className={`bmc ${large ? 'bmc-large' : ''}`}>
      {items.map(([k, h, body]) => (
        <div key={k} className={`bmc-${k}`}>
          <b>{h}</b>
          <p>{body}</p>
        </div>
      ))}
    </div>
  );
}
