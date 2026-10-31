// คำอธิบายชิ้นส่วนในโมเดล 3D (id ตรงกับ HOTSPOTS ใน blender/build_model.py → hotspots.json)
// name = ชื่อ, what = ทำอะไร, why = มีไว้ทำไม · ตัวเลขเป็นค่าประมาณจากสเปกของกลุ่ม
export const PARTS = {
  hopper: {
    zone: '140–180',
    name: ['ช่องป้อนวัตถุดิบ', 'Feed hopper'],
    what: ['รับเศษพืชแห้งจากด้านบน มีตะแกรงกันมือขวางไว้', 'Takes in dry crop residue from the top, behind a hand guard grid'],
    why: ['ให้วัตถุดิบไหลลงเครื่องสับด้วยแรงโน้มถ่วง และกันไม่ให้ใครล้วงมือเข้าไปถึงใบมีด', 'Lets material fall into the mill by gravity and keeps hands away from the blades'],
  },
  lid: {
    zone: '140–180',
    name: ['ฝา + สวิตช์ตัดไฟ', 'Lid interlock switch'],
    what: ['ตรวจว่าฝาปิดอยู่ ถ้าเปิดฝาเครื่องหยุดทันที', 'Detects the lid position; opening it stops the machine'],
    why: ['ความปลอดภัยชั้นแรก ป้องกันการเข้าถึงชิ้นส่วนที่หมุนขณะทำงาน', 'First safety layer — no access to moving parts while running'],
  },
  magnet: {
    zone: '140–180',
    name: ['แม่เหล็กดักเศษเหล็ก', 'Tramp-metal magnet'],
    what: ['ดูดลวด ตะปู หรือเศษเหล็กที่ปนมากับฟาง', 'Catches wire, nails and scrap mixed in with the straw'],
    why: ['กันใบมีดและแม่พิมพ์เสียหาย และกันประกายไฟที่อาจทำให้ฝุ่นพืชติดไฟ', 'Protects blades and dies and prevents sparks that could ignite plant dust'],
  },
  moisture: {
    zone: '140–180',
    name: ['เซนเซอร์ความชื้น', 'Moisture sensor'],
    what: ['วัดความชื้นตอนป้อน ถ้าเกิน 20% จะแจ้งเตือนและไม่รับ', 'Measures moisture at the inlet; over 20% is rejected'],
    why: ['ของชื้นอัดเม็ด/อัดแท่งไม่ติดกันและขึ้นราง่าย และใช้คิดราคาตามความชื้นอย่างโปร่งใส', 'Wet material won’t bind and moulds easily; also drives transparent moisture-based pricing'],
  },
  screen: {
    zone: '140–180',
    name: ['หน้าจอสัมผัส', 'Touchscreen'],
    what: ['แสดงข้อมูลล็อต น้ำหนัก ความชื้น ให้เลือกโหมด A/B/C และแสดงผลลัพธ์', 'Shows lot, weight and moisture, lets the user choose A/B/C and shows results'],
    why: ['ใช้งานง่ายสำหรับคนในชุมชน ทุกขั้นตอนเห็นตัวเลขจริง ไม่ต้องจดมือ', 'Simple for villagers to use; every step shows real numbers, no paper records'],
  },
  qr: {
    zone: '140–180',
    name: ['เครื่องสแกน QR', 'QR scanner'],
    what: ['สแกน QR จาก LINE ของเกษตรกรหรือคนขับ', 'Scans the QR from the farmer’s or driver’s LINE'],
    why: ['ผูกวัตถุดิบกับเจ้าของได้ถูกคน จึงจ่ายเงินและส่งใบรับของเข้า LINE ได้อัตโนมัติ', 'Links material to the right owner, so payment and the LINE receipt are automatic'],
  },
  camera: {
    zone: '140–180',
    name: ['กล้องหน้าตู้', 'Evidence camera'],
    what: ['ถ่ายรูปวัตถุดิบตอนป้อนและสินค้าที่ได้', 'Photographs the input and the output'],
    why: ['เป็นหลักฐานการซื้อขาย ลดข้อโต้แย้งเรื่องคุณภาพและน้ำหนัก', 'Proof of transaction — fewer disputes about quality and weight'],
  },
  estop: {
    zone: '140–180',
    name: ['ปุ่มหยุดฉุกเฉิน', 'Emergency stop'],
    what: ['ตัดไฟมอเตอร์ทุกตัวทันทีที่กด', 'Cuts power to every motor instantly'],
    why: ['มาตรฐานความปลอดภัยของเครื่องจักร ต้องอยู่ในตำแหน่งที่มองเห็นและกดง่าย', 'A machine-safety essential, visible and easy to reach'],
  },
  mill: {
    zone: '100–140',
    name: ['เครื่องสับ (Hammer mill)', 'Hammer mill'],
    what: ['ค้อนเหวี่ยงตีเศษพืชจนละเอียด ใช้ร่วมกันทั้ง 3 โหมด', 'Swinging hammers shred the residue; shared by all 3 modes'],
    why: ['เป็นหัวใจของตู้ ทำให้ 3 เครื่องในตู้เดียวใช้ต้นกำลังร่วมกัน ประหยัดพื้นที่และต้นทุน', 'The heart of the cabinet — one mill feeds three processes, saving space and cost'],
  },
  sieve: {
    zone: '100–140',
    name: ['ตะแกรงเปลี่ยนได้ 2 ขนาด', 'Swappable screen (2 sizes)'],
    what: ['ตะแกรงหยาบสำหรับโหมดสับ ตะแกรงละเอียดสำหรับอัดเม็ด/อัดแท่ง', 'Coarse screen for chop, fine screen for pellet/briquette'],
    why: ['คุมขนาดชิ้นให้เหมาะกับสินค้าแต่ละแบบ', 'Controls particle size for each product'],
  },
  motor: {
    zone: '100–140',
    name: ['มอเตอร์เครื่องสับ ~3 kW', 'Mill motor ~3 kW'],
    what: ['ขับเครื่องสับ มีเซนเซอร์อุณหภูมิตัดไฟเมื่อร้อนเกิน', 'Drives the mill, with a temperature sensor that cuts power when overheating'],
    why: ['ระบบเริ่มทีละตัวเพื่อลดกระแสกระชาก ใช้ไฟร่วมกับโซลาร์เซลล์ได้', 'Motors start one at a time to limit inrush current; can share solar power'],
  },
  diverter: {
    zone: '85–100',
    name: ['ลิ้นสลับทาง', 'Diverter flap'],
    what: ['แผ่นโลหะหมุนด้วยมอเตอร์ ส่งวัตถุดิบไปทาง A (ซ้าย) C (กลาง) หรือ B (ขวา)', 'A motor-driven plate routing material to A (left), C (centre) or B (right)'],
    why: ['ทำให้ตู้เดียวเลือกได้ 3 โหมดจากหน้าจอ โดยไม่ต้องถอดประกอบ', 'Lets one cabinet switch between 3 modes from the screen without disassembly'],
  },
  pellet: {
    zone: '30–85',
    name: ['A · แม่พิมพ์อัดเม็ด (Flat die)', 'A · Flat-die pellet mill'],
    what: ['ลูกกลิ้งกดวัตถุดิบผ่านรูแม่พิมพ์ ความร้อนจากแรงเสียดทานทำให้เส้นใยยึดกันเป็นเม็ดโดยไม่ใช้กาว', 'Rollers press material through a die; frictional heat binds the fibres into pellets with no glue'],
    why: ['ได้อาหารสัตว์อัดเม็ด (แม่พิมพ์เล็ก) หรือเชื้อเพลิงอัดเม็ด (แม่พิมพ์ใหญ่) มูลค่าสูงกว่าขายฟางดิบ', 'Makes feed pellets (small die) or fuel pellets (large die) worth more than raw straw'],
  },
  chute: {
    zone: '30–85',
    name: ['C · ช่องตรง (โหมดสับ)', 'C · Straight chute (chop)'],
    what: ['ส่งวัตถุดิบที่สับแล้วลงถาดโดยตรง', 'Sends chopped material straight to the tray'],
    why: ['โหมดที่เร็วที่สุดและใช้ไฟน้อยที่สุด ได้วัสดุคลุมดิน วัสดุเพาะเห็ด และวัตถุดิบปุ๋ยหมัก', 'Fastest, lowest-energy mode: mulch, mushroom substrate and compost feedstock'],
  },
  press: {
    zone: '30–85',
    name: ['B · เกลียวอัดแท่ง + ขดลวดร้อน', 'B · Screw press + heater'],
    what: ['เกลียวดันวัตถุดิบผ่านท่อที่มีขดลวดความร้อน ได้แท่งกลวงตรงกลาง แล้วตัดเป็นท่อน', 'A screw pushes material through a heated barrel, forming hollow logs that are cut to length'],
    why: ['แท่งกลวงติดไฟง่ายและเผาไหม้ทั่วถึง ใช้แทนถ่าน/ฟืน ต้องอุ่นเครื่อง 10–15 นาทีก่อนเริ่ม', 'Hollow briquettes light easily and burn evenly, replacing charcoal/firewood; needs 10–15 min warm-up'],
  },
  trays: {
    zone: '0–30',
    name: ['ถาดรับสินค้า 3 ช่อง', '3 output trays'],
    what: ['ถาด A อัดเม็ด · C สับ · B อัดแท่ง ดึงออกด้านหน้าได้', 'Trays A pellet · C chop · B briquette, pull out from the front'],
    why: ['แยกสินค้าไม่ให้ปนกัน และบรรจุถุงได้ทันที', 'Keeps products separate and ready to bag'],
  },
  scale: {
    zone: '0–30',
    name: ['ตาชั่งใต้ถาด', 'Load cells under trays'],
    what: ['ชั่งน้ำหนักสินค้าที่ได้ทุกครั้ง', 'Weighs the output every run'],
    why: ['ข้อมูลน้ำหนักก่อน-หลังใช้จ่ายเงิน วัดผลกระทบ (กก. ที่ไม่ถูกเผา) และส่งใบรับของเข้า LINE', 'Before/after weights drive payment, impact metrics (kg not burned) and the LINE receipt'],
  },
  dust: {
    zone: 'back',
    name: ['พัดลมดูดฝุ่น + ถุงเก็บฝุ่น', 'Dust extractor + bag'],
    what: ['ดูดฝุ่นจากเครื่องสับลงถุงด้านหลัง', 'Pulls dust from the mill into a rear bag'],
    why: ['ฝุ่นพืชติดไฟได้และอันตรายต่อปอด ตู้ที่ลดฝุ่นควันต้องไม่สร้างฝุ่นเพิ่ม', 'Plant dust is flammable and harmful to lungs — a machine meant to cut smoke must not make dust'],
  },
  electric: {
    zone: 'back',
    name: ['ตู้ควบคุมไฟฟ้า', 'Electrical cabinet'],
    what: ['ควบคุมมอเตอร์ เซนเซอร์ และจ่ายไฟจากการไฟฟ้า + โซลาร์เซลล์', 'Controls motors and sensors; grid power plus solar'],
    why: ['แยกส่วนไฟฟ้าออกจากฝุ่น และแจ้งเตือนรอบบำรุงรักษาเข้า LINE ช่าง', 'Keeps electrics away from dust and sends service alerts to the technician’s LINE'],
  },
};

