import { Link, Nav } from '../App.jsx';
import PriceBoard from '../components/PriceBoard.jsx';

export default function Prices() {
  return (
    <>
      <Nav />
      <main className="wrap narrow">
        <PriceBoard />
        <Link to="/liff" className="btn primary block">
          แจ้งขาย / เรียกรถไปรับ
        </Link>
      </main>
    </>
  );
}
