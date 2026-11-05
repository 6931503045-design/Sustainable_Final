"""
booth_mockup.py — ภาพจำลองการจัดบูธ "ไร่ไม่เผา" บนโต๊ะพับ 150 × 60 × 75 ซม.

ใช้: python booth/booth_mockup.py [--quick]      (รันจากโฟลเดอร์ blender/, ต้องรัน build_model.py --save ก่อนเพื่อได้ .glb)
     หรือ blender -b -P booth/booth_mockup.py -- [--quick]
ผลลัพธ์: booth/output/booth_view.png, booth_top.png, booth_front.png + booth_points.json (ตำแหน่งป้ายสำหรับ booth_compose.mjs)
"""
import bpy
import bmesh
import json
import math
import os
import sys
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
QUICK = '--quick' in argv
HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
OUT = os.path.join(HERE, 'output')
GLB = os.path.join(HERE, '..', 'output', 'rai_mai_phao.glb')
os.makedirs(OUT, exist_ok=True)
rad = math.radians

# ขนาดโต๊ะ (เมตร) — โต๊ะพับขาเหล็กมาตรฐาน
TW, TD, TH = 1.50, 0.60, 0.75
MODEL_SCALE = 1 / 8  # โมเดลพิมพ์ 3D: ตู้จริงสูง 180 ซม. → 22.5 ซม.

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple((c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4) for c in (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)))


def mat(name, color='#ffffff', metal=0.0, rough=0.5, image=None, emit=0.0, alpha=1.0, transmission=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*hex_rgb(color), 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    b.inputs['Alpha'].default_value = alpha
    if transmission:
        b.inputs['Transmission Weight'].default_value = transmission
    if image:
        t = m.node_tree.nodes.new('ShaderNodeTexImage')
        t.image = bpy.data.images.load(os.path.join(TEX, image))
        if emit:
            b.inputs['Base Color'].default_value = (0, 0, 0, 1)
            m.node_tree.links.new(t.outputs['Color'], b.inputs['Emission Color'])
            b.inputs['Emission Strength'].default_value = emit
        else:
            m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])
    return m


def box(name, size, loc, m, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    me.materials.append(m)
    return ob


def cyl(name, r, h, loc, m, rot=(0, 0, 0), r2=None, segs=48):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=h)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    for p in me.polygons:
        p.use_smooth = len(p.vertices) == 4
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    me.materials.append(m)
    return ob


def panel(name, w, h, m, loc, rot):
    """แผ่นภาพบาง (หน้าภาพหัน -Y เมื่อ rot = (90°, 0, 0))"""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5, calc_uvs=True)
    bmesh.ops.scale(bm, vec=(w, h, 1), verts=bm.verts)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    me.materials.append(m)
    return ob


# ---------------------------------------------------------------- วัสดุ
M_TOP = mat('TableTop', '#f4f4f2', rough=0.35)
M_EDGE = mat('TableEdge', '#2b2b2b', rough=0.5)
M_CHROME = mat('Chrome', '#d8dadd', metal=1, rough=0.18)
M_SKIRT_SIDE = mat('SkirtSide', '#2f6b3a', rough=0.9)
M_FLOOR = mat('Floor', '#8d8a84', rough=0.8)
M_WALL = mat('Wall', '#5f6b73', rough=0.9)  # ผนังเทาเข้ม ให้บอร์ดสีขาวเด่น
M_BOARD_EDGE = mat('BoardEdge', '#b9bec2', rough=0.6)  # ขอบบอร์ดเทา ให้เห็นในแปลนด้านบน
M_BLACK = mat('Black', '#16181b', rough=0.4)
M_GLASS = mat('JarGlass', '#ffffff', rough=0.05, transmission=1.0)
M_RISER = mat('Riser', '#23272a', rough=0.5)
CONTENTS = {'raw': '#c9a44a', 'chop': '#d9b45a', 'pellet': '#a07a3f', 'briquette': '#5b4027'}

