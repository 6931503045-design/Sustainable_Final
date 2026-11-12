# ไฟล์ปริ้น A3 แบบประหยัด: เฉพาะชิ้นป๊อปอัพ จัดให้แน่นที่สุด
# usage: make_lean.py SRC(lang) ICONS RENDER OUT LANG
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

SRC, ICONS, RENDER, OUT, LANG = sys.argv[1:6]
DPI = 150
PXCM = DPI / 2.54
A3W, A3H = round(29.7 * PXCM), round(42.0 * PXCM)
EXP = 4134 / 1587
BOARD_PXCM = 4134 / 70
SC = PXCM / BOARD_PXCM
FONT = ImageFont.truetype('/usr/share/fonts/opentype/tlwg/Loma-Bold.otf', 26)
FONT_S = ImageFont.truetype('/usr/share/fonts/opentype/tlwg/Loma.otf', 22)
M, GAP = 45, 22
bg = (0xf3, 0xef, 0xe6)


def scaled(img, s):
    return img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)


def outlined(img, mask, grow=11):
    cut = mask.filter(ImageFilter.MaxFilter(grow))
    ol = ImageChops.subtract(cut.filter(ImageFilter.MaxFilter(5)), cut)
    out = Image.new('RGB', img.size, 'white')
    out.paste(img, (0, 0), mask)
    out.paste((60, 60, 60), (0, 0), ol)
    return out.crop(ol.getbbox())


def pad(img, p=20):
    o = Image.new(img.mode, (img.width + 2 * p, img.height + 2 * p), 0 if img.mode == 'L' else 'white')
    o.paste(img, (p, p))
    return o


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


class Pager:
    def __init__(self):
        self.pages = []

    def new(self, title, landscape=False):
        pg = Image.new('RGB', (A3H, A3W) if landscape else (A3W, A3H), 'white')
        d = ImageDraw.Draw(pg)
        d.text((M, 14), title, font=FONT, fill='black')
        d.text((M, pg.height - 40), 'ปริ้นขนาดจริง 100% (Actual size) · ตัดตามเส้นเทา · ยกด้วยโฟม 5–10 มม.', font=FONT_S, fill=(90, 90, 90))
        self.pages.append(pg)
        self.pg, self.d = pg, d
        self.x, self.y, self.rh = M, 60, 0
        return pg

    def place(self, im, cap=''):
        h = im.height + (28 if cap else 0)
        if self.x + im.width > self.pg.width - M:
            self.x, self.y, self.rh = M, self.y + self.rh + GAP, 0
        if self.y + h > self.pg.height - 55:
            return False
        self.pg.paste(im, (self.x, self.y))
        if cap:
            self.d.text((self.x, self.y + im.height + 2), cap, font=FONT_S, fill=(110, 110, 110))
        self.x += im.width + GAP
        self.rh = max(self.rh, h)
        return True


P = Pager()

