# Modela a plataforma tesoura e o operador por partes e exporta um GLB.
# Coordenadas escritas no sistema do jogo (Y para cima, Z para frente).
import bpy, math, sys
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)

MATS = {}
def mat(name, color, metal=0.0, rough=0.5):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    MATS[name] = m; return m

PAINT = mat('paint', (0.15, 0.25, 0.06), 0.3, 0.4); PAINTD = mat('paintD', (0.08, 0.14, 0.03), 0.3, 0.45)
STEEL = mat('steel', (0.5, 0.52, 0.55), 0.85, 0.35); DARK = mat('dark', (0.02, 0.025, 0.03), 0.5, 0.6)
RUBBER = mat('rubber', (0.012, 0.012, 0.014), 0, 0.92); HUB = mat('hub', (0.7, 0.72, 0.75), 0.7, 0.35)
YELLOW = mat('yellow', (0.9, 0.45, 0.0), 0.2, 0.5); RED = mat('red', (0.7, 0.02, 0.01), 0, 0.4)
CHROME = mat('chrome', (1, 1, 1), 1, 0.12); DECK = mat('deck', (0.2, 0.22, 0.24), 0.6, 0.5)
HAZ = mat('hazard', (0.9, 0.45, 0), 0, 0.6); GREEN = mat('btnGreen', (0.02, 0.35, 0.05), 0, 0.4)
SCREEN = mat('screen', (0.01, 0.03, 0.02), 0.2, 0.15); LABEL = mat('labora', (0.86, 0.86, 0.86), 0, 0.45)
VEST = mat('vest', (1.0, 0.15, 0.0), 0, 0.75); REFL = mat('reflect', (0.8, 0.9, 0.2), 0, 0.3)
PANTS = mat('pants', (0.02, 0.035, 0.07), 0, 0.9); SKIN = mat('skin', (0.58, 0.27, 0.15), 0, 0.8)
HELMET = mat('helmet', (0.9, 0.9, 0.88), 0, 0.35); STRAP = mat('strap', (0.012, 0.012, 0.012), 0, 0.9)
BOOT = mat('boot', (0.06, 0.035, 0.02), 0, 0.8); GLOVE = mat('glove', (0.55, 0.42, 0.18), 0, 0.85)
SHIRT = mat('shirt', (0.05, 0.08, 0.16), 0, 0.85)

def G2B(x, y, z): return Vector((x, -z, y))

def fin(o, m, bevel=0.0, seg=2):
    o.data.materials.append(m)
    if bevel:
        b = o.modifiers.new('bv', 'BEVEL'); b.width = bevel; b.segments = seg; b.limit_method = 'ANGLE'; b.angle_limit = math.radians(40)
    return o

def cube(size, loc, m, bevel=0.0, seg=2):
    bpy.ops.mesh.primitive_cube_add(size=1, location=G2B(*loc)); o = bpy.context.object
    o.scale = (size[0], size[2], size[1]); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return fin(o, m, bevel, seg)

ROT = {'x': (0, math.pi / 2, 0), 'y': (0, 0, 0), 'z': (math.pi / 2, 0, 0)}
def cyl(r, h, loc, m, axis='y', verts=24, bevel=0.0, r2=None, seg=2):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=G2B(*loc), rotation=ROT[axis])
    else: bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=h, vertices=verts, location=G2B(*loc), rotation=ROT[axis])
    o = bpy.context.object; bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    return fin(o, m, bevel, seg)

def sphere(r, loc, m, scale=(1, 1, 1), seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=seg, ring_count=seg // 2, location=G2B(*loc)); o = bpy.context.object
    o.scale = (scale[0], scale[2], scale[1]); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return fin(o, m)

def torus(R, r, loc, m, axis='y'):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=24, minor_segments=8, location=G2B(*loc), rotation=ROT[axis])
    o = bpy.context.object; bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    return fin(o, m)

def uvmap(o, fn):
    me = o.data
    if not me.uv_layers: me.uv_layers.new()
    uv = me.uv_layers.active.data
    for poly in me.polygons:
        for li in poly.loop_indices:
            uv[li].uv = fn(me.vertices[me.loops[li].vertex_index].co + o.location)

def text(s, size, loc, m, side):
    bpy.ops.object.text_add(location=G2B(*loc)); o = bpy.context.object
    o.data.body = s; o.data.size = size; o.data.extrude = 0.0015; o.data.align_x = 'CENTER'; o.data.align_y = 'CENTER'
    cols = {'+x': ((0, 1, 0), (0, 0, 1), (1, 0, 0)), '-x': ((0, -1, 0), (0, 0, 1), (-1, 0, 0)), '+z': ((1, 0, 0), (0, 0, 1), (0, -1, 0))}[side]
    o.rotation_euler = Matrix(cols).transposed().to_euler()
    bpy.ops.object.convert(target='MESH'); o = bpy.context.object
    return fin(o, m)