// ขั้นตอน flow การทำงาน (ใช้ทั้งในโมเดล 3D และหน้าพรีเซนต์)
// focus = จุดที่กล้องหันไป ('mode' = ชิ้นส่วนของโหมดที่เลือก), path = ช่วงเส้นทางที่จุดวัตถุดิบวิ่ง
export const FLOW_STEPS = [
  { id: 'scan', focus: 'qr', path: null, title: ['1. สแกน QR', '1. Scan QR'], text: ['เกษตรกรหรือคนขับสแกน QR จาก LINE ระบบรู้ว่าเป็นล็อตของใครและน้ำหนักที่รับเข้า', 'The farmer or driver scans the LINE QR — the system knows the owner and intake weight'] },
  { id: 'feed', focus: 'hopper', path: 'feed', title: ['2. ป้อน + ตรวจความชื้น', '2. Feed + moisture check'], text: ['เทเศษพืชลงช่องป้อน แม่เหล็กดักเศษเหล็ก เซนเซอร์วัดความชื้น กล้องถ่ายรูป', 'Residue goes into the hopper; the magnet catches metal, the sensor checks moisture, the camera takes a photo'] },
  { id: 'mill', focus: 'mill', path: 'mill', title: ['3. สับละเอียด', '3. Shred'], text: ['เครื่องสับตีให้ละเอียดผ่านตะแกรงที่เลือก', 'The hammer mill shreds it through the selected screen'] },
  { id: 'divert', focus: 'diverter', path: 'divert', title: ['4. ลิ้นสลับทาง', '4. Diverter'], text: ['ลิ้นสลับทางหมุนไปยังโหมดที่เลือก A / B / C', 'The diverter turns to the selected mode A / B / C'] },
  { id: 'process', focus: 'mode', path: 'process', title: ['5. แปรรูป', '5. Process'], text: ['A อัดเม็ด · B อัดแท่ง · C ส่งตรงลงถาด', 'A pellets · B briquettes · C straight to the tray'] },
  { id: 'weigh', focus: 'scale', path: null, title: ['6. ชั่งน้ำหนัก', '6. Weigh'], text: ['ตาชั่งใต้ถาดชั่งสินค้า กล้องถ่ายรูปผลลัพธ์', 'Load cells weigh the output; the camera photographs it'] },
  { id: 'line', focus: 'screen', path: null, title: ['7. ใบรับของเข้า LINE', '7. Receipt in LINE'], text: ['ส่งน้ำหนักก่อน-หลัง ยอดเงิน และ กก. ที่ไม่ถูกเผา เข้า LINE และ Dashboard', 'Weights, payment and kg not burned go to LINE and the dashboard'] },
];
