import { useEffect, useRef, useState } from 'react';
import '@google/model-viewer';

// โมเดล 3D จาก Blender (blender/output/rai_mai_phao.glb) — เลื่อนแถบเพื่อดูแบบแยกชิ้นส่วน
export default function ModelViewer() {
  const ref = useRef(null);
  const [t, setT] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onLoad = () => {
      el.pause();
      setDuration(el.duration || 0);
      el.currentTime = 0;
    };
    el.addEventListener('load', onLoad);
    return () => el.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    if (ref.current && duration) ref.current.currentTime = t * duration;
  }, [t, duration]);

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
      <label className="explode">
        <span>ประกอบ</span>
        <input type="range" min="0" max="1" step="0.01" value={t} onChange={(e) => setT(Number(e.target.value))} disabled={!duration} />
        <span>แยกชิ้นส่วน</span>
      </label>
    </div>
  );
}
