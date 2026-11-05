// หน้าร่างการจัดบูธ (สำหรับทีม): ภาพจำลอง แปลน ตำแหน่งของ ร่างสิ่งพิมพ์ และงบ — ที่มา: blender/booth/ + docs/BOOTH.md
import { Nav } from '../App.jsx';
import { useT } from '../lib/i18n.jsx';

const ITEMS = [
  [['จอคอม 22–24"', '22–24" monitor'], ['ซ้ายหลัง หันเฉียงเข้ากลาง ~18°', 'Back left, angled ~18° inward'], ['เปิด /present เต็มจอ (กด F) โชว์โมเดล 3D + flow วนเอง', 'Run /present full screen (F): 3D model + workflow on loop']],
  [['ฟิวเจอร์บอร์ด ปีกซ้าย 30×90 ซม.', 'Left board wing 30×90 cm'], ['หลังโต๊ะ ปีกพับเข้า ~35°', 'Behind the table, folded in ~35°'], ['ปัญหา → ทางออก (เนื้อหาไว้ครึ่งบน เพราะจอบังครึ่งล่าง)', 'Problem → solution (keep content high; the monitor hides the lower half)']],
  [['ฟิวเจอร์บอร์ด กลาง 60×90 ซม.', 'Centre board 60×90 cm'], ['หลังโต๊ะ ค่อนขวา ขอบบนสูง ~165 ซม.', 'Behind the table, right of centre, top edge ~165 cm'], ['Business Model Canvas + 3 โหมด A/B/C (ข้อมูลหลักสำหรับกรรมการ)', 'Business Model Canvas + modes A/B/C (main info for judges)']],
  [['ฟิวเจอร์บอร์ด ปีกขวา 30×90 ซม.', 'Right board wing 30×90 cm'], ['หลังโต๊ะ ปีกพับเข้า ~35°', 'Behind the table, folded in ~35°'], ['ผลกระทบ + ทีม 9 คน + QR เว็บไซต์', 'Impact + 9-person team + website QR']],
  [['โมเดลตู้พิมพ์ 3D 1:8 (~10.6 × 7.5 × 22.5 ซม.)', '3D-printed model 1:8 (~10.6 × 7.5 × 22.5 cm)'], ['กลางโต๊ะ หน้าบอร์ดกลาง บนแท่นหมุน Ø ~24 ซม.', 'Centre, in front of the main board, on a ~24 cm turntable'], ['จุดดึงสายตา ใช้คู่กับจุดชี้ชิ้นส่วนบนจอ + ป้ายบอกสเกล', 'Eye-catcher, paired with the on-screen part hotspots + scale tag']],
  [['ขวดตัวอย่าง 4 ขวด', '4 sample jars'], ['หน้าโต๊ะ ระหว่างจอกับโมเดล', 'Front, between monitor and model'], ['ดิบ → C สับ → A อัดเม็ด → B อัดแท่ง ให้คนหยิบดูได้', 'Raw → C chop → A pellet → B briquette, hands-on']],
  [['แท็บเล็ต + ขาตั้ง', 'Tablet on stand'], ['ขวาหน้า', 'Front right'], ['เปิด /kiosk ให้ผู้ชมลองสแกน QR → แปรรูป → ใบรับของเข้า LINE', 'Run /kiosk so visitors can scan a QR → process → LINE receipt']],
  [['ป้าย QR A5 ตั้งโต๊ะ', 'A5 QR stand'], ['ซ้ายหน้า (ใกล้ทางเดินที่สุด)', 'Front left (closest to the aisle)'], ['เพิ่มเพื่อน LINE OA แล้วลองแจ้งขาย / เรียกรถ', 'Add the LINE OA and try selling / booking a pickup']],
  [['ผ้า/ไวนิลหน้าโต๊ะ 150×70 ซม.', 'Table skirt 150×70 cm'], ['คลุมหน้าโต๊ะ', 'Front of the table'], ['โลโก้ + สโลแกน + QR "โหวตให้เรา" มองเห็นจากทางเดิน', 'Logo + slogan + "vote for us" QR, visible from the aisle']],
];

const BUDGET = [
  [['ฟิวเจอร์บอร์ด 3 ทบ หรือแผ่น 65×122 ตัดเอง', 'Tri-fold board or 65×122 sheet cut to size'], '120–200'],
  [['พิมพ์โปสเตอร์ติดบอร์ด 3 แผ่น (A1 + A2 ×2)', 'Print 3 board posters (A1 + 2× A2)'], '300–400'],
  [['ไวนิลหน้าโต๊ะ 150×70 ซม.', 'Table vinyl 150×70 cm'], '150–250'],
  [['ป้าย A5 + ป้ายโมเดล + สติกเกอร์ A/B/C', 'A5 sign + model tag + A/B/C stickers'], '50–100'],
  [['เทปกาวสองหน้า เทปใส คัตเตอร์', 'Double-sided tape, clear tape, cutter'], '50–80'],
];

const PRINTS = [
  ['board_left', ['ปีกซ้าย', 'Left wing']],
  ['board_center', ['แผ่นกลาง (BMC)', 'Centre (BMC)']],
  ['board_right', ['ปีกขวา', 'Right wing']],
  ['skirt', ['ผ้าหน้าโต๊ะ', 'Table skirt']],
  ['qr_stand', ['ป้าย QR A5', 'A5 QR sign']],
];

