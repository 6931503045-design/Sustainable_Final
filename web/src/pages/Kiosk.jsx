// หน้าจอสัมผัสหน้าตู้ (จำลองบนแท็บเล็ต): สแกน QR → วัดความชื้น → เลือกโหมด → แปรรูป → ชั่ง → ส่งใบรับของเข้า LINE
import { useEffect, useRef, useState } from 'react';
import { MODES, MOISTURE_MAX, PELLET_TYPES, needsFlush, residueName, round } from '../../shared/rules.js';
import { api, kg, local, thb } from '../lib/client.js';

const MACHINE_ID = 'RMP-01';
// คำสั่งซื้อจำลองจากผู้รับซื้อ (ระบบจริงดึงจากฐานข้อมูลคำสั่งซื้อ)
const ORDERS = [
  { buyer: 'ฟาร์มเห็ดบ้านดู่', mode: 'chop' },
  { buyer: 'สวนลำไยแม่สาย (วัสดุคลุมดิน)', mode: 'chop' },
  { buyer: 'สหกรณ์โคนมแม่จัน', mode: 'pellet', pelletType: 'feed' },
  { buyer: 'โรงอบลำไยเวียงชัย', mode: 'briquette' },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function Scanner({ onToken }) {
  const cb = useRef(onToken);
  cb.current = onToken;
  const [err, setErr] = useState('');
  useEffect(() => {
    let scanner;
    let stopped = false;
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (stopped) return;
      scanner = new Html5Qrcode('qr-reader', { verbose: false });
      scanner
        .start({ facingMode: 'environment' }, { fps: 10, qrbox: 260 }, (text) => {
          stopped = true;
          scanner.stop().catch(() => {});
          cb.current(text);
        })
        .catch(() => setErr('เปิดกล้องไม่ได้ (ต้องอนุญาตกล้อง และเปิดผ่าน https) ใช้ปุ่มล็อตทดลองแทนได้'));
    });
    return () => {
      stopped = true;
      scanner?.isScanning && scanner.stop().catch(() => {});
    };
  }, []);
  return (
    <div className="scanner">
      <div id="qr-reader" />
      {err && <p className="k-err">{err}</p>}
    </div>
  );
}

