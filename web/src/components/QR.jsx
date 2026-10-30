import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QR({ value, size = 240 }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(value, { width: size * 2, margin: 2, color: { dark: '#1d2b22' } }).then(setSrc);
  }, [value, size]);
  return src ? <img className="qr" src={src} width={size} height={size} alt="QR ของล็อต" /> : <div className="qr" style={{ width: size, height: size }} />;
}
