# ตัวหนังสือทั้งหมดบนบอร์ด (EN) เป็นชิ้นตัดติดบอร์ด ขนาดเท่าบนบอร์ด 50x70 จัดลง A3 ให้น้อยแผ่นที่สุด
import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SRC, ELEMS, OUT = sys.argv[1:4]
DPI = 150
PXCM = DPI / 2.54
A3W, A3H = round(29.7 * PXCM), round(42.0 * PXCM)
EXP = 4134 / 1587
SC = PXCM / (4134 / 70)
FONT = ImageFont.truetype('/usr/share/fonts/opentype/tlwg/Loma-Bold.otf', 26)
FONT_S = ImageFont.truetype('/usr/share/fonts/opentype/tlwg/Loma.otf', 20)
bg = np.array([0xf3, 0xef, 0xe6])
M, GAP = 45, 18
PILL = 'MAGF1db_4cM'

el = json.load(open(ELEMS))
# บอร์ด 2 (EN) จากข้อมูล Canva: (top, left, w, h)
el['2'] = [dict(type='text', top=t, left=l, w=w, h=h) for t, l, w, h in [
    (408.67, 803.54, 114.08, 33.8), (325, 51.28, 114.08, 33.8), (409.07, 976.55, 97.33, 33.4),
    (527.07, 977.03, 132.68, 66.63), (750.5, 980.2, 132.68, 66.63), (974.13, 976.55, 132.68, 66.63),
    (1393.35, 75.65, 190, 53.8), (1393.35, 297.27, 190, 25.8), (1393.35, 519.27, 190, 25.8),
    (1393.35, 722.63, 190, 53.8), (1393.35, 925.63, 124.03, 81.8),
    (44, 40, 640, 16.2), (74, 38, 680, 120.6), (56, 697, 390, 64.8), (160, 697, 390, 22.2),
    (188, 697, 390, 18), (1522, 36, 820, 15.4)]]

SKIP = {'01 / 03', '02 / 03', '03 / 03', 'Why a station?', '01', '02', '03', '04', '05',
        '1', '2', '3', '4', '5', '6', '7', '8', 'Truck scale', 'Drying yard', 'Machine shed', 'Solar roof',
        'Lot storage', 'Shop & office', 'Fire safety', 'Parking'}

