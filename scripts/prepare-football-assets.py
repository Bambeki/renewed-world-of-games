"""Retarget four CC0 locomotion clips to the bundled CC0 humanoid.
Usage: python3 scripts/prepare-football-assets.py BASE.glb UAL1_Standard.glb
No Blender or third-party Python packages required. Runtime uses only player.glb.
"""
import bisect, copy, json, math, struct, sys
from pathlib import Path

def load(path):
    blob = Path(path).read_bytes()
    size = struct.unpack_from('<I', blob, 12)[0]
    return json.loads(blob[20:20+size]), blob[28+size:]

def mul(a, b):
    x,y,z,w=a; X,Y,Z,W=b
    return (w*X+x*W+y*Z-z*Y, w*Y-x*Z+y*W+z*X, w*Z+x*Y-y*X+z*W, w*W-x*X-y*Y-z*Z)

def inv(q): return (-q[0],-q[1],-q[2],q[3])
def norm(q):
    n=math.sqrt(sum(x*x for x in q))
    return tuple(x/n for x in q)
def blend(a,b,t):
    dot=sum(x*y for x,y in zip(a,b))
    if dot<0: b=tuple(-x for x in b); dot=-dot
    if dot>.9995: return norm(tuple(x+(y-x)*t for x,y in zip(a,b)))
    angle=math.acos(max(-1,min(1,dot))); sine=math.sin(angle)
    return tuple((x*math.sin((1-t)*angle)+y*math.sin(t*angle))/sine for x,y in zip(a,b))

def parents(doc):
    return {child:i for i,node in enumerate(doc['nodes']) for child in node.get('children',[])}
def worlds(doc, parent, rotations=None):
    result={}
    def get(i):
        if i not in result:
            q=(rotations or {}).get(i,doc['nodes'][i].get('rotation',(0,0,0,1)))
            result[i]=mul(get(parent[i]),q) if i in parent else q
        return result[i]
    for i in range(len(doc['nodes'])):get(i)
    return result

def accessor(doc, blob, i):
    a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']]
    count={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']]
    assert a['componentType']==5126, 'animation accessors must be floats'
    offset=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',count*4)
    return [struct.unpack_from('<'+'f'*count,blob,offset+j*stride) for j in range(a['count'])]

def sample(track,t,rotation=False):
    times,values=track;index=max(0,min(len(times)-2,bisect.bisect_right(times,t)-1))
    if len(times)==1:return values[0]
    alpha=max(0,min(1,(t-times[index])/(times[index+1]-times[index] or 1)))
    return blend(values[index],values[index+1],alpha) if rotation else tuple(x+(y-x)*alpha for x,y in zip(values[index],values[index+1]))

def prepare(base_path, animation_path, output):
    base,binary=load(base_path);source,src_binary=load(animation_path)
    binary=bytearray(binary);bp,sp=parents(base),parents(source)
    bw,sw=worlds(base,bp),worlds(source,sp)
    byname={n.get('name'):i for i,n in enumerate(base['nodes'])};mapping={i:byname[n['name']] for i,n in enumerate(source['nodes']) if n.get('name') in byname}
    def add(rows, kind):
        while len(binary)%4:binary.append(0)
        offset=len(binary);flat=[x for row in rows for x in row]
        binary.extend(struct.pack('<'+'f'*len(flat),*flat))
        view=len(base['bufferViews']);base['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(flat)*4})
        a={'bufferView':view,'componentType':5126,'count':len(rows),'type':kind}
        if kind=='SCALAR':a.update(min=[flat[0]],max=[flat[-1]])
        i=len(base['accessors']);base['accessors'].append(a);return i
    base['animations']=[]
    keep={'Idle_Loop':'Idle','Walk_Loop':'Walk','Jog_Fwd_Loop':'Jog','Sprint_Loop':'Sprint'}
    for clip in source['animations']:
        if clip['name'] not in keep:continue
        rotations={};position=None;duration=0
        for channel in clip['channels']:
            target=channel['target'];node=target.get('node');sampler=clip['samplers'][channel['sampler']]
            if node not in mapping:continue
            times=[x[0] for x in accessor(source,src_binary,sampler['input'])];values=accessor(source,src_binary,sampler['output']);duration=max(duration,times[-1])
            if target['path']=='rotation':rotations[node]=(times,values)
            elif target['path']=='translation' and source['nodes'][node].get('name')=='pelvis':position=(node,(times,values))
        frames=max(2,math.ceil(duration*30)+1);times=[(duration*i/(frames-1),) for i in range(frames)];time_id=add(times,'SCALAR')
        rows={node:[] for node in rotations}
        for (t,) in times:
            source_world=worlds(source,sp,{i:sample(track,t,True) for i,track in rotations.items()})
            target_world={mapping[i]:mul(mul(source_world[i],inv(sw[i])),bw[mapping[i]]) for i in rotations}
            for i in rotations:
                dest=mapping[i];parent_world=target_world.get(bp.get(dest),bw.get(bp.get(dest),(0,0,0,1)))
                q=norm(mul(inv(parent_world),target_world[dest]))
                if rows[i] and sum(x*y for x,y in zip(rows[i][-1],q))<0:q=tuple(-x for x in q)
                rows[i].append(q)
        animation={'name':keep[clip['name']],'channels':[],'samplers':[]}
        for node,values in rows.items():
            aid=add(values,'VEC4');index=len(animation['samplers'])
            animation['samplers'].append({'input':time_id,'output':aid,'interpolation':'LINEAR'})
            animation['channels'].append({'sampler':index,'target':{'node':mapping[node],'path':'rotation'}})
        if position:
            node,track=position;dest=mapping[node]
            sr=source['nodes'][node].get('translation',[0,0,0]);dr=base['nodes'][dest].get('translation',[0,0,0])
            values=[tuple(b+(v-a)*1.04 for a,b,v in zip(sr,dr,sample(track,t))) for (t,) in times]
            aid=add(values,'VEC3');index=len(animation['samplers'])
            animation['samplers'].append({'input':time_id,'output':aid,'interpolation':'LINEAR'})
            animation['channels'].append({'sampler':index,'target':{'node':dest,'path':'translation'}})
        base['animations'].append(animation)
    assert len(base['animations'])==4
    base['buffers']=[{'byteLength':len(binary)}]
    base['asset']['extras']={'character':'Quaternius Universal Base Characters, CC0','animations':'Quaternius Universal Animation Library Standard, CC0','processing':'RWOG rest-pose retarget; original bone lengths retained; four 30 Hz clips; no root-motion translation'}
    meta=json.dumps(base,separators=(',',':')).encode();meta+=b' '*((-len(meta))%4);binary+=b'\0'*((-len(binary))%4)
    result=struct.pack('<4sII','glTF'.encode(),2,28+len(meta)+len(binary))+struct.pack('<I4s',len(meta),b'JSON')+meta+struct.pack('<I4s',len(binary),b'BIN\0')+binary
    Path(output).parent.mkdir(parents=True,exist_ok=True);Path(output).write_bytes(result)
    print(f'{output}: {len(result)} bytes; clips: '+', '.join(a['name'] for a in base['animations']))

if __name__=='__main__':prepare(sys.argv[1],sys.argv[2],sys.argv[3] if len(sys.argv)>3 else 'frontend/public/assets/football/player.glb')
