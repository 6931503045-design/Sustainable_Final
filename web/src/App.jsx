import { lazy, Suspense, useEffect, useState } from 'react';

const Home = lazy(() => import('./pages/Home.jsx'));
const Farmer = lazy(() => import('./pages/Farmer.jsx'));
const Kiosk = lazy(() => import('./pages/Kiosk.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));

const ROUTES = { '/': Home, '/liff': Farmer, '/kiosk': Kiosk, '/dashboard': Dashboard, '/privacy': Privacy };

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
        <Link to="/liff">เกษตรกร</Link>
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