pieces = []
for b in ('1', '2', '3'):
    im = Image.open(f'{SRC}/p{b}.png').convert('RGB')
    arr = np.asarray(im).astype(int)
    texts, pills = [], []
    for e in el[b]:
        r = [e['left'], e['top'], e['left'] + e['w'], e['top'] + e['h']]
        if e['type'] == 'text' and e.get('text', '').strip() not in SKIP:
            texts.append(r)
        elif e.get('media') == PILL and not (b == '3' and 900 < e['top'] < 1000):
            pills.append(r)
    # ตัดขอบขวาของกล่องข้อความที่ทับกล่องถัดไปในแถวเดียวกัน
    for r in texts:
        for o in texts:
            if o is r: continue
            if o[1] < r[3] and r[1] < o[3] and r[0] < o[0] < r[2]:
                r[2] = o[0] - 2
    # ชิ้น = ข้อความเดี่ยว หรือ ป้ายแคปซูล + ข้อความที่อยู่บนป้าย
    blocks = []
    used = set()
    for pr in pills:
        members = [pr]
        for i, t in enumerate(texts):
            if t[0] < pr[2] and pr[0] < t[2] and t[1] < pr[3] and pr[1] < t[3]:
                members.append(t); used.add(i)
        blocks.append(members)
    blocks += [[t] for i, t in enumerate(texts) if i not in used]
    # พื้นหลังสะอาด: บอร์ด 1 ลบแผนที่/รูปพืช ด้วยการเก็บเฉพาะพิกเซลในกล่องของชิ้นนั้น และพิกเซลที่ไม่ใช่สีแผนที่
    mapc = None
    if b == '1':
        mapc = np.full_like(arr, bg)
        mi = np.asarray(Image.open(f'{SRC}/../icons/map_clean.png').convert('RGB')).astype(int)
        L, T = round(255.52501705351278 * EXP), round(250.81311598787443 * EXP)
        mapc[T:T + mi.shape[0], L:L + mi.shape[1]] = mi
    for members in blocks:
        X0 = min(r[0] for r in members); Y0 = min(r[1] for r in members)
        X1 = max(r[2] for r in members); Y1 = max(r[3] for r in members)
        x0, y0 = max(0, round((X0 - 4) * EXP)), max(0, round((Y0 - 4) * EXP))
        x1, y1 = min(im.width, round((X1 + 4) * EXP)), min(im.height, round((Y1 + 4) * EXP))
        sub = arr[y0:y1, x0:x1].copy()
        keep = np.zeros(sub.shape[:2], bool)
        for r in members:
            keep[max(0, round((r[1] - 4) * EXP) - y0):round((r[3] + 4) * EXP) - y0,
                 max(0, round((r[0] - 4) * EXP) - x0):round((r[2] + 4) * EXP) - x0] = True
        if mapc is not None and len(members) == 1:
            # ข้อความลอยบนพื้น: ลบพิกเซลที่ไม่ใช่ตัวหนังสือ (สีแผนที่/รูปพืช) โดยเก็บเฉพาะสีเข้ม/สีแดงของตัวอักษร
            px = sub
            dark = px.sum(2) < 420
            red = (px[..., 0] > 140) & (px[..., 1] < 90) & (px[..., 2] < 80)
            green = (px[..., 1] > 110) & (px[..., 0] < 110) & (px[..., 2] < 110)
            keep &= dark | red | green
        sub[~keep] = bg
        ink = np.abs(sub - bg).sum(2) > 60
        ys, xs = np.nonzero(ink)
        if len(xs) == 0:
            continue
        m = 22
        cx0, cy0 = max(0, xs.min() - m), max(0, ys.min() - m)
        cx1, cy1 = min(sub.shape[1], xs.max() + m), min(sub.shape[0], ys.max() + m)
        c = Image.fromarray(sub[cy0:cy1, cx0:cx1].astype('uint8'))
        c = c.resize((round(c.width * SC), round(c.height * SC)), Image.LANCZOS)
        ImageDraw.Draw(c).rectangle((0, 0, c.width - 1, c.height - 1), outline=(60, 60, 60), width=2)
        pieces.append((f'บอร์ด {b}', c))

LW = A3H - 2 * M
pieces = [(c, im if im.width <= LW else im.resize((LW, round(im.height * LW / im.width)), Image.LANCZOS)) for c, im in pieces]
pieces.sort(key=lambda p: (p[1].width <= A3W - 2 * M, -p[1].height))  # ชิ้นกว้างพิเศษก่อน (ลงหน้าแนวนอน)
pages = []
def newpage(land=False):
    W, H = (A3H, A3W) if land else (A3W, A3H)
    pg = Image.new('RGB', (W, H), 'white')
    d = ImageDraw.Draw(pg)
    d.text((M, 14), f'ตัวหนังสือบอร์ด (EN) ({len(pages)+1})', font=FONT, fill='black')
    d.text((M, H - 40), 'ปริ้นขนาดจริง 100% (Actual size) · ตัดตามกรอบ · ติดเรียบหรือยกโฟม 3–5 มม.', font=FONT_S, fill=(90, 90, 90))
    pages.append([pg, d, M, 60, 0])
if any(im.width > A3W - 2 * M for _, im in pieces):
    newpage(True)
# first-fit shelf ข้ามหน้า
for cap, im in pieces:
    h = im.height + 24
    placed = False
    for P in pages:
        pg, d, x, y, rh = P
        PW, PH = pg.size
        if im.width > PW - 2 * M: continue
        if x + im.width > PW - M:
            x, y, rh = M, y + rh + GAP, 0
        if y + h <= PH - 55:
            pg.paste(im, (x, y)); d.text((x, y + im.height + 1), cap, font=FONT_S, fill=(120, 120, 120))
            P[2], P[3], P[4] = x + im.width + GAP, y, max(rh, h)
            placed = True; break
    if not placed:
        newpage(im.width > A3W - 2 * M); P = pages[-1]; pg, d = P[0], P[1]
        pg.paste(im, (M, 60)); d.text((M, 60 + im.height + 1), cap, font=FONT_S, fill=(120, 120, 120))
        P[2], P[3], P[4] = M + im.width + GAP, 60, h

