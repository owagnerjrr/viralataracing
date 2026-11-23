"""Original Caramelo development sculpt. Blender 5.3, no third-party meshes.
Run: blender -b --python tools/blender/caramelo.py -- --output DIR
Coordinates: Blender +Y faces forward, Z up. glTF exporter converts to Y up.
The candidate is deliberately separate from the approved production assets.
"""
import bpy, math, json, sys, argparse
import numpy as np
from pathlib import Path
from mathutils import Vector

parser=argparse.ArgumentParser();parser.add_argument('--output',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
OUT=Path(args.output).resolve();OUT.mkdir(parents=True,exist_ok=True)
ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'assets/blender';ASSETS.mkdir(parents=True,exist_ok=True)
CANDIDATE=ROOT/'public/models/candidates';CANDIDATE.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name,color,rough=.6,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m

# Authored, deterministic fine strand texture; no runtime hair geometry.
N=512;rng=np.random.default_rng(2847);yy,xx=np.mgrid[:N,:N]
height=np.zeros((N,N),dtype=np.float32)
for _ in range(24000):
 x,y=rng.integers(N,size=2);length=int(rng.integers(5,22));bend=rng.uniform(-2,2);amp=rng.uniform(.12,.65)
 for k in range(length):height[(y+k)%N,int(x+bend*k/length)%N]+=math.sin(k/length*math.pi)*amp
height=np.clip(height,0,1)
def image_array(name,a):
 im=bpy.data.images.new(name,width=N,height=N,alpha=True)
 im.pixels.foreach_set(np.asarray(a,dtype=np.float32).ravel());im.filepath_raw=str(ASSETS/(name+'.png'));im.file_format='PNG';im.save();im.pack();return im
tone=.88+.1*rng.random((N,N))+.07*height
fur_image=image_array('caramelo_fur_base',np.dstack([tone,tone,tone,np.ones_like(tone)]))
dx=(np.roll(height,1,1)-np.roll(height,-1,1))*.23;dy=(np.roll(height,1,0)-np.roll(height,-1,0))*.23
normal=np.dstack([dx,dy,np.ones_like(dx)]);normal/=np.linalg.norm(normal,axis=2)[...,None]
normal_image=image_array('caramelo_fur_normal',np.dstack([normal*.5+.5,np.ones_like(dx)]));normal_image.colorspace_settings.name='Non-Color'
fur=material('Caramelo | short baked coat',(.55,.26,.065),.75)
nodes=fur.node_tree.nodes;links=fur.node_tree.links;p=nodes.get('Principled BSDF');p.inputs['Sheen Weight'].default_value=.12;p.inputs['Sheen Roughness'].default_value=.65;p.inputs['Sheen Tint'].default_value=(.5,.26,.06,1)
attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='Coat'
tex=nodes.new('ShaderNodeTexImage');tex.image=fur_image
mul=nodes.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1
links.new(attr.outputs['Color'],mul.inputs[1]);links.new(tex.outputs['Color'],mul.inputs[2]);links.new(mul.outputs[0],p.inputs['Base Color'])
texn=nodes.new('ShaderNodeTexImage');texn.image=normal_image;nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.27;links.new(texn.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs[0],p.inputs['Normal'])
cream=material('Warm ivory',(.85,.71,.46),.72)
earmat=material('Ear velvet',(.28,.092,.036),.76)
inner=material('Ear inner rose',(.43,.20,.115),.8)
nose=material('Wet charcoal nose',(.012,.017,.019),.27)
pn=nose.node_tree.nodes.get('Principled BSDF');noise=nose.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=150
bump=nose.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.012;nose.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);nose.node_tree.links.new(bump.outputs[0],pn.inputs['Normal'])
black=material('Mouth and nostril cavities',(.008,.005,.004),.8)
lip=material('Soft lip',(.075,.033,.018),.62)
white=material('Eye ivory',(.91,.9,.8),.18)
pupilmat=material('Pupil',(.001,.002,.003),.13)
green=material('Bandana | mata verde',(.028,.25,.105),.82)
gold=material('Stitched paw emblem',(.95,.66,.18),.52)
tongue=material('Tongue',(.7,.22,.19),.5)

