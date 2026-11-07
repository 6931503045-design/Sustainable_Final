// สลับภาษาไทย/อังกฤษทั้งเว็บ: const t = useT(); t('ไทย', 'English')
// ข้อมูลใน shared/rules.js ที่มีทั้ง th/en ใช้ t.pick(obj)
import { useSyncExternalStore } from 'react';
import { local, setFormatLang } from './client.js';

const listeners = new Set();
let lang = local.get('lang', 'th');
if (typeof document !== 'undefined') document.documentElement.lang = lang;

export function setLang(next) {
  lang = next;
  setFormatLang(next);
  local.set('lang', next);
  document.documentElement.lang = next;
  listeners.forEach((f) => f());
}

const subscribe = (f) => {
  listeners.add(f);
  return () => listeners.delete(f);
};

export function useLang() {
  return useSyncExternalStore(subscribe, () => lang);
}

// ข้อความแบบมี key (ใช้กับ nav / hero / footer / โมเดล 3D): t.k('nav.prices'), t.k('footer.disclaimer', { pm25: 8 })
// เพิ่ม key ใหม่ต้องใส่ทั้ง th และ en
export const MESSAGES = {
  th: {
    'brand.name': 'ไร่ไม่เผา',
    'nav.home': 'ไร่ไม่เผา หน้าแรก',
    'nav.present': 'พรีเซนต์',
    'nav.prices': 'ราคา',
    'nav.farmer': 'เกษตรกร',
    'nav.team': 'เมนูทีมงาน',
    'nav.driver': 'คนขับ',
    'nav.kiosk': 'หน้าจอตู้',
    'nav.dashboard': 'Dashboard',
    'nav.booth': 'บูธ',
    'nav.openMenu': 'เปิดเมนู',
    'nav.closeMenu': 'ปิดเมนู',
    'nav.main': 'เมนูหลัก',
    'hero.eyebrow': 'นิทรรศการนวัตกรรมเพื่อความยั่งยืนและความรับผิดชอบต่อสังคม',
    'hero.title1': 'เปลี่ยนเศษพืช',
    'hero.title2': 'ที่เคยเผา',
    'hero.title3': 'ให้เป็น',
    'hero.titleHl': 'รายได้',
    'hero.ctaLine': 'เปิดใน LINE: แจ้งขาย / เรียกรถ',
    'hero.ctaTry': 'ลองแจ้งขายเศษพืช',
    'hero.ctaPresent': 'เริ่มพรีเซนต์',
    'hero.ctaPrices': 'ดูราคารับซื้อ',
    'model.loading': 'กำลังโหลดโมเดล 3D…',
    'model.posterAlt': 'ภาพตู้แปรรูปเศษวัสดุเกษตร ไร่ไม่เผา',
    'model.error': 'โหลดโมเดล 3D ไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง',
    'present.partsHint': 'กดปุ่ม "🏷️ ชื่อชิ้นส่วน" แล้วแตะตัวเลขบนโมเดล เพื่อดูว่าแต่ละชิ้นทำอะไร มีไว้ทำไม',
    'footer.tagline': 'ตู้แปรรูปเศษวัสดุเกษตร 3 in 1 + ระบบ LINE รับซื้อเศษพืชและเรียกรถคนในชุมชนไปรับถึงไร่ ลดการเผา เพิ่มรายได้',
    'footer.line': 'ติดต่อเราทาง LINE',
    'footer.pages': 'เมนู',
    'footer.team': 'สำหรับทีมงาน',
    'footer.home': 'หน้าแรก',
    'footer.pdpa': 'นโยบายความเป็นส่วนตัว (PDPA)',
    'footer.disclaimerTitle': 'ความโปร่งใสของตัวเลข',
    'footer.disclaimer':
      'นี่คือต้นแบบสำหรับนำเสนอ ตัวเลขสเปก ราคา ผลผลิต และค่าประมาณ PM2.5 ({pm25} กรัม ต่อเศษพืช 1 กก. ที่ไม่ถูกเผา) เป็นค่าสมมติ ต้องทดสอบจริงและอ้างอิงงานวิจัยก่อนใช้งาน',
    'footer.course': 'ต้นแบบในรายวิชา 2302103 มหาวิทยาลัยแม่ฟ้าหลวง',
  },
  en: {
    'brand.name': 'Rai Mai Phao',
    'nav.home': 'Rai Mai Phao home',
    'nav.present': 'Present',
    'nav.prices': 'Prices',
    'nav.farmer': 'Farmer',
    'nav.team': 'Team menu',
    'nav.driver': 'Driver',
    'nav.kiosk': 'Kiosk',
    'nav.dashboard': 'Dashboard',
    'nav.booth': 'Booth',
    'nav.openMenu': 'Open menu',
    'nav.closeMenu': 'Close menu',
    'nav.main': 'Main menu',
    'hero.eyebrow': 'Sustainability & Social Responsibility Innovation Expo',
    'hero.title1': 'Turn crop waste',
    'hero.title2': 'that used to be burned',
    'hero.title3': 'into',
    'hero.titleHl': 'income',
    'hero.ctaLine': 'Open in LINE: sell / book pickup',
    'hero.ctaTry': 'Try selling residue',
    'hero.ctaPresent': 'Start presentation',
    'hero.ctaPrices': 'See buy prices',
    'model.loading': 'Loading 3D model…',
    'model.posterAlt': 'The Rai Mai Phao crop-residue processor',
    'model.error': 'Couldn’t load the 3D model — please refresh',
    'present.partsHint': 'Turn on "🏷️ Part names", then tap a number on the model to see what each part does and why',
    'footer.tagline': 'A 3-in-1 crop-residue processor + a LINE system that buys residue and sends a local driver to the farm. Less burning, more income.',
    'footer.line': 'Contact us on LINE',
    'footer.pages': 'Menu',
    'footer.team': 'For the team',
    'footer.home': 'Home',
    'footer.pdpa': 'Privacy policy (PDPA)',
    'footer.disclaimerTitle': 'About the numbers',
    'footer.disclaimer':
      'This is a presentation prototype. Specs, prices, yields and the PM2.5 estimate ({pm25} g per kg of residue not burned) are assumptions to be tested and referenced before real use.',
    'footer.course': 'Prototype for course 2302103, Mae Fah Luang University',
  },
};

export function useT() {
  const l = useLang();
  const t = (th, en) => (l === 'en' ? en ?? th : th);
  t.k = (key, vars = {}) => (MESSAGES[l][key] ?? MESSAGES.th[key] ?? key).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? '');
  t.lang = l;
  // ข้อมูลภาษาอังกฤษใช้ชื่อฟิลด์ลงท้าย _en เช่น { th, en } หรือ { products, products_en }
  t.pick = (obj, field = 'th') => (obj ? (l === 'en' ? obj[field === 'th' ? 'en' : `${field}_en`] ?? obj[field] : obj[field]) : '');
  t.locale = l === 'en' ? 'en-GB' : 'th-TH';
  return t;
}

export function LangToggle({ dark = false }) {
  const l = useLang();
  return (
    <div className={`lang-toggle ${dark ? 'dark' : ''}`} role="group" aria-label="Language">
      {['th', 'en'].map((k) => (
        <button key={k} type="button" className={l === k ? 'on' : ''} aria-pressed={l === k} lang={k} onClick={() => setLang(k)}>
          {k === 'th' ? 'ไทย' : 'EN'}
        </button>
      ))}
    </div>
  );
}
