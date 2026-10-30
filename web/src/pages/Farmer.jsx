// หน้า LIFF ของเกษตรกร: ยินยอม PDPA → ดูราคา/คำนวณ → แจ้งขาย (นำมาเอง หรือเรียกรถคนในพื้นที่ไปรับ) → รับ QR → ติดตามสถานะ → สิทธิ์ PDPA
import { useEffect, useMemo, useState } from 'react';
import { Link, Nav } from '../App.jsx';
import QR from '../components/QR.jsx';
import PriceBoard from '../components/PriceBoard.jsx';
import { MACHINE, MODES, PICKUP, PURPOSES, RESIDUES, distanceKm, modeLabel, residueName, settle } from '../../shared/rules.js';
import { api, kg, local, thb, when } from '../lib/client.js';
import { lineSession } from '../lib/line.js';

export const CONSENT_VERSION = '2026-11-01';

const STATUS = {
  open: '🔎 กำลังหาคนขับ',
  accepted: '🛻 คนขับรับงานแล้ว กำลังไป',
  picked: '📦 รับของแล้ว กำลังไปที่ตู้',
  done: '✅ ชั่งและจ่ายเงินแล้ว',
  cancelled: 'ยกเลิกรถ (นำมาเองแล้ว)',
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
  const [ok, setOk] = useState(false);
  return (
    <div className="card">
      <h2>ขอความยินยอมเก็บข้อมูลส่วนบุคคล</h2>
      <p>เพื่อซื้อขายเศษพืชกับ "ไร่ไม่เผา" เราขอเก็บข้อมูลต่อไปนี้</p>
      <ul>
        <li>ชื่อที่แสดงใน LINE และ LINE user ID: ยืนยันตัวตน ส่ง QR และใบรับของเข้าแชต</li>
        <li>หมู่บ้าน ชนิดและน้ำหนักเศษพืช เวลานัด: จัดคิวและคำนวณยอดเงิน</li>
        <li>
          <b>ถ้าเรียกรถไปรับ:</b> ตำแหน่งกองเศษพืชและเบอร์โทร โดยจะเปิดเผยให้<b>เฉพาะคนขับที่รับงานของคุณ</b>เท่านั้น
        </li>
        <li>รูปถ่ายวัตถุดิบและสินค้าที่ตู้: หลักฐานการซื้อขาย</li>
      </ul>
      <p>
        คุณขอดู แก้ไข ลบข้อมูล หรือถอนความยินยอมได้ทุกเมื่อที่แท็บ "สิทธิ์" <Link to="/privacy">อ่านนโยบายฉบับเต็ม</Link>
      </p>
      <label className="check">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> ฉันอ่านและยินยอมให้เก็บข้อมูลตามวัตถุประสงค์ข้างต้น
      </label>
      <button className="btn primary block" disabled={!ok} onClick={onAccept}>
        ยินยอมและเริ่มใช้งาน
      </button>
    </div>
  );
}

function Quote({ q, pickup, km }) {
  if (!q) return null;
  return (
    <div className="quote">
      <div className="row between">
        <span>{q.gross >= 0 ? 'ค่าเศษพืช (ราคาเต็ม)' : 'ค่าบริการแปรรูป'}</span>
        <b>{thb(Math.abs(q.gross))}</b>
      </div>
      {pickup && (
        <div className="row between">
          <span>ค่ารถรับถึงที่ ({km} กม.)</span>
          <b>− {thb(q.pickupFee)}</b>
        </div>
      )}
      <div className="row between total">
        <span>{q.amount >= 0 ? 'คาดว่าจะได้รับ' : 'คาดว่าต้องจ่าย'}</span>
        <b>{thb(Math.abs(q.amount))}</b>
      </div>
      <small className="hint">ยอดจริงคิดจากน้ำหนักที่ชั่งและความชื้นที่ตู้</small>
    </div>
  );
}