# --- แผนที่เปล่า (ไม่มีรูปพืช) ---
mapimg = Image.open(f'{ICONS}/map_clean.png').convert('RGB')
a = np.asarray(mapimg).astype(int)
mask = Image.fromarray(((np.abs(a - np.array(bg)).sum(2) > 30) * 255).astype('uint8'))
small = mask.resize((mask.width // 4, mask.height // 4)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
mask = small.resize(mask.size).point(lambda v: 255 if v > 127 else 0)
split = round(3490 / round(2098.167635587608 * EXP) * mapimg.height)
ov = round(0.5 * BOARD_PXCM)
up_img, up_m = mapimg.crop((0, 0, mapimg.width, split + ov)), mask.crop((0, 0, mapimg.width, split + ov))
lo_img, lo_m = mapimg.crop((0, split - ov, mapimg.width, mapimg.height)), mask.crop((0, split - ov, mapimg.width, mapimg.height))
upper = outlined(pad(up_img), pad(up_m), 9)
MS = min(SC, (A3W - 2 * M) / upper.width)   # ย่อแผนที่ให้พอดีกระดาษ (ไม่ได้ปริ้นพื้นบอร์ดแล้ว)
upper = scaled(upper, MS)
lower = scaled(outlined(pad(lo_img), pad(lo_m), 9), MS)

pg = P.new('บอร์ด 1 · แผนที่ส่วนบน (ไม่มีรูปพืช)')
P.x = (A3W - upper.width) // 2
P.place(upper)
P.new('บอร์ด 1 · แผนที่ส่วนใต้ + รูปพืชแยกชิ้น')
P.place(lower, 'แผนที่ภาคใต้ (ต่อกับส่วนบนตรงคอคอดกระ)')
mapR, mapB = P.x, P.y + P.rh

# --- รูปพืช (ไอคอน) ---
import glob
icons = [scaled(Image.open(f).convert('RGB'), MS) for f in sorted(glob.glob(f'{ICONS}/icon*.png'))]
icons.sort(key=lambda im: -im.height)
# ช่องขวาของแผนที่ใต้ก่อน แล้วค่อยใต้แผนที่
rest = []
x, y, rh = mapR, 60, 0
for im in icons:
    if x + im.width > A3W - M:
        x, y, rh = mapR, y + rh + GAP, 0
    if y + im.height > mapB:
        rest.append(im); continue
    P.pg.paste(im, (x, y)); x += im.width + GAP; rh = max(rh, im.height)
P.x, P.y, P.rh = M, mapB + GAP, 0
left = []
for im in rest:
    if not P.place(im):
        left.append(im)

# --- ตู้ + วงกลมขั้นตอนบอร์ด 2 ---
p2 = Image.open(f'{SRC}/p2.png').convert('RGB')
p3 = Image.open(f'{SRC}/p3.png').convert('RGB')
r = Image.open(RENDER).convert('RGBA').crop((627, 317, 2389, 3747))
cab_h_cm = 881.362085797926 / 1587 * 70
r = scaled(r, cab_h_cm * PXCM / r.height)
al = r.split()[3].point(lambda v: 255 if v > 40 else 0)
rw = Image.new('RGB', r.size, 'white'); rw.paste(r, (0, 0), r)
cab = outlined(pad(rw), pad(al), 11)
P.new('บอร์ด 2 · ตู้ไร่ไม่เผา + วงกลมขั้นตอน')
P.place(cab, f'ตู้ สูง {cab_h_cm:.1f} ซม.')
SD = 89.49523886441389 * EXP
steps2 = [scaled(circ(p2, l * EXP, 1277.8543674347968 * EXP, SD), SC) for l in (73.3403421114754, 280.14276606969776, 504.6380049341116, 721.8309970805261, 932.506298603707)]
steps3 = [scaled(circ(p3, cx - SD / 2, 3082, SD), SC) for cx in (300.5, 839, 1423.5, 1989, 2537.5)]
# วางวงกลมเป็นคอลัมน์ข้างตู้
colx = P.x
y = 60
for lab, group in (('บอร์ด 2', steps2), ('บอร์ด 3', steps3)):
    for im in group:
        if y + im.height > A3H - 60:
            colx += im.width + GAP; y = 60
        P.pg.paste(im, (colx, y)); y += im.height + 12
    P.d.text((colx, y), lab, font=FONT_S, fill=(110, 110, 110)); y += 40
    colx += steps2[0].width + GAP; y = 60

# --- วงกลมวัตถุดิบ/ผลผลิต + รถ + ป้าย ---
P.new('บอร์ด 2–3 · วงกลมวัตถุดิบ ผลผลิต รถกระบะ ป้าย')
D = 196.56420253802747 * EXP
for t in (380.438483533511, 597.4527675492913, 814.4670515650716):
    P.place(scaled(circ(p2, 9.64 * EXP, t * EXP, D), SC))
for t, l in ((462.9228564819617, 769.7722045093832), (679.9371404977419, 770.5730252997091), (896.9514245135222, 770.5730252997089)):
    P.place(scaled(circ(p2, l * EXP, t * EXP, D), SC))
P.place(scaled(rect(p3, (680, 2690, 1255, 3150)), SC), 'บอร์ด 3 รถกระบะ')
P.place(scaled(rect(p3, (95, 2365, 1215, 2765)), SC), 'บอร์ด 3 ป้าย')
P.x, P.y, P.rh = M, P.y + P.rh + GAP, 0
for im in left:
    P.place(im, '')

# --- ภาพสถานี แนวนอน (ย่อให้พอดี A3) ---
st = p3.crop((93, 672, 2831, 2201))
s = min((A3H - 2 * M) / st.width, (A3W - 130) / st.height)
st = rect(st.resize((round(st.width * s), round(st.height * s)), Image.LANCZOS), (0, 0, round(st.width * s), round(st.height * s)))
P.new('บอร์ด 3 · ภาพสถานี (แนวนอน)', landscape=True)
P.x = (A3H - st.width) // 2
P.place(st, f'กว้าง {st.width / PXCM:.1f} × สูง {st.height / PXCM:.1f} ซม. (ย่อจากบนบอร์ด {s / SC * 100:.0f}% ให้พอดีกระดาษ)')

P.pages[0].save(OUT, save_all=True, append_images=P.pages[1:], resolution=DPI)
for i, p in enumerate(P.pages):
    p.resize((p.width // 5, p.height // 5)).save(OUT.replace('.pdf', f'_prev{i+1:02d}.jpg'))
print(LANG, 'pages', len(P.pages))