def coat_color(v,region):
 x,y,z=v
 gold=np.array([.48,.19,.035]);c=np.array([.84,.67,.40])
 if region=='head':
  cream_mask=np.clip((y-.36)*3.8,0,1)*np.clip((1.83-z)*7,0,1)
  brow=np.exp(-((abs(x)-.24)/.26)**2-((z-2.04)/.2)**2)*.13
  gold=gold+np.array([.18,.09,.025])*brow
 elif region=='body':cream_mask=np.clip((y-.09)*6,0,1)*np.clip((1.22-z)*5,0,1)*np.clip((z-.37)*5,0,1)
 else:cream_mask=np.clip((.24-z)*9,0,.8)
 variation=.93+.055*math.sin(x*19+y*15+z*9)+.018*math.sin(y*81-z*45)
 return tuple((gold*(1-cream_mask)+c*cream_mask)*variation)+(1,)

def mesh(name,verts,faces,mat,region=None):
 d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);d.materials.append(mat)
 for p in d.polygons:p.use_smooth=True
 if region:
  a=d.color_attributes.new(name='Coat',type='FLOAT_COLOR',domain='POINT')
  for v,c in zip(d.vertices,a.data):c.color=coat_color(v.co,region)
 return o

def loft(name,profile,mat,axis='z',sides=40,sub=2,region=None):
 # Each section is center x/y/z, width and depth, hand-authored for anatomy.
 verts=[];faces=[]
 for i,(x,y,z,w,h) in enumerate(profile):
  for j in range(sides):
   a=j*math.tau/sides
   if axis=='z':p=(x+w*math.cos(a),y+h*math.sin(a),z)
   elif axis=='y':p=(x+w*math.cos(a),y,z+h*math.sin(a))
   else:p=(x,y+w*math.cos(a),z+h*math.sin(a))
   verts.append(p)
   if i:faces.append(((i-1)*sides+j,(i-1)*sides+(j+1)%sides,i*sides+(j+1)%sides,i*sides+j))
 faces.extend([tuple(reversed(range(sides))),tuple((len(profile)-1)*sides+j for j in range(sides))])
 o=mesh(name,verts,faces,mat,region)
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 # Recalculate winding before subdivision.
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
 if sub:
  m=o.modifiers.new('Sculpt surface subdivision','SUBSURF');m.levels=sub;bpy.ops.object.modifier_apply(modifier=m.name)
 # Colors are evaluated on the actual subdivided sculpt positions.
 if region:
  a=o.data.color_attributes.get('Coat')
  for v,c in zip(o.data.vertices,a.data):c.color=coat_color(v.co,region)
 bpy.ops.object.select_all(action='DESELECT')
 return o

def smooth_union(name,objects,voxel,region):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
 rem=o.modifiers.new('Watertight anatomical union','REMESH');rem.mode='VOXEL';rem.voxel_size=voxel;rem.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=rem.name)
 sm=o.modifiers.new('Relax sculpt transition','SMOOTH');sm.factor=.65;sm.iterations=5;bpy.ops.object.modifier_apply(modifier=sm.name)
 o.data.materials.clear();o.data.materials.append(fur)
 if o.data.color_attributes.get('Coat'):o.data.color_attributes.remove(o.data.color_attributes['Coat'])
 a=o.data.color_attributes.new(name='Coat',type='FLOAT_COLOR',domain='POINT')
 for v,c in zip(o.data.vertices,a.data):c.color=coat_color(v.co,region)
 return o

def uv(o):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)

def ellipsoid(name,loc,scale,mat):
 # Only eyeballs, iris/cornea and paw pads use spherical anatomy.
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 o.select_set(False);return o

def tube(name,points,radius,mat):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=radius;c.bevel_resolution=3
 s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type=p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o

