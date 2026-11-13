import { useEffect, useRef, useState } from 'react';
import '@google/model-viewer';
import ASSET from '../data/model-asset.json';
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
const HS_MIN_GAP = 38; // px: จุดชี้ที่ห่างกันน้อยกว่านี้บนจอจะถูกดันออกจากกัน
// ระยะกล้องตั้งต้น (% ของระยะพอดีโมเดล): ถอยออกนิดให้ตู้ไม่ถูกปุ่มด้านบน/แผงควบคุมด้านล่างบัง (ตู้สูง จึงดูจากความสูงของกรอบ)
const baseZoom = (el) => (el && el.clientHeight < 700 ? 125 : 112);
// เล็งกล้องต่ำกว่ากลางตู้เล็กน้อย ตู้จะขยับขึ้นไปอยู่ในที่ว่าง (แผงควบคุมด้านล่างสูงกว่าปุ่มด้านบน)
const baseTarget = (el) => {
  const c = el.getBoundingBoxCenter();
  return `${c.x}m ${c.y - el.getDimensions().y * 0.14}m ${c.z}m`;
};

// โมเดลบีบอัดด้วย Draco (scripts/optimize-model.mjs) ตัวถอดรหัสเก็บไว้ในเว็บเอง ไม่ต้องโหลดจาก gstatic
// (model-viewer อ่านค่านี้จาก self.ModelViewerElement ตอนสร้าง element ทุกครั้ง)
self.ModelViewerElement = { ...self.ModelViewerElement, dracoDecoderLocation: ASSET.draco };
const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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
export default function ModelViewer({ tall = false, poster = true, onReady, lockScroll = false }) {
  const t = useT();
  const ref = useRef(null);
  const walls = useRef([]);
  const anim = useRef(0);
  const dotAnim = useRef(0);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
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
      el.cameraTarget = baseTarget(el);
      setReady(true);
      onReady?.();
    };
    const onProgress = (e) => setProgress(e.detail.totalProgress);
    const onError = () => setFailed(true);
    el.addEventListener('load', onLoad);
    el.addEventListener('progress', onProgress);
    el.addEventListener('error', onError);
    return () => {
      el.removeEventListener('load', onLoad);
      el.removeEventListener('progress', onProgress);
      el.removeEventListener('error', onError);
      cancelAnimationFrame(anim.current);
      cancelAnimationFrame(dotAnim.current);
    };
  }, []);

  // ---------------- จุดชี้ไม่ซ้อนกัน: หลังกล้องขยับ ดูตำแหน่งบนจอแล้วดันจุดที่ใกล้กันเกินออก (แค่การแสดงผล)
  useEffect(() => {
    const el = ref.current;
    if (!el || !ready) return;
    let raf = 0;
    const spread = () => {
      raf = 0;
      const pts = PART_IDS.map((id, i) => {
        const btn = el.querySelector(`[slot="hotspot-${id}"]`);
        if (!btn || btn.offsetParent === null) return null;
        // ตำแหน่งจริงบนจอ ลบระยะที่เคยดันไว้ออก = ตำแหน่งตั้งต้นของจุด
        const r = btn.querySelector('.hs-dot').getBoundingClientRect();
        const [sx, sy] = (btn.dataset.shift || '0,0').split(',').map(Number);
        return { i, btn, x: r.x + r.width / 2 - sx, y: r.y + r.height / 2 - sy, dx: 0, dy: 0, front: btn.hasAttribute('data-visible') };
      });
      const vis = pts.filter(Boolean);
      // 1) ดันจุดที่ใกล้กันเกินออกจากกัน (ทำซ้ำหลายรอบให้นิ่ง)
      for (let round = 0; round < 6; round++)
        for (let i = 0; i < vis.length; i++)
          for (let j = i + 1; j < vis.length; j++) {
            const a = vis[i];
            const b = vis[j];
            const ddx = b.x + b.dx - (a.x + a.dx);
            const ddy = b.y + b.dy - (a.y + a.dy);
            const d = Math.hypot(ddx, ddy);
            if (d >= HS_MIN_GAP) continue;
            const push = (HS_MIN_GAP - d) / 2;
            const [ux, uy] = d > 0.5 ? [ddx / d, ddy / d] : [0, 1];
            a.dx -= ux * push;
            a.dy -= uy * push;
            b.dx += ux * push;
            b.dy += uy * push;
          }
      // ไม่ดันจุดเข้าไปใต้ปุ่มด้านบน / แผงควบคุมด้านล่าง (กดไม่ได้)
      const box = el.getBoundingClientRect();
      const topBar = el.parentElement.querySelector('.viewer-top')?.getBoundingClientRect();
      const panel = el.parentElement.querySelector('.viewer-controls')?.getBoundingClientRect();
      const minY = (topBar ? topBar.bottom : box.top) + 22;
      const maxY = (panel ? panel.top : box.bottom) - 22;
      const clamp = (v, lo, hi) => (lo > hi ? v : Math.min(hi, Math.max(lo, v)));
      for (const p of vis) {
        const y = p.y + p.dy;
        // ถ้าตำแหน่งจริงอยู่ในที่ว่างอยู่แล้ว อย่าดันออกไปนอกที่ว่าง
        if (p.y >= minY && p.y <= maxY) p.dy = clamp(y, minY, maxY) - p.y;
        p.dx = clamp(p.x + p.dx, box.left + 22, box.right - 22) - p.x;
      }
      for (const p of vis) {
        p.btn.dataset.shift = `${p.dx.toFixed(1)},${p.dy.toFixed(1)}`;
        p.btn.style.setProperty('--hs-shift', `${p.dx.toFixed(1)}px, ${p.dy.toFixed(1)}px`);
      }
      // 2) ชื่อชิ้นส่วนที่จะทับกันซ่อนไว้ก่อน (จุดที่หันหน้าเข้ากล้องได้ที่ก่อน) ชี้/กด/โฟกัสจุดนั้นแล้วชื่อจะขึ้น
      const hit = (r, o) => r.left < o.right + 2 && r.right > o.left - 2 && r.top < o.bottom + 2 && r.bottom > o.top - 2;
      const taken = vis.map((p) => p.btn.querySelector('.hs-dot').getBoundingClientRect());
      for (const p of [...vis].sort((a, b) => b.front - a.front || a.i - b.i)) {
        const label = p.btn.querySelector('.hs-label');
        p.btn.classList.remove('label-hidden');
        const r = label.getBoundingClientRect();
        if (!r.width) continue; // ปิดชื่ออยู่ ไม่ต้องจัด
        const own = taken[vis.indexOf(p)];
        if (taken.some((o) => o !== own && hit(r, o))) p.btn.classList.add('label-hidden');
        else taken.push(r);
      }
    };
    const onCamera = () => {
      if (!raf) raf = requestAnimationFrame(spread);
    };
    el.addEventListener('camera-change', onCamera);
    onCamera();
    return () => {
      el.removeEventListener('camera-change', onCamera);
      cancelAnimationFrame(raf);
    };
  }, [ready, labels, explode, selected, flow?.step]);

  // ---------------- แยกชิ้น: เลื่อน animation + ขยับจุดชี้ตามชิ้นส่วน + ถอยกล้อง
  useEffect(() => {
    const el = ref.current;
    if (!el || !duration) return;
    el.currentTime = Math.min(explode, 0.999) * duration; // เวลาเท่ากับ duration พอดีจะวนกลับไปเฟรมแรก
    for (const id of PART_IDS) el.updateHotspot({ name: `hotspot-${id}`, position: vec(partPos(id, explode)) });
    if (!flow && !selected) {
      const { theta, phi } = el.getCameraOrbit();
      el.cameraOrbit = `${theta}rad ${phi}rad ${baseZoom(el) + 75 * explode}%`; // ถอยกล้องออกให้เห็นชิ้นส่วนที่แยกครบ
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
    el.cameraTarget = baseTarget(el);
    el.cameraOrbit = `-35deg 75deg ${baseZoom(el)}%`;
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
    <div className={`viewer ${tall ? 'tall' : ''} ${ready ? 'is-ready' : ''}`}>
      <model-viewer
        ref={ref}
        src={ASSET.glb}
        alt={t('โมเดล 3 มิติ ตู้แปรรูปเศษวัสดุเกษตร ไร่ไม่เผา', '3D model of the Rai Mai Phao crop-residue processor')}
        camera-controls
        touch-action={lockScroll ? 'none' : 'pan-y'}
        auto-rotate={!flow && !selected && !reducedMotion ? true : undefined}
        interpolation-decay="120"
        shadow-intensity="1"
        exposure="1.05"
        camera-orbit="-35deg 75deg auto"
        max-camera-orbit="auto auto 250%"
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        {/* poster={false}: หน้าแรกวางภาพ poster ไว้ชั้นล่างเอง */}
        <div slot="poster" className={poster ? 'mv-poster' : 'mv-poster-none'}>
          {poster && <img src={ASSET.poster} alt={t.k('model.posterAlt')} width="675" height="900" decoding="async" />}
        </div>
        <div slot="progress-bar" className={`mv-progress-slot ${ready ? 'done' : ''}`}>
          <span className="mv-progress-bar" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
        </div>
        {PART_IDS.map((id, i) => (
          <button
            key={id}
            slot={`hotspot-${id}`}
            // จุดชี้แสดงเมื่อเปิด "ชื่อชิ้นส่วน" (หรือเป็นชิ้นที่กำลังดู) และซ่อนไว้จนโมเดลโหลดเสร็จ
            className={`hs ${focusId === id ? 'active' : ''} ${labels && !flow ? 'labelled' : ''} ${ready && ((labels && !flow) || focusId === id) ? 'shown' : ''}`}
            tabIndex={ready && ((labels && !flow) || focusId === id) ? 0 : -1}
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

      {/* ข้อความกำลังโหลด อยู่นอก model-viewer ตำแหน่งเดียวกับตอนโหลดโค้ด (ไม่กระตุก) */}
      {!ready && (
        <div className="mv-progress" role="status" aria-live="polite">
          <span className="mv-progress-pill">
            {failed ? (
              t.k('model.error')
            ) : (
              <>
                <span className="mv-spinner" aria-hidden="true" />
                {t.k('model.loading')} {Math.round(progress * 100)}%
              </>
            )}
          </span>
        </div>
      )}

      <div className="viewer-top">
        {!flow ? (
          <>
            <button type="button" className="chip" onClick={startFlow} disabled={!ready}>
              ▶ {t('ดู flow การทำงาน', 'Show workflow')}
            </button>
            <button type="button" className={`chip ${labels ? 'on' : ''}`} aria-pressed={labels} onClick={() => setLabels(!labels)} disabled={!ready}>
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