export default function Booth() {
  const t = useT();
  return (
    <>
      <Nav />
      <main className="wrap">
        <h1>{t('ร่างการจัดบูธ', 'Booth layout draft')}</h1>
        <p className="lead">
          {t(
            'โต๊ะพับ 150 × 60 × 75 ซม. · จอคอม + ฟิวเจอร์บอร์ด 3 ทบ + โมเดลพิมพ์ 3D · ภาพจำลองจาก Blender (blender/booth/)',
            'Folding table 150 × 60 × 75 cm · monitor + tri-fold board + 3D-printed model · rendered in Blender (blender/booth/)',
          )}
        </p>

        <figure className="card booth-fig">
          <a href="/img/booth/layout.jpg" target="_blank" rel="noreferrer">
            <img src="/img/booth/layout.jpg" alt={t('ภาพจำลองบูธจากมุมผู้ชม พร้อมหมายเลขอธิบาย', 'Booth mockup from the visitor’s view with numbered callouts')} loading="lazy" />
          </a>
          <figcaption className="hint">{t('มุมมองจากทางเดิน (กรรมการ/ผู้ชม) · กดที่ภาพเพื่อเปิดเต็มขนาด', 'View from the aisle (judges/visitors) · tap to open full size')}</figcaption>
        </figure>
        <figure className="card booth-fig">
          <a href="/img/booth/plan.jpg" target="_blank" rel="noreferrer">
            <img src="/img/booth/plan.jpg" alt={t('แปลนบูธด้านบนและด้านหน้าพร้อมระยะ', 'Top plan and front elevation with dimensions')} loading="lazy" />
          </a>
          <figcaption className="hint">{t('แปลนด้านบน + ด้านหน้า พร้อมระยะ', 'Top plan + front elevation with dimensions')}</figcaption>
        </figure>

        <section className="card">
          <h2>{t('ตำแหน่งของบนโต๊ะ', 'What goes where')}</h2>
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('ของ', 'Item')}</th>
                  <th>{t('ตำแหน่ง', 'Position')}</th>
                  <th>{t('ใช้ทำอะไร', 'Purpose')}</th>
                </tr>
              </thead>
              <tbody>
                {ITEMS.map(([name, pos, use], i) => (
                  <tr key={name[1]}>
                    <td>
                      <span className="badge-num">{i + 1}</span>
                    </td>
                    <td>
                      <b>{t(...name)}</b>
                    </td>
                    <td>{t(...pos)}</td>
                    <td>{t(...use)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>{t('ร่างสิ่งพิมพ์', 'Print drafts')}</h2>
          <p className="hint">
            {t(
              'เป็นแบบร่าง ทีมออกแบบไปทำไฟล์พิมพ์จริงต่อ (ใส่ตัวเลขฝุ่นจริง + รูปทีม · QR ในร่างเป็นลิงก์สมมติ) กดเพื่อดาวน์โหลด',
              'Drafts only — the design team should finish the print files (add real haze data + team photos; the QR is a placeholder). Tap to download.',
            )}
          </p>
          <div className="print-grid">
            {PRINTS.map(([f, name]) => (
              <a key={f} href={`/img/booth/${f}.jpg`} download className="print-item">
                <img src={`/img/booth/${f}.jpg`} alt={t(...name)} loading="lazy" />
                <span>{t(...name)}</span>
              </a>
            ))}
          </div>
        </section>

        <div className="grid2">
          <section className="card">
            <h2>{t('เคล็ดลับ', 'Tips')}</h2>
            <ul>
              <li>{t('จอบังครึ่งล่างของปีกซ้าย: วางเนื้อหาไว้ครึ่งบน หรือใช้จอ 22" / ยกบอร์ดสูงขึ้นด้วยกล่อง', 'The monitor hides the lower left wing: keep content high, use a 22" screen, or raise the board on a box')}</li>
              <li>{t('ใต้โต๊ะ: คอม/โน้ตบุ๊ก ปลั๊กพ่วง สายชาร์จ (ผ้าหน้าโต๊ะปิดไว้) + hotspot มือถือสำรอง', 'Under the table: computer, power strip, chargers (hidden by the skirt) + a backup mobile hotspot')}</li>
              <li>{t('ทีมยืนหลังโต๊ะ 2–3 คน: 1 คนพูด pitch · 1 คนพาลองแท็บเล็ต/LINE · 1 คนชวนคนมาสแกนโหวต', '2–3 people behind the table: one pitches, one guides the tablet/LINE demo, one invites passers-by to scan and vote')}</li>
              <li>{t('โมเดล 3D: export STL จาก Blender ที่สเกล 1:8 ถ้าพิมพ์สีเดียว ทาสี/ติดสติกเกอร์ A/B/C ที่ถาด', '3D model: export STL from Blender at 1:8; if printed in one colour, paint or add A/B/C stickers on the trays')}</li>
            </ul>
          </section>
          <section className="card">
            <h2>{t('งบ 1,000 บาท', 'Budget ฿1,000')}</h2>
            <table className="prices">
              <tbody>
                {BUDGET.map(([name, baht]) => (
                  <tr key={name[1]}>
                    <td>{t(...name)}</td>
                    <td className="num">{baht} ฿</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hint">
              {t(
                'รวม ~670–1,030 บาท อาจเกินถ้าเลือกแพงสุด · เบิกได้เฉพาะเครื่องเขียน/งานพิมพ์ ใบเสร็จในนาม ม.แม่ฟ้าหลวง · เส้นพิมพ์ 3D ขวดโหล วัตถุดิบตัวอย่าง เบิกไม่ได้',
                'Total ~฿670–1,030, may exceed the cap at the top end · only stationery/printing is reimbursable (receipt to Mae Fah Luang University) · 3D filament, jars and samples are not',
              )}
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
