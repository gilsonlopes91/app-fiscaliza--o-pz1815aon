# Normaliza o operador gerado (GLB), reduz polígonos, cria esqueleto e pesos, exporta GLB com skin.
# uso: blender -b --python rig.py -- entrada.glb saida.glb
import bpy, bmesh, math, sys
from mathutils import Vector
from mathutils.geometry import intersect_point_line

IN, OUT = sys.argv[sys.argv.index('--') + 1:][:2]
H = 1.74
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=IN)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for o in bpy.data.objects: o.select_set(o in meshes)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
body = bpy.context.object
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
for o in list(bpy.data.objects):
    if o != body: bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

body.rotation_mode = "XYZ"
def verts(): return [body.matrix_world @ v.co for v in body.data.vertices]
# altura e chão
vs = verts(); zmin = min(v.z for v in vs); zmax = max(v.z for v in vs)
s = H / (zmax - zmin); body.scale = (s, s, s); bpy.ops.object.transform_apply(scale=True)
vs = verts(); zmin = min(v.z for v in vs)
cx = sum(v.x for v in vs) / len(vs); cy = sum(v.y for v in vs) / len(vs)
body.location = (-cx, -cy, -zmin); bpy.ops.object.transform_apply(location=True)
# braços ao longo de X
vs = verts(); mid = [v for v in vs if 0.45 * H < v.z < 0.55 * H]
print("MID", len(mid), max(abs(v.y) for v in mid), max(abs(v.x) for v in mid), body.name, body.select_get(), [o.name for o in bpy.data.objects])
if max(abs(v.y) for v in mid) > max(abs(v.x) for v in mid):
    body.rotation_euler = (0, 0, math.pi / 2); bpy.ops.object.transform_apply(rotation=True)
# frente = -Y no Blender (+Z no jogo): as pontas das botas apontam para a frente
vs = verts()
feet = [v.y for v in vs if v.z < 0.05]; shin = [v.y for v in vs if 0.25 < v.z < 0.45]
toe = (min(feet) + max(feet)) / 2 - sum(shin) / len(shin)
front_min = min(feet) - sum(shin) / len(shin); front_max = max(feet) - sum(shin) / len(shin)
if abs(front_max) > abs(front_min):
    body.rotation_euler = (0, 0, math.pi); bpy.ops.object.transform_apply(rotation=True)
print("ORIENT", front_min, front_max, max(abs(v.x) for v in verts() if 0.45*H<v.z<0.55*H))
# reduz polígonos
dec = body.modifiers.new('d', 'DECIMATE'); n0 = len(body.data.polygons); dec.ratio = min(1.0, 24000 / max(1, n0))
bpy.ops.object.modifier_apply(modifier='d')
bpy.ops.object.shade_smooth()

# juntas a partir da forma
vs = verts()
def band(z0, z1): return [v for v in vs if z0 < v.z < z1]
sh_z = H * 0.815
torso = band(sh_z - 0.12, sh_z - 0.04); tw = sorted(abs(v.x) for v in torso)
shoulder_x = tw[int(len(tw) * 0.55)] if tw else 0.18
handL = max(vs, key=lambda v: v.x); handR = min(vs, key=lambda v: v.x)
J = {
    'hips': Vector((0, 0, H * 0.53)), 'spine': Vector((0, 0, H * 0.66)), 'chest': Vector((0, 0, sh_z - 0.05)),
    'neck': Vector((0, 0, H * 0.86)), 'head': Vector((0, 0, H * 0.93)), 'top': Vector((0, 0, H)),
}
for side, hand in (('l', handL), ('r', handR)):
    sg = 1 if side == 'l' else -1
    shp = Vector((sg * max(0.17, shoulder_x * 0.85), 0, sh_z)); hp = Vector((hand.x * 0.97, hand.y, hand.z + 0.06))
    J['shoulder_' + side] = shp; J['elbow_' + side] = shp.lerp(hp, 0.5) + Vector((0, 0.02, 0)); J['wrist_' + side] = hp
    J['hand_' + side] = hp + (hp - shp).normalized() * 0.1
    J['hip_' + side] = Vector((sg * 0.09, 0, H * 0.5)); J['knee_' + side] = Vector((sg * 0.1, 0, H * 0.28)); J['ankle_' + side] = Vector((sg * 0.1, 0, H * 0.05))
print('JOINTS', {k: tuple(round(c, 3) for c in v) for k, v in J.items()})

bpy.ops.object.armature_add(location=(0, 0, 0)); arm = bpy.context.object; arm.name = 'worker_rig'
bpy.ops.object.mode_set(mode='EDIT'); eb = arm.data.edit_bones; eb.remove(eb[0])
def bone(name, a, b, parent=None):
    x = eb.new(name); x.head = J[a] if isinstance(a, str) else a; x.tail = J[b] if isinstance(b, str) else b
    if parent: x.parent = eb[parent]; x.use_connect = False
    return x
bone('hips', 'hips', 'spine'); bone('spine', 'spine', 'chest', 'hips'); bone('chest', 'chest', 'neck', 'spine'); bone('head', 'neck', 'top', 'chest')
for sd in ('l', 'r'):
    bone('upperarm_' + sd, 'shoulder_' + sd, 'elbow_' + sd, 'chest'); bone('forearm_' + sd, 'elbow_' + sd, 'wrist_' + sd, 'upperarm_' + sd); bone('hand_' + sd, 'wrist_' + sd, 'hand_' + sd, 'forearm_' + sd)
    bone('thigh_' + sd, 'hip_' + sd, 'knee_' + sd, 'hips'); bone('shin_' + sd, 'knee_' + sd, 'ankle_' + sd, 'thigh_' + sd)
segs = {b.name: (b.head.copy(), b.tail.copy()) for b in eb}
bpy.ops.object.mode_set(mode='OBJECT')

# pesos por distância aos ossos (sem depender do "automatic weights")
for n in segs: body.vertex_groups.new(name=n)
mw = body.matrix_world
for v in body.data.vertices:
    p = mw @ v.co; d = []
    for n, (a, b) in segs.items():
        q, t = intersect_point_line(p, a, b); t = max(0.0, min(1.0, t)); q = a.lerp(b, t)
        dist = (p - q).length
        # braços só pegam o que está fora do tronco
        if n.startswith(('upperarm', 'forearm', 'hand')) and abs(p.x) < abs(a.x) * 0.9 and n.startswith('upperarm'): dist *= 1.6
        d.append((dist, n))
    d.sort(); best = d[:2]
    w0 = 1 / (best[0][0] + 1e-3) ** 3; w1 = 1 / (best[1][0] + 1e-3) ** 3
    body.vertex_groups[best[0][1]].add([v.index], w0 / (w0 + w1), 'REPLACE')
    body.vertex_groups[best[1][1]].add([v.index], w1 / (w0 + w1), 'REPLACE')
mod = body.modifiers.new('arm', 'ARMATURE'); mod.object = arm
body.parent = arm; body.name = 'worker'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_skins=True, export_animations=False, export_image_format='WEBP', export_image_quality=82)
print('DONE', len(body.data.polygons))
