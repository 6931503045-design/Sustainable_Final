// แถบหัวของหน้า iPad: สลับหน้า Business Model / 3D และกลับไปหน้าอื่นของเว็บ
import { useEffect, useState } from 'react';
import { Link } from '../App.jsx';
import { LangToggle, useT } from '../lib/i18n.jsx';

export default function IpadBar({ title }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);
  const [tip, setTip] = useState(false);
  useEffect(() => {
    const on = () => setFull(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', on);
    document.addEventListener('webkitfullscreenchange', on);
    return () => {
      document.removeEventListener('fullscreenchange', on);
      document.removeEventListener('webkitfullscreenchange', on);
    };
  }, []);
  // เต็มจอ: Safari บน iPad ใช้ webkitRequestFullscreen ถ้าเครื่องไม่รองรับ แนะนำ Add to Home Screen แทน
  function toggleFull() {
    const d = document;
    const el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      (d.exitFullscreen || d.webkitExitFullscreen)?.call(d);
      return;
    }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) {
      setTip(true);
      setTimeout(() => setTip(false), 6000);
      return;
    }
    try {
      const r = req.call(el);
      if (r && r.catch) r.catch(() => setTip(true));
    } catch {
      setTip(true);
    }
  }
  const here = window.location.pathname.replace(/\/+$/, '');
  const tabs = [
    ['/ipad/bmc', 'Business Model'],
    ['/ipad/3d', t('โมเดล 3D', '3D Model')],
  ];
  const more = [
    ['/', t('หน้าแรก', 'Home')],
    ['/present', t('พรีเซนต์', 'Presentation')],
    ['/prices', t('ราคา', 'Prices')],
    ['/dashboard', 'Dashboard'],
  ];
  return (
    <header className="ipad-bar">
      <span className="brand">🌾 {t('ไร่ไม่เผา', 'Rai Mai Phao')}</span>
      <nav className="ipad-tabs" aria-label={t('สลับหน้า', 'Switch page')}>
        {tabs.map(([to, label]) => (
          <Link key={to} to={to} className={here === to ? 'on' : ''} aria-current={here === to ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <h1 className="sr-only">{title}</h1>
      <div className="ipad-right">
        <LangToggle />
        <button type="button" className="chip ipad-full" onClick={toggleFull} aria-pressed={full}>
          {full ? '⤡' : '⛶'} {full ? t('ออกจากเต็มจอ', 'Exit full screen') : t('เต็มจอ', 'Full screen')}
        </button>
        <div className="ipad-menu">
          <button type="button" className="chip" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            ☰ {t('เมนู', 'Menu')}
          </button>
          {open && (
            <div className="ipad-menu-list" role="menu">
              {more.map(([to, label]) => (
                <Link key={to} to={to} role="menuitem" onClick={() => setOpen(false)}>
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      {tip && (
        <p className="ipad-tip" role="status">
          {t('เครื่องนี้เปิดเต็มจอจากปุ่มไม่ได้ ให้กด Share → Add to Home Screen แล้วเปิดจากไอคอนแทน', 'Full screen isn’t available here. Use Share → Add to Home Screen, then open it from the icon.')}
        </p>
      )}
    </header>
  );
}