# A continuous skull/cheek/muzzle surface, rather than intersecting facial balls.
head=loft('Caramelo_HeadSculpt',[
 (0,-.39,1.77,.035,.06),(0,-.31,1.8,.32,.36),(0,-.14,1.82,.47,.48),
 (0,.07,1.81,.50,.49),(0,.25,1.77,.47,.43),(0,.39,1.70,.415,.34),
 (0,.51,1.61,.32,.23),(0,.67,1.57,.295,.18),(0,.79,1.57,.23,.14),
 (0,.83,1.58,.12,.075),(0,.84,1.58,.025,.018)
],fur,'y',48,2,'head')
# Eye sockets pressed into the skull, not painted over a ball.
for v in head.data.vertices:
 x,y,z=v.co
 for side in [-1,1]:
  d=((x-side*.272)/.205)**2+((z-1.925)/.235)**2
  if y>.22:v.co.y-=.058*math.exp(-d*2)

torso=loft('Caramelo_BodySculpt',[
 (0,-.08,.25,.10,.12),(0,-.08,.32,.32,.26),(0,-.1,.47,.39,.30),
 (0,-.08,.67,.36,.29),(0,-.04,.86,.34,.27),(0,.0,1.03,.36,.28),
 (0,.005,1.18,.29,.245),(0,0,1.33,.235,.21),(0,0,1.51,.20,.18),
 (0,0,1.60,.08,.08)],fur,'z',40,2,'body')

# Tail is one continuously tapered curved mesh with a three bone skin.
tail=loft('Caramelo_Tail',[(0,-.23,.46,.11,.10),(0,-.40,.54,.12,.11),(.02,-.61,.68,.105,.095),(.08,-.83,.86,.09,.08),(.15,-1.0,1.08,.065,.06),(.20,-1.08,1.24,.035,.035),(.22,-1.1,1.29,.004,.004)],fur,'z',24,2,'body')

ears=[];paws=[];limbs=[]
for side in [-1,1]:
 tag='L' if side<0 else 'R'
 ears.append(loft('Ear_'+tag,[(side*.40,-.04,2.11,.04,.04),(side*.49,-.02,2.16,.13,.09),(side*.61,.035,2.08,.18,.09),(side*.66,.11,1.91,.185,.075),(side*.65,.19,1.72,.15,.06),(side*.60,.23,1.61,.075,.035),(side*.57,.23,1.61,.008,.008)],earmat,'z',32,2))
 # Inset ear surface follows the folded silhouette.
 ears.append(loft('Ear_lining_'+tag,[(side*.51,.067,2.08,.02,.008),(side*.60,.13,1.98,.10,.025),(side*.62,.20,1.80,.10,.021),(side*.59,.25,1.69,.04,.012),(side*.58,.25,1.68,.003,.003)],inner,'z',24,2))
 # Shaped shoulder, elbow, wrist and digits; front paws in a relaxed driving pose.
 arm=loft('Foreleg_'+tag,[(side*.30,.0,1.06,.08,.08),(side*.37,.05,1.01,.15,.15),(side*.44,.12,.87,.13,.13),(side*.46,.23,.72,.105,.11),(side*.45,.38,.77,.095,.095),(side*.43,.53,.86,.09,.085),(side*.42,.61,.88,.07,.06)],fur,'y',28,2,'body');limbs.append(arm)
 palm=loft('Paw_'+tag,[(side*.42,.55,.87,.06,.06),(side*.42,.62,.86,.12,.095),(side*.42,.71,.85,.14,.10),(side*.42,.77,.84,.12,.08),(side*.42,.79,.84,.03,.03)],fur,'y',28,2,'limb')
 digits=[]
 for j in range(3):
  x=side*.42+(j-1)*.078
  digits.append(loft('Toe',[(x,.69,.84,.046,.066),(x,.77,.835,.049,.062),(x,.825,.83,.037,.05),(x,.84,.835,.005,.008)],fur,'y',16,1,'limb'))
 paws.append(smooth_union('FrontPaw_'+tag,[palm,*digits],.012,'limb'))
 # Folded rear haunch, hock and forward foot.
 limbs.append(loft('Hindleg_'+tag,[(side*.23,-.10,.55,.10,.12),(side*.32,-.07,.44,.22,.23),(side*.38,.02,.28,.19,.19),(side*.36,.17,.19,.12,.12),(side*.33,.36,.17,.12,.10)],fur,'y',28,2,'body'))
 foot=loft('HindPaw_'+tag,[(side*.33,.25,.17,.08,.09),(side*.33,.39,.15,.16,.115),(side*.33,.54,.14,.17,.105),(side*.33,.64,.13,.13,.09),(side*.33,.67,.13,.015,.018)],fur,'y',28,2,'limb');limbs.append(foot)
 for j in [-1,0,1]:
  limbs.append(ellipsoid('PawPad_'+tag+str(j),(side*.33+j*.085,.55,.052),(.032,.055,.015),nose))