function NewLot({ session, onCreated }) {
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

  function locate(demo = false) {
    setErr('');
    if (demo) return setF({ ...f, loc: { lat: MACHINE.lat + 0.03, lng: MACHINE.lng - 0.02 } }); // จุดทดลองห่างตู้ ~5 กม.
    if (!navigator.geolocation) return setErr('อุปกรณ์นี้แชร์ตำแหน่งไม่ได้');
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setF((x) => ({ ...x, loc: { lat: p.coords.latitude, lng: p.coords.longitude } }));
        setLocBusy(false);
      },
      () => {
        setErr('ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง (หรือใช้ปุ่ม "ตำแหน่งทดลอง")');
        setLocBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!f.slot) return setErr(pickup ? 'กรุณาเลือกวันเวลาให้ไปรับ' : 'กรุณาเลือกเวลานัด');
    if (pickup && !f.loc) return setErr('กรุณาแชร์ตำแหน่งกองเศษพืช');
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
      <h2>แจ้งขายเศษพืช</h2>
      <label>
        ชนิดเศษพืช
        <select value={f.residue} onChange={set('residue')}>
          {Object.entries(RESIDUES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.th} — {v.buy.toFixed(2)} ฿/กก.
            </option>
          ))}
        </select>
      </label>
      <label>
        น้ำหนักโดยประมาณ (กก.)
        <input type="number" inputMode="decimal" min="1" max="5000" required value={f.estKg} onChange={set('estKg')} placeholder="เช่น 120" />
      </label>
      <label>
        หมู่บ้าน
        <input required value={f.village} onChange={set('village')} placeholder="เช่น บ้านห้วยไคร้" />
      </label>
      <fieldset>
        <legend>ต้องการ</legend>
        {Object.entries(PURPOSES).map(([k, v]) => (
          <label className="radio" key={k}>
            <input type="radio" name="purpose" value={k} checked={f.purpose === k} onChange={set('purpose')} /> {v}
          </label>
        ))}
      </fieldset>
      {f.purpose === 'self' && (
        <label>
          โหมดที่ต้องการ
          <select value={f.wantMode} onChange={set('wantMode')}>
            {Object.values(MODES).map((m) => (
              <option key={m.key} value={m.key}>
                {modeLabel(m.key)} ({m.products.join(' / ')})
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset>
        <legend>ส่งเศษพืชอย่างไร</legend>
        <div className="choice">
          <button type="button" className={!pickup ? 'on' : ''} onClick={() => setF({ ...f, delivery: 'self' })}>
            🚜 นำมาเองที่ตู้
            <small>{MACHINE.th}</small>
          </button>
          <button type="button" className={pickup ? 'on' : ''} onClick={() => setF({ ...f, delivery: 'pickup' })}>
            🛻 เรียกรถไปรับ
            <small>คนในพื้นที่ขับไปรับถึงไร่</small>
          </button>
        </div>
      </fieldset>

      {pickup && (
        <div className="pickup-box">
          <div className="row">
            <button type="button" className="btn" onClick={() => locate(false)} disabled={locBusy}>
              📍 {locBusy ? 'กำลังหาตำแหน่ง…' : f.loc ? 'แชร์ตำแหน่งใหม่' : 'แชร์ตำแหน่งกองเศษพืช'}
            </button>
            <button type="button" className="btn ghost-sm" onClick={() => locate(true)}>
              ตำแหน่งทดลอง
            </button>
          </div>
          {f.loc && (
            <p className={km > PICKUP.maxKm ? 'error' : 'hint'}>
              ห่างตู้ประมาณ {km} กม. {km > PICKUP.maxKm && `(เกิน ${PICKUP.maxKm} กม. ยังไม่มีบริการ)`}{' '}
              <a href={`https://www.google.com/maps/search/?api=1&query=${f.loc.lat},${f.loc.lng}`} target="_blank" rel="noreferrer">
                ดูบนแผนที่
              </a>
            </p>
          )}
          <label>
            จุดสังเกต (ให้คนขับหาเจอ)
            <input value={f.landmark} onChange={set('landmark')} placeholder="เช่น ไร่ข้าวโพดหลังวัด ทางเข้าเป็นดิน" />
          </label>
          <label>
            เบอร์โทร (เปิดให้เฉพาะคนขับที่รับงาน)
            <input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="0812345678" />
          </label>
        </div>
      )}

      <fieldset>
        <legend>{pickup ? 'วันเวลาที่สะดวกให้ไปรับ' : 'เวลานัดนำเศษพืชมาที่ตู้'}</legend>
        <div className="slots">
          {options.map((s) => (
            <button type="button" key={s} className={f.slot === s ? 'slot on' : 'slot'} onClick={() => setF({ ...f, slot: s })}>
              {when(s)}
            </button>
          ))}
        </div>
      </fieldset>

      <Quote q={quote} pickup={pickup && km != null} km={km} />
      <p className="hint">⚠️ เศษพืชต้องแห้ง ความชื้นไม่เกิน 20% (15–20% ลดราคา 10%)</p>
      {err && <p className="error">{err}</p>}
      <button className="btn primary block" disabled={busy}>
        {busy ? 'กำลังส่ง…' : pickup ? 'ยืนยันและเรียกรถ' : 'ยืนยันและรับ QR'}
      </button>
    </form>
  );
}

function LotCard({ item, open }) {
  const { lot, token } = item;
  const [p, setP] = useState(null);
  useEffect(() => {
    if (lot.delivery !== 'pickup') return;
    let alive = true;
    const load = () => api(`pickups?lot=${lot.id}`).then((r) => alive && setP(r.pickup)).catch(() => {});
    load();
    const t = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [lot.id, lot.delivery]);
  return (
    <div className="card lot">
      <div className="row between">
        <b>ล็อต {lot.id}</b>
        <span className="tag">{residueName(lot.residue)}</span>
      </div>
      <p>
        {kg(lot.estKg)} · {PURPOSES[lot.purpose]}
        <br />
        {lot.delivery === 'pickup' ? 'ให้ไปรับ' : 'นัด'} {lot.slot ? when(lot.slot) : '-'}
      </p>
      {p && (
        <div className="status">
          <b>{STATUS[p.status] || p.status}</b>
          {p.driver && (
            <div>
              คนขับ {p.driver.name} · {p.driver.vehicleTh} {p.driver.plate}
            </div>
          )}
        </div>
      )}
      {open && <QR value={token} />}
    </div>
  );
}

export default function Farmer() {
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
    if (!window.confirm('ลบข้อมูลล็อตและประวัติทั้งหมดของคุณ และถอนความยินยอม?')) return;
    try {
      if (session.mode === 'line') await api('me', { method: 'DELETE', data: { idToken: session.idToken } });
      ['lots', 'consent', 'village', 'phone'].forEach(local.remove);
      setLots([]);
      setConsent(null);
      setMsg('ลบข้อมูลเรียบร้อยแล้ว');
    } catch (e) {
      setMsg(e.message);
    }
  }

  if (!session) return <div className="center">กำลังเชื่อมต่อ LINE…</div>;

  const tabs = [
    ['new', 'แจ้งขาย'],
    ['price', 'ราคา'],
    ['lots', `ล็อตของฉัน (${lots.length})`],
    ['rights', 'สิทธิ์'],
  ];

  return (
    <>
      {!session.inClient && <Nav />}
      <main className="wrap narrow">
        <div className="hello">
          {session.profile.pictureUrl && <img src={session.profile.pictureUrl} alt="" />}
          <div>
            สวัสดี <b>{session.profile.displayName}</b>
            {session.mode === 'demo' && <div className="tag warn">โหมดทดลอง (ไม่ได้เปิดผ่าน LINE จึงไม่ส่งข้อความเข้าแชต)</div>}
          </div>
        </div>
        {msg && <p className="card">{msg}</p>}
        {tab === 'price' && !done ? (
          <>
            <div className="tabs">
              {tabs.map(([k, v]) => (
                <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                  {v}
                </button>
              ))}
            </div>
            <PriceBoard onSell={() => setTab('new')} />
          </>
        ) : !consent ? (
          <>
            <button className="btn block" onClick={() => setTab('price')}>
              💰 ดูราคารับซื้อก่อน
            </button>
            <br />
            <Consent onAccept={accept} />
          </>
        ) : done ? (
          <div className="card center-text">
            <h2>✅ {done.lot.delivery === 'pickup' ? 'ส่งคำขอรถแล้ว' : 'ลงทะเบียนแล้ว'} · ล็อต {done.lot.id}</h2>
            <QR value={done.token} size={240} />
            <p>
              {done.lot.delivery === 'pickup'
                ? 'ระบบแจ้งคนขับในพื้นที่แล้ว จะส่งข้อความเข้า LINE เมื่อมีคนรับงาน'
                : done.pushed
                  ? 'ส่ง QR เข้าแชต LINE ของคุณแล้ว นำไปสแกนที่ตู้ได้เลย'
                  : 'แคปหน้าจอ QR นี้ไว้ แล้วนำไปสแกนที่ตู้'}
            </p>
            {done.quote && (
              <p>
                {done.quote.amount >= 0 ? 'คาดว่าจะได้รับ' : 'คาดว่าต้องจ่าย'} <b>{thb(Math.abs(done.quote.amount))}</b>
              </p>
            )}
            {done.pushError && <p className="error">ส่งเข้า LINE ไม่สำเร็จ: {done.pushError}</p>}
            <button
              className="btn block"
              onClick={() => {
                setDone(null);
                setTab('lots');
              }}
            >
              ดูสถานะ
            </button>
          </div>
        ) : (
          <>
            <div className="tabs">
              {tabs.map(([k, v]) => (
                <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                  {v}
                </button>
              ))}
            </div>
            {tab === 'new' && <NewLot session={session} onCreated={created} />}
            {tab === 'lots' && (lots.length ? lots.map((it, i) => <LotCard key={it.lot.id} item={it} open={i === 0} />) : <p className="card">ยังไม่มีล็อต</p>)}
            {tab === 'rights' && (
              <div className="card">
                <h2>สิทธิ์ของเจ้าของข้อมูล (PDPA)</h2>
                <p>ยินยอมเมื่อ {when(consent.at)} (ฉบับ {consent.version})</p>
                <ul>
                  <li>ดูข้อมูลของฉัน: ล็อตทั้งหมดอยู่ในแท็บ "ล็อตของฉัน" และใบรับของอยู่ในแชต LINE</li>
                  <li>ขอแก้ไขข้อมูล: ติดต่อเจ้าหน้าที่ผ่านแชต LINE</li>
                  <li>ถอนความยินยอม / ลบข้อมูล: กดปุ่มด้านล่าง (ง่ายเท่ากับตอนให้ความยินยอม)</li>
                </ul>
                <button className="btn danger block" onClick={erase}>
                  ถอนความยินยอมและลบข้อมูลของฉัน
                </button>
                <p className="hint">ต้นแบบนี้ลบทุกอย่าง ส่วนระบบจริงอาจต้องเก็บรายการซื้อขายแบบไม่ระบุตัวตนไว้ตามกฎหมายบัญชี/ภาษี (ฐาน Legal Obligation)</p>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
