// สลับภาษาไทย/อังกฤษทั้งเว็บ: const t = useT(); t('ไทย', 'English')
// ข้อมูลใน shared/rules.js ที่มีทั้ง th/en ใช้ t.pick(obj)
import { useSyncExternalStore } from 'react';
import { local, setFormatLang } from './client.js';

const listeners = new Set();
let lang = local.get('lang', 'th');

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

export function useT() {
  const l = useLang();
  const t = (th, en) => (l === 'en' ? en ?? th : th);
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
        <button key={k} type="button" className={l === k ? 'on' : ''} onClick={() => setLang(k)}>
          {k === 'th' ? 'ไทย' : 'EN'}
        </button>
      ))}
    </div>
  );
}
