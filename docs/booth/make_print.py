# สร้างไฟล์ปริ้น A3 สำหรับบอร์ดฟิวเจอร์บอร์ด 50x70 ซม. (พื้นบอร์ดต่อ 4 แผ่น + ชิ้นป๊อปอัพ)
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

SRC = sys.argv[1]          # โฟลเดอร์ที่มี p1..p7.png (export 2923x4134)
RENDER = sys.argv[2]       # render_front_3000x4000_clean.png
OUT = sys.argv[3]

DPI = 150
PXCM = DPI / 2.54                      # 59.06 px/cm ที่ 150 dpi
A3W, A3H = round(29.7 * PXCM), round(42.0 * PXCM)
EXP = 4134 / 1587                       # page px -> export px
BOARD_PXCM = 4134 / 70                  # export px ต่อ ซม. บนบอร์ดจริง (สูง 70 ซม.)
SC = PXCM / BOARD_PXCM                  # export px -> print px (≈1.0)
FONT = ImageFont.truetype('/usr/share/fonts/opentype/tlwg/Loma-Bold.otf', 26)
FONT_S = ImageFont.truetype('/usr/share/fonts/opentype/tlwg/Loma.otf', 22)
GRAY = (150, 150, 150)


def a3(landscape=False):
    return Image.new('RGB', (A3H, A3W) if landscape else (A3W, A3H), 'white')


def crop_marks(d, box, L=40, gap=8):
    x0, y0, x1, y1 = box
    for x in (x0, x1):
        d.line([(x, y0 - gap - L), (x, y0 - gap)], fill='black', width=2)
        d.line([(x, y1 + gap), (x, y1 + gap + L)], fill='black', width=2)
    for y in (y0, y1):
        d.line([(x0 - gap - L, y), (x0 - gap, y)], fill='black', width=2)
        d.line([(x1 + gap, y), (x1 + gap + L, y)], fill='black', width=2)


def label(page, text, sub=''):
    d = ImageDraw.Draw(page)
    d.text((50, 22), text, font=FONT, fill='black')
    if sub:
        d.text((50, page.height - 50), sub, font=FONT_S, fill=(90, 90, 90))
    return d


def scaled(img, s):
    return img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)


pages = []

# ---------- 1) พื้นบอร์ด: หั่นบอร์ดละ 4 แผ่น (2x2) ทับซ้อน 1 ซม. ----------
BASE = {1: 'p7.png', 2: 'p2.png', 3: 'p3.png'}   # บอร์ด 1 ใช้หน้า 7 (ไม่มีแผนที่ เพราะแผนที่เป็นชิ้นป๊อปอัพ)
NAMES = {(0, 0): 'ซ้ายบน', (1, 0): 'ขวาบน', (0, 1): 'ซ้ายล่าง', (1, 1): 'ขวาล่าง'}
OV = round(1.0 * BOARD_PXCM)  # ทับซ้อน 1 ซม.
for b, fn in BASE.items():
    im = Image.open(f'{SRC}/{fn}').convert('RGB')
    W, H = im.size
    mx, my = W // 2, H // 2
    for (cx, cy), nm in NAMES.items():
        x0 = 0 if cx == 0 else mx - OV // 2
        x1 = mx + OV // 2 if cx == 0 else W
        y0 = 0 if cy == 0 else my - OV // 2
        y1 = my + OV // 2 if cy == 0 else H
        tile = scaled(im.crop((x0, y0, x1, y1)), SC)
        pg = a3()
        ox, oy = (A3W - tile.width) // 2, (A3H - tile.height) // 2
        pg.paste(tile, (ox, oy))
        d = label(pg, f'พื้นบอร์ด {b} · แผ่น{nm} ({(cy*2+cx)+1}/4)',
                  'ปริ้นขนาดจริง 100% (Actual size) · ตัดตามเส้นมุม · ขอบที่ต่อกันทับซ้อน 1 ซม.')
        crop_marks(d, (ox, oy, ox + tile.width, oy + tile.height))
        pages.append(pg)

