// หน้า LIFF ของเกษตรกร: ยินยอม PDPA → ดูราคา/คำนวณ → แจ้งขาย (นำมาเอง หรือเรียกรถคนในพื้นที่ไปรับ) → รับ QR → ติดตามสถานะ → สิทธิ์ PDPA
import { useEffect, useMemo, useState } from 'react';
import { Link, Nav } from '../App.jsx';
import QR from '../components/QR.jsx';
import PriceBoard from '../components/PriceBoard.jsx';
import DemoNotice from '../components/DemoNotice.jsx';
import { MACHINE, MODES, PICKUP, PURPOSES, PURPOSES_EN, RESIDUES, distanceKm, settle } from '../../shared/rules.js';
import { api, kg, local, thb, when } from '../lib/client.js';
import { LangToggle, useT } from '../lib/i18n.jsx';
import { lineSession } from '../lib/line.js';

export const CONSENT_VERSION = '2026-11-01';

const STATUS = {
  open: ['🔎 กำลังหาคนขับ', '🔎 Finding a driver'],
  accepted: ['🛻 คนขับรับงานแล้ว กำลังไป', '🛻 Driver accepted, on the way'],
  picked: ['📦 รับของแล้ว กำลังไปที่ตู้', '📦 Picked up, heading to the machine'],
  done: ['✅ ชั่งและจ่ายเงินแล้ว', '✅ Weighed and paid'],
  cancelled: ['ยกเลิกรถ (นำมาเองแล้ว)', 'Pickup cancelled (brought in person)'],
};

function slots() {
  const out = [];
  const d = new Date();
  for (let day = 1; out.length < 12; day++) {
    const base = new Date(d.getFullYear(), d.getMonth(), d.getDate() + day);
    if (base.getDay() === 0) continue; // ปิดวันอาทิตย์
    for (const [h, m] of [[9, 0], [10, 30], [13, 0], [14, 30]]) out.push(new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m).toISOString());
  }
  return out;
}

function Consent({ onAccept }) {
  const t = useT();
  const [ok, setOk] = useState(false);
  return (
    <div className="card">
      <h2>{t('ขอความยินยอมเก็บข้อมูลส่วนบุคคล', 'Consent to collect personal data')}</h2>
      <p>{t('เพื่อซื้อขายเศษพืชกับ "ไร่ไม่เผา" เราขอเก็บข้อมูลต่อไปนี้', 'To buy your crop residue, "Rai Mai Phao" needs the following data:')}</p>
      <ul>
        <li>{t('ชื่อที่แสดงใน LINE และ LINE user ID: ยืนยันตัวตน ส่ง QR และใบรับของเข้าแชต', 'LINE display name and user ID: to identify you and send the QR and receipt to your chat')}</li>
        <li>{t('หมู่บ้าน ชนิดและน้ำหนักเศษพืช เวลานัด: จัดคิวและคำนวณยอดเงิน', 'Village, residue type/weight and booking time: to schedule and calculate payment')}</li>
        <li>
          <b>{t('ถ้าเรียกรถไปรับ:', 'If you book a pickup:')}</b>{' '}
          {t('ตำแหน่งกองเศษพืชและเบอร์โทร โดยจะเปิดเผยให้เฉพาะคนขับที่รับงานของคุณเท่านั้น', 'the pile location and your phone number, shown only to the driver who accepts your job')}
        </li>
        <li>{t('รูปถ่ายวัตถุดิบและสินค้าที่ตู้: หลักฐานการซื้อขาย', 'Photos of input and output at the machine: proof of the transaction')}</li>
      </ul>
      <p>
        {t('คุณขอดู แก้ไข ลบข้อมูล หรือถอนความยินยอมได้ทุกเมื่อที่แท็บ "สิทธิ์"', 'You can view, correct or delete your data, or withdraw consent, any time in the "Rights" tab.')}{' '}
        <Link to="/privacy">{t('อ่านนโยบายฉบับเต็ม', 'Full privacy policy')}</Link>
      </p>
      <label className="check">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> {t('ฉันอ่านและยินยอมให้เก็บข้อมูลตามวัตถุประสงค์ข้างต้น', 'I have read this and consent to the purposes above')}
      </label>
      <button className="btn primary block" disabled={!ok} onClick={onAccept}>
        {t('ยินยอมและเริ่มใช้งาน', 'Agree and start')}
      </button>
    </div>
  );
}

