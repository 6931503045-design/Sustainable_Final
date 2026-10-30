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

export const thb = (n) => `${Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ฿`;
export const kg = (n) => `${Number(n).toLocaleString('th-TH', { maximumFractionDigits: 1 })} กก.`;
export const when = (iso) => new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
