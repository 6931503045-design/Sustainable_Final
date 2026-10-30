// เชื่อม LIFF (เปิดหน้าเว็บใน LINE) — ถ้ายังไม่ได้ตั้ง VITE_LIFF_ID หรือ init ไม่ผ่าน จะเข้าโหมดทดลองพร้อมบอกสาเหตุ
import liff from '@line/liff';

export const LIFF_ID = import.meta.env.VITE_LIFF_ID;
/** ลิงก์ที่เปิดแอป LINE โดยตรง (มือถือ) เช่น liffLink('/driver') */
export const liffLink = (path = '') => (LIFF_ID ? `https://liff.line.me/${LIFF_ID}${path}` : null);

let session;

export function lineSession() {
  if (session) return session;
  session = (async () => {
    const demo = (reason) => ({ mode: 'demo', profile: { displayName: 'ผู้ใช้ทดลอง' }, reason });
    if (!LIFF_ID) return demo('ยังไม่ได้ตั้งค่า VITE_LIFF_ID ใน Vercel (ใส่แล้วต้อง Redeploy)');
    if (!window.location.pathname.startsWith('/liff')) return demo('หน้านี้อยู่นอก LIFF Endpoint URL (/liff) ให้เปิดผ่านลิงก์ LINE ด้านล่าง');
    try {
      await liff.init({ liffId: LIFF_ID });
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return new Promise(() => {}); // กำลังพาไปหน้า login
      }
      const profile = await liff.getProfile();
      return { mode: 'line', profile, idToken: liff.getIDToken(), inClient: liff.isInClient() };
    } catch (e) {
      return demo(`เชื่อม LIFF ไม่สำเร็จ: ${e.message} — เช็กว่า Endpoint URL ใน LINE Developers = ${window.location.origin}/liff และ channel เป็น Published`);
    }
  })();
  return session;
}

export const closeLiff = () => liff.isInClient?.() && liff.closeWindow();
