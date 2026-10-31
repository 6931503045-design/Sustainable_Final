// หน้าคนขับ (แบบ Grab): สมัคร → ดูงานรับของใกล้ฉัน → กดรับ → ไปรับ → ส่งที่ตู้ (แสดง QR ให้ตู้สแกน) → ได้ค่าจ้าง
import { useCallback, useEffect, useState } from 'react';
import { Link, Nav } from '../App.jsx';
import QR from '../components/QR.jsx';
import DemoNotice from '../components/DemoNotice.jsx';
import { MACHINE, RESIDUES, VEHICLES } from '../../shared/rules.js';
import { api, kg, local, thb, when } from '../lib/client.js';
import { LangToggle, useT } from '../lib/i18n.jsx';
import { lineSession } from '../lib/line.js';

const STATUS = {
  accepted: ['รับงานแล้ว · กำลังไปรับ', 'Accepted · on the way'],
  picked: ['รับของแล้ว · กำลังไปที่ตู้', 'Picked up · heading to machine'],
  done: ['ส่งสำเร็จ', 'Delivered'],
  cancelled: ['ยกเลิก', 'Cancelled'],
};

function Register({ session, onDone }) {
  const t = useT();
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
      <h2>🛻 {t('สมัครเป็นคนขับรับเศษพืช', 'Become a residue pickup driver')}</h2>
      <p>
        {t(
          'มีรถอยู่แล้ว? รับงานขนเศษพืชจากไร่เพื่อนบ้านไปที่ตู้ ได้ค่าจ้างตามระยะทางและน้ำหนัก ช่วยให้เศษพืชไม่ถูกเผา',
          'Have a vehicle? Haul residue from neighbouring farms to the machine, earn by distance and weight, and keep it from being burned.',
        )}
      </p>
      <label>
        {t('ประเภทรถ', 'Vehicle type')}
        <select value={f.vehicle} onChange={set('vehicle')}>
          {Object.entries(VEHICLES).map(([k, v]) => (
            <option key={k} value={k}>
              {t.pick(v)} ({t('บรรทุกได้', 'load')} ~{v.capacityKg} {t('กก.', 'kg')})
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('ทะเบียนรถ', 'Licence plate')}
        <input required value={f.plate} onChange={set('plate')} placeholder={t('เช่น บข 1234 เชียงราย', 'e.g. บข 1234 Chiang Rai')} />
      </label>
      <label>
        {t('เบอร์โทร', 'Phone')}
        <input required type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="0812345678" />
      </label>
      <label>
        {t('หมู่บ้าน', 'Village')}
        <input value={f.village} onChange={set('village')} placeholder={t('เช่น บ้านห้วยไคร้', 'e.g. Ban Huai Khrai')} />
      </label>
      <label className="check">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>
          {t(
            'ยินยอมให้เก็บชื่อ LINE เบอร์โทร และทะเบียนรถ เพื่อจับคู่งาน และเปิดเผยชื่อ/ทะเบียน/เบอร์โทรให้เกษตรกรเจ้าของงานที่ฉันรับเท่านั้น',
            'I consent to storing my LINE name, phone and plate to match jobs, and to sharing my name/plate/phone only with farmers whose jobs I accept',
          )}{' '}
          (<Link to="/privacy">{t('นโยบาย', 'policy')}</Link>)
        </span>
      </label>
      <p className="hint">{t('⚠️ บรรทุกไม่เกินพิกัดรถ คลุมผ้าใบกันเศษพืชปลิว และขับขี่อย่างปลอดภัย', '⚠️ Stay within load limits, cover the load with a tarp and drive safely')}</p>
      {err && <p className="error">{err}</p>}
      <button className="btn primary block" disabled={!ok}>
        {t('สมัคร', 'Sign up')}
      </button>
    </form>
  );
}

export default function Driver() {
  const t = useT();
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
    const timer = setInterval(load, 6000);
    return () => clearInterval(timer);
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

  if (!session) return <div className="center">{t('กำลังเชื่อมต่อ LINE…', 'Connecting to LINE…')}</div>;
  const active = (me?.jobs || []).filter((j) => ['accepted', 'picked'].includes(j.status));
  const history = (me?.jobs || []).filter((j) => !['accepted', 'picked'].includes(j.status));
  const km = t('กม.', 'km');

  return (
    <>
      {!session.inClient && <Nav />}
      <main className="wrap narrow">
        <div className="hello">
          {session.profile.pictureUrl && <img src={session.profile.pictureUrl} alt="" />}
          <div style={{ flex: 1 }}>
            {t('คนขับ', 'Driver')} <b>{session.profile.displayName}</b>
            {me && (
              <div className="hint">
                {t.pick(VEHICLES[me.driver.vehicle])} {me.driver.plate} · {t('รายได้สะสม', 'earned')} <b>{thb(me.earned)}</b>
              </div>
            )}
          </div>
          {session.inClient && <LangToggle />}
        </div>
        <DemoNotice session={session} path="/driver" />
        {msg && <p className="card error">{msg}</p>}
        {!token ? (
          <Register session={session} onDone={() => setToken(local.get('driverToken'))} />
        ) : (
          <>
            <div className="tabs">
              {[
                ['near', `${t('งานใกล้ฉัน', 'Nearby jobs')} (${open.length})`],
                ['mine', `${t('งานของฉัน', 'My jobs')} (${active.length})`],
                ['history', t('ประวัติ', 'History')],
              ].map(([k, v]) => (
                <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                  {v}
                </button>
              ))}
            </div>

            {tab === 'near' && (
              <>
                <button className="btn block" onClick={locate}>
                  📍 {here ? t('อัปเดตตำแหน่งของฉัน', 'Update my location') : t('ใช้ตำแหน่งของฉันเรียงงานใกล้สุด', 'Sort jobs by my location')}
                </button>
                {open.length === 0 && <p className="card">{t('ยังไม่มีงานรับของตอนนี้ ระบบจะแจ้งเข้า LINE เมื่อมีงานใหม่', 'No pickup jobs right now — new ones are sent to your LINE')}</p>}
                {open.map((p) => (
                  <div className="card job" key={p.lotId}>
                    <div className="row between">
                      <b>{p.village || t('ไม่ระบุหมู่บ้าน', 'Village not set')}</b>
                      <span className="earn">{thb(p.driverEarn)}</span>
                    </div>
                    <p>
                      {t.pick(RESIDUES[p.residue])} · {kg(p.estKg)}
                      <br />
                      {p.fromYouKm != null && (
                        <>
                          {t('ห่างคุณ', 'from you')} ~{p.fromYouKm} {km} ·{' '}
                        </>
                      )}
                      {t('ไปตู้', 'to machine')} {p.distanceKm} {km}
                      <br />
                      {t('ให้ไปรับ', 'Pickup')} {p.slot ? when(p.slot) : '-'}
                    </p>
                    <button className="btn primary block" onClick={() => act('accept', p.lotId)}>
                      {t('รับงานนี้', 'Accept job')}
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
                      <b>
                        {t('ล็อต', 'Lot')} {p.lotId}
                      </b>
                      <span className="tag">{t(...STATUS[p.status])}</span>
                    </div>
                    <p>
                      {p.farmerName} · {p.village}
                      <br />
                      {t('จุดสังเกต', 'Landmark')}: {p.landmark || '-'}
                      <br />
                      {t.pick(RESIDUES[p.residue])} {kg(p.estKg)} · {t('ค่าจ้าง', 'pay')} <b>{thb(p.driverEarn)}</b>
                    </p>
                    <div className="row">
                      {p.loc && (
                        <a className="btn" href={`https://www.google.com/maps/dir/?api=1&destination=${p.loc.lat},${p.loc.lng}`} target="_blank" rel="noreferrer">
                          🧭 {t('นำทาง', 'Navigate')}
                        </a>
                      )}
                      {p.farmerPhone && (
                        <a className="btn" href={`tel:${p.farmerPhone}`}>
                          📞 {t('โทร', 'Call')}
                        </a>
                      )}
                    </div>
                    {p.status === 'accepted' && (
                      <div className="row">
                        <button className="btn primary" onClick={() => act('picked', p.lotId)}>
                          📦 {t('รับของแล้ว', 'Picked up')}
                        </button>
                        <button className="btn danger" onClick={() => act('release', p.lotId)}>
                          {t('ยกเลิกงาน', 'Release job')}
                        </button>
                      </div>
                    )}
                    {p.status === 'picked' && (
                      <>
                        <p className="hint">
                          {t(`ถึงตู้แล้ว ให้แสดง QR นี้ที่หน้าจอตู้ (${MACHINE.th}) ค่าจ้างจะเข้าเมื่อชั่งเสร็จ`, `At the machine (${MACHINE.en}), show this QR to the screen. You are paid once it is weighed.`)}
                        </p>
                        <QR value={p.lotToken} size={220} />
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p className="card">{t('ยังไม่มีงานที่รับไว้', 'No accepted jobs')}</p>
              ))}

            {tab === 'history' && (
              <div className="card">
                <h3>
                  {t('รายได้สะสม', 'Total earned')} {thb(me?.earned || 0)}
                </h3>
                {history.length ? (
                  <ul className="list">
                    {history.map((p) => (
                      <li key={p.lotId}>
                        {p.lotId} · {p.village} · {t(...STATUS[p.status])} {p.status === 'done' && <b>{thb(p.driverEarn)}</b>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="hint">{t('ยังไม่มีประวัติ', 'No history yet')}</p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