# ---- ลูกศร วงเล็บ แถบไล่สี (วาดใหม่ให้คม ขนาดเท่าบนบอร์ด) ลงแผ่นสุดท้าย ----
K = 70 / 1587 * PXCM          # print px ต่อ page px ของ Canva
def hexc(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
def box(img):
    ImageDraw.Draw(img).rectangle((0, 0, img.width - 1, img.height - 1), outline=(60, 60, 60), width=2)
    return img
def arrow():
    L, T = round(115.9 * K), round(12.69 * K)
    hl, hw = round(T * 2.2), round(T * 2.6)
    pad = 14
    im = Image.new('RGB', (L + 2 * pad, hw + 2 * pad), 'white')
    d = ImageDraw.Draw(im); c = hexc('#6e9048'); cy = pad + hw // 2
    d.rectangle((pad, cy - T // 2, pad + L - hl, cy + T // 2), fill=c)
    d.polygon([(pad + L - hl, pad), (pad + L, cy), (pad + L - hl, pad + hw)], fill=c)
    return box(im)
def bracket():
    W8 = round(9.17 * K); pad = 14
    x0, x1, xr = 189.5, 232.0, 316.0
    y0, ym, y1 = 454.6, 703.5, 949.7
    w = round((xr - x0) * K) + 2 * pad + W8; h = round((y1 - y0) * K) + 2 * pad + W8
    im = Image.new('RGB', (w, h), 'white'); d = ImageDraw.Draw(im); c = hexc('#d5a34f')
    X = lambda x: pad + round((x - x0) * K) + W8 // 2
    Y = lambda y: pad + round((y - y0) * K) + W8 // 2
    for xa, ya, xb, yb in ((x0, y0, x1, y0), (x0, y1, x1, y1), (x1, y0, x1, y1), (x0, ym, xr, ym)):
        d.line((X(xa), Y(ya), X(xb), Y(yb)), fill=c, width=W8)
    return box(im)
def bar_halves(tag):
    Lp, Tp = round(889.3 * K), round(31 * K)
    a, b = np.array(hexc('#ffd476')), np.array(hexc('#7d9240'))
    t = np.linspace(0, 1, Lp)[None, :, None]
    g = (a + (b - a) * t).repeat(Tp, 0).astype('uint8')
    full = Image.fromarray(g)
    ov = round(0.5 * PXCM); mid = Lp // 2
    out = []
    for nm, (s0, s1) in (('ซ้าย', (0, mid + ov)), ('ขวา', (mid - ov, Lp))):
        part = full.crop((s0, 0, s1, Tp))
        im = Image.new('RGB', (part.width + 20, part.height + 20), 'white'); im.paste(part, (10, 10))
        out.append((f'{tag} แถบสีท่อน{nm} (ทับกัน 1 ซม.)', box(im)))
    return out
P = pages[-1]
pg, d = P[0], P[1]
y = P[3] + P[4] + GAP
def put(im, x, y, cap):
    pg.paste(im, (x, y)); d.text((x, y + im.height + 1), cap, font=FONT_S, fill=(120, 120, 120))
    return y + im.height + 26
br = bracket().rotate(90, expand=True)
y = put(br, M, y, 'บอร์ด 2 วงเล็บส้ม (หมุนกลับตั้งตรงตอนติด)')
bars = bar_halves('บอร์ด 2') + bar_halves('บอร์ด 3')
yb = y
for cap, im in bars:
    yb = put(im, M, yb, cap)
xa = M + bars[0][1].width + 40
ya = y
for i in (1, 2, 3):
    ya = put(arrow(), xa, ya, f'บอร์ด 2 ลูกศร {i}')
assert max(yb, ya) <= pg.height - 55, ('overflow', max(yb, ya), pg.height)

imgs = [p[0] for p in pages]
imgs[0].save(OUT, save_all=True, append_images=imgs[1:], resolution=DPI)
for i, p in enumerate(imgs):
    p.resize((p.width // 4, p.height // 4)).save(OUT.replace('.pdf', f'_prev{i+1}.jpg'))
print('pieces', len(pieces), 'pages', len(imgs))
