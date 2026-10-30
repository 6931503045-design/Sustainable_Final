import { lazy, Suspense, useEffect, useState } from 'react';

const Home = lazy(() => import('./pages/Home.jsx'));
const Farmer = lazy(() => import('./pages/Farmer.jsx'));
const Kiosk = lazy(() => import('./pages/Kiosk.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const Driver = lazy(() => import('./pages/Driver.jsx'));
const Prices = lazy(() => import('./pages/Prices.jsx'));

// LIFF เปิด liff.line.me/<id>/driver → <endpoint>/liff/driver
const ROUTES = { '/': Home, '/liff': Farmer, '/liff/driver': Driver, '/driver': Driver, '/prices': Prices, '/kiosk': Kiosk, '/dashboard': Dashboard, '/privacy': Privacy };

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
  return (
    <header className="nav">
      <Link to="/" className="brand">
        🌾 ไร่ไม่เผา
      </Link>
      <nav>
        <Link to="/prices">ราคา</Link>
        <Link to="/liff">เกษตรกร</Link>
        <Link to="/liff/driver">คนขับ</Link>
        <Link to="/kiosk">หน้าจอตู้</Link>
        <Link to="/dashboard">Dashboard</Link>
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
    <Suspense fallback={<div className="center">กำลังโหลด…</div>}>
      <Page />
    </Suspense>
  );
}
