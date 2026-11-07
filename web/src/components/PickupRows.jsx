// แถวค่ารถในใบเสนอราคา: ค่ารถตามสูตร / กองทุนช่วยจ่ายค่ารถ / ส่วนที่เกษตรกรจ่าย (ใช้ทั้งหน้าราคาและหน้าเกษตรกร)
import { PICKUP, PICKUP_VEHICLES, VEHICLES } from '../../shared/rules.js';
import { thb } from '../lib/client.js';
import { useT } from '../lib/i18n.jsx';

export function PickupRows({ q, km }) {
  const t = useT();
  const dist = km != null ? ` (${km} ${t('กม.', 'km')})` : '';
  if (!q.pickupCapped)
    return (
      <div className="row between">
        <span>
          {t.k('price.fee')}
          {dist}
        </span>
        <b>− {thb(q.pickupFee)}</b>
      </div>
    );
  return (
    <>
      <div className="row between muted-row">
        <span>
          {t.k('price.fullFee')}
          {dist}
        </span>
        <span>{thb(q.pickupFull)}</span>
      </div>
      <div className="row between fund-row">
        <span>{t.k('price.fund')}</span>
        <span>{thb(q.pickupSubsidy)}</span>
      </div>
      <div className="row between">
        <span>
          {t.k('price.farmerFee')} <small className="nowrap hint">({t.k('price.capShort', { cap: Math.round(PICKUP.capShare * 100) })})</small>
        </span>
        <b>− {thb(q.pickupFee)}</b>
      </div>
    </>
  );
}

/** ใต้ยอดสุทธิ: คนขับได้เท่าไร + คำเตือนเมื่อค่ารถเกินเพดาน */
export function PickupNotes({ q }) {
  const t = useT();
  if (!q.pickupFull) return null;
  return (
    <>
      <small className="hint driver-row">
        🛻 {t.k('price.driverGets', { pct: Math.round(PICKUP.driverShare * 100) })} <b>{thb(q.driverEarn)}</b>
      </small>
      {q.pickupCapped && (
        <p className="cap-warning" role="note">
          ⚠️ {t.k('price.capWarning', { cap: Math.round(PICKUP.capShare * 100) })}
        </p>
      )}
    </>
  );
}

/** เลือกรถ + ของเต็มคันรถ + เตือนน้ำหนักไม่ถึงขั้นต่ำ + คำแนะนำฟาง (ใช้ทั้งเครื่องคิดเงินและฟอร์มแจ้งขาย) */
export function PickupLoad({ kg, vehicle, fullLoad, onChange }) {
  const t = useT();
  const under = Number(kg) > 0 && Number(kg) < PICKUP.minKg;
  return (
    <div className="pickup-load">
      <fieldset>
        <legend>{t.k('pickup.vehicle')}</legend>
        <div className="choice">
          {PICKUP_VEHICLES.map((v) => (
            <button type="button" key={v} className={vehicle === v ? 'on' : ''} aria-pressed={vehicle === v} onClick={() => onChange({ vehicle: v })}>
              {v === 'etan' ? '🚜' : '🛻'} {t.pick(VEHICLES[v])}
              <small>
                ~{VEHICLES[v].capacityKg} {t('กก.', 'kg')}
              </small>
            </button>
          ))}
        </div>
      </fieldset>
      <p className="hint">{t.k('pickup.minRule', { min: PICKUP.minKg })}</p>
      {under && (
        <label className="check">
          <input type="checkbox" checked={fullLoad} onChange={(e) => onChange({ fullLoad: e.target.checked })} /> {t.k('pickup.fullLoad', { min: PICKUP.minKg })}
        </label>
      )}
      {under && !fullLoad && (
        <p className="cap-warning" role="alert">
          ⚠️ {t.k('pickup.underMin', { min: PICKUP.minKg })}
        </p>
      )}
      <p className="hint">💡 {t.k('pickup.strawTip')}</p>
    </div>
  );
}
