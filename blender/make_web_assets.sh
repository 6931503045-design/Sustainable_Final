#!/usr/bin/env bash
# คัดลอกผลลัพธ์จาก Blender ไปให้เว็บใช้ (รันหลัง build_model.py --render)
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p ../web/public/model ../web/public/img
cp output/rai_mai_phao.glb ../web/public/model/
for m in chop pellet briquette; do cp "output/receipt-$m.jpg" "../web/public/img/receipt-$m.jpg"; done
cp output/render_front.png ../web/public/img/render-front.png
echo "copied assets to web/public"
