import json,bisect,sys
m=json.load(open('meta.json')); segs=sorted(json.load(open('segs.json')),key=lambda s:s['s'])
out=0; S=[]
for s in segs: S.append((s['s'],s['e'],out,s['want'])); out+=s['want']
total=out; starts=[x[0] for x in S]
def T(t):
    i=bisect.bisect_right(starts,t)-1
    if i<0: return 0.0
    s,e,o,w=S[i]
    if t<=e: return o+(w if e<=s else (t-s)/(e-s)*w)
    return S[i+1][2] if i+1<len(S) else total
tl=[]
for fr in m:
    tt=round(T(fr['t']),3)
    if tl and tt<=tl[-1]['T']: tl[-1]={'f':fr['f'],'T':tl[-1]['T']}
    else: tl.append({'f':fr['f'],'T':tt})
json.dump({'total':total,'frames':tl},open('timeline.json','w'))
print('total',round(total,1),'frames',len(tl))
for want in map(float,sys.argv[1:]):
    k=max(i for i,x in enumerate(tl) if x['T']<=want); print(want,tl[k]['f'])
