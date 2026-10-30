import { useEffect, useRef, useState } from 'react';
import '@google/model-viewer';

// วัสดุของผนังตู้ (ตั้งชื่อไว้ใน blender/build_model.py) ที่จะค่อย ๆ โปร่งใสเมื่อเลื่อน X-ray
const XRAY_MATERIALS = ['ShellGreen', 'DoorWhite', 'PanelDark', 'Glass', 'DoorLabel', 'WarningSticker'];
const MIN_ALPHA = 0.12;

// โมเดล 3D จาก Blender (blender/output/rai_mai_phao.glb): แถบ X-ray + แถบแยกชิ้นส่วน
export default function ModelViewer() {
  const ref = useRef(null);
  const walls = useRef([]);
  const anim = useRef(0);
  const [ready, setReady] = useState(false);
  const [xray, setXray] = useState(0);
  const [explode, setExplode] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onLoad = () => {
      el.pause();
      setDuration(el.duration || 0);
      el.currentTime = 0;
      walls.current = (el.model?.materials || [])
        .filter((m) => XRAY_MATERIALS.includes(m.name))
        .map((m) => ({ m, color: [...m.pbrMetallicRoughness.baseColorFactor] }));
      setReady(true);
    };
    el.addEventListener('load', onLoad);
    return () => {
      el.removeEventListener('load', onLoad);
      cancelAnimationFrame(anim.current);
    };
  }, []);

  useEffect(() => {
    if (ref.current && duration) ref.current.currentTime = explode * duration;
  }, [explode, duration]);

  useEffect(() => {
    const alpha = 1 - (1 - MIN_ALPHA) * xray;
    for (const { m, color } of walls.current) {
      m.setAlphaMode(xray > 0 ? 'BLEND' : 'OPAQUE');
      m.pbrMetallicRoughness.setBaseColorFactor([color[0], color[1], color[2], color[3] * alpha]);
    }
  }, [xray, ready]);

  /** ปุ่มเล่น: ค่อย ๆ เปลี่ยนไปเป็น X-ray (หรือกลับเป็นทึบ) ใน ~1.5 วินาที */
  function playXray() {
    cancelAnimationFrame(anim.current);
    const from = xray;
    const to = xray < 0.5 ? 1 : 0;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 1500);
      const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      setXray(from + (to - from) * eased);
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }

  return (
    <div className="viewer">
      <model-viewer
        ref={ref}
        src="/model/rai_mai_phao.glb"
        alt="โมเดล 3 มิติ ตู้แปรรูปเศษวัสดุเกษตร ไร่ไม่เผา"
        camera-controls
        touch-action="pan-y"
        auto-rotate
        shadow-intensity="1"
        exposure="1.05"
        camera-orbit="-35deg 75deg auto"
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      />
      <div className="viewer-controls">
        <button type="button" className="btn primary xray-btn" onClick={playXray} disabled={!ready}>
          {xray < 0.5 ? '🔍 X-ray' : '🧱 ทึบ'}
        </button>
        <label className="explode">
          <span>ทึบ</span>
          <input type="range" min="0" max="1" step="0.01" value={xray} onChange={(e) => setXray(Number(e.target.value))} disabled={!ready} aria-label="ความโปร่งใสของผนังตู้" />
          <span>X-ray</span>
        </label>
        <label className="explode">
          <span>ประกอบ</span>
          <input type="range" min="0" max="1" step="0.01" value={explode} onChange={(e) => setExplode(Number(e.target.value))} disabled={!duration} aria-label="แยกชิ้นส่วน" />
          <span>แยกชิ้น</span>
        </label>
      </div>
    </div>
  );
}
