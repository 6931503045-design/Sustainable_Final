# โมเดล 3D ตู้ "ไร่ไม่เผา"

ตู้ทั้งตู้สร้างจากสคริปต์ Python (`build_model.py`) เลยแก้ขนาดหรือตำแหน่งได้จากตัวเลข แล้วรันใหม่ทุกครั้ง

| ไฟล์ | คืออะไร |
|---|---|
| `rai_mai_phao.blend` | ไฟล์ Blender (5.2) พร้อม collection แยกชิ้นส่วน กล้อง 4 มุม ไฟ และ animation แยกชิ้น (frame 1 → 60) |
| `output/render_front.png` | ภาพด้านหน้า (พื้นหลังโปร่งใส เอาไปวางบนโปสเตอร์ได้เลย) |
| `output/render_back.png` | ภาพด้านหลัง (พัดลมดูดฝุ่น ถุงฝุ่น ตู้ไฟ) |
| `output/render_cutaway.png` / `_labeled.png` | ภาพตัดให้เห็นภายใน / แบบมีป้ายชื่อภาษาไทย |
| `output/render_exploded.png` / `_labeled.png` | ภาพแยกชิ้นส่วน / แบบมีป้ายชื่อ |
| `output/render_xray.png` / `_labeled.png` | ตู้กระจกมองทะลุเห็นกลไก (โครงเหล็ก + แผงโปร่ง) / แบบมีป้ายชื่อ |
| `output/render_dims_labeled.png` | ภาพบอกขนาด 85 × 180 × 60 ซม. + แถบระดับความสูง 0–30 / 30–85 / 85–100 / 100–140 / 140–180 ซม. |
| `output/render_hero.png` | ตู้ + มือถือโชว์ใบรับของ LINE (ตัวเลขคำนวณจากกติกาเดียวกับระบบจริง) |
| `output/render_phone.png` | มือถือ 3D อย่างเดียว (พื้นหลังโปร่งใส) |
| `output/receipt-*.jpg` | ภาพสินค้าในถาด ใช้เป็นรูปในใบรับของ LINE |
| `output/rai_mai_phao.glb` | โมเดลสำหรับเว็บ (หมุนดูบนมือถือได้) |

## เปิดใน Blender
รหัสโหมดบนถาด: **A อัดเม็ด (เขียว) · B อัดแท่ง (ส้ม) · C สับ (ฟ้า)** ซ้าย→ขวา = A · C · B

เปิด `rai_mai_phao.blend` แล้วดู Outliner ซึ่งแบ่ง collection ตามระบบ: `Feed` (ช่องป้อน), `HammerMill` (เครื่องสับ), `Diverter` (ลิ้นสลับทาง), `PelletMill`, `StraightChute`, `ScrewPress`, `Trays`, `Rear`, `FrontPanels`, `Controls`, `Shell`
- เลื่อน timeline ไป frame 60 เพื่อดูแบบแยกชิ้น
- ซ่อน `FrontPanels` + `Controls` เพื่อดูภายใน
- กล้อง: `CAM_Front`, `CAM_Cutaway`, `CAM_Back`, `CAM_Exploded`, `CAM_Xray`, `CAM_dim_front`/`CAM_dim_side` (orthographic), `CAM_Phone`
- collection `Props` = มือถือ (ปิด render ไว้ วางห่างตู้ที่ x = 4 ม.)

## แก้แล้วสร้างใหม่
ค่าคงที่หลักอยู่ต้นไฟล์ `build_model.py` (`W, D, H` = กว้าง ลึก สูง หน่วยเมตร) ส่วนประกอบแต่ละชิ้นแยกหัวข้อตามชั้นความสูงในสเปก

```bash
# ต้องมี Blender 5.2 (หรือ pip install bpy) และ Node.js + Playwright สำหรับป้ายภาษาไทย
npm install                                   # ฟอนต์ Prompt สำหรับทำป้าย
./render_all.sh                               # ทำทุกขั้นด้านล่างในคำสั่งเดียว (~30–40 นาที)
# หรือทีละขั้น:
node textures/make_textures.mjs               # สร้างป้าย/หน้าจอภาษาไทย (textures/*.png)
blender -b -P build_model.py -- --render      # สร้างโมเดล + render + export (หรือ: python build_model.py --render)
node textures/annotate.mjs                    # ใส่ป้ายชื่อชิ้นส่วนบนภาพ cutaway / exploded / xray
node textures/compose.mjs                     # ภาพบอกขนาด + ภาพตู้คู่มือถือ
./make_web_assets.sh                          # คัดลอก .glb และรูปไปที่ web/public
```
- `--quick` = render เร็ว ความละเอียดต่ำ (ใช้ทดสอบ)
- `--only xray,dims` = render เฉพาะบางภาพ (front back xray dims phone cutaway trays exploded)
- สี/รหัสโหมดและตัวเลขบนจอมือถือดึงจาก `web/shared/rules.js` จึงตรงกับเว็บเสมอ
- เปิดสคริปต์ใน Blender (Scripting → Run Script) จะสร้างโมเดลอย่างเดียวโดยไม่ render

ป้ายภาษาไทยทำเป็นรูปจาก HTML เพราะ Blender วางสระและวรรณยุกต์ไทยไม่ถูกต้อง

> ⚠️ ขนาดมอเตอร์ กำลังการผลิต และรายละเอียดกลไกเป็นค่าประมาณสำหรับนำเสนอแนวคิด ไม่ใช่แบบวิศวกรรมสำหรับผลิตจริง
