# ไฟล์ปริ้นเพิ่มเติม (ของที่ลืม/หาย): โลโก้, ภาพครอบครัวในควันไฟ, รถแทรกเตอร์, QR, ชิ้น "0.63 M rai"
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

IMG, SRC_EN, OUT = sys.argv[1:4]
DPI = 150
PXCM = DPI / 2.54
A3W, A3H = round(29.7 * PXCM), round(42.0 * PXCM)
M, GAP = 45, 30
FONT = ImageFont.truetype('/usr/share/fonts/opentype/tlwg/Loma-Bold.otf', 26)
FONT_S = ImageFont.truetype('/usr/share/fonts/opentype/tlwg/Loma.otf', 22)
EXP = 4134 / 1587
SC = PXCM / (4134 / 70)


def fill_holes(m):
    inv = ImageChops.invert(m)
    w, h = inv.size
    big = Image.new('L', (w + 2, h + 2), 255)
    big.paste(inv, (1, 1))
    ImageDraw.floodfill(big, (0, 0), 0)
    holes = big.crop((1, 1, w + 1, h + 1))
    return ImageChops.lighter(m, holes)


def cutout(path, width_cm, white_bg=True):
    im = Image.open(path).convert('RGB')
    s = width_cm * PXCM / im.width
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    p = 25
    big = Image.new('RGB', (im.width + 2 * p, im.height + 2 * p), 'white')
    big.paste(im, (p, p))
    a = np.asarray(big).astype(int)
    m = Image.fromarray(((a.min(2) < 235) * 255).astype('uint8'))
    m = m.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(5))
    m = fill_holes(m)
    cut = m.filter(ImageFilter.MaxFilter(9))
    ol = ImageChops.subtract(cut.filter(ImageFilter.MaxFilter(5)), cut)
    out = Image.new('RGB', big.size, 'white')
    out.paste(big, (0, 0), cut)
    out.paste((60, 60, 60), (0, 0), ol)
    return out.crop(ol.getbbox())


def boxed(im):
    ImageDraw.Draw(im).rectangle((0, 0, im.width - 1, im.height - 1), outline=(60, 60, 60), width=2)
    return im


# QR: ขยายแบบพิกเซลคม + ขอบขาว (quiet zone)
qr = Image.open(f'{IMG}/4.png').convert('RGB')
QW = round(7 * PXCM)
qr = qr.resize((QW, QW), Image.NEAREST)
qrp = Image.new('RGB', (QW + 40, QW + 40), 'white'); qrp.paste(qr, (20, 20)); qr = boxed(qrp)

# "0.63 M rai" จากบอร์ด EN ความละเอียดสูง (ขนาดเท่าบนบอร์ด เหมือนชุดเดิม)
p1 = np.asarray(Image.open(f'{SRC_EN}/p1.png').convert('RGB')).astype(int)
bg = np.array([0xf3, 0xef, 0xe6])
t, l, w, h = 1092.73, 629.86, 277, 47.13
y0, y1, x0, x1 = round((t - 4) * EXP), round((t + h + 4) * EXP), round((l - 4) * EXP), round((l + w + 4) * EXP)
sub = p1[y0:y1, x0:x1].copy()
red = (sub[..., 0] > 140) & (sub[..., 1] < 90) & (sub[..., 2] < 80)
sub[~red] = bg
ys, xs = np.nonzero(red)
sub = sub[max(0, ys.min() - 22):ys.max() + 22, max(0, xs.min() - 22):xs.max() + 22]
stat = Image.fromarray(sub.astype('uint8'))
stat = boxed(stat.resize((round(stat.width * SC), round(stat.height * SC)), Image.LANCZOS))

logo = cutout(f'{IMG}/6.webp', 19.5)
smoke = cutout(f'{IMG}/5.png', 16.5)
tractor = cutout(f'{IMG}/7.png', 14.0)

pg = Image.new('RGB', (A3W, A3H), 'white')
d = ImageDraw.Draw(pg)
d.text((M, 14), 'ของที่ปริ้นเพิ่ม (ของที่ลืม/หาย)', font=FONT, fill='black')
d.text((M, A3H - 40), 'ปริ้นขนาดจริง 100% (Actual size) · ตัดตามเส้นเทา · ยกด้วยโฟม 5–10 มม.', font=FONT_S, fill=(90, 90, 90))


def put(im, x, y, cap):
    pg.paste(im, (x, y))
    d.text((x, y + im.height + 2), cap, font=FONT_S, fill=(110, 110, 110))
    return y + im.height + 32


y = 60
yl = put(logo, M, y, f'โลโก้ Zero-Burn Farm (กว้าง {logo.width / PXCM:.1f} ซม.)')
put(qr, M + logo.width + GAP, y, 'QR (7 ซม.)')
y2 = put(smoke, M, yl, f'ภาพเผาเศษพืช ฝุ่น PM2.5 (กว้าง {smoke.width / PXCM:.1f} ซม.)')
put(stat, M + smoke.width + GAP, yl + 40, 'บอร์ด 1 · 0.63 M rai (ขนาดเท่าบนบอร์ด)')
used = put(tractor, M, y2, f'รถแทรกเตอร์ (กว้าง {tractor.width / PXCM:.1f} ซม.)')
assert used <= A3H - 50, used / PXCM
print("w", (M + smoke.width + GAP + stat.width)/PXCM, (M + logo.width + GAP + qr.width)/PXCM, A3W/PXCM)
pg.save(OUT, resolution=DPI)
pg.resize((pg.width // 4, pg.height // 4)).save(OUT.replace('.pdf', '_preview.jpg'))
print('used height cm', round(used / PXCM, 1), 'of 42')
