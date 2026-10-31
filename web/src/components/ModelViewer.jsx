import { useEffect, useRef, useState } from 'react';
import '@google/model-viewer';
import HS from '../data/hotspots.json';
import { FLOW_STEPS, PARTS } from '../data/parts.js';
import { MODES } from '../../shared/rules.js';
import { useT } from '../lib/i18n.jsx';

// วัสดุของผนังตู้ (ตั้งชื่อไว้ใน blender/build_model.py) ที่จะค่อย ๆ โปร่งใสเมื่อเลื่อน X-ray
const XRAY_MATERIALS = ['ShellGreen', 'DoorWhite', 'PanelDark', 'Glass', 'DoorLabel', 'WarningSticker'];
const MIN_ALPHA = 0.12;
const MODE_PART = { pellet: 'pellet', briquette: 'press', chop: 'chute' };
const PART_IDS = Object.keys(PARTS);
const STEP_MS = 5000;

const smooth = (k) => k * k * (3 - 2 * k); // ใกล้เคียง ease in-out ของ keyframe ใน Blender
const vec = (p) => `${p[0]}m ${p[1]}m ${p[2]}m`;
const add = (a, b, k = 1) => a.map((v, i) => v + b[i] * k);
const partPos = (id, explode) => add(HS.hotspots[id].pos, HS.hotspots[id].explode, smooth(explode));

function segment(name, mode) {
  const f = HS.flow;
  return { feed: f.common.slice(0, 3), mill: f.common.slice(2, 5), divert: [f.common[4], f[mode][0]], process: f[mode] }[name] || null;
}

/** ตำแหน่งบนเส้นทาง (polyline) ที่สัดส่วน k (0..1) */
function along(points, k) {
  const lens = points.slice(1).map((p, i) => Math.hypot(...p.map((v, j) => v - points[i][j])));
  let d = k * lens.reduce((s, x) => s + x, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) return add(points[i], points[i + 1].map((v, j) => v - points[i][j]), Math.min(1, d / lens[i]));
    d -= lens[i];
  }
  return points.at(-1);
}

