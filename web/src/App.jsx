import { lazy, Suspense, useEffect, useState } from 'react';
import { LangToggle, useT } from './lib/i18n.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const Farmer = lazy(() => import('./pages/Farmer.jsx'));
const Kiosk = lazy(() => import('./pages/Kiosk.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const Driver = lazy(() => import('./pages/Driver.jsx'));
const Prices = lazy(() => import('./pages/Prices.jsx'));
const Present = lazy(() => import('./pages/Present.jsx'));

// LIFF เปิด liff.line.me/<id>/driver → <endpoint>/liff/driver
const ROUTES = { '/': Home, '/liff': Farmer, '/liff/driver': Driver, '/driver': Driver, '/prices': Prices, '/present': Present, '/kiosk': Kiosk, '/dashboard': Dashboard, '/privacy': Privacy };

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

export function Nav() {
  const t = useT();
  return (
    <header className="nav">
      <Link to="/" className="brand">
        🌾 {t('ไร่ไม่เผา', 'Rai Mai Phao')}
      </Link>
      <nav>
        <Link to="/present">{t('พรีเซนต์', 'Present')}</Link>
        <Link to="/prices">{t('ราคา', 'Prices')}</Link>
        <Link to="/liff">{t('เกษตรกร', 'Farmer')}</Link>
        <Link to="/liff/driver">{t('คนขับ', 'Driver')}</Link>
        <Link to="/kiosk">{t('หน้าจอตู้', 'Kiosk')}</Link>
        <Link to="/dashboard">Dashboard</Link>
        <LangToggle dark />
      </nav>
    </header>
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
