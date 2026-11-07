import { lazy, Suspense, useEffect, useState } from 'react';
import { PM25_G_PER_KG } from '../shared/rules.js';
import { LangToggle, useT } from './lib/i18n.jsx';
import { liffLink } from './lib/line.js';

const Home = lazy(() => import('./pages/Home.jsx'));
const Farmer = lazy(() => import('./pages/Farmer.jsx'));
const Kiosk = lazy(() => import('./pages/Kiosk.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const Driver = lazy(() => import('./pages/Driver.jsx'));
const Prices = lazy(() => import('./pages/Prices.jsx'));
const Present = lazy(() => import('./pages/Present.jsx'));
const Booth = lazy(() => import('./pages/Booth.jsx'));

// LIFF เปิด liff.line.me/<id>/driver → <endpoint>/liff/driver
const ROUTES = { '/': Home, '/liff': Farmer, '/liff/driver': Driver, '/driver': Driver, '/prices': Prices, '/present': Present, '/booth': Booth, '/kiosk': Kiosk, '/dashboard': Dashboard, '/privacy': Privacy };

export function go(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}

export function Link({ to, children, ...rest }) {
  return (
    <a
      href={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        go(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

const PUBLIC_LINKS = [
  ['/present', 'nav.present'],
  ['/prices', 'nav.prices'],
  ['/liff', 'nav.farmer'],
];
// หน้าของทีมงาน (route ยังใช้ได้เหมือนเดิม แค่ย้ายออกจากแถบหลัก)
const TEAM_LINKS = [
  ['/liff/driver', 'nav.driver'],
  ['/kiosk', 'nav.kiosk'],
  ['/dashboard', 'nav.dashboard'],
  ['/booth', 'nav.booth'],
];

export function Nav() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const here = window.location.pathname.replace(/\/+$/, '') || '/';
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const item = ([to, key]) => (
    <Link key={to} to={to} onClick={close} aria-current={here === to ? 'page' : undefined}>
      {t.k(key)}
    </Link>
  );
  return (
    <header className={`nav ${open ? 'open' : ''}`}>
      <Link to="/" className="brand" aria-label={t.k('nav.home')}>
        <img src="/favicon.svg" alt="" width="28" height="28" />
        <span>{t.k('brand.name')}</span>
      </Link>
      <button type="button" className="nav-toggle" aria-expanded={open} aria-controls="main-nav" aria-label={open ? t.k('nav.closeMenu') : t.k('nav.openMenu')} onClick={() => setOpen(!open)}>
        <span aria-hidden="true" />
      </button>
      <nav id="main-nav" aria-label={t.k('nav.main')}>
        {PUBLIC_LINKS.map(item)}
        <details className="team-menu">
          <summary>{t.k('nav.team')}</summary>
          <div className="team-list">{TEAM_LINKS.map(item)}</div>
        </details>
        <LangToggle dark />
      </nav>
    </header>
  );
}

export function Footer() {
  const t = useT();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <img src="/favicon.svg" alt="" width="32" height="32" />
            <b>{t.k('brand.name')}</b>
          </Link>
          <p>{t.k('footer.tagline')}</p>
          {liffLink() ? (
            <a href={liffLink()} className="btn line-btn">
              {t.k('footer.line')}
            </a>
          ) : (
            <Link to="/liff" className="btn line-btn">
              {t.k('footer.line')}
            </Link>
          )}
        </div>
        <nav className="footer-links" aria-label={t.k('footer.pages')}>
          <b>{t.k('footer.pages')}</b>
          <Link to="/">{t.k('footer.home')}</Link>
          {PUBLIC_LINKS.map(([to, key]) => (
            <Link key={to} to={to}>
              {t.k(key)}
            </Link>
          ))}
          <Link to="/privacy">{t.k('footer.pdpa')}</Link>
        </nav>
        <nav className="footer-links" aria-label={t.k('footer.team')}>
          <b>{t.k('footer.team')}</b>
          {TEAM_LINKS.map(([to, key]) => (
            <Link key={to} to={to}>
              {t.k(key)}
            </Link>
          ))}
        </nav>
        <div className="footer-note" id="numbers">
          <b>* {t.k('footer.disclaimerTitle')}</b>
          <p>{t.k('footer.disclaimer', { pm25: PM25_G_PER_KG })}</p>
        </div>
      </div>
      <p className="footer-bottom">© 2026 {t.k('brand.name')} · {t.k('footer.course')}</p>
    </footer>
  );
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname.replace(/\/+$/, '') || '/');
  useEffect(() => {
    const on = () => setPath(window.location.pathname.replace(/\/+$/, '') || '/');
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  const Page = ROUTES[path] || Home;
  return (
    <Suspense fallback={<div className="center">…</div>}>
      <Page />
    </Suspense>
  );
}