def boolean(o, cutters):
    for c in cutters:
        b = o.modifiers.new('cut', 'BOOLEAN'); b.operation = 'DIFFERENCE'; b.object = c; b.solver = 'EXACT'
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    for mname in [x.name for x in o.modifiers if x.type == 'BOOLEAN']: bpy.ops.object.modifier_apply(modifier=mname)
    for c in cutters: bpy.data.objects.remove(c, do_unlink=True)

def part(name, objs, smooth=35):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.convert(target='MESH')
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.object; o.name = name; o.data.name = name
    bpy.context.scene.cursor.location = (0, 0, 0); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(smooth))
    return o

# ─────────── chassi (coordenadas do grupo "tilt") ───────────
L = []
body = cube((0.78, 0.30, 1.86), (0, 0.42, 0), PAINT, 0.03, 3)
cut = [cyl(0.235, 0.22, (sx * 0.37, 0.19, sz * 0.7), PAINT, 'x', 32) for sx in (1, -1) for sz in (1, -1)]
boolean(body, cut); L.append(body)
L.append(cube((0.80, 0.03, 1.9), (0, 0.565, 0), PAINTD, 0.008))
L.append(cube((0.70, 0.10, 1.4), (0, 0.2, 0), DARK, 0.01))
for sz in (1, -1):
    L.append(cube((0.84, 0.11, 0.07), (0, 0.29, sz * 0.955), DARK, 0.015))
    hz = cube((0.80, 0.07, 0.01), (0, 0.29, sz * 0.993), HAZ); uvmap(hz, lambda c: (c.x / 0.8 + 0.5, c.z / 0.07 + 0.5)); L.append(hz)
    for sx in (1, -1): L.append(torus(0.025, 0.007, (sx * 0.33, 0.6, sz * 0.88), YELLOW, 'x'))
for i in range(7): L.append(cube((0.03, 0.12, 0.012), (-0.27 + i * 0.09, 0.43, 0.932), DARK, 0.003))
for sx in (1, -1): L.append(cube((0.045, 0.035, 1.72), (sx * 0.29, 0.592, 0), DARK, 0.006))
# arcos dos para-lamas
# comando de solo e descida de emergência
L.append(cube((0.32, 0.22, 0.06), (-0.2, 0.44, -0.96), DARK, 0.012))
L.append(cyl(0.032, 0.02, (-0.29, 0.47, -0.995), RED, 'z', 20)); L.append(sphere(0.03, (-0.29, 0.47, -1.005), RED, (1, 1, 0.5)))
L.append(cyl(0.014, 0.03, (-0.2, 0.47, -0.995), CHROME, 'z', 12)); L.append(cube((0.07, 0.04, 0.004), (-0.11, 0.48, -0.991), SCREEN))
for i in range(2): L.append(cyl(0.012, 0.012, (-0.12 + i * 0.04, 0.41, -0.993), GREEN, 'z', 12))
L.append(cyl(0.022, 0.06, (0.2, 0.3, -0.99), RED, 'z', 16, 0.005)); L.append(cube((0.06, 0.05, 0.02), (0.2, 0.3, -0.955), DARK))
L.append(cube((0.05, 0.035, 0.03), (0.3, 0.46, -0.955), DARK, 0.005))
# escada
for i in range(3):
    L.append(cube((0.36, 0.025, 0.075), (0.1, 0.22 + i * 0.22, -1.0), STEEL, 0.004))
    for k in range(5): L.append(cube((0.34, 0.006, 0.006), (0.1, 0.235 + i * 0.22, -1.03 + k * 0.015), DARK))
for x in (-0.08, 0.28): L.append(cube((0.03, 0.72, 0.03), (x, 0.5, -1.0), STEEL, 0.005))
part('chassis', L)

# ─────────── bandejas laterais (origem na dobradiça) ───────────
for name, sx, side in (('trayL', 1, '+x'), ('trayR', -1, '-x')):
    L = [cube((0.02, 0.26, 1.0), (0, 0.13, 0), PAINTD, 0.006)]
    for i in range(4): L.append(cube((0.006, 0.012, 0.3), (sx * 0.012, 0.06 + i * 0.03, 0.3), DARK, 0.002))
    L.append(cube((0.025, 0.03, 0.18), (sx * 0.012, 0.22, 0.0), DARK, 0.006))
    L.append(text('LABORA', 0.085, (sx * 0.0115, 0.12, -0.18), LABEL, side))
    part(name, L)

