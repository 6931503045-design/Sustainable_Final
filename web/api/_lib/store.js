// ที่เก็บข้อมูล: ใช้ Upstash Redis (ฟรี) ถ้าตั้งค่าไว้ ไม่งั้นเก็บในหน่วยความจำ (หายเมื่อ server รีสตาร์ต เหมาะกับทดสอบเท่านั้น)
// เก็บเฉพาะข้อมูลที่จำเป็น: รายการงานแปรรูป (ไม่มี userId) และรายการล็อตของแต่ละคน (ไว้ลบตามสิทธิ์ PDPA)

// รองรับทั้งชื่อตัวแปรของ Upstash และชื่อที่ Vercel Marketplace ตั้งให้ (KV_REST_API_*)
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
export const persistent = Boolean(URL_ && TOKEN);

const mem = globalThis.__raiStore || (globalThis.__raiStore = new Map());

async function redis(...cmd) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return (await res.json()).result;
}

const MAX = 500;

export async function pushItem(list, item) {
  if (persistent) {
    await redis('LPUSH', list, JSON.stringify(item));
    await redis('LTRIM', list, 0, MAX - 1);
    return;
  }
  const arr = mem.get(list) || [];
  arr.unshift(item);
  mem.set(list, arr.slice(0, MAX));
}

export async function listItems(list, n = 100) {
  if (persistent) return ((await redis('LRANGE', list, 0, n - 1)) || []).map((s) => JSON.parse(s));
  return (mem.get(list) || []).slice(0, n);
}

/** ลบรายการที่ match ออกจาก list (ใช้กับคำขอลบข้อมูล) */
export async function removeWhere(list, pred) {
  const all = await listItems(list, MAX);
  const keep = all.filter((x) => !pred(x));
  if (persistent) {
    await redis('DEL', list);
    if (keep.length) await redis('RPUSH', list, ...keep.map((x) => JSON.stringify(x)));
  } else {
    mem.set(list, keep);
  }
  return all.length - keep.length;
}

// ---- key/value (ใช้กับงานรับของที่สถานะเปลี่ยนได้) ----
export async function kvGet(key) {
  if (persistent) {
    const v = await redis('GET', key);
    return v ? JSON.parse(v) : null;
  }
  return mem.has(`kv:${key}`) ? structuredClone(mem.get(`kv:${key}`)) : null;
}

export async function kvSet(key, value) {
  if (persistent) return redis('SET', key, JSON.stringify(value));
  mem.set(`kv:${key}`, structuredClone(value));
}

/** ตั้งค่าเฉพาะเมื่อยังไม่มี (ใช้กันคนขับ 2 คนรับงานเดียวกัน) คืน true ถ้าได้สิทธิ์ */
export async function kvSetNX(key, value) {
  if (persistent) return (await redis('SET', key, JSON.stringify(value), 'NX')) === 'OK';
  if (mem.has(`kv:${key}`)) return false;
  mem.set(`kv:${key}`, value);
  return true;
}

export async function kvDel(key) {
  if (persistent) return redis('DEL', key);
  mem.delete(`kv:${key}`);
}
