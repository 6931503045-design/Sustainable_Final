// หน้า iPad: ล็อกหน้าเว็บไม่ให้เลื่อนขึ้นลง/เด้ง ตอนลากหมุนโมเดลหรือแตะการ์ด (ทั้งหน้าพอดีจอเดียวอยู่แล้ว)
import { useEffect } from 'react';

export default function useLockScroll() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('ipad-lock');
    window.scrollTo(0, 0);
    return () => root.classList.remove('ipad-lock');
  }, []);
}