# Sewn triangular bandana with folded thickness and a small original paw emblem.
bandana=loft('Bandana_Collar',[(0,0,1.21,.255,.23),(0,0,1.26,.265,.24),(0,0,1.30,.25,.225)],green,'z',48,2)
scarf=mesh('Bandana_Front',[(-.25,.245,1.25),(0,.30,1.28),(.25,.245,1.25),(-.12,.30,1.08),(0,.345,.91),(.12,.30,1.08),(0,.323,1.13)],[(0,1,6,3),(1,2,5,6),(3,6,4),(6,5,4)],green)
sol=scarf.modifiers.new('Cloth thickness','SOLIDIFY');sol.thickness=.012
sub=scarf.modifiers.new('Soft cloth','SUBSURF');sub.levels=2
emblem=[]
emblem.append(ellipsoid('Paw_emblem',(0,.344,1.10),(.04,.008,.033),gold))
for x,z in [(-.045,1.145),(-.015,1.16),(.018,1.16),(.047,1.14)]:emblem.append(ellipsoid('Paw_emblem_toe',(x,.337,z),(.014,.009,.018),gold))
stitch=tube('Bandana_seam',[(-.21,.266,1.235),(-.105,.318,1.08),(0,.35,.955),(.105,.318,1.08),(.21,.266,1.235)],.004,gold)

# Sculpted triangular rhinarium, nostrils and philtrum.
no=loft('Nose',[(0,.78,1.62,.08,.055),(0,.82,1.625,.16,.095),(0,.885,1.63,.165,.085),(0,.927,1.61,.115,.065),(0,.94,1.60,.02,.015)],nose,'y',36,2)
face_details=[no]
for side in [-1,1]:
 face_details.append(ellipsoid('Nostril',(side*.095,.922,1.64),(.036,.012,.02),black))
 face_details.append(tube('Smile',[(0,.842,1.47),(side*.09,.818,1.435),(side*.23,.70,1.45),(side*.30,.58,1.50)],.010,lip))
 for j in range(4):face_details.append(ellipsoid('Whisker_follicle',(side*(.12+j*.032),.785-j*.028,1.52+(j%2)*.035),(.006,.006,.006),earmat))
face_details.append(tube('Philtrum',[(0,.92,1.58),(0,.86,1.52),(0,.842,1.47)],.008,lip))
jaw=loft('Jaw',[(0,.34,1.48,.12,.07),(0,.46,1.42,.25,.09),(0,.64,1.405,.24,.08),(0,.76,1.43,.17,.055),(0,.79,1.44,.015,.008)],fur,'y',32,2,'head')

