"""
build_model.py — สร้างโมเดล 3D ตู้แปรรูปเศษวัสดุเกษตร 3 in 1 "ไร่ไม่เผา"

วิธีใช้
  1) เปิดใน Blender 5.2: แท็บ Scripting > Open > เลือกไฟล์นี้ > Run Script
     (สร้างโมเดลอย่างเดียว ไม่ render)
  2) รันจาก command line (ต้องมี Blender หรือ `pip install bpy`):
       blender -b -P build_model.py -- --render          # render ภาพ + export .blend/.glb
       python build_model.py --render --quick            # ทดสอบเร็ว (ความละเอียดต่ำ)

หน่วยเป็นเมตร แกน X = ความกว้าง (ซ้าย-ขวา), Y = ความลึก (หน้า = -Y), Z = ความสูง
ขนาดตู้ 85 x 60 x 180 ซม. จัดชั้นตามสเปกในเอกสาร (docs/SRS.md หัวข้อตัวเครื่อง)
"""
import bpy
import bmesh
import json
import math
import os
import random
import sys
from mathutils import Euler, Matrix, Vector
from bpy_extras.object_utils import world_to_camera_view

# ---------------------------------------------------------------- ตั้งค่า
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
DO_RENDER = '--render' in argv
QUICK = '--quick' in argv

try:
    HERE = os.path.dirname(os.path.abspath(__file__))
    if not os.path.isdir(os.path.join(HERE, 'textures')):
        raise NameError
except NameError:  # รันจาก Text Editor ใน Blender: ใช้โฟลเดอร์ของไฟล์ .blend หรือ cwd
    HERE = bpy.path.abspath('//') or os.getcwd()
TEX = os.path.join(HERE, 'textures')
OUT = os.path.join(HERE, 'output')
os.makedirs(OUT, exist_ok=True)

W, D, H, T = 0.85, 0.60, 1.80, 0.015  # กว้าง ลึก สูง ความหนาแผ่น
FRONT = -D / 2
random.seed(7)
rad = math.radians

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'

# ---------------------------------------------------------------- collections
# ชื่อภาษาไทยใช้ทำป้ายกำกับในภาพ (Blender ใช้ชื่ออังกฤษเพื่อเปิดได้ทุกเครื่อง)
PART_LABELS = {
    'Shell': 'ตัวตู้',
    'FrontPanels': 'แผงหน้า / ประตูซ่อมบำรุง',
    'Controls': 'หน้าจอสัมผัส + สแกน QR + กล้อง',
    'Feed': 'ช่องป้อน + ตะแกรงกันมือ + แม่เหล็ก',
    'HammerMill': 'เครื่องสับ (Hammer mill)',
    'Diverter': 'ลิ้นสลับทาง',
    'PelletMill': 'แม่พิมพ์อัดเม็ด (Flat die)',
    'StraightChute': 'ช่องตรง (โหมดสับ)',
    'ScrewPress': 'เกลียวอัดแท่ง (Screw press)',
    'Trays': 'ถาดรับ 3 ช่อง + ตาชั่ง',
    'Rear': 'พัดลมดูดฝุ่น + ตู้ไฟ',
}
root = bpy.data.collections.new('RaiMaiPhao')
scene.collection.children.link(root)
C = {}
for key in PART_LABELS:
    C[key] = bpy.data.collections.new(key)
    root.children.link(C[key])
STAGE = bpy.data.collections.new('Stage')  # ไฟ กล้อง พื้น (ไม่ export)
scene.collection.children.link(STAGE)

# ---------------------------------------------------------------- materials
MATS = {}


def mat(name, color, metal=0.0, rough=0.5, emit=None, emit_strength=0.0, transmission=0.0, image=None, alpha_image=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*hex_rgb(color), 1)
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Roughness'].default_value = rough
    if transmission:
        bsdf.inputs['Transmission Weight'].default_value = transmission
        bsdf.inputs['IOR'].default_value = 1.45
    if emit:
        bsdf.inputs['Emission Color'].default_value = (*hex_rgb(emit), 1)
        bsdf.inputs['Emission Strength'].default_value = emit_strength
    if image:
        tex = nt.nodes.new('ShaderNodeTexImage')
        img = bpy.data.images.load(os.path.join(TEX, image), check_existing=True)
        img.pack()
        tex.image = img
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        if emit_strength:
            nt.links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
        if alpha_image:
            nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
    MATS[name] = m
    return m


def hex_rgb(h):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb)


M_GREEN = mat('BodyGreen', '#2f6b3a', rough=0.45)
M_WHITE = mat('BodyWhite', '#e8ebe4', rough=0.5)
M_DARK = mat('Dark', '#23272a', rough=0.6)
M_STEEL = mat('Steel', '#b9bec4', metal=1.0, rough=0.32)
M_STEEL_DARK = mat('SteelDark', '#5d6369', metal=1.0, rough=0.45)
M_MOTOR = mat('Motor', '#3a5a80', metal=0.3, rough=0.4)
M_STRAW = mat('Straw', '#e3b23c', rough=0.5)
M_ORANGE = mat('Orange', '#e07b39', rough=0.5)
M_CHOPGREEN = mat('ModeGreen', '#6fbf73', rough=0.5)
M_RED = mat('Red', '#d62828', rough=0.3)
M_YELLOW = mat('Yellow', '#ffd21f', rough=0.5)
M_GLASS = mat('Glass', '#dfefff', rough=0.05, transmission=1.0)
M_HEATER = mat('HeaterCoil', '#c4622d', metal=1.0, rough=0.35, emit='#ff6a1a', emit_strength=1.5)
M_CERAMIC = mat('Insulation', '#cfc8bb', rough=0.9)
M_FABRIC = mat('DustBag', '#f2efe6', rough=1.0)
M_RUBBER = mat('Rubber', '#111111', rough=0.8)
M_SENSOR = mat('Sensor', '#2a7fd4', rough=0.4)
M_LENS = mat('Lens', '#0b0f14', metal=0.5, rough=0.05)
M_SCAN = mat('ScannerWindow', '#ff3b3b', rough=0.1, emit='#ff2a2a', emit_strength=3.0)
M_CHIPS = mat('ChoppedStraw', '#d9b45a', rough=0.85)
M_PELLETS = mat('Pellets', '#a07a3f', rough=0.7)
M_BRIQ = mat('Briquettes', '#5b4027', rough=0.85)
M_SOLAR = mat('Solar', '#1b2a4a', metal=0.6, rough=0.15)
M_FLOOR = mat('Floor', '#ffffff')

