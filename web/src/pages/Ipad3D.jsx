// หน้าสำหรับ iPad ตั้งที่บูธ: โมเดล 3D ของตู้เต็มจอ ให้คนดูหมุน แตะชิ้นส่วน และเล่น flow A/B/C เอง
import { lazy, Suspense } from 'react';
import IpadBar from '../components/IpadBar.jsx';
import { useT } from '../lib/i18n.jsx';

const ModelViewer = lazy(() => import('../components/ModelViewer.jsx'));

export default function Ipad3D() {
  const t = useT();
  return (
    <div className="ipad ipad-3d">
      <IpadBar title={t('ตู้แปรรูป 3 in 1', '3-in-1 processor')} />
      <Suspense fallback={<div className="viewer skeleton">{t.k('model.loading')}</div>}>
        <ModelViewer tall />
      </Suspense>
    </div>
  );
}
