# โมเดล 3D ตู้ "ไร่ไม่เผา"

ตู้ทั้งตู้สร้างจากสคริปต์ Python (`build_model.py`) เลยแก้ขนาดหรือตำแหน่งได้จากตัวเลข แล้วรันใหม่ทุกครั้ง

| ไฟล์ | คืออะไร |
|---|---|
| `rai_mai_phao.blend` | ไฟล์ Blender (5.2) พร้อม collection แยกชิ้นส่วน กล้อง 4 มุม ไฟ และ animation แยกชิ้น (frame 1 → 60) |
| `output/render_front.png` | ภาพด้านหน้า (พื้นหลังโปร่งใส เอาไปวางบนโปสเตอร์ได้เลย) |
| `output/render_back.png` | ภาพด้านหลัง (พัดลมดูดฝุ่น ถุงฝุ่น ตู้ไฟ) |
| `output/render_cutaway.png` / `_labeled.png` | ภาพตัดให้เห็นภายใน / แบบมีป้ายชื่อภาษาไทย |
| `output/render_exploded.png` / `_labeled.png` | ภาพแยกชิ้นส่วน / แบบมีป้ายชื่อ |
| `output/receipt-*.jpg` | ภาพสินค้าในถาด ใช้เป็นรูปในใบรับของ LINE |
| `output/rai_mai_phao.glb` | โมเดลสำหรับเว็บ (หมุนดูบนมือถือได้) |

## เปิดใน Blender
เปิด `rai_mai_phao.blend` แล้วดู Outliner ซึ่งแบ่ง collection ตามระบบ: `Feed` (ช่องป้อน), `HammerMill` (เครื่องสับ), `Diverter` (ลิ้นสลับทาง), `PelletMill`, `StraightChute`, `ScrewPress`, `Trays`, `Rear`, `FrontPanels`, `Controls`, `Shell`
- เลื่อน timeline ไป frame 60 เพื่อดูแบบแยกชิ้น
- ซ่อน `FrontPanels` + `Controls` เพื่อดูภายใน
- กล้อง: `CAM_Front`, `CAM_Cutaway`, `CAM_Back`, `CAM_Exploded`

## แก้แล้วสร้างใหม่
ค่าคงที่หลักอยู่ต้นไฟล์ `build_model.py` (`W, D, H` = กว้าง ลึก สูง หน่วยเมตร) ส่วนประกอบแต่ละชิ้นแยกหัวข้อตามชั้นความสูงในสเปก

```bash
# ต้องมี Blender 5.2 (หรือ pip install bpy) และ Node.js + Playwright สำหรับป้ายภาษาไทย
npm install                                   # ฟอนต์ Prompt สำหรับทำป้าย
node textures/make_textures.mjs               # สร้างป้าย/หน้าจอภาษาไทย (textures/*.png)
blender -b -P build_model.py -- --render      # สร้างโมเดล + render + export (หรือ: python build_model.py --render)
node textures/annotate.mjs                    # ใส่ป้ายชื่อชิ้นส่วนบนภาพ cutaway / exploded
./make_web_assets.sh                          # คัดลอก .glb และรูปไปที่ web/public
```
- `--quick` = render เร็ว ความละเอียดต่ำ (ใช้ทดสอบ)
- เปิดสคริปต์ใน Blender (Scripting → Run Script) จะสร้างโมเดลอย่างเดียวโดยไม่ render

ป้ายภาษาไทยทำเป็นรูปจาก HTML เพราะ Blender วางสระและวรรณยุกต์ไทยไม่ถูกต้อง

> ⚠️ ขนาดมอเตอร์ กำลังการผลิต และรายละเอียดกลไกเป็นค่าประมาณสำหรับนำเสนอแนวคิด ไม่ใช่แบบวิศวกรรมสำหรับผลิตจริง