# ---------------------------------------------------------------- พื้น + ผนังหลัง
box('Floor', (14, 10, 0.02), (0, 0.6, -0.01), M_FLOOR)
box('BackWall', (14, 0.05, 3), (0, 1.6, 1.5), M_WALL)

# ---------------------------------------------------------------- โต๊ะพับ
box('Table_Top', (TW, TD, 0.025), (0, 0, TH - 0.0125), M_TOP)
for sy in (-1, 1):
    box(f'Table_EdgeY{sy}', (TW + 0.004, 0.004, 0.027), (0, sy * TD / 2, TH - 0.0125), M_EDGE)
for sx in (-1, 1):
    box(f'Table_EdgeX{sx}', (0.004, TD, 0.027), (sx * TW / 2, 0, TH - 0.0125), M_EDGE)
    box(f'Table_Apron{sx}', (0.03, TD - 0.06, 0.04), (sx * (TW / 2 - 0.08), 0, TH - 0.045), M_EDGE)
    for sy in (-1, 1):
        box(f'Table_Leg{sx}{sy}', (0.03, 0.03, TH - 0.03), (sx * (TW / 2 - 0.08), sy * (TD / 2 - 0.05), (TH - 0.03) / 2), M_CHROME)
    box(f'Table_Bar{sx}', (0.025, TD - 0.1, 0.025), (sx * (TW / 2 - 0.08), 0, 0.25), M_CHROME)
for sy in (-1, 1):
    box(f'Table_Rail{sy}', (TW - 0.2, 0.025, 0.04), (0, sy * (TD / 2 - 0.03), TH - 0.045), M_EDGE)

# ผ้าหน้าโต๊ะ (พิมพ์ไวนิล/ผ้า) + ผ้าข้าง
SKIRT_H = TH - 0.04
panel('Skirt_Front', TW, SKIRT_H, mat('SkirtFront', image='skirt.png', rough=0.9), (0, -TD / 2 - 0.004, 0.04 + SKIRT_H / 2), (rad(90), 0, 0))
for sx in (-1, 1):
    panel(f'Skirt_Side{sx}', TD, SKIRT_H, M_SKIRT_SIDE, (sx * (TW / 2 + 0.004), 0, 0.04 + SKIRT_H / 2), (rad(90), 0, rad(90 * sx)))

Z = TH  # ผิวโต๊ะ

# ---------------------------------------------------------------- ฟิวเจอร์บอร์ด 3 ทบ (60 + 30 + 30 ซม. สูง 90 ซม.) ด้านหลังโต๊ะ
BX, BY, BH, BC, BW = 0.20, 0.22, 0.90, 0.60, 0.30
WING = rad(35)


def board(name, w, image, loc, rotz):
    box(f'{name}_Core', (w, 0.005, BH), loc, M_BOARD_EDGE, (0, 0, rotz))
    off = Vector((0, -0.0028, 0))
    off.rotate(__import__('mathutils').Euler((0, 0, rotz)))
    return panel(name, w, BH, mat(name, image=image, rough=0.7), Vector(loc) + off, (rad(90), 0, rotz))


board('Board_Center', BC, 'board_center.png', (BX, BY, Z + BH / 2), 0)
for side, img in ((-1, 'board_left.png'), (1, 'board_right.png')):
    hinge = Vector((BX + side * BC / 2, BY, Z + BH / 2))
    d = Vector((side * math.cos(WING), -math.sin(WING), 0))
    board(f'Board_{"Left" if side < 0 else "Right"}', BW, img, hinge + d * (BW / 2), -side * WING)

