# Operador estilizado: peças rígidas presas a um esqueleto, com animações gravadas (idle, work, done).
# uso: blender -b --python operador_estilizado_blender.py -- models/worker2.glb
# Coordenadas no sistema do jogo (Y para cima, Z para frente); pés em y=0.
import bpy, math, sys
from mathutils import Vector, Euler

OUT = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = 30

MATS = {}
def mat(name, color, metal=0.0, rough=0.6):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    return m
VEST = mat('vest', (1.0, 0.16, 0.0), 0, 0.7); REFL = mat('reflect', (0.75, 0.78, 0.8), 0.3, 0.3)
SHIRT = mat('shirt', (0.04, 0.07, 0.16), 0, 0.85); PANTS = mat('pants', (0.03, 0.05, 0.11), 0, 0.9)
SKIN = mat('skin', (0.62, 0.36, 0.22), 0, 0.75); HELMET = mat('helmet', (0.93, 0.93, 0.9), 0, 0.3)
STRAP = mat('strap', (0.015, 0.015, 0.015), 0, 0.85); BUCKLE = mat('buckle', (0.75, 0.76, 0.78), 0.9, 0.3)
BOOT = mat('boot', (0.12, 0.06, 0.03), 0, 0.75); GLOVE = mat('glove', (0.7, 0.5, 0.2), 0, 0.8)
HS = mat('harnessStrap', (0.015, 0.015, 0.015), 0, 0.85); HB = mat('harnessBuckle', (0.75, 0.76, 0.78), 0.9, 0.3); HR = mat('harnessRing', (0.9, 0.5, 0.0), 0.3, 0.45)
EYE = mat('eye', (0.01, 0.01, 0.012), 0, 0.3); YEL = mat('ringYellow', (0.9, 0.5, 0.0), 0.3, 0.45)

def G2B(x, y, z): return Vector((x, -z, y))
def fin(o, m, bevel=0.0, seg=3):
    o.data.materials.append(m)
    if bevel:
        b = o.modifiers.new('bv', 'BEVEL'); b.width = bevel; b.segments = seg; b.limit_method = 'ANGLE'; b.angle_limit = math.radians(40)
    return o
def cube(size, loc, m, bevel=0.0, seg=3, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=G2B(*loc)); o = bpy.context.object
    o.scale = (size[0], size[2], size[1]); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if rot: o.rotation_euler = rot
    return fin(o, m, bevel, seg)
ROT = {'x': (0, math.pi / 2, 0), 'y': (0, 0, 0), 'z': (math.pi / 2, 0, 0)}
def cyl(r, h, loc, m, axis='y', verts=20, bevel=0.0, r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=G2B(*loc), rotation=ROT[axis])
    else: bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=h, vertices=verts, location=G2B(*loc), rotation=ROT[axis])
    o = bpy.context.object; bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    return fin(o, m, bevel)