M_SCREEN = mat('ScreenUI', '#000000', image='screen_ui.png', emit_strength=1.4, rough=0.2)
M_BRAND = mat('BrandPlate', '#ffffff', image='brand_plate.png', rough=0.4)
M_WARN = mat('WarningSticker', '#ffffff', image='warning.png', rough=0.5)
M_DOORLBL = mat('DoorLabel', '#ffffff', image='door_label.png', rough=0.5)
M_ESTOP = mat('EStopRing', '#ffffff', image='estop_ring.png', rough=0.5, alpha_image=True)
M_LBL = {k: mat(f'Label_{k}', '#ffffff', image=f'label_{k}.png', rough=0.5) for k in ('chop', 'pellet', 'briquette')}

# ---------------------------------------------------------------- mesh helpers


def link(name, bm, coll, material, loc=(0, 0, 0), rot=(0, 0, 0), smooth=False):
    me = bpy.data.meshes.new(name)
    if smooth:
        for f in bm.faces:
            f.smooth = True
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = rot
    if material:
        me.materials.append(material)
    return ob


def bevel(ob, width=0.004, segments=2):
    m = ob.modifiers.new('Bevel', 'BEVEL')
    m.width, m.segments, m.limit_method = width, segments, 'ANGLE'
    return ob


def solidify(ob, thickness):
    m = ob.modifiers.new('Solidify', 'SOLIDIFY')
    m.thickness = thickness
    return ob


