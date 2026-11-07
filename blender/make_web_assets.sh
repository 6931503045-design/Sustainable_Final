#!/usr/bin/env bash
# คัดลอกผลลัพธ์จาก Blender ไปให้เว็บใช้ (รันหลัง build_model.py --render)
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p ../web/public/model ../web/public/img
# โมเดลสำหรับเว็บ: บีบอัด (Draco + WebP) และตั้งชื่อตาม hash → web/public/model + web/src/data/model-asset.json
(cd ../web && npm run model:optimize)
mkdir -p ../web/src/data && cp output/hotspots.json ../web/src/data/hotspots.json
for m in chop pellet briquette; do cp "output/receipt-$m.jpg" "../web/public/img/receipt-$m.jpg"; done
cp output/render_front.png ../web/public/img/render-front.png
cp output/render_hero.png ../web/public/img/render-hero.png
echo "copied assets to web/public"