def sphere(r, loc, m, scale=(1, 1, 1), seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=seg, ring_count=seg // 2, location=G2B(*loc)); o = bpy.context.object
    o.scale = (scale[0], scale[2], scale[1]); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return fin(o, m)
def torus(R, r, loc, m, axis='y', scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=28, minor_segments=8, location=G2B(*loc), rotation=ROT[axis])
    o = bpy.context.object; bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    o.scale = (scale[0], scale[2], scale[1]); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return fin(o, m)
def capsule(r, y0, y1, x, m, r2=None):
    L = [cyl(r, y1 - y0, (x, (y0 + y1) / 2, 0), m, 'y', 20, r2=r2), sphere(r, (x, y0, 0), m, seg=16), sphere(r2 or r, (x, y1, 0), m, seg=16)]
    return L
def part(name, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.convert(target='MESH')
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.object; o.name = 'm_' + name; o.data.name = 'm_' + name
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    return o

# ─────────── juntas ───────────
SX = 0.225  # ombro
J = {'hips': ((0, 0.92, 0), (0, 1.03, 0)), 'chest': ((0, 1.03, 0), (0, 1.4, 0)), 'head': ((0, 1.4, 0), (0, 1.72, 0))}
for sd, sg in (('l', 1), ('r', -1)):
    J['upperarm_' + sd] = ((sg * SX, 1.36, 0), (sg * SX, 1.08, 0)); J['forearm_' + sd] = ((sg * SX, 1.08, 0), (sg * SX, 0.82, 0)); J['hand_' + sd] = ((sg * SX, 0.82, 0), (sg * SX, 0.72, 0))
    J['thigh_' + sd] = ((sg * 0.09, 0.9, 0), (sg * 0.09, 0.5, 0)); J['shin_' + sd] = ((sg * 0.09, 0.5, 0), (sg * 0.09, 0.1, 0)); J['foot_' + sd] = ((sg * 0.09, 0.1, 0), (sg * 0.09, 0.02, 0.12))
PARENT = {'chest': 'hips', 'head': 'chest'}
for sd in 'lr':
    PARENT.update({'upperarm_' + sd: 'chest', 'forearm_' + sd: 'upperarm_' + sd, 'hand_' + sd: 'forearm_' + sd, 'thigh_' + sd: 'hips', 'shin_' + sd: 'thigh_' + sd, 'foot_' + sd: 'shin_' + sd})

# ─────────── peças ───────────
P = {}
# quadril: calça, cinto do cinturão com argolas laterais
L = [cube((0.33, 0.2, 0.21), (0, 0.93, 0), PANTS, 0.07, 4)]
L.append(cube((0.35, 0.05, 0.225), (0, 1.0, 0), HS, 0.012)); L.append(cube((0.06, 0.06, 0.012), (0, 1.0, 0.116), HB, 0.008))
for sg in (1, -1):
    L.append(torus(0.024, 0.006, (sg * 0.18, 0.99, 0), HR, 'x'))
    for z in (0.1, -0.1): L.append(cube((0.04, 0.16, 0.012), (sg * 0.09, 0.9, z), HS, 0.004))
P['hips'] = part('hips', L)
# tronco: camisa, colete com faixas, cinturão (suspensórios, fita peitoral, argola dorsal)
L = [cube((0.36, 0.4, 0.21), (0, 1.21, 0), SHIRT, 0.085, 4)]
L.append(cube((0.385, 0.36, 0.228), (0, 1.19, 0), VEST, 0.075, 4))
for y in (1.09, 1.21): L.append(cube((0.39, 0.035, 0.232), (0, y, 0), REFL, 0.01, 2))
for sg in (1, -1):
    L.append(cube((0.05, 0.42, 0.244), (sg * 0.1, 1.2, 0), HS, 0.012))             # suspensório frente e costas
    L.append(cube((0.055, 0.03, 0.2), (sg * 0.1, 1.405, 0), HS, 0.012))             # passa por cima do ombro
    L.append(cube((0.058, 0.035, 0.012), (sg * 0.1, 1.3, 0.124), HB, 0.006))
L.append(cube((0.25, 0.04, 0.012), (0, 1.27, 0.122), HS, 0.006)); L.append(cube((0.05, 0.05, 0.014), (0, 1.27, 0.128), HB, 0.008))
L.append(cube((0.25, 0.04, 0.012), (0, 1.3, -0.122), HS, 0.006)); L.append(torus(0.03, 0.007, (0, 1.3, -0.135), HB, 'z'))
for sg in (1, -1): L.append(sphere(0.06, (sg * (SX - 0.012), 1.365, 0), SHIRT, seg=18))
L.append(cyl(0.05, 0.08, (0, 1.42, 0), SKIN, 'y', 16))
L.append(torus(0.058, 0.014, (0, 1.4, 0), SHIRT, 'y', (1, 1, 1.05)))
P['chest'] = part('chest', L)
# cabeça: rosto simples, capacete com aba e jugular
L = [sphere(0.118, (0, 1.545, 0), SKIN, (0.96, 1.05, 0.98), 28)]
for sg in (1, -1):
    L.append(sphere(0.016, (sg * 0.043, 1.555, 0.108), EYE, (0.85, 1.25, 0.5), 14))
    L.append(sphere(0.024, (sg * 0.113, 1.54, 0), SKIN, (0.45, 1, 0.8), 12))
    L.append(cube((0.006, 0.12, 0.014), (sg * 0.112, 1.52, 0.03), STRAP, 0.002))
for sg in (1, -1): L.append(cube((0.035, 0.008, 0.01), (sg * 0.043, 1.585, 0.107), EYE, 0.003))
L.append(torus(0.028, 0.0045, (0, 1.505, 0.098), EYE, 'z', (1, 0.45, 1)))
hm = sphere(0.14, (0, 1.6, 0), HELMET, (1, 0.92, 1.08), 32)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
for v in hm.data.vertices: v.select = v.co.z < -0.002
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.delete(type='VERT'); bpy.ops.object.mode_set(mode='OBJECT')
sol = hm.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.008; L.append(hm)
L.append(cyl(0.153, 0.012, (0, 1.602, 0), HELMET, 'y', 32))
L.append(cube((0.2, 0.012, 0.11), (0, 1.602, 0.13), HELMET, 0.005))
L.append(cube((0.03, 0.012, 0.03), (0, 1.435, 0.07), STRAP, 0.004))
P['head'] = part('head', L)
for sd, sg in (('l', 1), ('r', -1)):
    x = sg * SX
    P['upperarm_' + sd] = part('upperarm_' + sd, capsule(0.055, 1.1, 1.34, x, SHIRT))
    P['forearm_' + sd] = part('forearm_' + sd, capsule(0.05, 0.85, 1.08, x, SHIRT, r2=0.052) + [cyl(0.05, 0.035, (x, 0.855, 0), GLOVE, 'y', 18)])
    L = [cube((0.085, 0.12, 0.05), (x, 0.765, 0.0), GLOVE, 0.022, 3), cube((0.03, 0.06, 0.03), (x, 0.78, 0.035), GLOVE, 0.012, 3)]
    P['hand_' + sd] = part('hand_' + sd, L)
    lx = sg * 0.09
    L = capsule(0.082, 0.52, 0.88, lx, PANTS, r2=0.086)
    L.append(torus(0.088, 0.016, (lx, 0.8, 0), HS, 'y')); L.append(cube((0.035, 0.035, 0.012), (lx + sg * 0.03, 0.8, 0.093), HB, 0.005))
    P['thigh_' + sd] = part('thigh_' + sd, L)
    P['shin_' + sd] = part('shin_' + sd, capsule(0.07, 0.13, 0.5, lx, PANTS, r2=0.078))
    L = [cube((0.125, 0.11, 0.25), (lx, 0.055, 0.04), BOOT, 0.04, 4), cube((0.13, 0.025, 0.26), (lx, 0.0125, 0.04), STRAP, 0.008)]
    P['foot_' + sd] = part('foot_' + sd, L)

# ─────────── esqueleto ───────────
bpy.ops.object.armature_add(location=(0, 0, 0)); arm = bpy.context.object; arm.name = 'worker'
bpy.ops.object.mode_set(mode='EDIT'); eb = arm.data.edit_bones; eb.remove(eb[0])
for n, (h, t) in J.items():
    b = eb.new(n); b.head = G2B(*h); b.tail = G2B(*t)
for n, p in PARENT.items(): eb[n].parent = eb[p]
bpy.ops.object.mode_set(mode='OBJECT')
for n, o in P.items():
    mw = o.matrix_world.copy(); o.parent = arm; o.parent_type = 'BONE'; o.parent_bone = n
    bpy.context.view_layer.update(); o.matrix_world = mw
REST = {b.name: b.matrix_local.to_quaternion() for b in arm.data.bones}
for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'

# ─────────── animação ───────────
L1, L2 = 0.28, 0.33
def ik(fwd, up):
    """mão a 'fwd' m à frente e 'up' m acima do ombro -> (giro do braço, giro do antebraço) em graus, eixo X do Blender"""
    dn = -up; d = min(L1 + L2 - 0.01, math.hypot(fwd, dn)); phi = math.atan2(fwd, dn)
    a = math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)); b = math.acos((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))
    return -math.degrees(phi - a), -math.degrees(math.pi - b)