# ─────────── roda (eixo X, face externa +X) ───────────
L = [cyl(0.19, 0.13, (0, 0, 0), RUBBER, 'x', 40, 0.045, seg=4)]
for k in range(3): L.append(cyl(0.192, 0.01, (-0.035 + k * 0.035, 0, 0), RUBBER, 'x', 40))
L.append(cyl(0.115, 0.136, (0, 0, 0), HUB, 'x', 32, 0.01))
L.append(cyl(0.085, 0.01, (0.066, 0, 0), DARK, 'x', 32))
for k in range(5):
    a = k * 2 * math.pi / 5; L.append(cyl(0.011, 0.02, (0.072, math.cos(a) * 0.06, math.sin(a) * 0.06), CHROME, 'x', 8))
L.append(cyl(0.03, 0.03, (0.072, 0, 0), CHROME, 'x', 16, 0.006))
part('wheel', L)

# ─────────── braços e pinos da tesoura ───────────
for name, m in (('armA', PAINT), ('armB', PAINTD)):
    L = [cube((0.035, 0.075, 1.62), (0, 0, 0), m, 0.008)]
    for z in (-0.81, 0, 0.81): L.append(cyl(0.045, 0.045, (0, 0, z), m, 'x', 20, 0.006))
    for z in (-0.4, 0.4): L.append(cube((0.039, 0.03, 0.22), (0, 0, z), PAINTD if m is PAINT else PAINT, 0.004))
    part(name, L)
L = [cyl(0.022, 0.72, (0, 0, 0), STEEL, 'x', 16)]
for sx in (1, -1): L.append(cyl(0.032, 0.012, (sx * 0.355, 0, 0), DARK, 'x', 16, 0.003))
part('pin', L)

# ─────────── plataforma (origem no centro do piso) ───────────
L = []
dk = cube((0.82, 0.06, 1.9), (0, 0, 0), DECK); uvmap(dk, lambda c: (c.x / 0.82 + 0.5, c.y / 1.9 + 0.5)); L.append(dk)
L.append(cube((0.86, 0.1, 1.94), (0, -0.07, 0), PAINT, 0.012))
for sx in (1, -1): L.append(cube((0.03, 0.05, 1.7), (sx * 0.29, -0.14, 0), DARK, 0.005))
for sx in (1, -1): L.append(cube((0.012, 0.15, 1.86), (sx * 0.405, 0.1, 0), PAINT, 0.004))
L.append(cube((0.8, 0.15, 0.012), (0, 0.1, 0.94), PAINT, 0.004))
for x in (0.39, -0.39):
    for z in (0.93, 0, -0.93): L.append(cube((0.04, 1.1, 0.04), (x, 0.58, z), PAINT, 0.006))
for y in (1.13, 0.6):
    for x in (0.39, -0.39): L.append(cube((0.04, 0.04, 1.9), (x, y, 0), PAINT, 0.006))
    L.append(cube((0.78, 0.04, 0.04), (0, y, 0.93), PAINT, 0.006))
# caixa de comando
L.append(cube((0.28, 0.2, 0.14), (-0.15, 1.02, 0.86), DARK, 0.02, 3))
L.append(cube((0.24, 0.006, 0.1), (-0.15, 1.123, 0.86), PAINTD))
L.append(cyl(0.028, 0.025, (-0.22, 1.14, 0.84), RUBBER, 'y', 16, 0.008)); L.append(cyl(0.011, 0.09, (-0.22, 1.19, 0.84), DARK, 'y', 10))
L.append(sphere(0.028, (-0.22, 1.24, 0.84), DARK, (1, 1.2, 1)))
L.append(cyl(0.02, 0.02, (-0.07, 1.135, 0.84), DARK, 'y', 16)); L.append(sphere(0.03, (-0.07, 1.15, 0.84), RED, (1, 0.55, 1)))
for i in range(3): L.append(cyl(0.011, 0.012, (-0.15 + i * 0.03, 1.128, 0.895), (GREEN, YELLOW, GREEN)[i], 'y', 12))
L.append(cube((0.06, 0.004, 0.03), (-0.13, 1.126, 0.83), SCREEN))
# caixa do manual
L.append(cube((0.24, 0.3, 0.05), (0.2, 0.8, 0.9), DARK, 0.01)); L.append(cube((0.2, 0.012, 0.03), (0.2, 0.95, 0.875), STEEL, 0.003))
# ancoragem
for sx in (1, -1):
    L.append(cube((0.03, 0.06, 0.08), (sx * 0.375, 0.06, 0.5), STEEL, 0.004)); L.append(torus(0.035, 0.009, (sx * 0.36, 0.1, 0.5), YELLOW, 'x'))
