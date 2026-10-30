// หน้า LIFF ของเกษตรกร: ยินยอม PDPA → แจ้งเศษพืช/จองคิว → รับ QR → ดูล็อต → ใช้สิทธิ์ของเจ้าของข้อมูล
import { useEffect, useMemo, useState } from 'react';
import { Link, Nav } from '../App.jsx';
import QR from '../components/QR.jsx';
import { MODES, PURPOSES, RESIDUES } from '../../shared/rules.js';
import { api, kg, local, when } from '../lib/client.js';
import { lineSession } from '../lib/line.js';

export const CONSENT_VERSION = '2026-11-01';

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
      <p>เพื่อใช้บริการตู้ "ไร่ไม่เผา" เราขอเก็บข้อมูลต่อไปนี้</p>
      <ul>
        <li>ชื่อที่แสดงใน LINE และ LINE user ID: เพื่อยืนยันตัวตนและส่ง QR / ใบรับของเข้าแชตของคุณ</li>
        <li>หมู่บ้าน ชนิดและน้ำหนักเศษพืช เวลานัด: เพื่อจัดคิวและคำนวณยอดเงิน</li>
        <li>รูปถ่ายวัตถุดิบและสินค้าที่ตู้: เป็นหลักฐานการซื้อขาย</li>
      </ul>
      <p>
        ข้อมูลที่แสดงในหน้า Dashboard สาธารณะจะซ่อนชื่อบางส่วนเสมอ คุณขอดู แก้ไข หรือลบข้อมูล และถอนความยินยอมได้ทุกเมื่อที่แท็บ "สิทธิ์ของฉัน"{' '}
        <Link to="/privacy">อ่านนโยบายฉบับเต็ม</Link>
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

function NewLot({ session, onCreated }) {
  const [f, setF] = useState({ residue: 'corn_cob', estKg: '', village: local.get('village', ''), purpose: 'sell', wantMode: 'chop', slot: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const options = useMemo(slots, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!f.slot) return setErr('กรุณาเลือกเวลานัด');
    setBusy(true);
    try {
      const out = await api('lots', {
        method: 'POST',
        data: { ...f, idToken: session.idToken, demo: session.mode === 'demo', name: session.profile.displayName, consentAt: local.get('consent')?.at },
      });
      local.set('village', f.village);
      onCreated(out);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2>แจ้งเศษพืช / จองคิวตู้</h2>
      <label>
        ชนิดเศษพืช
        <select value={f.residue} onChange={set('residue')}>
          {Object.entries(RESIDUES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
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
                {m.th} ({m.product})
              </option>
            ))}
          </select>
        </label>
      )}
      {f.purpose === 'sell' && <p className="hint">ระบบจะเลือกโหมดให้ตามคำสั่งซื้อของผู้รับซื้อ</p>}
      <fieldset>
        <legend>เวลานัดนำเศษพืชมาที่ตู้</legend>
        <div className="slots">
          {options.map((s) => (
            <button type="button" key={s} className={f.slot === s ? 'slot on' : 'slot'} onClick={() => setF({ ...f, slot: s })}>
              {when(s)}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="hint">⚠️ เศษพืชต้องแห้ง ความชื้นไม่เกิน 20% ไม่งั้นตู้จะไม่รับ</p>
      {err && <p className="error">{err}</p>}
      <button className="btn primary block" disabled={busy}>
        {busy ? 'กำลังส่ง…' : 'ยืนยันและรับ QR'}
      </button>
    </form>
  );
}

function LotCard({ item, open }) {
  const { lot, token } = item;
  return (
    <div className="card lot">
      <div className="row">
        <b>ล็อต {lot.id}</b>
        <span className="tag">{RESIDUES[lot.residue]}</span>
      </div>
      <p>
        {kg(lot.estKg)} · {PURPOSES[lot.purpose]}
        <br />
        นัด {lot.slot ? when(lot.slot) : '-'}
      </p>
      {open && <QR value={token} />}
    </div>
  );
}

export default function Farmer() {
  const [session, setSession] = useState(null);
  const [consent, setConsent] = useState(local.get('consent'));
  const [tab, setTab] = useState(new URLSearchParams(window.location.search).get('tab') || 'new'); // rich menu ส่ง ?tab=lots มาได้
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
      ['lots', 'consent', 'village'].forEach(local.remove);
      setLots([]);
      setConsent(null);
      setMsg('ลบข้อมูลเรียบร้อยแล้ว');
    } catch (e) {
      setMsg(e.message);
    }
  }

  if (!session) return <div className="center">กำลังเชื่อมต่อ LINE…</div>;

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
        {!consent ? (
          <Consent onAccept={accept} />
        ) : done ? (
          <div className="card center-text">
            <h2>✅ ลงทะเบียนล็อต {done.lot.id} แล้ว</h2>
            <QR value={done.token} size={260} />
            <p>{done.pushed ? 'ส่ง QR เข้าแชต LINE ของคุณแล้ว นำไปสแกนที่ตู้ได้เลย' : 'แคปหน้าจอ QR นี้ไว้ แล้วนำไปสแกนที่ตู้'}</p>
            {done.pushError && <p className="error">ส่งเข้า LINE ไม่สำเร็จ: {done.pushError}</p>}
            <button className="btn block" onClick={() => setDone(null)}>
              กลับ
            </button>
          </div>
        ) : (
          <>
            <div className="tabs">
              {[['new', 'แจ้งเศษพืช'], ['lots', `ล็อตของฉัน (${lots.length})`], ['rights', 'สิทธิ์ของฉัน']].map(([k, v]) => (
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
                  <li>ขอแก้ไขข้อมูล: ติดต่อเจ้าหน้าที่ประจำตู้ผ่านแชต LINE</li>
                  <li>ถอนความยินยอม / ลบข้อมูล: กดปุ่มด้านล่าง (ง่ายเท่ากับตอนให้ความยินยอม)</li>
                </ul>
                <button className="btn danger block" onClick={erase}>
                  ถอนความยินยอมและลบข้อมูลของฉัน
                </button>
                <p className="hint">หลังถอนความยินยอม คุณจะแจ้งเศษพืชใหม่ไม่ได้จนกว่าจะยินยอมอีกครั้ง ต้นแบบนี้ลบทุกอย่าง ส่วนระบบจริงอาจต้องเก็บรายการซื้อขายแบบไม่ระบุตัวตนไว้ตามกฎหมายบัญชี/ภาษี (ฐาน Legal Obligation)</p>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
