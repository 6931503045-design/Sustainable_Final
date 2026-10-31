// Dashboard ผลกระทบ: รวมข้อมูลจริงจาก API + งานในเครื่องนี้ + ข้อมูลจำลอง (เปิด/ปิดได้)
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '../App.jsx';
import { MODES, PELLET_TYPES, PELLET_TYPES_EN, PURPOSES, PURPOSES_EN, RESIDUES, SERVICE_HOURS } from '../../shared/rules.js';
import { api, kg, local, thb, when } from '../lib/client.js';
import { useT } from '../lib/i18n.jsx';
import { SEED_MACHINE_HOURS, seedJobs } from '../lib/seed.js';

const SEED = seedJobs();

function Stat({ label, value, sub }) {
  return (
    <div className="card stat">
      <small>{label}</small>
      <b>{value}</b>
      {sub && <span>{sub}</span>}
    </div>
  );
}

function Bars({ data, unit }) {
  const t = useT();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="bar" key={d.label}>
          <span>{d.label}</span>
          <div>
            <i style={{ width: `${(d.value / max) * 100}%`, background: d.color || 'var(--green)' }} />
          </div>
          <b>
            {Math.round(d.value).toLocaleString(t.locale)} {unit}
          </b>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const t = useT();
  const [server, setServer] = useState({ jobs: [], lots: [], persistent: false });
  const [showSeed, setShowSeed] = useState(local.get('showSeed', true));
  const [note, setNote] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () => api('stats').then((s) => alive && setServer(s)).catch(() => {});
    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const jobs = useMemo(() => {
    const seen = new Set();
    return [...server.jobs, ...local.get('jobs', []), ...(showSeed ? SEED : [])]
      .filter((j) => !seen.has(j.id) && seen.add(j.id))
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [server, showSeed]);

  const sum = (f, list = jobs) => list.reduce((s, j) => s + f(j), 0);
  const savedKg = sum((j) => j.savedKg);
  const paid = sum((j) => Math.max(0, j.amount));
  const farmers = new Set(jobs.map((j) => `${j.name}|${j.village}`)).size;
  const hours = (showSeed ? SEED_MACHINE_HOURS : 0) + sum((j) => (j.inputKg / 100) * (MODES[j.mode].minutesPer100kg / 60), jobs.filter((j) => !j.seed));
  const due = hours >= SERVICE_HOURS * 0.9;

  const byMode = Object.values(MODES).map((m) => ({ label: `${m.code} ${t.pick(m)}`, value: sum((j) => j.outputKg, jobs.filter((j) => j.mode === m.key)), color: m.color }));
  const villages = [...new Set(jobs.map((j) => j.village))]
    .map((v) => ({ label: v, value: sum((j) => j.savedKg, jobs.filter((j) => j.village === v)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const today = new Date().toDateString();
  const queue = server.lots.filter((l) => l.slot && new Date(l.slot).toDateString() === today && !jobs.some((j) => j.lotId === l.id));

  async function notifyTech() {
    try {
      await api('maintenance', { method: 'POST', data: { machineId: 'RMP-01', hours: Math.round(hours) } });
      setNote(t('ส่งแจ้งเตือนเข้า LINE ช่างแล้ว ✓', 'Technician notified on LINE ✓'));
    } catch (e) {
      setNote(e.message);
    }
  }

  return (
    <>
      <Nav />
      <main className="wrap">
        <div className="row between">
          <h1>{t('Dashboard ผลกระทบ', 'Impact dashboard')}</h1>
          <label className="check">
            <input
              type="checkbox"
              checked={showSeed}
              onChange={(e) => {
                setShowSeed(e.target.checked);
                local.set('showSeed', e.target.checked);
              }}
            />{' '}
            {t('รวมข้อมูลจำลอง', 'Include sample data')}
          </label>
        </div>
        {showSeed && <p className="tag warn">{t('มีข้อมูลจำลองรวมอยู่ด้วย (ต้นแบบสำหรับนำเสนอ)', 'Includes sample data (presentation prototype)')}</p>}

        <div className="grid4">
          <Stat label={t('เศษพืชที่ไม่ถูกเผา', 'Residue not burned')} value={kg(savedKg)} sub={t(`${jobs.length} ครั้งที่แปรรูป`, `${jobs.length} runs`)} />
          <Stat label={t('ลดฝุ่น PM2.5 (ประมาณ)', 'PM2.5 avoided (est.)')} value={kg(sum((j) => j.pm25g) / 1000)} sub={t('ค่าประมาณ ต้องอ้างอิงงานวิจัย', 'Estimate — needs a cited source')} />
          <Stat label={t('รายได้ที่จ่ายให้เกษตรกร', 'Paid to farmers')} value={thb(paid)} sub={t(`${farmers} ครัวเรือน`, `${farmers} households`)} />
          <Stat label={t('รายได้คนขับในชุมชน', 'Earned by local drivers')} value={thb(sum((j) => j.driverEarn || 0))} sub={t(`${jobs.filter((j) => j.pickupFee).length} เที่ยวรับของถึงไร่`, `${jobs.filter((j) => j.pickupFee).length} farm pickups`)} />
        </div>

        <div className="grid2">
          <div className="card">
            <h3>{t('ผลผลิตแยกตามโหมด', 'Output by mode')}</h3>
            <Bars data={byMode} unit={t('กก.', 'kg')} />
          </div>
          <div className="card">
            <h3>{t('หมู่บ้านที่ลดการเผามากที่สุด', 'Villages avoiding the most burning')}</h3>
            <Bars data={villages} unit={t('กก.', 'kg')} />
          </div>
        </div>

        <div className="grid2">
          <div className="card">
            <h3>{t('สถานะตู้', 'Machine status')} RMP-01</h3>
            <p>
              {t('ชั่วโมงทำงานตั้งแต่บำรุงรักษาล่าสุด', 'Run hours since last service')} <b>{hours.toFixed(1)}</b> / {SERVICE_HOURS} {t('ชม.', 'h')}
            </p>
            <div className={`meter ${due ? 'due' : ''}`}>
              <i style={{ width: `${Math.min(100, (hours / SERVICE_HOURS) * 100)}%` }} />
            </div>
            <p className="hint">{due ? t('⚠️ ใกล้ถึงรอบตรวจใบมีดสับ / ลูกกลิ้ง / แม่พิมพ์ (สึกจากซิลิกาในเศษพืช)', '⚠️ Service due soon: hammers / rollers / dies (worn by silica in residue)') : t('ปกติ', 'OK')}</p>
            <button className="btn" onClick={notifyTech}>
              🔧 {t('แจ้งช่างผ่าน LINE', 'Notify technician on LINE')}
            </button>
            {note && <p className="hint">{note}</p>}
          </div>
          <div className="card">
            <h3>{t('คิววันนี้', 'Today’s queue')}</h3>
            {queue.length ? (
              <ul className="list">
                {queue.map((l) => (
                  <li key={l.id}>
                    <b>{new Date(l.slot).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}</b> {l.id} · {l.name} · {t.pick(RESIDUES[l.residue])} {kg(l.estKg)} {l.delivery === 'pickup' && '🛻'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">
                {t('ยังไม่มีคิววันนี้', 'No bookings today')}
                {server.persistent ? '' : t(' (ยังไม่ได้เชื่อมฐานข้อมูล คิวจะไม่แชร์ข้ามเครื่อง)', ' (database not connected — queue is not shared)')}
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <h3>{t('รายการแปรรูปล่าสุด', 'Latest runs')}</h3>
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>{t('เวลา', 'Time')}</th>
                  <th>{t('ล็อต', 'Lot')}</th>
                  <th>{t('เกษตรกร', 'Farmer')}</th>
                  <th>{t('โหมด', 'Mode')}</th>
                  <th>{t('ก่อน → หลัง', 'In → out')}</th>
                  <th>{t('ประเภท', 'Type')}</th>
                  <th>{t('ยอดเงิน', 'Amount')}</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 15).map((j) => (
                  <tr key={j.id} className={j.seed ? 'seed' : ''}>
                    <td>{when(j.at)}</td>
                    <td>{j.lotId}</td>
                    <td>
                      {j.name}
                      <br />
                      <small>{j.village}</small>
                    </td>
                    <td>
                      {MODES[j.mode].code} {t.pick(MODES[j.mode])}
                      {j.pelletType && <small> · {(t.lang === 'en' ? PELLET_TYPES_EN : PELLET_TYPES)[j.pelletType].split(' (')[0]}</small>}
                    </td>
                    <td>
                      {j.inputKg} → {j.outputKg}
                    </td>
                    <td>{t.lang === 'en' ? PURPOSES_EN[j.purpose].split(' ')[0] : PURPOSES[j.purpose].split(' ')[0]}</td>
                    <td className={j.amount >= 0 ? 'good' : ''}>{thb(j.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