eyes=[];brows=[]
iris=material('Amber iris',(.29,.105,.021),.25)
# Radial iris texture baked into an image, with a limbal ring and amber fibers.
iy,ix=np.mgrid[:N,:N];u=(ix-N/2)/(N/2);v=(iy-N/2)/(N/2);rr=np.sqrt(u*u+v*v);aa=np.arctan2(v,u)
fibers=(np.sin(aa*97+rr*26)+np.sin(aa*173-rr*19))*.045
ring=np.clip((1-rr)*8,0,1);k=(.78+fibers)*ring
iris_image=image_array('caramelo_iris_amber',np.dstack([.31*k+.016,.135*k+.008,.038*k+.004,np.ones_like(k)]))
inode=iris.node_tree.nodes.new('ShaderNodeTexImage');inode.image=iris_image;iris.node_tree.links.new(inode.outputs[0],iris.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
for side in [-1,1]:
 tag='L' if side<0 else 'R';x=side*.265;y=.416;z=1.94
 eye=ellipsoid('Eye_'+tag,(x,y,z),(.185,.131,.207),white);eyes.append(eye)
 # Curved iris cap with explicit planar UVs facing the camera.
 verts=[(x,y+.134,z)];faces=[];segments=64;rings=6
 for r in range(1,rings+1):
  radius=.119*r/rings
  for j in range(segments):
   a=j*math.tau/segments;verts.append((x+radius*math.cos(a),y+.134-.023*(r/rings)**2,z+radius*math.sin(a)))
 for j in range(segments):faces.append((0,1+j,1+(j+1)%segments))
 for r in range(1,rings):
  for j in range(segments):a=1+(r-1)*segments+j;b=1+(r-1)*segments+(j+1)%segments;faces.append((a,a+segments,b+segments,b))
 ir=mesh('Iris_'+tag,verts,faces,iris);uvlayer=ir.data.uv_layers.new()
 for poly in ir.data.polygons:
  for li in poly.loop_indices:
   co=ir.data.vertices[ir.data.loops[li].vertex_index].co;uvlayer.data[li].uv=((co.x-x)/.238+.5,(co.z-z)/.238+.5)
 eyes.append(ir);eyes.append(ellipsoid('Pupil_'+tag,(x,y+.139,z),(.059,.009,.068),pupilmat))
 eyes.append(ellipsoid('Catchlight_'+tag,(x-.033,y+.148,z+.05),(.023,.007,.025),white))
 # Upper and lower eyelids follow the eyeball rather than a painted outline.
 for upper in [True,False]:
  pts=[]
  for j in range(9):
   a=math.pi*j/8+(0 if upper else math.pi);pts.append((x+.187*math.cos(a),y+.019+.042*math.sin(a)**2,z+.211*math.sin(a)))
  eyes.append(tube(('UpperLid_' if upper else 'LowerLid_')+tag,pts,.018,earmat if upper else cream))
 brows.append(tube('Brow_'+tag,[(x-side*.16,.33,2.17),(x-side*.06,.35,2.22),(x+side*.07,.32,2.23),(x+side*.15,.28,2.19)],.037,earmat))

# Fuse anatomical transitions before weighting. No intersecting shoulder tubes.
anatomy=[o for o in limbs if o.name.startswith(('Foreleg_','Hindleg_','HindPaw_'))]
torso=smooth_union('Caramelo_BodySculpt',[torso,*anatomy],.018,'body')
limbs=[o for o in limbs if o not in anatomy]
dec=torso.modifiers.new('Retopology budget','DECIMATE');dec.ratio=.65
bpy.context.view_layer.objects.active=torso;bpy.ops.object.modifier_apply(modifier=dec.name)

# All deforming surfaces carry an actual armature modifier and weight groups.
armdata=bpy.data.armatures.new('Caramelo_Skeleton');rig=bpy.data.objects.new('Caramelo',armdata);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
bone_specs={
 'Root':((0,0,.1),(0,0,.35),None),
 'Spine':((0,0,.35),(0,0,.90),'Root'),
 'Chest':((0,0,.90),(0,0,1.2),'Spine'),
 'Neck':((0,0,1.2),(0,0,1.62),'Chest'),
 'Head':((0,0,1.62),(0,0,2.1),'Neck'),
 'Jaw':((0,.34,1.48),(0,.72,1.44),'Head'),
 'Tail':((0,-.23,.46),(.03,-.61,.69),'Spine'),
 'TailMid':((.03,-.61,.69),(.13,-.95,1.02),'Tail'),
 'TailTip':((.13,-.95,1.02),(.22,-1.1,1.29),'TailMid')}
for side,tag in [(-1,'L'),(1,'R')]:
 bone_specs.update({
  'Ear_'+tag:((side*.43,0,2.1),(side*.65,.15,1.82),'Head'),
  'EarTip_'+tag:((side*.65,.15,1.82),(side*.58,.23,1.61),'Ear_'+tag),
  'UpperArm_'+tag:((side*.32,0,1.03),(side*.46,.23,.72),'Chest'),
  'Forearm_'+tag:((side*.46,.23,.72),(side*.42,.62,.87),'UpperArm_'+tag),
  'Paw_'+tag:((side*.42,.62,.87),(side*.42,.80,.84),'Forearm_'+tag),
  'Thigh_'+tag:((side*.25,-.08,.5),(side*.37,.11,.22),'Spine'),
  'Foot_'+tag:((side*.37,.11,.22),(side*.33,.60,.13),'Thigh_'+tag)})
for name,(a,b,parent) in bone_specs.items():
 bone=armdata.edit_bones.new(name);bone.head=a;bone.tail=b
 if parent:bone.parent=armdata.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)