# ---------- 2) แผนที่ป๊อปอัพ (บอร์ด 1) ----------
p1 = Image.open(f'{SRC}/p1.png').convert('RGB')
p5 = np.asarray(Image.open(f'{SRC}/p5.png').convert('RGB')).astype(int)
p6 = np.asarray(Image.open(f'{SRC}/p6.png').convert('RGB')).astype(int)
bg = np.array([0xf3, 0xef, 0xe6])
MH = round(2098.167635587608 * EXP)               # ความสูงภาพแผนที่เต็มใน export px
full = np.zeros((MH, p5.shape[1]), bool)
r5 = round(1350.5446524902677 * EXP)
full[:r5] = (np.abs(p5 - bg).sum(2) > 30)[:r5]
s6 = round(1329.1815557777375 * EXP)
h6 = min(MH - s6, round(768.9860798098701 * EXP))
full[s6:s6 + h6] |= (np.abs(p6 - bg).sum(2) > 30)[:h6]
# วางลงตำแหน่งแผนที่บนบอร์ด 1
L, T = 255.52501705351278 * EXP, 250.81311598787443 * EXP
MW, MHH = round(655.4749829464872 * EXP), round(1225.1868840121256 * EXP)
mimg = Image.fromarray((full * 255).astype('uint8')).resize((MW, MHH), Image.LANCZOS)
mask = Image.new('L', p1.size, 0)
mask.paste(mimg, (round(L), round(T)))
mask = mask.point(lambda v: 255 if v > 100 else 0)
# ปิดรู/ช่องเส้นขอบจังหวัด แล้วขยายขอบเผื่อตัด 2 มม.
small = mask.resize((mask.width // 4, mask.height // 4))
small = small.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
small = small.filter(ImageFilter.MaxFilter(3))
cut = small.resize(mask.size).point(lambda v: 255 if v > 127 else 0)
outline = ImageChops.subtract(cut.filter(ImageFilter.MaxFilter(5)), cut)

piece = Image.new('RGB', p1.size, 'white')
piece.paste(p1, (0, 0), cut)
piece.paste((60, 60, 60), (0, 0), outline)
bbox = cut.getbbox()
split_y = round(T + 3490 / MH * MHH)              # คอคอดกระ (จุดแยกเดียวกับหน้า 5/6)
OV2 = round(1.0 * BOARD_PXCM)
parts = [('ส่วนบน (เหนือ อีสาน กลาง ตะวันออก ตะวันตก)', (bbox[0], bbox[1], bbox[2], split_y + OV2 // 2)),
         ('ส่วนล่าง (ใต้)', (bbox[0], split_y - OV2 // 2, bbox[2], bbox[3]))]
map_sizes = []
for i, (nm, box) in enumerate(parts, 1):
    cr = piece.crop(box)
    # ตัดพื้นขาวรอบ ๆ ให้เหลือแค่ตัวแผนที่
    inv = ImageChops.invert(cr.convert('L')).point(lambda v: 255 if v > 8 else 0)
    cr = cr.crop(inv.getbbox())
    cr = scaled(cr, SC)
    land = cr.width > cr.height and cr.width > A3W - 40
    pg = a3(land)
    ox, oy = (pg.width - cr.width) // 2, (pg.height - cr.height) // 2 + 15
    pg.paste(cr, (ox, oy))
    label(pg, f'ป๊อปอัพ บอร์ด 1 · แผนที่{nm} ({i}/2)',
          'ปริ้น 100% · ตัดตามเส้นเทา · ส่วนบน/ล่างทับกันตรงคอคอดกระ 1 ซม. · ยกด้วยโฟม 5–10 มม.')
    pages.append(pg)
    map_sizes.append((cr.width / PXCM, cr.height / PXCM))

# ---------- 3) ตู้ป๊อปอัพ (บอร์ด 2) จากภาพเรนเดอร์ความละเอียดสูง ----------
r = Image.open(RENDER).convert('RGBA').crop((627, 317, 2389, 3747))
cab_h_cm = 881.362085797926 / 1587 * 70
s = cab_h_cm * PXCM / r.height
r = scaled(r, s)
al = r.split()[3].point(lambda v: 255 if v > 40 else 0)
al_cut = al.filter(ImageFilter.MaxFilter(11))
ol = ImageChops.subtract(al_cut.filter(ImageFilter.MaxFilter(5)), al_cut)
cab = Image.new('RGB', r.size, 'white')
cab.paste(r, (0, 0), r)
cab.paste((60, 60, 60), (0, 0), ol)
pg = a3()
ox, oy = (A3W - cab.width) // 2, (A3H - cab.height) // 2
pg.paste(cab, (ox, oy))
label(pg, 'ป๊อปอัพ บอร์ด 2 · ตู้ไร่ไม่เผา', f'ปริ้น 100% · ตัดตามเส้นเทา · สูง {cab_h_cm:.1f} ซม. ตรงกับตู้บนพื้นบอร์ด · ยกด้วยโฟม 10 มม.')
pages.append(pg)

# ---------- 4) ชิ้นเล็ก: วงกลมวัตถุดิบ/ผลผลิต/ขั้นตอน + รถกระบะ + ป้าย ----------
def circ(img, x, y, size):
    c = img.crop((round(x), round(y), round(x + size), round(y + size)))
    m = Image.new('L', c.size, 0)
    ImageDraw.Draw(m).ellipse((0, 0, c.width - 1, c.height - 1), fill=255)
    out = Image.new('RGB', c.size, 'white')
    out.paste(c, (0, 0), m)
    ImageDraw.Draw(out).ellipse((0, 0, c.width - 1, c.height - 1), outline=(60, 60, 60), width=3)
    return out


def rect(img, box):
    c = img.crop(box).copy()
    ImageDraw.Draw(c).rectangle((0, 0, c.width - 1, c.height - 1), outline=(60, 60, 60), width=3)
    return c

p2 = Image.open(f'{SRC}/p2.png').convert('RGB')
p3 = Image.open(f'{SRC}/p3.png').convert('RGB')
small_pieces = []
D = 196.56420253802747 * EXP
for t in (380.438483533511, 597.4527675492913, 814.4670515650716):
    small_pieces.append(('บอร์ด 2 วัตถุดิบ', circ(p2, 9.64 * EXP, t * EXP, D)))
for t, l in ((462.9228564819617, 769.7722045093832), (679.9371404977419, 770.5730252997091), (896.9514245135222, 770.5730252997089)):
    small_pieces.append(('บอร์ด 2 ผลผลิต', circ(p2, l * EXP, t * EXP, D)))
SD = 89.49523886441389 * EXP
for l in (73.3403421114754, 280.14276606969776, 504.6380049341116, 721.8309970805261, 932.506298603707):
    small_pieces.append(('บอร์ด 2 ขั้นตอน', circ(p2, l * EXP, 1277.8543674347968 * EXP, SD)))

# บอร์ด 3: วงกลมขั้นตอน (วัดจากภาพ: บนสุด y=3082, เส้นผ่าศูนย์กลาง 233)
runs = [300.5, 839, 1423.5, 1989, 2537.5]
for cx in runs:
    small_pieces.append(('บอร์ด 3 ขั้นตอน', circ(p3, cx - SD / 2, 3082, SD)))
small_pieces.append(('บอร์ด 3 รถกระบะ', rect(p3, (680, 2690, 1255, 3150))))
small_pieces.append(('บอร์ด 3 ป้าย', rect(p3, (95, 2365, 1215, 2765))))

# จัดลงหน้า A3 แบบเรียงแถว
pieces = [(n, scaled(im, SC)) for n, im in small_pieces]
pg, d, x, y, rowh, k = None, None, 0, 0, 0, 0
M = 60
def newpage():
    global pg, d, x, y, rowh, k
    k += 1
    pg = a3()
    d = label(pg, f'ป๊อปอัพชิ้นเล็ก ({k})', 'ปริ้น 100% · ตัดตามเส้นเทา · ยกด้วยโฟม 5 มม. วางทับตำแหน่งเดิมบนพื้นบอร์ด')
    pages.append(pg)
    x, y, rowh = M, 80, 0
newpage()
for n, im in pieces:
    if x + im.width > A3W - M:
        x, y, rowh = M, y + rowh + 50, 0
    if y + im.height > A3H - 80:
        newpage()
    pg.paste(im, (x, y))
    d.text((x, y + im.height + 4), n, font=FONT_S, fill=(90, 90, 90))
    x += im.width + 30
    rowh = max(rowh, im.height + 30)

pages[0].save(OUT, save_all=True, append_images=pages[1:], resolution=DPI)
print('pages', len(pages), 'map piece sizes cm', [(round(a, 1), round(b, 1)) for a, b in map_sizes],
      'cab', round(cab.width / PXCM, 1), round(cab_h_cm, 1), 'b3 steps', runs)
for i, p in enumerate(pages):
    p.resize((p.width // 5, p.height // 5)).save(OUT.replace('.pdf', f'_prev{i+1:02d}.jpg'))