L.append(text('LABORA', 0.09, (0, 0.1, 0.947), LABEL, '+z'))
part('platform', L)

# ─────────── portão (origem na dobradiça) ───────────
L = []
for y in (1.13, 0.6, 0.15): L.append(cyl(0.019, 0.76, (-0.39, y, 0), YELLOW, 'x', 14))
L.append(cyl(0.019, 1.02, (-0.77, 0.64, 0), YELLOW, 'y', 14))
for y in (1.05, 0.25): L.append(cyl(0.026, 0.07, (0, y, 0), DARK, 'y', 14))
part('gate', L)

# ─────────── operador (pés em y=0, olhando para +Z) ───────────
L = []
for sx in (1, -1):
    L.append(cube((0.13, 0.1, 0.27), (sx * 0.09, 0.05, 0.035), BOOT, 0.035, 3))
    L.append(cyl(0.085, 0.84, (sx * 0.09, 0.5, 0), PANTS, 'y', 16, r2=0.068))
L.append(cube((0.34, 0.12, 0.21), (0, 0.9, 0), PANTS, 0.04, 3))
L.append(cube((0.36, 0.04, 0.225), (0, 0.86, 0), STRAP, 0.01))
L.append(cube((0.36, 0.42, 0.22), (0, 1.12, 0), SHIRT, 0.08, 4))
L.append(cube((0.4, 0.46, 0.24), (0, 1.1, 0), VEST, 0.07, 4))
for y in (0.97, 1.17): L.append(cube((0.405, 0.04, 0.245), (0, y, 0), REFL, 0.012, 2))
for sx in (1, -1): L.append(cube((0.045, 0.2, 0.245), (sx * 0.1, 1.25, 0), REFL, 0.01))
L.append(cyl(0.05, 0.1, (0, 1.41, 0), SKIN, 'y', 14))
L.append(sphere(0.105, (0, 1.53, 0.005), SKIN, (0.95, 1.12, 1)))
L.append(sphere(0.02, (0, 1.52, 0.105), SKIN))
for sx in (1, -1): L.append(sphere(0.022, (sx * 0.1, 1.53, 0), SKIN, (0.5, 1, 1)))
L.append(cube((0.2, 0.045, 0.02), (0, 1.565, 0.1), DARK, 0.008))
hm = sphere(0.135, (0, 1.58, 0), HELMET, (1, 0.95, 1.08), 32)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
for v in hm.data.vertices: v.select = v.co.z < -0.005
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.delete(type='VERT'); bpy.ops.object.mode_set(mode='OBJECT')
sol = hm.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.008
L.append(hm)
L.append(cyl(0.15, 0.012, (0, 1.585, 0.035), HELMET, 'y', 32, r2=0.14))
L.append(cube((0.012, 0.09, 0.32), (0, 1.7, 0), HELMET, 0.005))
part('op_body', L)
L = [cyl(0.052, 0.36, (0, 0.07, 0), VEST, 'y', 14, 0.02), cyl(0.045, 0.16, (0, -0.15, 0), SHIRT, 'y', 14, r2=0.04)]
L.append(cyl(0.044, 0.03, (0, -0.22, 0), GLOVE, 'y', 12)); L.append(sphere(0.05, (0, -0.27, 0.01), GLOVE, (0.8, 1.15, 1)))
part('op_arm', L)
L = [cube((0.42, 0.045, 0.255), (0, 0.86, 0), STRAP, 0.01)]
for sx in (1, -1):
    s = cube((0.045, 0.6, 0.25), (sx * 0.1, 1.1, 0), STRAP, 0.008); s.rotation_euler = (0, sx * -0.18, 0); L.append(s)
    L.append(cube((0.05, 0.05, 0.255), (sx * 0.12, 0.78, 0), STRAP, 0.008))
L.append(cube((0.22, 0.035, 0.255), (0, 1.2, 0), STRAP, 0.008))
L.append(torus(0.025, 0.006, (0, 1.28, -0.13), YELLOW, 'z')); L.append(cube((0.05, 0.03, 0.01), (0, 1.2, 0.13), CHROME, 0.003))
part('op_harness', L)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True)
print('PARTS', [o.name for o in bpy.data.objects], 'TRIS', sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH'))