export default function Kiosk() {
  const [step, setStep] = useState('scan');
  const [lot, setLot] = useState(null);
  const [token, setToken] = useState('');
  const [moisture, setMoisture] = useState(null);
  const [choice, setChoice] = useState({ mode: 'chop', pelletType: 'feed' });
  const [order, setOrder] = useState(null);
  const [stage, setStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const abort = useRef(false);
  const forceWet = useRef(false);

  function reset() {
    setStep('scan');
    setLot(null);
    setToken('');
    setMoisture(null);
    setOrder(null);
    setResult(null);
    setError('');
    setProgress(0);
    forceWet.current = false;
  }

  useEffect(() => {
    if (step !== 'done') return;
    const t = setTimeout(reset, 30000);
    return () => clearTimeout(t);
  }, [step]);

  async function loadToken(t) {
    setError('');
    try {
      const out = await api('scan', { method: 'POST', data: { token: t } });
      setToken(t);
      setLot(out.lot);
      setStep('measure');
      await sleep(1600); // จำลองเซนเซอร์ความชื้นที่ช่องป้อน
      const m = forceWet.current ? round(22 + Math.random() * 6) : round(10 + Math.random() * 7);
      setMoisture(m);
      if (m > MOISTURE_MAX) return setStep('wet');
      if (out.lot.purpose === 'sell') {
        const o = ORDERS[Math.floor(Math.random() * ORDERS.length)];
        setOrder(o);
        setChoice({ mode: o.mode, pelletType: o.pelletType || 'feed' });
      } else {
        setChoice({ mode: out.lot.wantMode || 'chop', pelletType: 'feed' });
      }
      setStep('mode');
    } catch (e) {
      setError(e.message);
      setStep('scan');
    }
  }

  async function demoLot(wet = false) {
    forceWet.current = wet;
    try {
      const purpose = Math.random() < 0.6 ? 'sell' : 'self';
      const out = await api('lots', {
        method: 'POST',
        data: { demo: true, name: 'ผู้เยี่ยมชม บูธ', residue: 'corn', estKg: 50 + Math.round(Math.random() * 100), village: 'บูธนิทรรศการ', purpose, wantMode: 'pellet', consentAt: new Date().toISOString() },
      });
      loadToken(out.token);
    } catch (e) {
      setError(e.message);
    }
  }

  function start() {
    const last = local.get('kiosk:last');
    if (needsFlush(last, choice)) setStep('flush');
    else run();
  }

  async function run() {
    abort.current = false;
    setStep('run');
    const m = MODES[choice.mode];
    const stages = [
      ['📸 ถ่ายรูปวัตถุดิบ', 900],
      ...(choice.mode === 'briquette' ? [['🔥 อุ่นขดลวดเกลียวอัด (จริง 10–15 นาที · เร่งเวลา)', 2400]] : []),
      ['⚙️ เครื่องสับกำลังทำงาน', 2200],
      [`↪️ ลิ้นสลับทาง → ${m.code} ${m.th}`, 900],
      ...(choice.mode === 'chop' ? [] : [[choice.mode === 'pellet' ? '🟤 แม่พิมพ์อัดเม็ด' : '🪵 เกลียวอัดแท่ง + ตัดท่อน', 2600]]),
      ['⚖️ ชั่งน้ำหนักสินค้า', 1100],
    ];
    const total = stages.reduce((s, [, ms]) => s + ms, 0);
    let elapsed = 0;
    for (const [label, ms] of stages) {
      setStage(label);
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        if (abort.current) return;
        await sleep(100);
        setProgress((elapsed + Date.now() - t0) / total);
      }
      elapsed += ms;
    }
    const outputKg = Math.min(lot.receivedKg, round(lot.receivedKg * m.yield * (0.97 + Math.random() * 0.04)));
    setStep('send');
    try {
      const out = await api('receipt', { method: 'POST', data: { token, mode: choice.mode, pelletType: choice.pelletType, moisture, outputKg, machineId: MACHINE_ID } });
      local.set('kiosk:last', { mode: choice.mode, pelletType: choice.pelletType });
      local.set('jobs', [out.job, ...local.get('jobs', [])].slice(0, 200));
      setResult(out);
      setStep('done');
    } catch (e) {
      setError(e.message);
      setStep('error');
    }
  }

  function emergencyStop() {
    abort.current = true;
    setStep('stopped');
  }

  return (
    <div className="kiosk">
      <header>
        <b>🌾 ไร่ไม่เผา</b>
        <span>
          ตู้ {MACHINE_ID} {lot && `· ล็อต ${lot.id} · ${lot.name}`}
        </span>
      </header>

      {step === 'scan' && (
        <section className="k-center">
          <h1>สแกน QR จาก LINE</h1>
          <p>เปิดแชต "ไร่ไม่เผา" แล้วแสดง QR ของล็อตให้กล้อง</p>
          <Scanner onToken={loadToken} />
          {error && <p className="k-err">{error}</p>}
          <div className="k-row">
            <button className="k-btn ghost" onClick={() => demoLot(false)}>
              ใช้ล็อตทดลอง
            </button>
            <button className="k-btn ghost" onClick={() => demoLot(true)}>
              ล็อตทดลอง (เศษพืชชื้น)
            </button>
          </div>
        </section>
      )}

      {lot && ['measure', 'wet', 'mode', 'flush'].includes(step) && (
        <div className="k-stats">
          <div>
            <small>{residueName(lot.residue)} · น้ำหนักรับเข้า{lot.driver && ` · 🛻 ส่งโดย ${lot.driver.name}`}</small>
            <b>{kg(lot.receivedKg)}</b>
          </div>
          <div>
            <small>ความชื้น (ไม่เกิน {MOISTURE_MAX}%)</small>
            <b className={moisture > MOISTURE_MAX ? 'bad' : 'good'}>{moisture == null ? 'กำลังวัด…' : `${moisture}% ${moisture > MOISTURE_MAX ? '✗' : '✓'}`}</b>
          </div>
        </div>
      )}

      {step === 'wet' && (
        <section className="k-center">
          <h1 className="bad">ความชื้นเกิน ไม่รับวัตถุดิบ</h1>
          <p>กรุณานำไปตากให้แห้งที่ลานตากก่อน แล้วสแกน QR เดิมอีกครั้ง</p>
          <button className="k-btn" onClick={reset}>
            ตกลง
          </button>
        </section>
      )}

      {step === 'mode' && (
        <section>
          <h2>{order ? `คำสั่งซื้อ: ${order.buyer} — ระบบเลือกโหมดให้` : 'เลือกโหมดแปรรูป (รับกลับไปใช้เอง)'}</h2>
          <div className="k-modes">
            {Object.values(MODES).map((m) => (
              <button
                key={m.key}
                disabled={Boolean(order) && order.mode !== m.key}
                className={choice.mode === m.key ? 'on' : ''}
                style={{ background: m.color }}
                onClick={() => setChoice({ ...choice, mode: m.key })}
              >
                <i className="k-code">{m.code}</i>
                <b>{m.th}</b>
                <span>{m.products.join(' / ')}</span>
              </button>
            ))}
          </div>
          {choice.mode === 'pellet' && (
            <div className="k-row">
              {Object.entries(PELLET_TYPES).map(([k, v]) => (
                <button key={k} disabled={Boolean(order)} className={`k-btn ${choice.pelletType === k ? '' : 'ghost'}`} onClick={() => setChoice({ ...choice, pelletType: k })}>
                  {v}
                </button>
              ))}
            </div>
          )}
          <div className="k-row">
            <button className="k-btn ghost" onClick={reset}>
              ยกเลิก
            </button>
            <button className="k-btn big" onClick={start}>
              เริ่มแปรรูป ▶
            </button>
          </div>
        </section>
      )}

      {step === 'flush' && (
        <section className="k-center">
          <h1>⚠️ ต้องไล่วัตถุดิบเก่าก่อน</h1>
          <p>งานก่อนหน้าเป็นเชื้อเพลิง แต่งานนี้เป็นอาหารสัตว์ กรุณาเดินเครื่องเปล่าและทำความสะอาดช่องทางให้เรียบร้อย</p>
          <button className="k-btn" onClick={run}>
            พนักงานยืนยัน: ทำความสะอาดแล้ว
          </button>
        </section>
      )}

      {step === 'run' && (
        <section className="k-center">
          <h1>{stage}</h1>
          <div className="k-bar">
            <i style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p>ห้ามเปิดฝาช่องป้อน · เปิดฝา = เครื่องหยุดทันที</p>
        </section>
      )}

      {step === 'send' && (
        <section className="k-center">
          <h1>กำลังส่งใบรับของเข้า LINE…</h1>
        </section>
      )}

      {step === 'done' && result && (
        <section className="k-center">
          <h1>✅ เสร็จเรียบร้อย</h1>
          <div className="k-receipt">
            <div>
              <small>ก่อนแปรรูป</small>
              <b>{kg(result.job.inputKg)}</b>
            </div>
            <div>
              <small>ได้ {MODES[result.job.mode].code} {MODES[result.job.mode].th}</small>
              <b>{kg(result.job.outputKg)}</b>
            </div>
            <div>
              <small>{result.job.amount >= 0 ? 'เกษตรกรได้รับ' : 'ค่าบริการ'}</small>
              <b>{thb(Math.abs(result.job.amount))}</b>
            </div>
          </div>
          {result.job.pickupFee > 0 && (
            <p>
              หักค่ารถ {thb(result.job.pickupFee)} · คนขับ {result.job.driverName} ได้ {thb(result.job.driverEarn)}
            </p>
          )}
          <p className="good">🌱 ลดการเผาได้ {kg(result.job.savedKg)} ≈ PM2.5 {result.job.pm25g} กรัม</p>
          <p>{result.pushed ? 'ส่งใบรับของเข้า LINE ของเจ้าของล็อตแล้ว ✓' : lot.hasLine ? `ส่งเข้า LINE ไม่สำเร็จ ${result.pushError || ''}` : 'ล็อตทดลอง: ไม่ได้ส่งเข้า LINE'}</p>
          <button className="k-btn" onClick={reset}>
            คิวถัดไป
          </button>
        </section>
      )}

      {(step === 'stopped' || step === 'error') && (
        <section className="k-center">
          <h1 className="bad">{step === 'stopped' ? '⛔ หยุดฉุกเฉิน' : 'เกิดข้อผิดพลาด'}</h1>
          <p>{step === 'stopped' ? 'ตัดไฟมอเตอร์ทั้งหมดแล้ว ตรวจสอบความปลอดภัยก่อนรีเซ็ต' : error}</p>
          <button className="k-btn" onClick={reset}>
            รีเซ็ต
          </button>
        </section>
      )}

      <button className="estop" onClick={emergencyStop} aria-label="หยุดฉุกเฉิน">
        หยุด
        <br />
        ฉุกเฉิน
      </button>
    </div>
  );
}