# ---------------------------------------------------------------- จอคอม 22–24" (เว็บ / หน้าพรีเซนต์ / โมเดล 3D)
MX, MY, MROT = -0.47, 0.02, rad(18)
SW, SH = 0.52, 0.29
screen_z = Z + 0.12 + SH / 2
box('Monitor_Base', (0.22, 0.17, 0.012), (MX, MY + 0.03, Z + 0.006), M_BLACK, (0, 0, MROT))
box('Monitor_Neck', (0.04, 0.025, 0.14), (MX, MY + 0.05, Z + 0.07), M_BLACK, (0, 0, MROT))
box('Monitor_Bezel', (SW + 0.02, 0.022, SH + 0.02), (MX, MY, screen_z), M_BLACK, (rad(-5), 0, MROT))
off = Vector((0, -0.0115, 0))
off.rotate(__import__('mathutils').Euler((rad(-5), 0, MROT)))
panel('Monitor_Screen', SW, SH, mat('MonitorScreen', image='monitor.png', emit=1.0), Vector((MX, MY, screen_z)) + off, (rad(85), 0, MROT))

# ---------------------------------------------------------------- แท็บเล็ต (หน้าจอตู้ /kiosk) บนขาตั้ง
TX, TY = 0.55, -0.13
box('Tablet_Stand', (0.10, 0.10, 0.01), (TX, TY + 0.03, Z + 0.005), M_BLACK)
box('Tablet_StandArm', (0.03, 0.01, 0.13), (TX, TY + 0.055, Z + 0.065), M_BLACK, (rad(-25), 0, 0))
box('Tablet_Body', (0.25, 0.008, 0.17), (TX, TY, Z + 0.13), M_BLACK, (rad(-25), 0, rad(-10)))
off = Vector((0, -0.0045, 0))
off.rotate(__import__('mathutils').Euler((rad(-25), 0, rad(-10))))
panel('Tablet_Screen', 0.235, 0.155, mat('TabletScreen', image='tablet.png', emit=1.0), Vector((TX, TY, Z + 0.13)) + off, (rad(65), 0, rad(-10)))

# ---------------------------------------------------------------- โมเดลพิมพ์ 3D ของตู้ (1:8) บนแท่นหมุน
RX, RY = BX, -0.06
cyl('Model_Riser', 0.12, 0.05, (RX, RY, Z + 0.025), M_RISER)
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=GLB)
imported = [o for o in bpy.data.objects if o not in before]
root = bpy.data.objects.new('Printed_Model', None)
col.objects.link(root)
for o in imported:
    if o.parent is None:
        o.parent = root
    if o.animation_data:
        o.animation_data_clear()  # ไม่เอา animation แยกชิ้น
root.scale = (MODEL_SCALE,) * 3
root.location = (RX, RY, Z + 0.05)
root.rotation_euler = (0, 0, rad(-20))
scene.frame_set(1)
panel('Model_Tag', 0.15, 0.05, mat('ModelTag', image='model_tag.png'), (RX, RY - 0.15, Z + 0.025), (rad(65), 0, 0))
box('Model_TagBack', (0.15, 0.003, 0.055), (RX, RY - 0.147, Z + 0.025), M_BOARD_EDGE, (rad(-25), 0, 0))

# ---------------------------------------------------------------- ขวดตัวอย่างวัตถุดิบ/สินค้า 4 ขวด (ดิบ → C สับ → A อัดเม็ด → B อัดแท่ง)
for i, (k, c) in enumerate(CONTENTS.items()):
    x = -0.20 + i * 0.085
    cyl(f'Jar_{k}', 0.033, 0.11, (x, -0.19, Z + 0.055), M_GLASS)
    cyl(f'Jar_{k}_Content', 0.03, 0.075, (x, -0.19, Z + 0.04), mat(f'Content_{k}', c, rough=0.9))
    cyl(f'Jar_{k}_Lid', 0.034, 0.015, (x, -0.19, Z + 0.118), M_BLACK)

# ---------------------------------------------------------------- ป้าย QR ตั้งโต๊ะ A5
QX, QY = -0.62, -0.19
panel('QR_Stand', 0.148, 0.21, mat('QRStand', image='qr_stand.png'), (QX, QY, Z + 0.10), (rad(75), 0, rad(15)))
box('QR_StandBack', (0.15, 0.004, 0.21), (QX + 0.002, QY + 0.004, Z + 0.10), M_BOARD_EDGE, (rad(-15), 0, rad(15)))