def skin(o,bones):
 o.parent=rig;mod=o.modifiers.new('Caramelo weighted skeleton','ARMATURE');mod.object=rig
 for name in bones:o.vertex_groups.new(name=name)
 for v in o.data.vertices:
  world=o.matrix_local@v.co;dist=[]
  for name in bones:
   a,b,_=bone_specs[name];a=Vector(a);b=Vector(b);d=b-a;t=max(0,min(1,(world-a).dot(d)/d.length_squared));dist.append((max(.025,(world-(a+t*d)).length),name))
  dist=sorted(dist)[:2];weights=[1/d**4 for d,n in dist];total=sum(weights)
  for (d,n),w in zip(dist,weights):o.vertex_groups[n].add([v.index],w/total,'REPLACE')

skin(head,['Head']);skin(torso,['Spine','Chest','Neck','UpperArm_L','Forearm_L','UpperArm_R','Forearm_R','Thigh_L','Foot_L','Thigh_R','Foot_R']);skin(tail,['Tail','TailMid','TailTip']);skin(jaw,['Jaw'])
for o in ears:
 tag=o.name[-1];skin(o,['Ear_'+tag,'EarTip_'+tag])
for o in limbs:
 tag='L' if '_L' in o.name else 'R'
 skin(o,['UpperArm_'+tag,'Forearm_'+tag] if o.name.startswith('Foreleg') else ['Thigh_'+tag,'Foot_'+tag])
for o in paws:skin(o,['Paw_'+o.name[-1]])
for o in face_details+eyes+brows:skin(o,['Head'])
for o in [bandana,scarf,stitch,*emblem]:skin(o,['Chest','Neck'])

# Blink is a true glTF morph on the eyeball/iris/pupil and eyelid surface.
bpy.context.view_layer.update()
for o in eyes:
 o.shape_key_add(name='Basis');key=o.shape_key_add(name='Blink')
 for v in key.data:
  world=o.matrix_local@v.co;world.z=1.94+(world.z-1.94)*.07;v.co=o.matrix_local.inverted()@world

objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in objects:
 if not o.data.uv_layers:uv(o)

# Author reusable clips on the skeleton, separate from the old procedural rig.
scene=bpy.context.scene;scene.render.fps=30
def animate(name,duration,poses):
 rig.animation_data_create();rig.animation_data.action=None
 for p in rig.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.scale=(1,1,1)
 for t,changes in poses:
  for b,(rot,scale) in changes.items():
   p=rig.pose.bones[b];p.rotation_euler=rot;p.scale=scale;p.keyframe_insert('rotation_euler',frame=t);p.keyframe_insert('scale',frame=t)
 action=rig.animation_data.action
 if action:
  action.name=name;track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,action);track.mute=True
 rig.animation_data.action=None
 return action
