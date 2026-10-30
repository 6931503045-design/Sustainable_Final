// เชื่อม LIFF (เปิดหน้าเว็บใน LINE) — ถ้ายังไม่ได้ตั้ง VITE_LIFF_ID จะเข้าโหมดทดลอง
import liff from '@line/liff';

export const LIFF_ID = import.meta.env.VITE_LIFF_ID;

let session;

export function lineSession() {
  if (session) return session;
  session = (async () => {
    if (!LIFF_ID) return { mode: 'demo', profile: { displayName: 'ผู้ใช้ทดลอง' } };
    try {
      await liff.init({ liffId: LIFF_ID });
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return new Promise(() => {}); // กำลังพาไปหน้า login
      }
      const profile = await liff.getProfile();
      return { mode: 'line', profile, idToken: liff.getIDToken(), inClient: liff.isInClient() };
    } catch (e) {
      return { mode: 'demo', profile: { displayName: 'ผู้ใช้ทดลอง' }, error: e.message };
    }
  })();
  return session;
}

export const closeLiff = () => liff.isInClient?.() && liff.closeWindow();
