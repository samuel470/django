"""Narração (Kokoro) + trilha sóbria + efeitos sutis para o vídeo profissional. Gera timeline_pro.json e audio_pro/premix.wav"""
import json, subprocess, os, re
import numpy as np, soundfile as sf
SR=44100
KD=os.environ.get('KOKORO_DIR','kokoro'); VOICE=os.environ.get('VOICE','pm_alex'); SPEED=float(os.environ.get('SPEED','1.0'))
os.makedirs('audio_pro',exist_ok=True)
scenes=json.load(open('pro_script.json'))
from kokoro_onnx import Kokoro
K=Kokoro(f'{KD}/kokoro-v1.0.onnx',f'{KD}/voices-v1.0.bin')
def load(p):
    o=subprocess.run(['ffmpeg','-v','error','-i',p,'-f','f32le','-ac','1','-ar',str(SR),'-'],capture_output=True,check=True).stdout
    return np.frombuffer(o,dtype=np.float32).copy()
LEAD,GAP,GAPS,TAIL=0.35,0.22,0.35,1.4
t=LEAD;chunks=[];tl=[]
for si,sc in enumerate(scenes):
    st=t;ss=[]
    for k,s in enumerate(sc['sentences']):
        a,sr=K.create(s['say'],voice=VOICE,speed=SPEED,lang='pt-br'); p=f'audio_pro/s{si}_{k}.wav'; sf.write(p,a,sr)
        a=load(p); idx=np.where(np.abs(a)>0.01)[0]
        if len(idx): a=a[max(0,idx[0]-150):idx[-1]+300]
        d=len(a)/SR; chunks.append((t,a)); ss.append({'show':s['show'],'start':round(t,3),'end':round(t+d,3)}); t+=d+GAP
    t+=GAPS-GAP
    tl.append({'id':sc['id'],'start':round(st,3),'end':round(t-GAPS,3),'sentences':ss})
total=t-GAPS+TAIL; n=int(total*SR)
voice=np.zeros(n,np.float32)
for st,a in chunks: i=int(st*SR); voice[i:i+len(a)]+=a
voice/=max(1e-6,np.max(np.abs(voice)))*1.05
json.dump({'total':round(total,3),'scenes':tl},open('timeline_pro.json','w'),ensure_ascii=False,indent=1)
sc={s['id']:s for s in tl}
rn=np.random.default_rng(11)
def tt(d): return np.arange(int(d*SR))/SR
def add(buf,at,x):
    i=int(at*SR)
    if i<0 or i>=len(buf): return
    x=x[:len(buf)-i]; buf[i:i+len(x)]+=x
def lp(x,k): return np.convolve(x,np.ones(k)/k,'same')
def note(m): return 440*2**((m-69)/12)
def pad(freqs,d,a=.05):
    x=tt(d); y=np.zeros_like(x)
    for f in freqs:
        for det in (-.004,.004): y+=2*((f*(1+det)*x)%1)-1
    y=lp(y,22)*a; env=np.minimum(1,x/.9)*np.minimum(1,(d-x)/1.1); return y*env
def pluck(f,d=.5,a=.05):
    x=tt(d); return a*np.exp(-x*7)*(1-np.exp(-x*300))*(np.sin(2*np.pi*f*x)+.3*np.sin(4*np.pi*f*x))
def kick(a=.22):
    x=tt(.3); f=45+90*np.exp(-x*28); return a*np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-x*10)
bpm=96; beat=60/bpm; bar_d=beat*4
chords=[[57,60,64,69],[53,57,60,65],[48,55,60,64],[55,59,62,67]]
music=np.zeros(n,np.float32); pos=0.0; bar=0
ev0=sc['events']['start']
while pos<total:
    ch=chords[bar%4]
    add(music,pos,pad([note(m) for m in ch]+[note(ch[0]-12)],bar_d+1.2,.05))
    if pos>=ev0-.1:
        for e in range(8): add(music,pos+e*beat/2,pluck(note(ch[[0,1,2,3,2,1,2,3][e]]+12),.5,.035))
        for b in (0,2): add(music,pos+b*beat,kick(.18))
    pos+=bar_d; bar+=1
music/=max(1e-6,np.max(np.abs(music)))*1.4
x=np.arange(n)/SR; music*=np.minimum(1,x/1.2)*np.minimum(1,(total-x)/1.6)
fx=np.zeros(n,np.float32)
def whoosh(d=.7,a=.22):
    x=tt(d); y=lp(rn.standard_normal(len(x)),40); return a*y*np.sin(np.pi*x/d)**2*5
def tick(a=.22,f=1800):
    x=tt(.1); return a*np.sin(2*np.pi*f*x)*np.exp(-x*40)
def thud(a=.5):
    x=tt(.6); f=60+60*np.exp(-x*14); return a*np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-x*6)
def chime(a=.25):
    x=tt(1.6); return a*(np.sin(2*np.pi*880*x)+.5*np.sin(2*np.pi*1320*x)+.3*np.sin(2*np.pi*1760*x))*np.exp(-x*2.5)
def riser(d=4.0,a=.18):
    x=tt(d); y=lp(rn.standard_normal(len(x)),12); return a*y*(x/d)**2*4
def wstart(s,rx):
    words=s['show'].split(' '); w=[len(q)+2 for q in words]; tot=sum(w); acc=0
    for q,ww in zip(words,w):
        if re.match(rx,q): return s['start']+acc/tot*(s['end']-s['start'])
        acc+=ww
    return s['start']
for s in tl[1:]: add(fx,s['start']-.12,whoosh(.55,.18))
add(fx,sc['intro']['start']-.0,thud(.35)); add(fx,sc['func']['start']+.2,thud(.4))
es=sc['events']['sentences'][0]
for rx,f in ((r'^S3',1500),(r'^API',1800),(r'^fila',2100)): add(fx,wstart(es,rx)-.1,tick(.28,f))
sa=sc['scale']; add(fx,sa['start']-.1,riser(min(4.5,sa['end']-sa['start']),.18)); add(fx,sa['start']+.6,thud(.45))
c0=sc['cost']['start']
for i in range(4): add(fx,c0+.5+i*.45,tick(.2,1400+i*220))
add(fx,sc['cost']['sentences'][1]['start']+.6,chime(.2))
add(fx,sc['outro']['start'],chime(.3))
mix=voice+music*0.55+fx*0.8
sf.write('audio_pro/premix.wav',np.stack([mix,mix],1),SR)
print('total',total); [print(s['id'],s['start'],s['end']) for s in tl]
