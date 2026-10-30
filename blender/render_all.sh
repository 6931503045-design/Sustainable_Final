#!/usr/bin/env bash
# สร้างทุกอย่างใหม่ตั้งแต่ป้ายจนถึงไฟล์สำหรับเว็บ (ใช้เวลา ~30–40 นาทีบน CPU)
set -euo pipefail
cd "$(dirname "$0")"
node textures/make_textures.mjs
python3 build_model.py --render "$@"     # หรือ: blender -b -P build_model.py -- --render
node textures/make_textures.mjs          # รอบสองเพื่อใช้ภาพสินค้าใหม่บนจอมือถือ
python3 build_model.py --render --only phone "$@"
node textures/annotate.mjs
node textures/compose.mjs
./make_web_assets.sh
