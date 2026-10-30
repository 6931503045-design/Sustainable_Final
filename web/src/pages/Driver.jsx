// หน้าคนขับ (แบบ Grab): สมัคร → ดูงานรับของใกล้ฉัน → กดรับ → ไปรับ → ส่งที่ตู้ (แสดง QR ให้ตู้สแกน) → ได้ค่าจ้าง
import { useCallback, useEffect, useState } from 'react';
import { Link, Nav } from '../App.jsx';
import QR from '../components/QR.jsx';
import { MACHINE, VEHICLES, residueName } from '../../shared/rules.js';
import { api, kg, local, thb, when } from '../lib/client.js';
import { lineSession } from '../lib/line.js';

const STATUS = { accepted: 'รับงานแล้ว · กำลังไปรับ', picked: 'รับของแล้ว · กำลังไปที่ตู้', done: 'ส่งสำเร็จ', cancelled: 'ยกเลิก' };

function Register({ session, onDone }) {
  const [f, setF] = useState({ vehicle: 'pickup', plate: '', phone: local.get('phone', ''), village: local.get('village', '') });
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      const out = await api('drivers', {
        method: 'POST',
        data: { ...f, idToken: session.idToken, demo: session.mode === 'demo', name: session.profile.displayName, consentAt: new Date().toISOString() },
      });
      local.set('driverToken', out.driverToken);
      onDone();
    } catch (e2) {
      setErr(e2.message);
    }
  }
  return (
    <form className="card form" onSubmit={submit}>
      <h2>🛻 สมัครเป็นคนขับรับเศษพืช</h2>
      <p>มีรถอยู่แล้ว? รับงานขนเศษพืชจากไร่เพื่อนบ้านไปที่ตู้ ได้ค่าจ้างตามระยะทางและน้ำหนัก ช่วยให้เศษพืชไม่ถูกเผา</p>
      <label>
        ประเภทรถ
        <select value={f.vehicle} onChange={set('vehicle')}>
          {Object.entries(VEHICLES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.th} (บรรทุกได้ ~{v.capacityKg} กก.)
            </option>
          ))}
        </select>
      </label>
      <label>
        ทะเบียนรถ
        <input required value={f.plate} onChange={set('plate')} placeholder="เช่น บข 1234 เชียงราย" />
      </label>
      <label>
        เบอร์โทร
        <input required type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="0812345678" />
      </label>
      <label>
        หมู่บ้าน
        <input value={f.village} onChange={set('village')} placeholder="เช่น บ้านห้วยไคร้" />
      </label>
      <label className="check">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        ยินยอมให้เก็บชื่อ LINE เบอร์โทร และทะเบียนรถ เพื่อจับคู่งาน และเปิดเผยชื่อ/ทะเบียน/เบอร์โทรให้เกษตรกรเจ้าของงานที่ฉันรับเท่านั้น (<Link to="/privacy">นโยบาย</Link>)
      </label>
      <p className="hint">⚠️ บรรทุกไม่เกินพิกัดรถ คลุมผ้าใบกันเศษพืชปลิว และขับขี่อย่างปลอดภัย</p>
      {err && <p className="error">{err}</p>}
      <button className="btn primary block" disabled={!ok}>
        สมัคร
      </button>
    </form>
  );
}