// โมเดล 3D จาก Blender: จุดชี้ชิ้นส่วน (คืออะไร/ทำอะไร/มีไว้ทำไม) + flow การทำงาน + X-ray + แยกชิ้น
export default function ModelViewer({ tall = false }) {
  const t = useT();
  const ref = useRef(null);
  const walls = useRef([]);
  const anim = useRef(0);
  const dotAnim = useRef(0);
  const [ready, setReady] = useState(false);
  const [xray, setXray] = useState(0);
  const [explode, setExplode] = useState(0);
  const [duration, setDuration] = useState(0);
  const [labels, setLabels] = useState(false); // เริ่มแค่ตัวเลข ชื่อขึ้นเมื่อชี้/กด หรือเปิดปุ่ม "ชื่อชิ้นส่วน"
  const [selected, setSelected] = useState(null);
  const [flow, setFlow] = useState(null); // { step, mode, playing }

  // ---------------- โหลดโมเดล
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onLoad = () => {
      // ต้องเลือก animation แล้วสั่ง play ก่อนหนึ่งครั้ง model-viewer ถึงจะรู้ความยาว (duration) ให้เลื่อนได้
      el.animationName = el.availableAnimations[0];
      el.play();
      el.pause();
      el.currentTime = 0;
      setDuration(el.duration || 0);
      walls.current = (el.model?.materials || [])
        .filter((m) => XRAY_MATERIALS.includes(m.name))
        .map((m) => ({ m, color: [...m.pbrMetallicRoughness.baseColorFactor] }));
      setReady(true);
    };
    el.addEventListener('load', onLoad);
    return () => {
      el.removeEventListener('load', onLoad);
      cancelAnimationFrame(anim.current);
      cancelAnimationFrame(dotAnim.current);
    };
  }, []);

  // ---------------- แยกชิ้น: เลื่อน animation + ขยับจุดชี้ตามชิ้นส่วน + ถอยกล้อง
  useEffect(() => {
    const el = ref.current;
    if (!el || !duration) return;
    el.currentTime = Math.min(explode, 0.999) * duration; // เวลาเท่ากับ duration พอดีจะวนกลับไปเฟรมแรก
    for (const id of PART_IDS) el.updateHotspot({ name: `hotspot-${id}`, position: vec(partPos(id, explode)) });
    if (!flow && !selected) {
      const { theta, phi } = el.getCameraOrbit();
      el.cameraOrbit = `${theta}rad ${phi}rad ${100 + 75 * explode}%`; // ถอยกล้องออกให้เห็นชิ้นส่วนที่แยกครบ
    }
  }, [explode, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------- X-ray: ผนังตู้โปร่งใสตามค่า
  useEffect(() => {
    const alpha = 1 - (1 - MIN_ALPHA) * xray;
    for (const { m, color } of walls.current) {
      m.setAlphaMode(xray > 0 ? 'BLEND' : 'OPAQUE');
      m.pbrMetallicRoughness.setBaseColorFactor([color[0], color[1], color[2], color[3] * alpha]);
    }
  }, [xray, ready]);

  function animateXray(to, ms = 1200) {
    cancelAnimationFrame(anim.current);
    const from = xray;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      setXray(from + (to - from) * smooth(k));
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }

  function focusOn(pos, radius = '3.1m') {
    const el = ref.current;
    if (!el) return;
    const { theta, phi } = el.getCameraOrbit();
    el.cameraTarget = vec(pos);
    el.cameraOrbit = `${theta}rad ${phi}rad ${radius}`;
  }

  function resetCamera() {
    const el = ref.current;
    if (!el) return;
    el.cameraTarget = 'auto auto auto';
    el.cameraOrbit = '-35deg 75deg auto';
  }

  // ---------------- กดจุดชี้ชิ้นส่วน
  function pick(id) {
    if (flow) return;
    setSelected(id);
    if (xray < 0.6) animateXray(0.85);
    focusOn(partPos(id, explode), '2.8m');
  }

  function closePart() {
    setSelected(null);
    resetCamera();
  }

  // ---------------- flow การทำงาน
  function startFlow() {
    setSelected(null);
    setExplode(0);
    animateXray(0.88);
    setFlow({ step: 0, mode: 'pellet', playing: true });
  }

  function stopFlow() {
    cancelAnimationFrame(dotAnim.current);
    setFlow(null);
    animateXray(0);
    resetCamera();
  }

  const step = flow ? FLOW_STEPS[flow.step] : null;
  const focusId = step ? (step.focus === 'mode' ? MODE_PART[flow.mode] : step.focus) : selected;

  // กล้องหันไปชิ้นส่วนของขั้นตอน + จุดวัตถุดิบวิ่งตามเส้นทาง
  useEffect(() => {
    const el = ref.current;
    cancelAnimationFrame(dotAnim.current);
    if (!flow || !el || !ready) return;
    if (focusId) focusOn(HS.hotspots[focusId].pos);
    const pts = step.path ? segment(step.path, flow.mode) : null;
    const rest = step.id === 'scan' ? null : step.path ? pts.at(-1) : HS.flow[flow.mode].at(-1);
    const t0 = performance.now();
    const tick = (now) => {
      const k = ((now - t0) % 2600) / 2200;
      const p = pts ? along(pts, Math.min(1, k)) : rest;
      if (p) el.updateHotspot({ name: 'hotspot-flowdot', position: vec(p) });
      if (pts) dotAnim.current = requestAnimationFrame(tick);
    };
    dotAnim.current = requestAnimationFrame(tick);
  }, [flow?.step, flow?.mode, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // เล่นอัตโนมัติทีละขั้น
  useEffect(() => {
    if (!flow?.playing) return;
    const timer = setTimeout(() => {
      setFlow((f) => (f && f.step < FLOW_STEPS.length - 1 ? { ...f, step: f.step + 1 } : f && { ...f, playing: false }));
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [flow?.step, flow?.playing]);

  const go = (d) => setFlow((f) => ({ ...f, playing: false, step: Math.max(0, Math.min(FLOW_STEPS.length - 1, f.step + d)) }));
  const part = selected && PARTS[selected];

  return (
    <div className={`viewer ${tall ? 'tall' : ''}`}>
      <model-viewer
        ref={ref}
        src="/model/rai_mai_phao.glb"
        alt={t('โมเดล 3 มิติ ตู้แปรรูปเศษวัสดุเกษตร ไร่ไม่เผา', '3D model of the Rai Mai Phao crop-residue processor')}
        camera-controls
        touch-action="pan-y"
        auto-rotate={!flow && !selected ? true : undefined}
        interpolation-decay="120"
        shadow-intensity="1"
        exposure="1.05"
        camera-orbit="-35deg 75deg auto"
        max-camera-orbit="auto auto 250%"
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        {PART_IDS.map((id, i) => (
          <button
            key={id}
            slot={`hotspot-${id}`}
            className={`hs ${focusId === id ? 'active' : ''} ${labels && !flow ? 'labelled' : ''}`}
            data-position={vec(HS.hotspots[id].pos)}
            data-normal="0 0 1"
            onClick={() => pick(id)}
            aria-label={t(...PARTS[id].name)}
          >
            <span className="hs-dot">{i + 1}</span>
            <span className="hs-label">{t(...PARTS[id].name)}</span>
          </button>
        ))}
        {flow && <div slot="hotspot-flowdot" className="flow-dot" data-position={vec(HS.flow.common[0])} data-normal="0 0 1" style={{ '--c': MODES[flow.mode].color }} />}
      </model-viewer>

      <div className="viewer-top">
        {!flow ? (
          <>
            <button type="button" className="chip" onClick={startFlow} disabled={!ready}>
              ▶ {t('ดู flow การทำงาน', 'Show workflow')}
            </button>
            <button type="button" className={`chip ${labels ? 'on' : ''}`} onClick={() => setLabels(!labels)}>
              🏷️ {t('ชื่อชิ้นส่วน', 'Part names')}
            </button>
          </>
        ) : (
          <button type="button" className="chip" onClick={stopFlow}>
            ✕ {t('ออกจาก flow', 'Exit workflow')}
          </button>
        )}
      </div>

      {part && !flow && (
        <div className="viewer-card">
          <button type="button" className="close" onClick={closePart} aria-label={t('ปิด', 'Close')}>
            ✕
          </button>
          <small className="hint">
            {PART_IDS.indexOf(selected) + 1} · {part.zone === 'back' ? t('ด้านหลังตู้', 'Rear of cabinet') : `${t('ระดับ', 'Height')} ${part.zone} ${t('ซม.', 'cm')}`}
          </small>
          <h3>{t(...part.name)}</h3>
          <p>
            <b>{t('ทำอะไร', 'What it does')}:</b> {t(...part.what)}
          </p>
          <p>
            <b>{t('มีไว้ทำไม', 'Why it’s there')}:</b> {t(...part.why)}
          </p>
        </div>
      )}

      {flow && (
        <div className="viewer-card flow-card">
          <h3>{t(...step.title)}</h3>
          <p>{step.id === 'process' ? `${MODES[flow.mode].code} · ${t.pick(MODES[flow.mode])}: ${t(...PARTS[MODE_PART[flow.mode]].what)}` : t(...step.text)}</p>
          <div className="flow-dots">
            {FLOW_STEPS.map((s, i) => (
              <i key={s.id} className={i === flow.step ? 'on' : i < flow.step ? 'done' : ''} onClick={() => setFlow({ ...flow, step: i, playing: false })} />
            ))}
          </div>
        </div>
      )}

      {flow ? (
        <div className="viewer-controls flow-controls">
          <div className="mode-chips">
            {Object.values(MODES).map((m) => (
              <button key={m.key} type="button" className={flow.mode === m.key ? 'on' : ''} style={{ '--c': m.color }} onClick={() => setFlow({ ...flow, mode: m.key })}>
                {m.code} {t.pick(m)}
              </button>
            ))}
          </div>
          <div className="row">
            <button type="button" className="btn" onClick={() => go(-1)} disabled={flow.step === 0} aria-label={t('ก่อนหน้า', 'Previous')}>
              ◀
            </button>
            <button type="button" className="btn primary" onClick={() => setFlow({ ...flow, playing: !flow.playing, step: !flow.playing && flow.step === FLOW_STEPS.length - 1 ? 0 : flow.step })}>
              {flow.playing ? `⏸ ${t('หยุด', 'Pause')}` : `▶ ${t('เล่น', 'Play')}`}
            </button>
            <button type="button" className="btn" onClick={() => go(1)} disabled={flow.step === FLOW_STEPS.length - 1} aria-label={t('ถัดไป', 'Next')}>
              ▶
            </button>
          </div>
        </div>
      ) : (
        <div className="viewer-controls">
          <button type="button" className="btn primary xray-btn" onClick={() => animateXray(xray < 0.5 ? 1 : 0)} disabled={!ready}>
            {xray < 0.5 ? '🔍 X-ray' : `🧱 ${t('ทึบ', 'Solid')}`}
          </button>
          <label className="explode">
            <span>{t('ทึบ', 'Solid')}</span>
            <input type="range" min="0" max="1" step="0.01" value={xray} onChange={(e) => setXray(Number(e.target.value))} disabled={!ready} aria-label={t('ความโปร่งใสของผนังตู้', 'Wall transparency')} />
            <span>X-ray</span>
          </label>
          <label className="explode">
            <span>{t('ประกอบ', 'Assembled')}</span>
            <input type="range" min="0" max="1" step="0.01" value={explode} onChange={(e) => setExplode(Number(e.target.value))} disabled={!duration} aria-label={t('แยกชิ้นส่วน', 'Exploded view')} />
            <span>{t('แยกชิ้น', 'Exploded')}</span>
          </label>
        </div>
      )}
    </div>
  );
}
