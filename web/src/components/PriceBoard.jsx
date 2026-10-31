// ตารางราคารับซื้อ + เครื่องคิดเงิน (ใช้ทั้งใน LIFF และหน้าเว็บ)
import { useState } from 'react';
import { MODES, MOISTURE_TIERS, PICKUP, RESIDUES, SERVICE_FEE, settle } from '../../shared/rules.js';
import { thb } from '../lib/client.js';
import { useT } from '../lib/i18n.jsx';

export default function PriceBoard({ onSell }) {
  const t = useT();
  const [c, setC] = useState({ residue: 'corn', kg: 200, moisture: 14, pickup: true, km: 6 });
  const set = (k, num = true) => (e) => setC({ ...c, [k]: num ? Number(e.target.value) : e.target.value });
  const q = settle({ residue: c.residue, purpose: 'sell', inputKg: c.kg || 0, moisture: c.moisture, pickupKm: c.pickup ? c.km : null });
  const unit = t('กก.', 'kg');

  return (
    <>
      <div className="card">
        <h2>💰 {t('ราคารับซื้อ', 'Buy prices')}</h2>
        <p className="hint">{t('บาท ต่อ กก. ที่ชั่งได้ที่ตู้ · ราคาสมมติของต้นแบบ', 'Baht per kg weighed at the machine · prototype assumptions')}</p>
        <table className="prices">
          <tbody>
            {Object.entries(RESIDUES).map(([k, r]) => (
              <tr key={k}>
                <td>{t.pick(r)}</td>
                <td className="num">{r.buy.toFixed(2)} ฿</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>{t('ความชื้น', 'Moisture')}</h3>
        <ul className="tight">
          {MOISTURE_TIERS.map((tier) => (
            <li key={tier.max}>{t.pick(tier)}</li>
          ))}
          <li>{t('เกิน 20% ตู้ไม่รับ ต้องตากให้แห้งก่อน', 'Over 20%: rejected — dry it first')}</li>
        </ul>
        <h3>🛻 {t('ค่ารถไปรับถึงไร่', 'Farm pickup fee')}</h3>
        <p>
          {PICKUP.base} ฿ + {PICKUP.perKm} ฿/{t('กม.', 'km')} + {PICKUP.perKg} ฿/{unit} {t('หักจากยอดขาย', 'deducted from the sale')} ({t('รัศมี', 'within')} {PICKUP.maxKm} {t('กม.', 'km')})
          <br />
          <small className="hint">
            {t(`คนขับในพื้นที่ได้ ${Math.round(PICKUP.driverShare * 100)}% ส่วนที่เหลือเป็นค่าดูแลระบบ`, `Local drivers keep ${Math.round(PICKUP.driverShare * 100)}%; the rest is the platform fee`)}
          </small>
        </p>
        <h3>{t('แปรรูปแล้วรับกลับไปใช้เอง (ค่าบริการ/กก.)', 'Process & take home (service fee per kg)')}</h3>
        <table className="prices">
          <tbody>
            {Object.values(MODES).map((m) => (
              <tr key={m.key}>
                <td>
                  <span className="code" style={{ background: m.color }}>
                    {m.code}
                  </span>{' '}
                  {t.pick(m)} <small className="hint">({t.pick(m, 'products').join(' / ')})</small>
                </td>
                <td className="num">{SERVICE_FEE[m.key].toFixed(2)} ฿</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card form">
        <h2>🧮 {t('คำนวณรายได้', 'Income calculator')}</h2>
        <label>
          {t('ชนิด', 'Residue')}
          <select value={c.residue} onChange={set('residue', false)}>
            {Object.entries(RESIDUES).map(([k, r]) => (
              <option key={k} value={k}>
                {t.pick(r)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('น้ำหนัก', 'Weight')}: <b>{c.kg} {unit}</b>
          <input type="range" min="10" max="2000" step="10" value={c.kg} onChange={set('kg')} />
        </label>
        <label>
          {t('ความชื้น', 'Moisture')}: <b>{c.moisture}%</b>
          <input type="range" min="5" max="25" value={c.moisture} onChange={set('moisture')} />
        </label>
        <label className="check">
          <input type="checkbox" checked={c.pickup} onChange={(e) => setC({ ...c, pickup: e.target.checked })} /> {t('เรียกรถไปรับ', 'Book a pickup')}
        </label>
        {c.pickup && (
          <label>
            {t('ระยะทางถึงตู้', 'Distance to machine')}: <b>{c.km} {t('กม.', 'km')}</b>
            <input type="range" min="1" max={PICKUP.maxKm} value={c.km} onChange={set('km')} />
          </label>
        )}
        <div className="quote">
          {c.moisture > 20 ? (
            <div className="error">{t('ความชื้นเกิน 20% ตู้ไม่รับ', 'Over 20% moisture: rejected')}</div>
          ) : (
            <>
              <div className="row between">
                <span>{t('ค่าเศษพืช', 'Residue value')}</span>
                <b>{thb(q.gross)}</b>
              </div>
              {c.pickup && (
                <div className="row between">
                  <span>{t('ค่ารถ', 'Pickup fee')}</span>
                  <b>− {thb(q.pickupFee)}</b>
                </div>
              )}
              <div className="row between total">
                <span>{t('ได้รับสุทธิ', 'Net payout')}</span>
                <b>{thb(q.amount)}</b>
              </div>
              <small className="hint">
                🌱 {t('ลดการเผา', 'Burning avoided')} {c.kg} {unit} ≈ PM2.5 {q.pm25g} {t('กรัม (ค่าประมาณ)', 'g (estimate)')}
              </small>
            </>
          )}
        </div>
        {onSell && (
          <button type="button" className="btn primary block" onClick={onSell}>
            {t('แจ้งขายเลย', 'Sell now')}
          </button>
        )}
      </div>
    </>
  );
}
