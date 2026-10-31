// เรียก API + ที่เก็บข้อมูลในเครื่อง (localStorage) แบบไม่พังถ้าเบราว์เซอร์ปิดไว้

export async function api(path, { method = 'GET', data } = {}) {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || `เกิดข้อผิดพลาด (${res.status})`);
  return out;
}

export const local = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(`rmp:${key}`);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`rmp:${key}`, JSON.stringify(value));
    } catch {
      /* โหมดส่วนตัว/ปิด storage: ข้ามไป */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(`rmp:${key}`);
    } catch {
      /* ignore */
    }
  },
};

// รูปแบบตัวเลข/วันที่ตามภาษาที่เลือก (i18n.jsx เรียก setFormatLang เมื่อสลับภาษา)
let fmtLang = local.get('lang', 'th');
export const setFormatLang = (l) => (fmtLang = l);
const loc = () => (fmtLang === 'en' ? 'en-GB' : 'th-TH');
export const thb = (n) => `${Number(n).toLocaleString(loc(), { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ฿`;
export const kg = (n) => `${Number(n).toLocaleString(loc(), { maximumFractionDigits: 1 })} ${fmtLang === 'en' ? 'kg' : 'กก.'}`;
export const when = (iso) => new Date(iso).toLocaleString(loc(), { dateStyle: 'medium', timeStyle: 'short' });
