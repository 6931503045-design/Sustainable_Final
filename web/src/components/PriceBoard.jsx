// ตารางราคารับซื้อ + เครื่องคิดเงิน (ใช้ทั้งใน LIFF และหน้าเว็บ)
import { useState } from 'react';
import { MODES, MOISTURE_TIERS, PICKUP, RESIDUES, SERVICE_FEE, modeLabel, settle } from '../../shared/rules.js';
import { thb } from '../lib/client.js';

export default function PriceBoard({ onSell }) {
  const [c, setC] = useState({ residue: 'corn', kg: 200, moisture: 14, pickup: true, km: 6 });
  const set = (k, num = true) => (e) => setC({ ...c, [k]: num ? Number(e.target.value) : e.target.value });
  const q = settle({ residue: c.residue, purpose: 'sell', inputKg: c.kg || 0, moisture: c.moisture, pickupKm: c.pickup ? c.km : null });

  return (
    <>
      <div className="card">
        <h2>💰 ราคารับซื้อ</h2>
        <p className="hint">บาท ต่อ กก. ที่ชั่งได้ที่ตู้ · ราคาสมมติของต้นแบบ</p>
        <table className="prices">
          <tbody>
            {Object.entries(RESIDUES).map(([k, r]) => (
              <tr key={k}>
                <td>{r.th}</td>
                <td className="num">{r.buy.toFixed(2)} ฿</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>ความชื้น</h3>
        <ul className="tight">
          {MOISTURE_TIERS.map((t) => (
            <li key={t.max}>{t.th}</li>
          ))}
          <li>เกิน 20% ตู้ไม่รับ ต้องตากให้แห้งก่อน</li>
        </ul>
        <h3>🛻 ค่ารถไปรับถึงไร่</h3>
        <p>
          {PICKUP.base} ฿ + {PICKUP.perKm} ฿/กม. + {PICKUP.perKg} ฿/กก. หักจากยอดขาย (รัศมี {PICKUP.maxKm} กม.)
          <br />
          <small className="hint">คนขับในพื้นที่ได้ {Math.round(PICKUP.driverShare * 100)}% ส่วนที่เหลือเป็นค่าดูแลระบบ</small>
        </p>
        <h3>แปรรูปแล้วรับกลับไปใช้เอง (ค่าบริการ/กก.)</h3>
        <table className="prices">
          <tbody>
            {Object.values(MODES).map((m) => (
              <tr key={m.key}>
                <td>
                  <span className="code" style={{ background: m.color }}>
                    {m.code}
                  </span>{' '}
                  {m.th} <small className="hint">({m.products.join(' / ')})</small>
                </td>
                <td className="num">{SERVICE_FEE[m.key].toFixed(2)} ฿</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card form">
        <h2>🧮 คำนวณรายได้</h2>
        <label>
          ชนิด
          <select value={c.residue} onChange={set('residue', false)}>
            {Object.entries(RESIDUES).map(([k, r]) => (
              <option key={k} value={k}>
                {r.th}
              </option>
            ))}
          </select>
        </label>
        <label>
          น้ำหนัก: <b>{c.kg} กก.</b>
          <input type="range" min="10" max="2000" step="10" value={c.kg} onChange={set('kg')} />
        </label>
        <label>
          ความชื้น: <b>{c.moisture}%</b>
          <input type="range" min="5" max="25" value={c.moisture} onChange={set('moisture')} />
        </label>
        <label className="check">
          <input type="checkbox" checked={c.pickup} onChange={(e) => setC({ ...c, pickup: e.target.checked })} /> เรียกรถไปรับ
        </label>
        {c.pickup && (
          <label>
            ระยะทางถึงตู้: <b>{c.km} กม.</b>
            <input type="range" min="1" max={PICKUP.maxKm} value={c.km} onChange={set('km')} />
          </label>
        )}
        <div className="quote">
          {c.moisture > 20 ? (
            <div className="error">ความชื้นเกิน 20% ตู้ไม่รับ</div>
          ) : (
            <>
              <div className="row between">
                <span>ค่าเศษพืช</span>
                <b>{thb(q.gross)}</b>
              </div>
              {c.pickup && (
                <div className="row between">
                  <span>ค่ารถ</span>
                  <b>− {thb(q.pickupFee)}</b>
                </div>
              )}
              <div className="row between total">
                <span>ได้รับสุทธิ</span>
                <b>{thb(q.amount)}</b>
              </div>
              <small className="hint">🌱 ลดการเผา {c.kg} กก. ≈ PM2.5 {q.pm25g} กรัม (ค่าประมาณ)</small>
            </>
          )}
        </div>
        {onSell && (
          <button type="button" className="btn primary block" onClick={onSell}>
            แจ้งขายเลย
          </button>
        )}
      </div>
    </>
  );
}
