// Dashboard ผลกระทบ: รวมข้อมูลจริงจาก API + งานในเครื่องนี้ + ข้อมูลจำลอง (เปิด/ปิดได้)
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '../App.jsx';
import { MODES, PELLET_TYPES, PURPOSES, RESIDUES, SERVICE_HOURS } from '../../shared/rules.js';
import { api, kg, local, thb, when } from '../lib/client.js';
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
            {Math.round(d.value).toLocaleString('th-TH')} {unit}
          </b>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [server, setServer] = useState({ jobs: [], lots: [], persistent: false });
  const [showSeed, setShowSeed] = useState(local.get('showSeed', true));
  const [note, setNote] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () => api('stats').then((s) => alive && setServer(s)).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
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

  const byMode = Object.values(MODES).map((m) => ({ label: m.th, value: sum((j) => j.outputKg, jobs.filter((j) => j.mode === m.key)), color: m.color }));
  const villages = [...new Set(jobs.map((j) => j.village))]
    .map((v) => ({ label: v, value: sum((j) => j.savedKg, jobs.filter((j) => j.village === v)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const today = new Date().toDateString();
  const queue = server.lots.filter((l) => l.slot && new Date(l.slot).toDateString() === today && !jobs.some((j) => j.lotId === l.id));

  async function notifyTech() {
    try {
      await api('maintenance', { method: 'POST', data: { machineId: 'RMP-01', hours: Math.round(hours) } });
      setNote('ส่งแจ้งเตือนเข้า LINE ช่างแล้ว ✓');
    } catch (e) {
      setNote(e.message);
    }
  }

  return (
    <>
      <Nav />
      <main className="wrap">
        <div className="row between">
          <h1>Dashboard ผลกระทบ</h1>
          <label className="check">
            <input
              type="checkbox"
              checked={showSeed}
              onChange={(e) => {
                setShowSeed(e.target.checked);
                local.set('showSeed', e.target.checked);
              }}
            />{' '}
            รวมข้อมูลจำลอง
          </label>
        </div>
        {showSeed && <p className="tag warn">มีข้อมูลจำลองรวมอยู่ด้วย (ต้นแบบสำหรับนำเสนอ)</p>}

        <div className="grid4">
          <Stat label="เศษพืชที่ไม่ถูกเผา" value={kg(savedKg)} sub={`${jobs.length} ครั้งที่แปรรูป`} />
          <Stat label="ลดฝุ่น PM2.5 (ประมาณ)" value={`${(sum((j) => j.pm25g) / 1000).toFixed(1)} กก.`} sub="ค่าประมาณ ต้องอ้างอิงงานวิจัย" />
          <Stat label="รายได้ที่จ่ายให้เกษตรกร" value={thb(paid)} sub={`${farmers} ครัวเรือน`} />
          <Stat label="ผลผลิตรวม" value={kg(sum((j) => j.outputKg))} sub="สับ + อัดเม็ด + อัดแท่ง" />
        </div>

        <div className="grid2">
          <div className="card">
            <h3>ผลผลิตแยกตามโหมด</h3>
            <Bars data={byMode} unit="กก." />
          </div>
          <div className="card">
            <h3>หมู่บ้านที่ลดการเผามากที่สุด</h3>
            <Bars data={villages} unit="กก." />
          </div>
        </div>

        <div className="grid2">
          <div className="card">
            <h3>สถานะตู้ RMP-01</h3>
            <p>
              ชั่วโมงทำงานตั้งแต่บำรุงรักษาล่าสุด <b>{hours.toFixed(1)}</b> / {SERVICE_HOURS} ชม.
            </p>
            <div className={`meter ${due ? 'due' : ''}`}>
              <i style={{ width: `${Math.min(100, (hours / SERVICE_HOURS) * 100)}%` }} />
            </div>
            <p className="hint">{due ? '⚠️ ใกล้ถึงรอบตรวจใบมีดสับ / ลูกกลิ้ง / แม่พิมพ์ (สึกจากซิลิกาในเศษพืช)' : 'ปกติ'}</p>
            <button className="btn" onClick={notifyTech}>
              🔧 แจ้งช่างผ่าน LINE
            </button>
            {note && <p className="hint">{note}</p>}
          </div>
          <div className="card">
            <h3>คิววันนี้</h3>
            {queue.length ? (
              <ul className="list">
                {queue.map((l) => (
                  <li key={l.id}>
                    <b>{new Date(l.slot).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</b> {l.id} · {l.name} · {RESIDUES[l.residue]} {kg(l.estKg)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">ยังไม่มีคิววันนี้{server.persistent ? '' : ' (ยังไม่ได้เชื่อมฐานข้อมูล คิวจะไม่แชร์ข้ามเครื่อง)'}</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3>รายการแปรรูปล่าสุด</h3>
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>ล็อต</th>
                  <th>เกษตรกร</th>
                  <th>โหมด</th>
                  <th>ก่อน → หลัง</th>
                  <th>ประเภท</th>
                  <th>ยอดเงิน</th>
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
                      {MODES[j.mode].th}
                      {j.pelletType && <small> · {PELLET_TYPES[j.pelletType].split(' ')[0]}</small>}
                    </td>
                    <td>
                      {j.inputKg} → {j.outputKg}
                    </td>
                    <td>{PURPOSES[j.purpose].split(' ')[0]}</td>
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
