import { Link, Nav } from '../App.jsx';
import PriceBoard from '../components/PriceBoard.jsx';
import { useT } from '../lib/i18n.jsx';

export default function Prices() {
  const t = useT();
  return (
    <>
      <Nav />
      <main className="wrap narrow">
        <PriceBoard />
        <Link to="/liff" className="btn primary block">
          {t('แจ้งขาย / เรียกรถไปรับ', 'Sell / book a pickup')}
        </Link>
      </main>
    </>
  );
}