S = math.sin
def base():
    return {n: [0.0, 0.0, 0.0] for n in J}
def arm_to(p, sd, fwd, up, inward=0.0, wrist=0.0):
    ua, fa = ik(fwd, up); sg = 1 if sd == 'l' else -1
    p['upperarm_' + sd] = [ua, 0, -sg * inward]; p['forearm_' + sd] = [fa, 0, 0]; p['hand_' + sd] = [wrist, 0, 0]
def sway(p, roll, loc):
    p['hips'] = [0, roll, 0]; p['thigh_l'][1] -= roll; p['thigh_r'][1] -= roll; p['_loc'] = loc
def idle(u):  # u de 0 a 1, laço de 6 s: mãos no comando, respira, olha em volta, troca o peso
    w = 2 * math.pi * u; p = base()
    arm_to(p, 'r', 0.33 + 0.012 * S(2 * w), -0.17 + 0.008 * S(3 * w), 6, -8)       # joystick
    arm_to(p, 'l', 0.40, -0.215 + 0.004 * S(2 * w), 2, -5)                         # guarda-corpo
    p['chest'] = [1.2 * S(4 * w) + 1.5, 0, 2.5 * S(w)]
    look = 22 * S(w) * max(0.0, S(w)) - 16 * max(0.0, S(w + math.pi)) ** 2
    p['head'] = [4 + 3 * S(2 * w + 1), 0, look]
    sway(p, 1.8 * S(w), (0.006 * S(w), 0, -0.004 - 0.003 * S(2 * w)))
    return p
