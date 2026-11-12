# ดึงไอคอนพืชบนแผนที่ (บอร์ด 1) ออกมาเป็นชิ้นแยก + ทำแผนที่เปล่า (ไม่มีไอคอน) ที่สเกลบอร์ด 50x70
import math, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

SRC, OUT = sys.argv[1], sys.argv[2]
EXP = 4134 / 1587
bg = np.array([0xf3, 0xef, 0xe6])
p1 = Image.open(f'{SRC}/p1.png').convert('RGB')
p5 = np.asarray(Image.open(f'{SRC}/p5.png').convert('RGB'))
p6 = np.asarray(Image.open(f'{SRC}/p6.png').convert('RGB'))

# ภาพแผนที่เต็ม (สีจริง) จากหน้า 5/6
MH = round(2098.167635587608 * EXP)
full = np.zeros((MH, p5.shape[1], 3), np.uint8); full[:] = bg
r5 = round(1350.5446524902677 * EXP)
full[:r5] = p5[:r5]
s6 = round(1329.1815557777375 * EXP)
h6 = min(MH - s6, round(768.9860798098701 * EXP))
full[s6 + 40:s6 + h6] = p6[40:h6]
L, T = 255.52501705351278 * EXP, 250.81311598787443 * EXP
MW, MHH = round(655.4749829464872 * EXP), round(1225.1868840121256 * EXP)
mapimg = Image.fromarray(full).resize((MW, MHH), Image.LANCZOS)
mapimg.save(f'{OUT}/map_clean.png')

# ภาพ "ที่ควรเป็น" ถ้าไม่มีไอคอน = พื้นครีม + แผนที่
expect = Image.new('RGB', p1.size, tuple(bg))
expect.paste(mapimg, (round(L), round(T)))
diff = np.abs(np.asarray(p1).astype(int) - np.asarray(expect).astype(int)).sum(2) > 70

# กรอบไอคอนพืชจาก Canva (top, left, w, h, rot)
PLANTS = [
 (265, 344.32, 97.92, 129.69, 0), (362.99, 291.10, 90.33, 106.27, 5.37), (285.20, 441.27, 127.03, 149.45, -12.78),
 (366.41, 394.80, 74.17, 100.92, 10.52), (1290.97, 496.69, 65.80, 105.29, 0), (1062.66, 357.07, 145.44, 191.37, 3.81),
 (550.68, 465.85, 90.67, 68.45, 62.47), (536.76, 410.76, 59.87, 81.46, 10.52), (706.25, 454.15, 94.78, 111.51, 13.77),
 (615.62, 437.91, 79.30, 105.03, 23.10), (619.80, 752.19, 102.57, 107.40, 5.66), (492.17, 718.52, 79.30, 105.03, 23.10),
 (478.04, 613.20, 59.87, 81.46, -45), (574.32, 579.83, 90.67, 68.45, 127.82), (628.23, 645.71, 94.78, 111.51, 13.77),
 (921.67, 382.40, 94.78, 111.51, 13.77), (808.22, 372.18, 79.30, 105.03, -50.31), (623.33, 314.39, 59.87, 81.46, 10.52),
 (728.13, 328.77, 92.17, 69.59, 38.23), (827.27, 532.70, 68.19, 90.32, 15.30), (772.26, 582.81, 47.88, 65.14, -45),
 (832.43, 602.16, 94.78, 111.51, 13.77),
]
from collections import deque
def largest(m):
    a = np.asarray(m) > 127
    lab = np.zeros(a.shape, int); best, bestn, cur = 0, 0, 0
    H, W = a.shape
    for y0, x0 in zip(*np.nonzero(a)):
        if lab[y0, x0]: continue
        cur += 1; q = deque([(y0, x0)]); lab[y0, x0] = cur; n = 0
        while q:
            y, x = q.popleft(); n += 1
            for yy, xx in ((y+1,x),(y-1,x),(y,x+1),(y,x-1)):
                if 0 <= yy < H and 0 <= xx < W and a[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = cur; q.append((yy, xx))
        if n > bestn: best, bestn = cur, n
    return Image.fromarray(((lab == best) * 255).astype('uint8'))

icons = []
for i, (t, l, w, h, rot) in enumerate(PLANTS):
    cx, cy = (l + w / 2) * EXP, (t + h / 2) * EXP
    a = math.radians(rot)
    pts = [(cx + (x * math.cos(a) - y * math.sin(a)) * EXP, cy + (x * math.sin(a) + y * math.cos(a)) * EXP)
           for x, y in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]
    poly = Image.new('L', p1.size, 0)
    ImageDraw.Draw(poly).polygon(pts, fill=255)
    m = Image.fromarray((diff * 255).astype('uint8'))
    m = ImageChops.multiply(m, poly)
    bb = m.getbbox()
    if not bb:
        continue
    pad = 30
    bb = (bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad)
    mc = m.crop(bb).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    # เติมรูในตัวไอคอน + เผื่อขอบตัด 1.5 มม.
    body = mc.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
    body = largest(body)
    if body.getbbox() is None:
        continue
    cut = body.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.MinFilter(5))
    src = p1.crop(bb)
    out = Image.new('RGB', src.size, 'white')
    out.paste(src, (0, 0), body)
    ol = ImageChops.subtract(cut.filter(ImageFilter.MaxFilter(5)), cut)
    out.paste((60, 60, 60), (0, 0), ol)
    bb2 = ol.getbbox()
    out = out.crop((max(0, bb2[0] - 4), max(0, bb2[1] - 4), bb2[2] + 4, bb2[3] + 4))
    out.save(f'{OUT}/icon{i:02d}.png')
    icons.append(i)
print('icons', len(icons))