def box(name, size, loc, material, coll, rot=(0, 0, 0), bev=0.0, open_faces=()):
    """กล่องขนาด size (x,y,z) วางที่ loc (จุดกึ่งกลาง); open_faces เช่น ('-y','+z') = เปิดหน้านั้นทิ้ง"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if open_faces:
        dirs = {'-x': (-1, 0, 0), '+x': (1, 0, 0), '-y': (0, -1, 0), '+y': (0, 1, 0), '-z': (0, 0, -1), '+z': (0, 0, 1)}
        bm.normal_update()
        kill = [f for f in bm.faces if any(f.normal.dot(Vector(dirs[o])) > 0.9 for o in open_faces)]
        bmesh.ops.delete(bm, geom=kill, context='FACES_ONLY')
    ob = link(name, bm, coll, material, loc, rot)
    if bev:
        bevel(ob, bev)
    return ob


AXIS_ROT = {'Z': (0, 0, 0), 'X': (0, rad(90), 0), 'Y': (rad(90), 0, 0)}


def _sharpen_caps(bm):
    for e in bm.edges:
        if len(e.link_faces) == 2 and abs(e.link_faces[0].normal.dot(e.link_faces[1].normal)) < 0.5:
            e.smooth = False


def cyl(name, r, depth, loc, material, coll, axis='Z', segs=32, r2=None, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    bm.normal_update()
    _sharpen_caps(bm)
    return link(name, bm, coll, material, loc, rot or AXIS_ROT[axis], smooth=True)


def tube(name, r_out, r_in, length, loc, material, coll, axis='Z', gap_dir=-90, gap=0, segs=48, rot=None):
    """ท่อกลวง (ตามแกน local Z) เว้นช่องเปิด gap องศา หันไปทาง gap_dir องศา ไว้โชว์ภายใน (cutaway)"""
    bm = bmesh.new()
    a0 = rad(gap_dir + gap / 2)
    span = rad(360 - gap)
    closed = gap == 0
    n = segs if closed else max(3, int(segs * (360 - gap) / 360))
    count = n if closed else n + 1
    rings = []
    for z in (-length / 2, length / 2):
        for rr in (r_out, r_in):
            rings.append([bm.verts.new((rr * math.cos(a0 + span * i / n), rr * math.sin(a0 + span * i / n), z)) for i in range(count)])
    lo_o, lo_i, hi_o, hi_i = rings
    for i in range(n):
        j = (i + 1) % count
        bm.faces.new((lo_o[i], lo_o[j], hi_o[j], hi_o[i]))       # ผิวนอก
        bm.faces.new((lo_i[j], lo_i[i], hi_i[i], hi_i[j]))       # ผิวใน
        bm.faces.new((lo_o[j], lo_o[i], lo_i[i], lo_i[j]))       # ขอบล่าง
        bm.faces.new((hi_o[i], hi_o[j], hi_i[j], hi_i[i]))       # ขอบบน
    if not closed:
        for k in (0, n):
            bm.faces.new((lo_o[k], hi_o[k], hi_i[k], lo_i[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    _sharpen_caps(bm)
    return link(name, bm, coll, material, loc, rot or AXIS_ROT[axis], smooth=True)


def sieve(name, r, length, a_from, a_to, loc, coll, axis='X', nu=28, nv=14):
    """ตะแกรงโค้งรูพรุน (ผิวโค้ง + wireframe modifier)"""
    bm = bmesh.new()
    grid = [[bm.verts.new((r * math.cos(rad(a_from + (a_to - a_from) * i / nu)), r * math.sin(rad(a_from + (a_to - a_from) * i / nu)),
                           -length / 2 + length * j / nv)) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    ob = link(name, bm, coll, M_STEEL, loc, AXIS_ROT[axis])
    w = ob.modifiers.new('Wire', 'WIREFRAME')
    w.thickness = 0.003
    return ob


def funnel(name, top, bottom, z_top, z_bot, coll, material=M_STEEL, thickness=0.004, open_front=False):
    """กรวยสี่เหลี่ยม top/bottom = (xmin,xmax,ymin,ymax); open_front = ไม่มีผนังหน้า (โชว์ภายใน)"""
    bm = bmesh.new()
    t = [bm.verts.new(v) for v in ((top[0], top[2], z_top), (top[1], top[2], z_top), (top[1], top[3], z_top), (top[0], top[3], z_top))]
    b = [bm.verts.new(v) for v in ((bottom[0], bottom[2], z_bot), (bottom[1], bottom[2], z_bot), (bottom[1], bottom[3], z_bot), (bottom[0], bottom[3], z_bot))]
    for i in range(1 if open_front else 0, 4):
        j = (i + 1) % 4
        bm.faces.new((b[i], b[j], t[j], t[i]))
    ob = link(name, bm, coll, material)
    solidify(ob, thickness)
    return ob


def helix(name, r_in, r_out, pitch, length, loc, material, coll, axis='Z', steps_per_turn=36, rot=None):
    """ใบเกลียว (screw flight)"""
    bm = bmesh.new()
    turns = length / pitch
    steps = int(turns * steps_per_turn)
    prev = None
    for s in range(steps + 1):
        a = 2 * math.pi * s / steps_per_turn
        z = -length / 2 + pitch * s / steps_per_turn
        pair = (bm.verts.new((r_in * math.cos(a), r_in * math.sin(a), z)), bm.verts.new((r_out * math.cos(a), r_out * math.sin(a), z)))
        if prev:
            bm.faces.new((prev[0], prev[1], pair[1], pair[0]))
        prev = pair
    ob = link(name, bm, coll, material, loc, rot or AXIS_ROT[axis], smooth=True)
    solidify(ob, 0.004)
    return ob


def pipe(name, points, radius, material, coll, resolution=10):
    """ท่อตามเส้นทาง (สร้างจาก curve แล้วแปลงเป็น mesh เพื่อให้ export glb ได้)"""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = radius
    cu.bevel_resolution = 4
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(points) - 1)
    for bp, p in zip(sp.bezier_points, points):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    sp.resolution_u = resolution
    tmp = bpy.data.objects.new(name + '_curve', cu)
    coll.objects.link(tmp)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = True
    me.materials.clear()
    me.materials.append(material)
    return ob


def beam(name, p1, p2, w, h, material, coll):
    """แผ่น/รางตรงจากจุด p1 ไป p2"""
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    ob = box(name, (w, d.length, h), (p1 + p2) / 2, material, coll)
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = d.to_track_quat('Y', 'Z')
    ob.rotation_mode = 'XYZ'
    return ob


def decal(name, material, w, h, loc, face, coll):
    """ป้าย/สติกเกอร์แบน หันออกด้าน face: 'front' | 'back' | 'right' | 'left'"""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5, calc_uvs=True)
    bmesh.ops.scale(bm, vec=(w, h, 1), verts=bm.verts)
    rot = {'front': (rad(90), 0, 0), 'back': (rad(90), 0, rad(180)), 'right': (rad(90), 0, rad(90)), 'left': (rad(90), 0, rad(-90))}[face]
    return link(name, bm, coll, material, loc, rot)


def scatter(name, coll, material, count, make, region):
    """โปรยชิ้นเล็ก ๆ (เม็ด/เศษฟาง) เป็นกองนูนตรงกลาง รวมเป็น mesh เดียว"""
    bm = bmesh.new()
    (x0, x1), (y0, y1), (z0, z1) = region
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    for _ in range(count):
        x, y = random.uniform(x0, x1), random.uniform(y0, y1)
        dist = min(1.0, math.hypot((x - cx) / ((x1 - x0) / 2), (y - cy) / ((y1 - y0) / 2)))
        z = z0 + random.uniform(0, 1) * (z1 - z0) * (1 - 0.7 * dist)
        mtx = Matrix.Translation((x, y, z)) @ Euler((random.uniform(0, 6.3), random.uniform(0, 6.3), random.uniform(0, 6.3))).to_matrix().to_4x4()
        make(bm, mtx)
    return link(name, bm, coll, material)


# ================================================================ 1. ตัวตู้ (Shell)
S = C['Shell']
box('Plinth', (W - 0.04, D - 0.04, 0.05), (0, 0, 0.025), M_DARK, S)
bevel(box('Panel_Left', (T, D, H - 0.05), (-W / 2 + T / 2, 0, 0.05 + (H - 0.05) / 2), M_GREEN, S), 0.003)
bevel(box('Panel_Right', (T, D, H - 0.05), (W / 2 - T / 2, 0, 0.05 + (H - 0.05) / 2), M_GREEN, S), 0.003)
box('Panel_Back', (W - 2 * T, T, H - 0.05), (0, D / 2 - T / 2, 0.05 + (H - 0.05) / 2), M_GREEN, S)
HOLE = (-0.20, 0.20, -0.17, 0.13)  # ช่องเปิดด้านบนสำหรับช่องป้อน
zt = H - T / 2
box('Top_Front', (W, HOLE[2] - FRONT, T), (0, (FRONT + HOLE[2]) / 2, zt), M_GREEN, S)
box('Top_Back', (W, D / 2 - HOLE[3], T), (0, (HOLE[3] + D / 2) / 2, zt), M_GREEN, S)
box('Top_Left', (HOLE[0] + W / 2, HOLE[3] - HOLE[2], T), ((-W / 2 + HOLE[0]) / 2, (HOLE[2] + HOLE[3]) / 2, zt), M_GREEN, S)
box('Top_Right', (W / 2 - HOLE[1], HOLE[3] - HOLE[2], T), ((HOLE[1] + W / 2) / 2, (HOLE[2] + HOLE[3]) / 2, zt), M_GREEN, S)
decal('Sticker_Warning', M_WARN, 0.24, 0.30, (W / 2 + 0.001, -0.08, 1.30), 'right', S)

# ================================================================ 2. แผงหน้า (FrontPanels)
F = C['FrontPanels']
yf = FRONT + T / 2
bevel(box('ControlPanel', (W, T, 0.40), (0, yf, 1.60), M_GREEN, F), 0.003)
# ประตูกลาง 30-140 ซม. มีหน้าต่างกระจกมองเห็นเครื่องสับ (ทำจาก 4 ชิ้นรอบช่องหน้าต่าง)
WIN = (-0.18, 0.18, 1.08, 1.32)
box('Door_Lower', (W, T, WIN[2] - 0.30), (0, yf, (0.30 + WIN[2]) / 2), M_WHITE, F)
box('Door_Upper', (W, T, 1.40 - WIN[3]), (0, yf, (WIN[3] + 1.40) / 2), M_WHITE, F)
box('Door_Left', (WIN[0] + W / 2, T, WIN[3] - WIN[2]), ((-W / 2 + WIN[0]) / 2, yf, (WIN[2] + WIN[3]) / 2), M_WHITE, F)
box('Door_Right', (W / 2 - WIN[1], T, WIN[3] - WIN[2]), ((WIN[1] + W / 2) / 2, yf, (WIN[2] + WIN[3]) / 2), M_WHITE, F)
box('Door_Window', (WIN[1] - WIN[0], 0.006, WIN[3] - WIN[2]), (0, yf, (WIN[2] + WIN[3]) / 2), M_GLASS, F)
for nm, (sx, sz, px, pz) in {
    'Frame_T': (0.39, 0.015, 0, WIN[3] + 0.0075), 'Frame_B': (0.39, 0.015, 0, WIN[2] - 0.0075),
    'Frame_L': (0.015, 0.27, WIN[0] - 0.0075, 1.20), 'Frame_R': (0.015, 0.27, WIN[1] + 0.0075, 1.20)}.items():
    box(nm, (sx, 0.008, sz), (px, FRONT - 0.004, pz), M_DARK, F)
cyl('Door_Handle', 0.012, 0.24, (0.37, FRONT - 0.045, 0.85), M_STEEL, F)
for z in (0.79, 0.91):
    beam(f'Door_HandlePost_{z}', (0.37, FRONT, z), (0.37, FRONT - 0.045, z), 0.014, 0.014, M_STEEL, F)
for z in (0.40, 1.30):
    cyl(f'Door_Hinge_{z}', 0.012, 0.08, (-W / 2 + 0.005, FRONT - 0.008, z), M_STEEL_DARK, F)
decal('Door_Label', M_DOORLBL, 0.42, 0.126, (0, FRONT - 0.001, 0.62), 'front', F)
box('Fascia_Trays', (W, T, 0.06), (0, yf, 0.27), M_DARK, F)

# ================================================================ 3. หน้าจอ/สแกน/กล้อง/ปุ่มฉุกเฉิน (Controls)
K = C['Controls']
decal('BrandPlate', M_BRAND, 0.50, 0.125, (-0.15, FRONT - 0.001, 1.715), 'front', K)
bevel(box('Screen_Bezel', (0.33, 0.03, 0.23), (0.20, FRONT - 0.015, 1.52), M_DARK, K), 0.006)
decal('Screen_Display', M_SCREEN, 0.30, 0.20, (0.20, FRONT - 0.031, 1.52), 'front', K)
bevel(box('QR_Scanner', (0.09, 0.05, 0.07), (-0.03, FRONT - 0.025, 1.50), M_DARK, K), 0.006)
decal('QR_Window', M_SCAN, 0.06, 0.02, (-0.03, FRONT - 0.051, 1.49), 'front', K)
cyl('Camera_Body', 0.03, 0.05, (0.30, FRONT - 0.025, 1.73), M_DARK, K, axis='Y')
cyl('Camera_Lens', 0.018, 0.012, (0.30, FRONT - 0.055, 1.73), M_LENS, K, axis='Y')
decal('EStop_Ring', M_ESTOP, 0.13, 0.13, (-0.31, FRONT - 0.001, 1.50), 'front', K)
cyl('EStop_Collar', 0.03, 0.03, (-0.31, FRONT - 0.016, 1.51), M_DARK, K, axis='Y')
cyl('EStop_Button', 0.042, 0.025, (-0.31, FRONT - 0.043, 1.51), M_RED, K, axis='Y', r2=0.036)

# ================================================================ 4. ช่องป้อน (Feed) 140-180 ซม.
P = C['Feed']
MILL_Y, MILL_Z, MILL_R = -0.02, 1.20, 0.175
funnel('Hopper', (-0.19, 0.19, -0.16, 0.12), (-0.12, 0.12, -0.10, 0.06), H, 1.56, P, open_front=True)
box('Hopper_Throat', (0.24, 0.16, 1.56 - (MILL_Z + MILL_R) + 0.02), (0, MILL_Y, (1.56 + MILL_Z + MILL_R) / 2), M_STEEL, P, open_faces=('+z', '-z', '-y'))
solidify(P.objects['Hopper_Throat'], 0.004)
# ฝาช่องป้อน (เปิดค้างไว้) บานพับด้านหลัง
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
bmesh.ops.scale(bm, vec=(0.42, 0.32, 0.014), verts=bm.verts)
bmesh.ops.translate(bm, vec=(0, -0.16, 0.007), verts=bm.verts)
lid = link('Hopper_Lid', bm, P, M_GREEN, (0, HOLE[3] + 0.01, H), (rad(-70), 0, 0))
bevel(lid, 0.003)
cyl('Lid_Handle', 0.008, 0.16, (0, HOLE[3] + 0.01 - 0.30 * math.cos(rad(70)) + 0.02, H + 0.30 * math.sin(rad(70)) - 0.005), M_STEEL, P, axis='X')
box('Lid_InterlockSwitch', (0.05, 0.03, 0.03), (0.16, HOLE[3] + 0.03, H + 0.015), M_YELLOW, P)
for i in range(9):  # ตะแกรงกันมือ
    cyl(f'Guard_Y{i}', 0.004, 0.27, (-0.16 + i * 0.04, -0.02, H - 0.025), M_STEEL, P, axis='Y', segs=8)
for j in range(4):
    cyl(f'Guard_X{j}', 0.004, 0.36, (0, -0.12 + j * 0.065, H - 0.02), M_STEEL, P, axis='X', segs=8)
cyl('Magnet_Bar', 0.018, 0.20, (0, -0.02, 1.64), M_RED, P, axis='X')
for s in (-1, 1):
    cyl(f'Magnet_Cap{s}', 0.02, 0.02, (s * 0.11, -0.02, 1.64), M_STEEL, P, axis='X')
box('Moisture_Sensor', (0.03, 0.06, 0.045), (0.185, -0.02, 1.70), M_SENSOR, P)
cyl('Moisture_Probe', 0.004, 0.06, (0.145, -0.02, 1.70), M_STEEL, P, axis='X', segs=8)

# ================================================================ 5. เครื่องสับ (HammerMill) 100-140 ซม.
HM = C['HammerMill']
L_MILL = 0.36
tube('Mill_Housing', MILL_R, MILL_R - 0.01, L_MILL, (0, MILL_Y, MILL_Z), M_STEEL_DARK, HM, axis='X', gap_dir=-90, gap=110)
for s in (-1, 1):
    cyl(f'Mill_EndPlate{s}', MILL_R, 0.012, (s * (L_MILL / 2 + 0.006), MILL_Y, MILL_Z), M_STEEL_DARK, HM, axis='X')
cyl('Mill_Shaft', 0.02, L_MILL + 0.06, (0, MILL_Y, MILL_Z), M_STEEL, HM, axis='X')
for k in range(4):
    cyl(f'Rotor_Disc{k}', 0.10, 0.008, (-0.15 + k * 0.10, MILL_Y, MILL_Z), M_STEEL, HM, axis='X')
for k in range(3):
    for a in range(4):
        ang = rad(20 + a * 90)
        r_mid = 0.105
        bevel(box(f'Hammer_{k}_{a}', (0.035, 0.016, 0.085),
                  (-0.10 + k * 0.10, MILL_Y + r_mid * math.sin(ang), MILL_Z + r_mid * math.cos(ang)), M_STEEL, HM, rot=(-ang, 0, 0)), 0.002)
sieve('Mill_Screen_Coarse', 0.155, L_MILL - 0.01, -80, 80, (0, MILL_Y, MILL_Z), HM)
cyl('Mill_Motor', 0.08, 0.16, (-0.325, MILL_Y, MILL_Z), M_MOTOR, HM, axis='X')
cyl('Mill_MotorFanCover', 0.075, 0.03, (-0.395, MILL_Y, MILL_Z), M_DARK, HM, axis='X')
for k in range(10):
    ang = rad(k * 36)
    box(f'Mill_MotorFin{k}', (0.12, 0.006, 0.012), (-0.325, MILL_Y + 0.083 * math.sin(ang), MILL_Z + 0.083 * math.cos(ang)), M_MOTOR, HM, rot=(-ang, 0, 0))
cyl('Mill_Coupling', 0.03, 0.04, (-0.225, MILL_Y, MILL_Z), M_STEEL_DARK, HM, axis='X')
box('Mill_TempSensor', (0.03, 0.03, 0.02), (-0.325, MILL_Y, MILL_Z + 0.09), M_YELLOW, HM)

# ================================================================ 6. ลิ้นสลับทาง (Diverter) 85-100 ซม.
DV = C['Diverter']
funnel('Collector_Funnel', (-0.17, 0.17, -0.15, 0.11), (-0.06, 0.06, -0.08, 0.04), MILL_Z - MILL_R + 0.01, 0.975, DV)
box('Diverter_Housing', (0.72, 0.20, 0.125), (0, MILL_Y, 0.9125), M_STEEL, DV, open_faces=('-y', '+z', '-z'))
solidify(DV.objects['Diverter_Housing'], 0.004)
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
bmesh.ops.scale(bm, vec=(0.012, 0.18, 0.15), verts=bm.verts)
bmesh.ops.translate(bm, vec=(0, 0, -0.075), verts=bm.verts)
link('Diverter_Flap', bm, DV, M_STRAW, (0, MILL_Y, 0.97), (0, rad(40), 0))  # ชี้ไปทางซ้าย = โหมดอัดเม็ด
cyl('Diverter_Pivot', 0.01, 0.22, (0, MILL_Y, 0.97), M_STEEL, DV, axis='Y')
cyl('Diverter_Motor', 0.035, 0.07, (0, MILL_Y + 0.135, 0.97), M_MOTOR, DV, axis='Y')
for nm, x in (('Outlet_Left', -0.27), ('Outlet_Center', 0.0), ('Outlet_Right', 0.27)):
    box(nm, (0.11, 0.11, 0.05), (x, MILL_Y, 0.825), M_STEEL, DV, open_faces=('+z', '-z'))
    solidify(DV.objects[nm], 0.003)

# ================================================================ 7. แม่พิมพ์อัดเม็ด (PelletMill) ซ้าย 30-85 ซม.
PM = C['PelletMill']
PX = -0.27
cyl('Pellet_FeedCone', 0.10, 0.06, (PX, MILL_Y, 0.77), M_STEEL, PM, r2=0.055)
tube('Pellet_Housing', 0.12, 0.112, 0.26, (PX, MILL_Y, 0.61), M_STEEL_DARK, PM, axis='Z', gap_dir=-90, gap=130)
cyl('Pellet_Die', 0.11, 0.03, (PX, MILL_Y, 0.55), M_STEEL_DARK, PM)
bm = bmesh.new()  # รูแม่พิมพ์
for ring_r, n in ((0.035, 12), (0.062, 22), (0.088, 30)):
    for i in range(n):
        a = 2 * math.pi * i / n
        res = bmesh.ops.create_circle(bm, cap_ends=True, segments=10, radius=0.0045)
        bmesh.ops.translate(bm, vec=(ring_r * math.cos(a), ring_r * math.sin(a), 0), verts=res['verts'])
link('Pellet_DieHoles', bm, PM, M_RUBBER, (PX, MILL_Y, 0.5655))
cyl('Pellet_Shaft', 0.018, 0.22, (PX, MILL_Y, 0.58), M_STEEL, PM)
bm = bmesh.new()
for s in (-1, 1):
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=28, radius1=0.035, radius2=0.035, depth=0.065)
    bmesh.ops.rotate(bm, verts=res['verts'], cent=(0, 0, 0), matrix=Matrix.Rotation(rad(90), 3, 'Y'))
    bmesh.ops.translate(bm, vec=(s * 0.06, 0, 0.0), verts=res['verts'])
res = bmesh.ops.create_cube(bm, size=1.0)
bmesh.ops.scale(bm, vec=(0.06, 0.03, 0.025), verts=res['verts'])
bm.normal_update()
_sharpen_caps(bm)
link('Pellet_Rollers', bm, PM, M_STEEL, (PX, MILL_Y, 0.6005), (0, 0, rad(35)), smooth=True)
bevel(box('Pellet_Gearbox', (0.20, 0.18, 0.09), (PX, MILL_Y, 0.445), M_GREEN, PM), 0.006)
cyl('Pellet_Motor', 0.065, 0.16, (PX, 0.17, 0.43), M_MOTOR, PM, axis='Y')
box('Pellet_TempSensor', (0.03, 0.02, 0.03), (PX, 0.17, 0.505), M_YELLOW, PM)
beam('Pellet_Spout', (PX, MILL_Y - 0.10, 0.50), (PX, -0.24, 0.31), 0.07, 0.01, M_STEEL, PM)

# ================================================================ 8. ช่องตรง (StraightChute) กลาง
SC = C['StraightChute']
box('Chute_Duct', (0.11, 0.11, 0.50), (0, MILL_Y, 0.55), M_STEEL, SC, open_faces=('+z', '-z', '-y'))
solidify(SC.objects['Chute_Duct'], 0.003)
cyl('Chute_Sleeve', 0.065, 0.06, (0, -0.05, 0.31), M_RUBBER, SC, r2=0.075)

# ================================================================ 9. เกลียวอัดแท่ง (ScrewPress) ขวา
SP = C['ScrewPress']
RX, RZ = 0.27, 0.60
Y_BACK, Y_FRONT = 0.13, -0.20
L_SCREW = Y_BACK - Y_FRONT
ymid = (Y_BACK + Y_FRONT) / 2
rot_y = AXIS_ROT['Y']
box('Press_FeedHopper', (0.10, 0.10, 0.20), (RX, 0.06, 0.725), M_STEEL, SP, open_faces=('+z', '-z', '-y'))
solidify(SP.objects['Press_FeedHopper'], 0.003)
beam('Press_FeedChute', (RX, MILL_Y, 0.80), (RX, 0.05, 0.75), 0.10, 0.006, M_STEEL, SP)
tube('Press_Barrel', 0.055, 0.047, L_SCREW, (RX, ymid, RZ), M_STEEL_DARK, SP, axis='Y', gap_dir=135, gap=100)
cyl('Press_Shaft', 0.015, L_SCREW + 0.04, (RX, ymid, RZ), M_STEEL, SP, axis='Y')
helix('Press_Screw', 0.015, 0.044, 0.045, L_SCREW - 0.02, (RX, ymid, RZ), M_STEEL, SP, rot=rot_y)
coil = []
for s in range(int(0.16 / 0.016 * 24) + 1):  # ขดลวดให้ความร้อน รอบช่วงหน้า
    a = 2 * math.pi * s / 24
    coil.append((RX + 0.064 * math.cos(a), Y_FRONT + 0.02 + 0.016 * s / 24, RZ + 0.064 * math.sin(a)))
pipe('Press_HeaterCoil', coil, 0.004, M_HEATER, SP, resolution=2)
tube('Press_Insulation', 0.085, 0.074, 0.17, (RX, Y_FRONT + 0.105, RZ), M_CERAMIC, SP, axis='Y', gap_dir=135, gap=140)
cyl('Press_Nozzle', 0.042, 0.03, (RX, Y_FRONT - 0.015, RZ), M_STEEL_DARK, SP, axis='Y')
tube('Press_Briquette_Out', 0.025, 0.009, 0.05, (RX, Y_FRONT - 0.055, RZ), M_BRIQ, SP, axis='Y', segs=24)
box('Press_Cutter', (0.08, 0.004, 0.05), (RX, Y_FRONT - 0.035, RZ + 0.055), M_STEEL, SP)
cyl('Press_CutterActuator', 0.012, 0.06, (RX, Y_FRONT - 0.035, RZ + 0.11), M_DARK, SP)
bevel(box('Press_Gearbox', (0.14, 0.12, 0.14), (RX, 0.21, RZ), M_GREEN, SP), 0.006)
cyl('Press_Motor', 0.065, 0.17, (RX, 0.21, 0.445), M_MOTOR, SP)
box('Press_TempSensor', (0.03, 0.03, 0.02), (RX, 0.21, RZ + 0.08), M_YELLOW, SP)
beam('Press_DropGuide', (RX, Y_FRONT - 0.07, RZ - 0.04), (RX, -0.20, 0.30), 0.08, 0.006, M_STEEL, SP)

# ================================================================ 10. ถาดรับ 3 ช่อง + ตาชั่ง (Trays) 0-30 ซม.
TR = C['Trays']
TRAYS = (('pellet', -0.278, M_STRAW), ('chop', 0.0, M_CHOPGREEN), ('briquette', 0.278, M_ORANGE))
for key, x, m_col in TRAYS:
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(f'LoadCell_{key}_{sx}{sy}', (0.03, 0.03, 0.015), (x + sx * 0.09, -0.05 + sy * 0.18, 0.0575), M_DARK, TR)
    box(f'ScalePlate_{key}', (0.25, 0.46, 0.01), (x, -0.05, 0.07), M_STEEL, TR)
    t = box(f'Tray_{key}', (0.255, 0.48, 0.15), (x, -0.05, 0.15), M_STEEL, TR, open_faces=('+z',))
    solidify(t, 0.003)
    bevel(box(f'TrayFront_{key}', (0.27, 0.02, 0.17), (x, FRONT - 0.01, 0.16), m_col, TR), 0.004)
    decal(f'TrayLabel_{key}', M_LBL[key], 0.20, 0.06, (x, FRONT - 0.021, 0.19), 'front', TR)
    cyl(f'TrayHandle_{key}', 0.009, 0.14, (x, FRONT - 0.04, 0.115), M_DARK, TR, axis='X')

def make_pellet(bm, mtx):
    bmesh.ops.create_cone(bm, cap_ends=True, segments=7, radius1=0.0045, radius2=0.0045, depth=random.uniform(0.012, 0.022), matrix=mtx)


def make_chip(bm, mtx):
    res = bmesh.ops.create_cube(bm, size=1.0, matrix=mtx)
    bmesh.ops.scale(bm, vec=(0.003, 0.003, random.uniform(0.012, 0.035)), verts=res['verts'], space=mtx.inverted())


scatter('Product_Pellets', TR, M_PELLETS, 900, make_pellet, ((-0.385, -0.17), (-0.27, 0.16), (0.085, 0.17)))
scatter('Product_Chopped', TR, M_CHIPS, 1400, make_chip, ((-0.11, 0.11), (-0.27, 0.16), (0.085, 0.18)))
bm, bm_holes = bmesh.new(), bmesh.new()
for i, (bx, by, bz, rz) in enumerate(((0.235, -0.18, 0.105, 5), (0.30, -0.15, 0.105, -8), (0.25, 0.0, 0.105, 2), (0.31, 0.05, 0.105, 12), (0.27, -0.08, 0.152, -4))):
    m4 = Matrix.Translation((bx, by, bz)) @ Matrix.Rotation(rad(rz), 4, 'Z') @ Matrix.Rotation(rad(90), 4, 'Y')
    bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=0.025, radius2=0.025, depth=0.11, matrix=m4)
    for end in (-1, 1):  # รูกลวงตรงกลางแท่ง (วงกลมสีเข้มที่ปลายทั้งสองข้าง)
        bmesh.ops.create_circle(bm_holes, cap_ends=True, segments=16, radius=0.0095, matrix=m4 @ Matrix.Translation((0, 0, end * 0.0556)))
link('Product_Briquettes', bm, TR, M_BRIQ, smooth=True)
link('Product_BriquetteHoles', bm_holes, TR, M_RUBBER)

# ================================================================ 11. ด้านหลัง (Rear)
R = C['Rear']
YB = D / 2
cyl('DustFan_Housing', 0.12, 0.09, (-0.20, YB + 0.045, 1.32), M_STEEL_DARK, R, axis='Y')
cyl('DustFan_Motor', 0.06, 0.08, (-0.20, YB + 0.13, 1.32), M_MOTOR, R, axis='Y')
for k in range(6):
    box(f'DustFan_Grille{k}', (0.22, 0.004, 0.006), (-0.20, YB + 0.092, 1.27 + k * 0.02), M_DARK, R)
pipe('DustDuct', [(0.0, 0.0, MILL_Z + MILL_R - 0.01), (-0.05, 0.12, 1.43), (-0.20, 0.22, 1.40), (-0.20, YB + 0.01, 1.32)], 0.035, M_STEEL_DARK, R)
pipe('DustBag_Pipe', [(-0.20, YB + 0.06, 1.20), (-0.20, YB + 0.08, 1.12)], 0.04, M_STEEL_DARK, R)
cyl('DustBag', 0.10, 0.36, (-0.20, YB + 0.09, 0.92), M_FABRIC, R, r2=0.085)
cyl('DustBag_Clamp', 0.088, 0.02, (-0.20, YB + 0.09, 1.10), M_STEEL, R)
bevel(box('ElectricCabinet', (0.32, 0.14, 0.44), (0.18, YB + 0.07, 0.66), M_WHITE, R), 0.006)
bevel(box('ElectricCabinet_Door', (0.29, 0.004, 0.41), (0.18, YB + 0.142, 0.66), M_WHITE, R), 0.002)
cyl('ElectricCabinet_Lock', 0.012, 0.02, (0.31, YB + 0.15, 0.66), M_STEEL, R, axis='Y')
bm = bmesh.new()
v = [bm.verts.new(p) for p in ((-0.05, 0, -0.04), (0.05, 0, -0.04), (0, 0, 0.045))]
bm.faces.new(v)
link('ElectricCabinet_Warning', bm, R, M_YELLOW, (0.18, YB + 0.1445, 0.80))
for k in range(8):
    box(f'Vent_{k}', (0.24, 0.012, 0.012), (0.18, YB + 0.006, 1.45 + k * 0.028), M_DARK, R)
pipe('PowerCable', [(0.10, YB + 0.10, 0.44), (0.10, YB + 0.18, 0.15), (0.0, YB + 0.40, 0.01)], 0.009, M_RUBBER, R)

# ================================================================ ฉาก: พื้น ไฟ กล้อง
bpy.ops.mesh.primitive_plane_add(size=30)
floor = bpy.context.active_object
floor.name = 'Floor_ShadowCatcher'
for c in floor.users_collection:
    c.objects.unlink(floor)
STAGE.objects.link(floor)
floor.data.materials.append(M_FLOOR)
floor.is_shadow_catcher = True


def light(name, loc, energy, size, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.energy, ld.size, ld.color = energy, size, color
    ob = bpy.data.objects.new(name, ld)
    STAGE.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector((0, 0, 0.9)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return ob


light('Key', (-2.6, -2.8, 3.6), 900, 2.5)
light('Fill', (3.0, -2.2, 1.8), 300, 3.0, (0.92, 0.96, 1.0))
light('Rim', (1.5, 3.2, 3.2), 600, 2.0)
world = bpy.data.worlds.new('World')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.75, 0.8, 0.85, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.35


def camera(name, loc, target, lens):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    ob = bpy.data.objects.new(name, cd)
    STAGE.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return ob


CAMS = {
    'front': camera('CAM_Front', (-2.5, -3.6, 1.6), (0, 0, 1.06), 56),
    'cutaway': camera('CAM_Cutaway', (-2.0, -3.0, 1.5), (0, 0, 1.0), 54),
    'back': camera('CAM_Back', (2.4, 3.4, 1.65), (0, 0, 1.06), 56),
    'exploded': camera('CAM_Exploded', (-3.6, -4.8, 2.3), (0, -0.1, 1.05), 64),
}
scene.camera = CAMS['front']

# ---------------------------------------------------------------- การแสดงผล / render
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 24 if QUICK else 128
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.resolution_percentage = 40 if QUICK else 100
scene.frame_start, scene.frame_end = 1, 60
scene.render.fps = 30

MODEL_OBJECTS = [o for c in C.values() for o in c.objects]
ANNOTATE = {  # จุดชี้ในภาพ: ชื่อ object -> ข้อความ
    'cutaway': [('Hopper', 'ช่องป้อน + ตะแกรงกันมือ'), ('Magnet_Bar', 'แม่เหล็กดักเศษเหล็ก'), ('Moisture_Sensor', 'เซนเซอร์ความชื้น'),
                ('Rotor_Disc1', 'เครื่องสับ (Hammer mill)'), ('Mill_Screen_Coarse', 'ตะแกรงเปลี่ยนได้ 2 ขนาด'),
                ('Diverter_Flap', 'ลิ้นสลับทาง'), ('Pellet_Rollers', 'แม่พิมพ์อัดเม็ด (Flat die)'), ('Chute_Duct', 'ช่องตรง (โหมดสับ)'),
                ('Press_HeaterCoil', 'เกลียวอัดแท่ง + ขดลวดร้อน'), ('ScalePlate_chop', 'ตาชั่งใต้ถาด'),
                ('Mill_Motor', 'มอเตอร์เครื่องสับ ~3 kW'), ('DustDuct', 'ท่อดูดฝุ่น')],
    'exploded': [(f'@{k}', v) for k, v in PART_LABELS.items() if k not in ('Shell', 'FrontPanels', 'Controls')],
}


def set_hidden(names, hidden):
    for o in MODEL_OBJECTS:
        if o.name in names or any(o.name in C[c].objects for c in names if c in C):
            o.hide_render = hidden


def anchor(key):
    """จุดกึ่งกลาง bounding box (world) ของ object หรือ collection ('@ชื่อ')"""
    objs = list(C[key[1:]].objects) if key.startswith('@') else [bpy.data.objects[key]]
    dg = bpy.context.evaluated_depsgraph_get()
    pts = [o.evaluated_get(dg).matrix_world @ Vector(c) for o in objs for c in o.evaluated_get(dg).bound_box]
    return sum(pts, Vector()) / len(pts)


def render(view, cam_key, res=(1200, 1600)):
    scene.camera = CAMS[cam_key]
    scene.render.resolution_x, scene.render.resolution_y = res
    path = os.path.join(OUT, f'render_{view}.png')
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    if view in ANNOTATE:
        pts = []
        for key, text in ANNOTATE[view]:
            p = world_to_camera_view(scene, scene.camera, anchor(key))
            pts.append({'label': text, 'x': round(p.x, 4), 'y': round(1 - p.y, 4)})
        with open(os.path.join(OUT, f'render_{view}.json'), 'w', encoding='utf-8') as f:
            pct = scene.render.resolution_percentage / 100
            json.dump({'image': f'render_{view}.png', 'width': int(res[0] * pct), 'height': int(res[1] * pct), 'points': pts}, f, ensure_ascii=False, indent=1)
    print('rendered', path)


# ---------------------------------------------------------------- ภาพนิ่ง (ก่อนใส่ animation)
CUTAWAY_HIDE = ['FrontPanels', 'Controls', 'Panel_Left', 'Top_Front', 'Top_Left']
SHELL_PANELS = ['Panel_Left', 'Panel_Right', 'Panel_Back', 'Top_Front', 'Top_Back', 'Top_Left', 'Top_Right', 'Sticker_Warning']
EXPLODED_HIDE = ['FrontPanels', 'Controls'] + SHELL_PANELS + [f'Vent_{k}' for k in range(8)]
TRAY_PULL = 0.20
if DO_RENDER:
    render('front', 'front')
    render('back', 'back')
    set_hidden(CUTAWAY_HIDE, True)
    for o in C['Trays'].objects:
        o.location.y -= TRAY_PULL
    render('cutaway', 'cutaway')
    # ภาพสินค้าในถาด (ใช้เป็นรูปในใบรับของ LINE)
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = 'JPEG'
    scene.render.image_settings.color_mode = 'RGB'
    for key, x, _ in TRAYS:
        target = (x, -0.05 - TRAY_PULL + 0.02, 0.12)
        CAMS[f'tray_{key}'] = camera(f'CAM_Tray_{key}', (x + 0.06, target[1] - 0.42, 0.62), target, 62)
        scene.camera = CAMS[f'tray_{key}']
        scene.render.resolution_x, scene.render.resolution_y = 1040, 676
        scene.render.filepath = os.path.join(OUT, f'receipt-{key}.jpg')
        bpy.ops.render.render(write_still=True)
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    for o in C['Trays'].objects:
        o.location.y += TRAY_PULL
    set_hidden(CUTAWAY_HIDE, False)

# ---------------------------------------------------------------- animation แยกชิ้น (frame 1 = ประกอบ, 60 = แยกชิ้น)
EXPLODE = {
    'FrontPanels': (0, -0.95, 0), 'Controls': (0, -0.95, 0), 'Feed': (0, 0, 0.55), 'HammerMill': (0, 0, 0.28),
    'Diverter': (0, 0, 0.08), 'PelletMill': (-0.55, 0, -0.04), 'StraightChute': (0, 0, -0.04), 'ScrewPress': (0.55, 0, -0.04),
    'Trays': (0, -0.55, 0), 'Rear': (0, 0.70, 0),
}
SHELL_EXPLODE = {'Panel_Left': (-0.95, 0, 0), 'Panel_Right': (0.95, 0, 0), 'Panel_Back': (0, 0.45, 0), 'Sticker_Warning': (0.95, 0, 0)}
for c_name, coll in C.items():
    for o in coll.objects:
        off = SHELL_EXPLODE.get(o.name, (0, 0, 1.15) if o.name.startswith('Top_') else (0, 0, 0)) if c_name == 'Shell' else EXPLODE[c_name]
        if off == (0, 0, 0):
            continue
        o.keyframe_insert('location', frame=1)
        o.location = o.location + Vector(off)
        o.keyframe_insert('location', frame=60)
        o.location = o.location - Vector(off)

if DO_RENDER:
    scene.frame_set(60)
    set_hidden(EXPLODED_HIDE, True)  # ภาพแยกชิ้นโชว์เฉพาะกลไกภายใน (แผงหน้าดูได้จากภาพ front)
    render('exploded', 'exploded', (1600, 1600))
    set_hidden(EXPLODED_HIDE, False)
scene.frame_set(1)
scene.camera = CAMS['front']

# ---------------------------------------------------------------- บันทึกไฟล์
blend_path = os.path.join(HERE, 'rai_mai_phao.blend')
if DO_RENDER or '--save' in argv:
    bpy.ops.wm.save_as_mainfile(filepath=blend_path, compress=True)
    print('saved', blend_path)
    for o in scene.objects:
        o.select_set(o in MODEL_OBJECTS)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'rai_mai_phao.glb'), export_format='GLB', use_selection=True,
                              export_apply=True, export_animations=True, export_animation_mode='SCENE', export_anim_scene_split_object=False,
                              export_cameras=False, export_lights=False)  # SCENE = รวมเป็น animation เดียว ให้เว็บเลื่อนแยกชิ้นได้
    print('exported glb')