unit=(1,1,1)
animate('Respirar',90,[(1,{'Chest':((0,0,0),unit),'Head':((0,0,-.015),unit),'TailTip':((0,0,-.12),unit)}),(45,{'Chest':((0,0,0),(1.014,1.018,1.018)),'Head':((.012,0,.015),unit),'TailTip':((0,0,.12),unit)}),(90,{'Chest':((0,0,0),unit),'Head':((0,0,-.015),unit),'TailTip':((0,0,-.12),unit)})])
for name,changes in {
 'Olhar':{'Head':(0,.04,.32)},'Dirigir':{'UpperArm_L':(.02,.04,.05),'UpperArm_R':(.02,-.04,-.05)},
 'VirarVolante':{'Chest':(0,0,.06),'UpperArm_L':(.12,0,.12),'Forearm_R':(-.12,0,-.12)},
 'Acelerar':{'Head':(.08,0,0),'Chest':(.05,0,0),'Ear_L':(-.12,0,0),'Ear_R':(-.12,0,0)},
 'Frear':{'Head':(-.12,0,0),'Chest':(-.08,0,0),'Ear_L':(.15,0,0),'Ear_R':(.15,0,0)},
 'Derrapar':{'Head':(0,0,.20),'Chest':(0,-.12,-.12),'Tail':(0,.20,.12)},
 'Colisao':{'Head':(.18,.10,.12),'Chest':(-.10,.10,0),'Jaw':(.18,0,0)},
 'Saltar':{'Chest':(-.08,0,0),'Head':(.13,0,0),'Ear_L':(.23,0,0),'Ear_R':(.23,0,0)},
 'SegurarItem':{'UpperArm_R':(.20,0,-.45),'Forearm_R':(.35,0,.10)},
 'Arremessar':{'Chest':(0,0,-.16),'UpperArm_R':(-.60,0,-.5),'Forearm_R':(-.5,0,0)},
 'Comemorar':{'Head':(-.08,0,.10),'UpperArm_L':(-.65,0,.8),'UpperArm_R':(-.65,0,-.8),'Jaw':(.16,0,0)},
 'TrocarAssento':{'Chest':(.12,0,.18),'Head':(0,0,-.22),'Thigh_L':(.12,0,0),'Thigh_R':(.12,0,0)}
}.items():
 animate(name,30,[(1,{b:((0,0,0),unit) for b in changes}),(15,{b:(r,unit) for b,r in changes.items()}),(30,{b:((0,0,0),unit) for b in changes})])
for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.scale=unit
scene.frame_set(1)

def aim(o,point):o.rotation_euler=(Vector(point)-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Neutral comparison studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.16,.19,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
scene.view_settings.view_transform='AgX'
for loc,power,size,color in [((-3,4,5),480,4,(1,.83,.65)),((4,2,3),350,3,(.68,.83,1)),((1,-3,4),600,3,(1,.91,.73))]:
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.data.color=color;aim(l,(0,0,1.2))
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Studio floor';floor.data.materials.append(material('Studio floor',(.055,.083,.085),.85));floor.location.z=.01
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=3.0

# Keep source sculpt editable and materials packed, with no baseline geometry.
for o in eyes:
 o.data.shape_keys.key_blocks['Blink'].value=0
bpy.ops.wm.save_as_mainfile(filepath=str(ASSETS/'caramelo.blend'),compress=True)
stats={}
for lod,ratio in [('high',1),('medium',.52),('low',.24)]:
 modifiers=[]
 if ratio<1:
  for o in objects:
   if len(o.data.polygons)>250 and not o.data.shape_keys:
    d=o.modifiers.new('Export LOD','DECIMATE');d.ratio=ratio;modifiers.append((o,d))
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in objects:o.select_set(True)
 path=CANDIDATE/f'caramelo_{lod}.glb'
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_skins=True,export_morph=True,export_extras=True,export_yup=True,export_vertex_color='NAME',export_vertex_color_name='Coat')
 deps=bpy.context.evaluated_depsgraph_get();triangles=0
 for o in objects:
  ev=o.evaluated_get(deps);m=ev.to_mesh();m.calc_loop_triangles();triangles+=len(m.loop_triangles);ev.to_mesh_clear()
 stats[lod]={'triangles':triangles,'bytes':path.stat().st_size}
 for o,d in modifiers:o.modifiers.remove(d)
 # The exporter samples morph targets; restore the explicit open-eye pose.
 for o in eyes:
  o.data.shape_keys.key_blocks['Blink'].value=0
(OUT/'caramelo-stats.json').write_text(json.dumps(stats,indent=2))

views={'perspectiva':(3.2,5.3,2.8),'frente':(0,6,1.65),'lado':(6,0,1.7),'costas':(0,-6,1.8)}
for name,pos in views.items():
 cam.location=pos;aim(cam,(0,0,1.21));scene.render.filepath=str(OUT/f'caramelo-novo-{name}.png');bpy.ops.render.render(write_still=True)
print('CARAMELO_REPORT',json.dumps(stats))
