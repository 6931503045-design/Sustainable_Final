// แถบหัวของหน้า iPad: สลับหน้า Business Model / 3D และกลับไปหน้าอื่นของเว็บ
import { useState } from 'react';
import { Link } from '../App.jsx';
import { LangToggle, useT } from '../lib/i18n.jsx';

export default function IpadBar({ title }) {
  const t = useT();
  const [open, setOpen] = useState(false);
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
    </header>
  );
}