def work(u):  # laço de 2,4 s: mãos na altura do peito e do rosto, alternando; olha para a luminária
    w = 2 * math.pi * u; p = base()
    arm_to(p, 'l', 0.40 + 0.035 * S(w), 0.10 + 0.07 * S(w), 14, 12 * S(2 * w))
    arm_to(p, 'r', 0.40 - 0.035 * S(w), 0.06 - 0.07 * S(w), 14, -25 * S(2 * w + 1))
    p['chest'] = [3 + 1.5 * S(2 * w), 0, 3 * S(w)]
    p['head'] = [-12 + 2.5 * S(2 * w), 0, 4 * S(w)]
    sway(p, 1.2 * S(w), (0.004 * S(w), -0.01, -0.006 + 0.004 * S(2 * w)))
    return p
def done(u):  # 1,6 s, uma vez: joinha com a mão direita e aceno de cabeça; começa e termina na pose parada
    k = math.sin(math.pi * min(1.0, u / 0.25)) if u < 0.125 else (1.0 if u < 0.75 else math.cos((u - 0.75) / 0.25 * math.pi / 2))
    k = max(0.0, min(1.0, k)); p = idle(0)
    q = base(); arm_to(q, 'r', 0.26, 0.08, -8, -35); arm_to(q, 'l', 0.40, -0.215, 2, -5)
    q['chest'] = [0, 0, -6]; q['head'] = [6 * S(u * 4 * math.pi), 0, -8]; sway(q, 0, (0, 0, 0))
    out = {n: [p[n][i] * (1 - k) + q[n][i] * k for i in range(3)] for n in J}
    out['_loc'] = tuple(p['_loc'][i] * (1 - k) + q['_loc'][i] * k for i in range(3)); return out

def bake(name, fn, frames, step=4):
    act = bpy.data.actions.new(name); arm.animation_data_create(); arm.animation_data.action = act
    prev = {}
    for f in list(range(0, frames, step)) + [frames]:
        p = fn(f / frames)
        for n in J:
            pb = arm.pose.bones[n]; r = REST[n]
            q = r.inverted() @ Euler([math.radians(a) for a in p[n]], 'XYZ').to_quaternion() @ r
            if n in prev and prev[n].dot(q) < 0: q.negate()
            prev[n] = q.copy(); pb.rotation_quaternion = q; pb.keyframe_insert('rotation_quaternion', frame=f + 1)
        hb = arm.pose.bones['hips']; hb.location = REST['hips'].inverted() @ Vector(p['_loc']); hb.keyframe_insert('location', frame=f + 1)
    tr = arm.animation_data.nla_tracks.new(); tr.name = name; tr.strips.new(name, 1, act); arm.animation_data.action = None; tr.mute = True
bake('idle', idle, 180); bake('work', work, 72); bake('done', done, 48, 2)
for tr in arm.animation_data.nla_tracks: tr.mute = False

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True, export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_skins=False)
print('TRIS', sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH'))
