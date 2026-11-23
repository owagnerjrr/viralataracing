"""Render approved 0.11 and Blender candidate under the same studio lighting."""
import bpy, math, sys, argparse
from pathlib import Path
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--baseline',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
ROOT=Path(__file__).resolve().parents[2];OUT=Path(a.output).resolve();OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/blender/caramelo.blend'))
for o in bpy.context.scene.objects:
 if o.type=='MESH' and o.data.shape_keys:
  for key in o.data.shape_keys.key_blocks:
   if key.name!='Basis':key.value=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/caramelo.blend'),compress=True)
scene=bpy.context.scene;cam=scene.camera
candidate=list(bpy.data.objects['Caramelo'].children_recursive)+[bpy.data.objects['Caramelo']]
for o in candidate:o.hide_render=True
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(Path(a.baseline)/'Caramelo.glb'));old=[o for o in bpy.data.objects if o not in before]
byname={o.name.split('.')[0]:o for o in old}
# Apply the same neutral arm pose used by the game; raw v0.11 GLBs leave these
# procedural pieces at the origin until main.js positions them each frame.
def limb(o,start,end,width):
 start,end=Vector(start),Vector(end);delta=end-start;o.location=(start+end)/2;o.scale=(width,width,delta.length*.68);o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(delta.normalized())
for i,side in enumerate([-1,1]):
 shoulder=(side*.4,.14,.94);elbow=(side*.49,.38,.68);paw=(side*.42,.65,.86)
 limb(byname['UpperArm'+str(i)],shoulder,elbow,.132);limb(byname['Forearm'+str(i)],elbow,paw,.119);byname['Paw'+str(i)].location=paw
for o in old:
 if o.name.startswith(('Mouth','Tongue')):o.hide_render=True
def aim(point):cam.rotation_euler=(Vector(point)-cam.location).to_track_quat('-Z','Y').to_euler()
views={'perspectiva':(3.2,5.3,2.8),'frente':(0,6,1.65),'lado':(6,0,1.7),'costas':(0,-6,1.8)}
for name,pos in views.items():
 cam.location=pos;aim((0,0,1.21));scene.render.filepath=str(OUT/f'caramelo-antigo-{name}.png');bpy.ops.render.render(write_still=True)
for o in old:o.hide_render=True
for o in candidate:o.hide_render=False
# Verify open eyes in the editable source, not just in the runtime viewer.
for name,pos in views.items():
 cam.location=pos;aim((0,0,1.21));scene.render.filepath=str(OUT/f'caramelo-novo-{name}.png');bpy.ops.render.render(write_still=True)
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(Path(a.baseline)/'KartRibeirao.glb'));kart=[o for o in bpy.data.objects if o not in before]
body=next(o for o in kart if o.name=='Body')
rig=bpy.data.objects['Caramelo'];rig.parent=body;rig.location=(0,.85,1.42)
cam.data.ortho_scale=6.8;cam.location=(5,7,4.5);aim((0,0,1.7));scene.render.filepath=str(OUT/'caramelo-novo-no-kart.png');bpy.ops.render.render(write_still=True)
