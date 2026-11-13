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

logo = cutout(f'{IMG}/6.webp', 18.0)

# "Moisture meter" จากบอร์ด 2 (EN) ขนาดเท่าบนบอร์ด
p2 = np.asarray(Image.open(f'{SRC_EN}/p2.png').convert('RGB')).astype(int)
t, l, w, h = 1393.35, 722.63, 190, 53.8
sub = p2[round((t - 4) * EXP):round((t + h + 4) * EXP), round((l - 4) * EXP):round((l + w + 4) * EXP)].copy()
dark = sub.sum(2) < 300
sub[~dark] = bg
ys, xs = np.nonzero(dark)
sub = sub[max(0, ys.min() - 22):ys.max() + 22, max(0, xs.min() - 22):xs.max() + 22]
mm = Image.fromarray(sub.astype('uint8'))
mm = boxed(mm.resize((round(mm.width * SC), round(mm.height * SC)), Image.LANCZOS))

# ป้ายตั้งโต๊ะ "ลองขายเศษพืช" + QR (9 x 12.5 ซม.)
SW, SH = round(9 * PXCM), round(12.5 * PXCM)
G = (47, 122, 62)
sign = Image.new('RGB', (SW, SH), 'white')
sd = ImageDraw.Draw(sign)
sd.rectangle((0, 0, SW - 1, SH - 1), outline=G, width=18)
F1 = ImageFont.truetype('/usr/share/fonts/opentype/tlwg/Loma-Bold.otf', 58)
F2 = ImageFont.truetype('/usr/share/fonts/opentype/tlwg/Loma.otf', 36)
F3 = ImageFont.truetype('/usr/share/fonts/opentype/tlwg/Loma.otf', 27)
def ctext(y, txt, f, fill):
    w = sd.textlength(txt, font=f); sd.text(((SW - w) / 2, y), txt, font=f, fill=fill)
ctext(48, 'ลองขายเศษพืช', F1, G)
ctext(128, 'ผ่าน LINE ได้เลย', F2, (30, 36, 51))
q = Image.open(f'{IMG}/4.png').convert('RGB')
QS = round(6.3 * PXCM)
sign.paste(q.resize((QS, QS), Image.NEAREST), ((SW - QS) // 2, 200))
ctext(200 + QS + 18, 'เพิ่มเพื่อน · แจ้งขาย · เรียกรถ', F3, (95, 111, 100))
qr = sign
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
put(qr, M + logo.width + GAP, y, 'ป้ายตั้งโต๊ะ QR (9 × 12.5 ซม.)')
y2 = put(smoke, M, yl, f'ภาพเผาเศษพืช ฝุ่น PM2.5 (กว้าง {smoke.width / PXCM:.1f} ซม.)')
ys_ = put(stat, M + smoke.width + GAP, yl + 40, 'บอร์ด 1 · 0.63 M rai (ขนาดเท่าบนบอร์ด)')
put(mm, M + smoke.width + GAP, ys_, 'บอร์ด 2 · Moisture meter (ขนาดเท่าบนบอร์ด)')
used = put(tractor, M, y2, f'รถแทรกเตอร์ (กว้าง {tractor.width / PXCM:.1f} ซม.)')
assert used <= A3H - 50, used / PXCM

# ---- SDG 4 ข้อหลัก (กรอบ 2x2 ข้างรถแทรกเตอร์) ----
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FR = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
SDGS = [
    (3, (0x4C, 0x9F, 0x38), 'GOOD HEALTH\nAND WELL-BEING', 'Less smoke and PM2.5', 'ลดฝุ่น PM2.5 ลดโรคทางเดินหายใจ'),
    (8, (0xA2, 0x19, 0x42), 'DECENT WORK AND\nECONOMIC GROWTH', 'Income for farmers & drivers', 'เกษตรกรและคนขับในหมู่บ้านมีรายได้'),
    (12, (0xBF, 0x8B, 0x2E), 'RESPONSIBLE\nCONSUMPTION\nAND PRODUCTION', 'Crop waste → feed, fuel, compost', 'เศษพืชเป็นอาหารสัตว์ เชื้อเพลิง ปุ๋ย'),
    (13, (0x3F, 0x7E, 0x44), 'CLIMATE\nACTION', 'No open burning, less CO₂', 'ไม่เผาในที่โล่ง ลดคาร์บอน'),
]
gx = M + tractor.width + GAP
avail_w = A3W - M - gx
avail_h = A3H - 50 - y2
cw = (avail_w - GAP) // 2
cap_h = round(1.35 * PXCM)
sq = min(cw, (avail_h - GAP - 2 * (cap_h + 26)) // 2)
def fit(d2, txt, path, size, maxw):
    while size > 8:
        f = ImageFont.truetype(path, size)
        if max(d2.textlength(line, font=f) for line in txt.split('\n')) <= maxw:
            return f
        size -= 1
    return ImageFont.truetype(path, size)
def sdg_card(n, col, title, en, th):
    W = cw
    im = Image.new('RGB', (W, sq + cap_h), 'white')
    d2 = ImageDraw.Draw(im)
    d2.rectangle((0, 0, W - 1, sq - 1), fill=col)
    pad = round(sq * 0.07)
    fn = ImageFont.truetype(FB, round(sq * 0.36))
    d2.text((pad, round(sq * 0.02)), str(n), font=fn, fill='white')
    ft = fit(d2, title, FB, round(sq * 0.095), W - 2 * pad)
    d2.multiline_text((pad, round(sq * 0.46)), title, font=ft, fill='white', spacing=round(sq * 0.02))
    fe = fit(d2, en, FB, round(cap_h * 0.27), W - 12)
    fth = fit(d2, th, '/usr/share/fonts/opentype/tlwg/Loma.otf', round(cap_h * 0.29), W - 12)
    d2.text((6, sq + round(cap_h * 0.08)), en, font=fe, fill=(30, 36, 51))
    d2.text((6, sq + round(cap_h * 0.5)), th, font=fth, fill=(60, 66, 80))
    d2.rectangle((0, 0, W - 1, sq + cap_h - 1), outline=(60, 60, 60), width=2)
    return im
for i, args in enumerate(SDGS):
    cx = gx + (i % 2) * (cw + GAP)
    cy = y2 + (i // 2) * (sq + cap_h + 26 + GAP)
    put(sdg_card(*args), cx, cy, f'SDG {args[0]}' + (f' (การ์ด {cw / PXCM:.1f} × {(sq + cap_h) / PXCM:.1f} ซม.)' if i == 0 else ''))
print('sdg square cm', round(sq / PXCM, 2))
print("w", (M + smoke.width + GAP + stat.width)/PXCM, (M + logo.width + GAP + qr.width)/PXCM, A3W/PXCM)
pg.save(OUT, resolution=DPI)
pg.resize((pg.width // 4, pg.height // 4)).save(OUT.replace('.pdf', '_preview.jpg'))
print('used height cm', round(used / PXCM, 1), 'of 42')