export default function Driver() {
  const [session, setSession] = useState(null);
  const [token, setToken] = useState(local.get('driverToken'));
  const [me, setMe] = useState(null);
  const [open, setOpen] = useState([]);
  const [here, setHere] = useState(null);
  const [tab, setTab] = useState('near');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    lineSession().then(setSession);
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setMe(await api(`drivers?token=${encodeURIComponent(token)}`));
      const q = here ? `?lat=${here.lat}&lng=${here.lng}` : '';
      setOpen((await api(`pickups${q}`)).pickups);
    } catch (e) {
      if (/ไม่พบข้อมูลคนขับ/.test(e.message)) {
        local.remove('driverToken');
        setToken(null);
      } else setMsg(e.message);
    }
  }, [token, here]);

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) => setHere({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setHere({ lat: MACHINE.lat, lng: MACHINE.lng }),
    );
  }

  async function act(action, lotId) {
    setMsg('');
    try {
      await api('pickups', { method: 'POST', data: { action, lotId, driverToken: token } });
      if (action === 'accept') setTab('mine');
      load();
    } catch (e) {
      setMsg(e.message);
      load();
    }
  }

  if (!session) return <div className="center">กำลังเชื่อมต่อ LINE…</div>;
  const active = (me?.jobs || []).filter((j) => ['accepted', 'picked'].includes(j.status));
  const history = (me?.jobs || []).filter((j) => !['accepted', 'picked'].includes(j.status));

  return (
    <>
      {!session.inClient && <Nav />}
      <main className="wrap narrow">
        <div className="hello">
          {session.profile.pictureUrl && <img src={session.profile.pictureUrl} alt="" />}
          <div>
            คนขับ <b>{session.profile.displayName}</b>
            {me && (
              <div className="hint">
                {me.driver.vehicleTh} {me.driver.plate} · รายได้สะสม <b>{thb(me.earned)}</b>
              </div>
            )}
            {session.mode === 'demo' && <div className="tag warn">โหมดทดลอง</div>}
          </div>
        </div>
        {msg && <p className="card error">{msg}</p>}
        {!token ? (
          <Register session={session} onDone={() => setToken(local.get('driverToken'))} />
        ) : (
          <>
            <div className="tabs">
              {[['near', `งานใกล้ฉัน (${open.length})`], ['mine', `งานของฉัน (${active.length})`], ['history', 'ประวัติ']].map(([k, v]) => (
                <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                  {v}
                </button>
              ))}
            </div>

            {tab === 'near' && (
              <>
                <button className="btn block" onClick={locate}>
                  📍 {here ? 'อัปเดตตำแหน่งของฉัน' : 'ใช้ตำแหน่งของฉันเรียงงานใกล้สุด'}
                </button>
                {open.length === 0 && <p className="card">ยังไม่มีงานรับของตอนนี้ ระบบจะแจ้งเข้า LINE เมื่อมีงานใหม่</p>}
                {open.map((p) => (
                  <div className="card job" key={p.lotId}>
                    <div className="row between">
                      <b>{p.village || 'ไม่ระบุหมู่บ้าน'}</b>
                      <span className="earn">{thb(p.driverEarn)}</span>
                    </div>
                    <p>
                      {residueName(p.residue)} · {kg(p.estKg)}
                      <br />
                      {p.fromYouKm != null && <>ห่างคุณ ~{p.fromYouKm} กม. · </>}ไปตู้ {p.distanceKm} กม.
                      <br />
                      ให้ไปรับ {p.slot ? when(p.slot) : '-'}
                    </p>
                    <button className="btn primary block" onClick={() => act('accept', p.lotId)}>
                      รับงานนี้
                    </button>
                  </div>
                ))}
              </>
            )}

            {tab === 'mine' &&
              (active.length ? (
                active.map((p) => (
                  <div className="card job" key={p.lotId}>
                    <div className="row between">
                      <b>ล็อต {p.lotId}</b>
                      <span className="tag">{STATUS[p.status]}</span>
                    </div>
                    <p>
                      {p.farmerName} · {p.village}
                      <br />
                      จุดสังเกต: {p.landmark || '-'}
                      <br />
                      {residueName(p.residue)} {kg(p.estKg)} · ค่าจ้าง <b>{thb(p.driverEarn)}</b>
                    </p>
                    <div className="row">
                      {p.loc && (
                        <a className="btn" href={`https://www.google.com/maps/dir/?api=1&destination=${p.loc.lat},${p.loc.lng}`} target="_blank" rel="noreferrer">
                          🧭 นำทาง
                        </a>
                      )}
                      {p.farmerPhone && (
                        <a className="btn" href={`tel:${p.farmerPhone}`}>
                          📞 โทร
                        </a>
                      )}
                    </div>
                    {p.status === 'accepted' && (
                      <div className="row">
                        <button className="btn primary" onClick={() => act('picked', p.lotId)}>
                          📦 รับของแล้ว
                        </button>
                        <button className="btn danger" onClick={() => act('release', p.lotId)}>
                          ยกเลิกงาน
                        </button>
                      </div>
                    )}
                    {p.status === 'picked' && (
                      <>
                        <p className="hint">ถึงตู้แล้ว ให้แสดง QR นี้ที่หน้าจอตู้ ({MACHINE.th}) ค่าจ้างจะเข้าเมื่อชั่งเสร็จ</p>
                        <QR value={p.lotToken} size={220} />
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p className="card">ยังไม่มีงานที่รับไว้</p>
              ))}

            {tab === 'history' && (
              <div className="card">
                <h3>รายได้สะสม {thb(me?.earned || 0)}</h3>
                {history.length ? (
                  <ul className="list">
                    {history.map((p) => (
                      <li key={p.lotId}>
                        {p.lotId} · {p.village} · {STATUS[p.status]} {p.status === 'done' && <b>{thb(p.driverEarn)}</b>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="hint">ยังไม่มีประวัติ</p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