function Quote({ q, pickup, km }) {
  const t = useT();
  if (!q) return null;
  return (
    <div className="quote">
      <div className="row between">
        <span>{q.gross >= 0 ? t('ค่าเศษพืช (ราคาเต็ม)', 'Residue value (full price)') : t('ค่าบริการแปรรูป', 'Processing fee')}</span>
        <b>{thb(Math.abs(q.gross))}</b>
      </div>
      {pickup && (
        <div className="row between">
          <span>
            {t('ค่ารถรับถึงที่', 'Pickup fee')} ({km} {t('กม.', 'km')})
          </span>
          <b>− {thb(q.pickupFee)}</b>
        </div>
      )}
      <div className="row between total">
        <span>{q.amount >= 0 ? t('คาดว่าจะได้รับ', 'Estimated payout') : t('คาดว่าต้องจ่าย', 'Estimated cost')}</span>
        <b>{thb(Math.abs(q.amount))}</b>
      </div>
      <small className="hint">{t('ยอดจริงคิดจากน้ำหนักที่ชั่งและความชื้นที่ตู้', 'Final amount uses the weight and moisture measured at the machine')}</small>
    </div>
  );
}

function NewLot({ session, onCreated }) {
  const t = useT();
  const [f, setF] = useState({
    residue: 'corn',
    estKg: '',
    village: local.get('village', ''),
    purpose: 'sell',
    wantMode: 'chop',
    delivery: 'self',
    slot: '',
    loc: null,
    landmark: '',
    phone: local.get('phone', ''),
  });
  const [busy, setBusy] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [err, setErr] = useState('');
  const options = useMemo(slots, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pickup = f.delivery === 'pickup';
  const km = f.loc ? distanceKm(f.loc) : null;
  const kgNum = Number(f.estKg);
  const quote = kgNum > 0 ? settle({ residue: f.residue, mode: f.wantMode, purpose: f.purpose, inputKg: kgNum, pickupKm: pickup && km != null ? km : null }) : null;
  const purposes = t.lang === 'en' ? PURPOSES_EN : PURPOSES;

  function locate(demo = false) {
    setErr('');
    if (demo) return setF({ ...f, loc: { lat: MACHINE.lat + 0.03, lng: MACHINE.lng - 0.02 } }); // จุดทดลองห่างตู้ ~5 กม.
    if (!navigator.geolocation) return setErr(t('อุปกรณ์นี้แชร์ตำแหน่งไม่ได้', 'This device cannot share its location'));
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setF((x) => ({ ...x, loc: { lat: p.coords.latitude, lng: p.coords.longitude } }));
        setLocBusy(false);
      },
      () => {
        setErr(t('ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง (หรือใช้ปุ่ม "ตำแหน่งทดลอง")', 'Location permission denied (or use "Demo location")'));
        setLocBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!f.slot) return setErr(pickup ? t('กรุณาเลือกวันเวลาให้ไปรับ', 'Please choose a pickup time') : t('กรุณาเลือกเวลานัด', 'Please choose a time'));
    if (pickup && !f.loc) return setErr(t('กรุณาแชร์ตำแหน่งกองเศษพืช', 'Please share the pile location'));
    setBusy(true);
    try {
      const out = await api('lots', {
        method: 'POST',
        data: { ...f, idToken: session.idToken, demo: session.mode === 'demo', name: session.profile.displayName, consentAt: local.get('consent')?.at },
      });
      local.set('village', f.village);
      if (f.phone) local.set('phone', f.phone);
      onCreated(out);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2>{t('แจ้งขายเศษพืช', 'Sell crop residue')}</h2>
      <label>
        {t('ชนิดเศษพืช', 'Residue type')}
        <select value={f.residue} onChange={set('residue')}>
          {Object.entries(RESIDUES).map(([k, v]) => (
            <option key={k} value={k}>
              {t.pick(v)} — {v.buy.toFixed(2)} ฿/{t('กก.', 'kg')}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('น้ำหนักโดยประมาณ (กก.)', 'Approximate weight (kg)')}
        <input type="number" inputMode="decimal" min="1" max="5000" required value={f.estKg} onChange={set('estKg')} placeholder={t('เช่น 120', 'e.g. 120')} />
      </label>
      <label>
        {t('หมู่บ้าน', 'Village')}
        <input required value={f.village} onChange={set('village')} placeholder={t('เช่น บ้านห้วยไคร้', 'e.g. Ban Huai Khrai')} />
      </label>
      <fieldset>
        <legend>{t('ต้องการ', 'I want to')}</legend>
        {Object.entries(purposes).map(([k, v]) => (
          <label className="radio" key={k}>
            <input type="radio" name="purpose" value={k} checked={f.purpose === k} onChange={set('purpose')} /> {v}
          </label>
        ))}
      </fieldset>
      {f.purpose === 'self' && (
        <label>
          {t('โหมดที่ต้องการ', 'Mode')}
          <select value={f.wantMode} onChange={set('wantMode')}>
            {Object.values(MODES).map((m) => (
              <option key={m.key} value={m.key}>
                {m.code} · {t.pick(m)} ({t.pick(m, 'products').join(' / ')})
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset>
        <legend>{t('ส่งเศษพืชอย่างไร', 'Delivery')}</legend>
        <div className="choice">
          <button type="button" className={!pickup ? 'on' : ''} onClick={() => setF({ ...f, delivery: 'self' })}>
            🚜 {t('นำมาเองที่ตู้', 'Bring it myself')}
            <small>{t.pick(MACHINE)}</small>
          </button>
          <button type="button" className={pickup ? 'on' : ''} onClick={() => setF({ ...f, delivery: 'pickup' })}>
            🛻 {t('เรียกรถไปรับ', 'Book a pickup')}
            <small>{t('คนในพื้นที่ขับไปรับถึงไร่', 'A local driver collects from your farm')}</small>
          </button>
        </div>
      </fieldset>

      {pickup && (
        <div className="pickup-box">
          <div className="row">
            <button type="button" className="btn" onClick={() => locate(false)} disabled={locBusy}>
              📍 {locBusy ? t('กำลังหาตำแหน่ง…', 'Locating…') : f.loc ? t('แชร์ตำแหน่งใหม่', 'Update location') : t('แชร์ตำแหน่งกองเศษพืช', 'Share pile location')}
            </button>
            <button type="button" className="btn ghost-sm" onClick={() => locate(true)}>
              {t('ตำแหน่งทดลอง', 'Demo location')}
            </button>
          </div>
          {f.loc && (
            <p className={km > PICKUP.maxKm ? 'error' : 'hint'}>
              {t(`ห่างตู้ประมาณ ${km} กม.`, `About ${km} km from the machine`)}{' '}
              {km > PICKUP.maxKm && t(`(เกิน ${PICKUP.maxKm} กม. ยังไม่มีบริการ)`, `(beyond ${PICKUP.maxKm} km — not served yet)`)}{' '}
              <a href={`https://www.google.com/maps/search/?api=1&query=${f.loc.lat},${f.loc.lng}`} target="_blank" rel="noreferrer">
                {t('ดูบนแผนที่', 'View map')}
              </a>
            </p>
          )}
          <label>
            {t('จุดสังเกต (ให้คนขับหาเจอ)', 'Landmark (to help the driver)')}
            <input value={f.landmark} onChange={set('landmark')} placeholder={t('เช่น ไร่ข้าวโพดหลังวัด ทางเข้าเป็นดิน', 'e.g. corn field behind the temple, dirt road')} />
          </label>
          <label>
            {t('เบอร์โทร (เปิดให้เฉพาะคนขับที่รับงาน)', 'Phone (shown only to your driver)')}
            <input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="0812345678" />
          </label>
        </div>
      )}

      <fieldset>
        <legend>{pickup ? t('วันเวลาที่สะดวกให้ไปรับ', 'Preferred pickup time') : t('เวลานัดนำเศษพืชมาที่ตู้', 'Drop-off time at the machine')}</legend>
        <div className="slots">
          {options.map((s) => (
            <button type="button" key={s} className={f.slot === s ? 'slot on' : 'slot'} onClick={() => setF({ ...f, slot: s })}>
              {when(s)}
            </button>
          ))}
        </div>
      </fieldset>

      <Quote q={quote} pickup={pickup && km != null} km={km} />
      <p className="hint">{t('⚠️ เศษพืชต้องแห้ง ความชื้นไม่เกิน 20% (15–20% ลดราคา 10%)', '⚠️ Residue must be dry: max 20% moisture (15–20% gets −10%)')}</p>
      {err && <p className="error">{err}</p>}
      <button className="btn primary block" disabled={busy}>
        {busy ? t('กำลังส่ง…', 'Sending…') : pickup ? t('ยืนยันและเรียกรถ', 'Confirm and book pickup') : t('ยืนยันและรับ QR', 'Confirm and get QR')}
      </button>
    </form>
  );
}

function LotCard({ item, open }) {
  const t = useT();
  const { lot, token } = item;
  const [p, setP] = useState(null);
  useEffect(() => {
    if (lot.delivery !== 'pickup') return;
    let alive = true;
    const load = () => api(`pickups?lot=${lot.id}`).then((r) => alive && setP(r.pickup)).catch(() => {});
    load();
    const timer = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [lot.id, lot.delivery]);
  return (
    <div className="card lot">
      <div className="row between">
        <b>
          {t('ล็อต', 'Lot')} {lot.id}
        </b>
        <span className="tag">{t.pick(RESIDUES[lot.residue])}</span>
      </div>
      <p>
        {kg(lot.estKg)} · {(t.lang === 'en' ? PURPOSES_EN : PURPOSES)[lot.purpose]}
        <br />
        {lot.delivery === 'pickup' ? t('ให้ไปรับ', 'Pickup') : t('นัด', 'Drop-off')} {lot.slot ? when(lot.slot) : '-'}
      </p>
      {p && (
        <div className="status">
          <b>{STATUS[p.status] ? t(...STATUS[p.status]) : p.status}</b>
          {p.driver && (
            <div>
              {t('คนขับ', 'Driver')} {p.driver.name} · {p.driver.vehicleTh} {p.driver.plate}
            </div>
          )}
        </div>
      )}
      {open && <QR value={token} />}
    </div>
  );
}

export default function Farmer() {
  const t = useT();
  const [session, setSession] = useState(null);
  const [consent, setConsent] = useState(local.get('consent'));
  const [tab, setTab] = useState(new URLSearchParams(window.location.search).get('tab') || 'new'); // rich menu ส่ง ?tab= มาได้
  const [lots, setLots] = useState(local.get('lots', []));
  const [done, setDone] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    lineSession().then(setSession);
  }, []);

  function accept() {
    const c = { version: CONSENT_VERSION, at: new Date().toISOString() };
    local.set('consent', c);
    setConsent(c);
  }

  function created(out) {
    const next = [{ lot: out.lot, token: out.token }, ...lots];
    local.set('lots', next);
    setLots(next);
    setDone(out);
  }

  async function erase() {
    if (!window.confirm(t('ลบข้อมูลล็อตและประวัติทั้งหมดของคุณ และถอนความยินยอม?', 'Delete all your lots and history and withdraw consent?'))) return;
    try {
      if (session.mode === 'line') await api('me', { method: 'DELETE', data: { idToken: session.idToken } });
      ['lots', 'consent', 'village', 'phone'].forEach(local.remove);
      setLots([]);
      setConsent(null);
      setMsg(t('ลบข้อมูลเรียบร้อยแล้ว', 'Your data has been deleted'));
    } catch (e) {
      setMsg(e.message);
    }
  }

  if (!session) return <div className="center">{t('กำลังเชื่อมต่อ LINE…', 'Connecting to LINE…')}</div>;

  const tabs = [
    ['new', t('แจ้งขาย', 'Sell')],
    ['price', t('ราคา', 'Prices')],
    ['lots', `${t('ล็อตของฉัน', 'My lots')} (${lots.length})`],
    ['rights', t('สิทธิ์', 'Rights')],
  ];
  const tabBar = (
    <div className="tabs">
      {tabs.map(([k, v]) => (
        <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
          {v}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {!session.inClient && <Nav />}
      <main className="wrap narrow">
        <div className="hello">
          {session.profile.pictureUrl && <img src={session.profile.pictureUrl} alt="" />}
          <div style={{ flex: 1 }}>
            {t('สวัสดี', 'Hello')} <b>{session.profile.displayName}</b>
          </div>
          {session.inClient && <LangToggle />}
        </div>
        <DemoNotice session={session} />
        {msg && <p className="card">{msg}</p>}
        {tab === 'price' && !done ? (
          <>
            {tabBar}
            <PriceBoard onSell={() => setTab('new')} />
          </>
        ) : !consent ? (
          <>
            <button className="btn block" onClick={() => setTab('price')}>
              💰 {t('ดูราคารับซื้อก่อน', 'See buy prices first')}
            </button>
            <br />
            <Consent onAccept={accept} />
          </>
        ) : done ? (
          <div className="card center-text">
            <h2>
              ✅ {done.lot.delivery === 'pickup' ? t('ส่งคำขอรถแล้ว', 'Pickup requested') : t('ลงทะเบียนแล้ว', 'Registered')} · {t('ล็อต', 'Lot')} {done.lot.id}
            </h2>
            <QR value={done.token} size={240} />
            <p>
              {done.lot.delivery === 'pickup'
                ? t('ระบบแจ้งคนขับในพื้นที่แล้ว จะส่งข้อความเข้า LINE เมื่อมีคนรับงาน', 'Local drivers have been notified. We’ll message you on LINE when one accepts.')
                : done.pushed
                  ? t('ส่ง QR เข้าแชต LINE ของคุณแล้ว นำไปสแกนที่ตู้ได้เลย', 'The QR is in your LINE chat — scan it at the machine.')
                  : t('แคปหน้าจอ QR นี้ไว้ แล้วนำไปสแกนที่ตู้', 'Screenshot this QR and scan it at the machine.')}
            </p>
            {done.quote && (
              <p>
                {done.quote.amount >= 0 ? t('คาดว่าจะได้รับ', 'Estimated payout') : t('คาดว่าต้องจ่าย', 'Estimated cost')} <b>{thb(Math.abs(done.quote.amount))}</b>
              </p>
            )}
            {done.pushError && (
              <p className="error">
                {t('ส่งเข้า LINE ไม่สำเร็จ', 'LINE delivery failed')}: {done.pushError}
              </p>
            )}
            <button
              className="btn block"
              onClick={() => {
                setDone(null);
                setTab('lots');
              }}
            >
              {t('ดูสถานะ', 'View status')}
            </button>
          </div>
        ) : (
          <>
            {tabBar}
            {tab === 'new' && <NewLot session={session} onCreated={created} />}
            {tab === 'lots' && (lots.length ? lots.map((it, i) => <LotCard key={it.lot.id} item={it} open={i === 0} />) : <p className="card">{t('ยังไม่มีล็อต', 'No lots yet')}</p>)}
            {tab === 'rights' && (
              <div className="card">
                <h2>{t('สิทธิ์ของเจ้าของข้อมูล (PDPA)', 'Your data rights (PDPA)')}</h2>
                <p>
                  {t('ยินยอมเมื่อ', 'Consented on')} {when(consent.at)} ({t('ฉบับ', 'version')} {consent.version})
                </p>
                <ul>
                  <li>{t('ดูข้อมูลของฉัน: ล็อตทั้งหมดอยู่ในแท็บ "ล็อตของฉัน" และใบรับของอยู่ในแชต LINE', 'Access: all lots are in "My lots"; receipts are in your LINE chat')}</li>
                  <li>{t('ขอแก้ไขข้อมูล: ติดต่อเจ้าหน้าที่ผ่านแชต LINE', 'Correction: contact staff via the LINE chat')}</li>
                  <li>{t('ถอนความยินยอม / ลบข้อมูล: กดปุ่มด้านล่าง (ง่ายเท่ากับตอนให้ความยินยอม)', 'Withdraw / erase: use the button below (as easy as giving consent)')}</li>
                </ul>
                <button className="btn danger block" onClick={erase}>
                  {t('ถอนความยินยอมและลบข้อมูลของฉัน', 'Withdraw consent and delete my data')}
                </button>
                <p className="hint">
                  {t(
                    'ต้นแบบนี้ลบทุกอย่าง ส่วนระบบจริงอาจต้องเก็บรายการซื้อขายแบบไม่ระบุตัวตนไว้ตามกฎหมายบัญชี/ภาษี (ฐาน Legal Obligation)',
                    'This prototype deletes everything; a production system may need to keep anonymised transactions for accounting/tax law (legal obligation basis).',
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