# ---------------------------------------------------------------- แสง + กล้อง
def light(name, loc, energy, size):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.energy, ld.size = energy, size
    ob = bpy.data.objects.new(name, ld)
    col.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector((0, 0, 0.9)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    ob.visible_camera = False  # ไม่ให้แผ่นไฟโผล่ในภาพ


light('Key', (-1.6, -2.2, 2.8), 260, 2.5)
light('Fill', (2.0, -1.8, 2.0), 110, 3)
light('Top', (0, 0, 3.2), 140, 2)
scene.world = bpy.data.worlds.new('W')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.35


def camera(name, loc, target, lens=35, ortho=None):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    if ortho:
        cd.type, cd.ortho_scale = 'ORTHO', ortho
    ob = bpy.data.objects.new(name, cd)
    col.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return ob


CAMS = {
    'view': (camera('CAM_View', (-0.85, -2.25, 1.5), (0.05, 0.08, 1.02), 30), (1800, 1350)),
    'top': (camera('CAM_Top', (0, -0.02, 4.0), (0, 0.0, 0), ortho=2.0), (1600, 1100)),
    'front': (camera('CAM_Front', (0.0, -3.5, 0.88), (0.0, 0.0, 0.88), ortho=2.6), (1500, 1150)),  # ภาพตรงด้านหน้า (มีระยะ)
}
CAMS['top'][0].rotation_euler = (0, 0, 0)

scene.render.engine = 'CYCLES'
scene.cycles.samples = 24 if QUICK else 128
scene.cycles.use_denoising = True
scene.view_settings.view_transform = 'Standard'
scene.view_settings.exposure = -0.45  # กันกระดาษขาวบนบอร์ดสว่างจนอ่านไม่ออก
scene.render.resolution_percentage = 50 if QUICK else 100

# จุดสำหรับใส่ป้ายหมายเลข (ใช้ใน booth_compose.mjs)
POINTS = {
    'monitor': (MX, MY - 0.02, screen_z),
    'board_left': (BX - BC / 2 - 0.12, BY - 0.08, Z + 0.55),
    'board_center': (BX, BY, Z + 0.70),
    'board_right': (BX + BC / 2 + 0.12, BY - 0.08, Z + 0.55),
    'model': (RX, RY, Z + 0.20),
    'jars': (-0.07, -0.19, Z + 0.10),
    'tablet': (TX, TY, Z + 0.15),
    'qr': (QX, QY, Z + 0.15),
    'skirt': (0.0, -TD / 2, 0.40),
}
DIMS = {'table_l': [(-TW / 2, -TD / 2, Z), (TW / 2, -TD / 2, Z)], 'table_d': [(TW / 2, -TD / 2, Z), (TW / 2, TD / 2, Z)],
        'table_h': [(TW / 2, -TD / 2, 0), (TW / 2, -TD / 2, Z)], 'board_h': [(BX + BC / 2, BY, Z), (BX + BC / 2, BY, Z + BH)]}
meta = {}
for key, (cam, res) in CAMS.items():
    if key == 'top':  # มองจากด้านบน: ซ่อนผนัง/ผ้าข้างที่บัง
        for n in ('BackWall',):
            bpy.data.objects[n].hide_render = True
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = os.path.join(OUT, f'booth_{key}.png')
    bpy.ops.render.render(write_still=True)
    pct = scene.render.resolution_percentage / 100
    proj = lambda co: (lambda p: [round(p.x, 4), round(1 - p.y, 4)])(world_to_camera_view(scene, cam, Vector(co)))  # noqa: E731
    meta[key] = {'image': f'booth_{key}.png', 'width': int(res[0] * pct), 'height': int(res[1] * pct),
                 'points': {k: proj(v) for k, v in POINTS.items()}, 'dims': {k: [proj(a), proj(b)] for k, (a, b) in DIMS.items()}}
    bpy.data.objects['BackWall'].hide_render = False
    print('rendered', key)
with open(os.path.join(OUT, 'booth_points.json'), 'w', encoding='utf-8') as f:
    json.dump(meta, f, indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'booth_mockup.blend'), compress=True)
