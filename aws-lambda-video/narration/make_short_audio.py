"""Narração (Kokoro) + trilha animada + efeitos sonoros para o Short. Gera timeline_short.json e audio_short/mix.wav"""
import json, subprocess, wave, os
import numpy as np, soundfile as sf
SR=44100
KD=os.environ.get('KOKORO_DIR','kokoro')
VOICE=os.environ.get('VOICE','pf_dora'); SPEED=float(os.environ.get('SPEED','1.08'))
os.makedirs('audio_short',exist_ok=True)
scenes=json.load(open('short_script.json'))
from kokoro_onnx import Kokoro
K=Kokoro(f'{KD}/kokoro-v1.0.onnx',f'{KD}/voices-v1.0.bin')
def load(p):
    o=subprocess.run(['ffmpeg','-v','error','-i',p,'-f','f32le','-ac','1','-ar',str(SR),'-'],capture_output=True,check=True).stdout
    return np.frombuffer(o,dtype=np.float32).copy()
LEAD,GAP,GAPS,TAIL=0.25,0.10,0.12,1.1
t=LEAD;chunks=[];tl=[]
for si,sc in enumerate(scenes):
    st=t;ss=[]
    for k,s in enumerate(sc['sentences']):
        a,sr=K.create(s['say'],voice=VOICE,speed=SPEED,lang='pt-br'); p=f'audio_short/s{si}_{k}.wav'; sf.write(p,a,sr)
        a=load(p); idx=np.where(np.abs(a)>0.01)[0]
        if len(idx): a=a[max(0,idx[0]-150):idx[-1]+300]
        d=len(a)/SR; chunks.append((t,a)); ss.append({'show':s['show'],'start':round(t,3),'end':round(t+d,3)}); t+=d+GAP
    t+=GAPS-GAP
    tl.append({'id':sc['id'],'start':round(st,3),'end':round(t-GAPS,3),'sentences':ss})
total=t-GAPS+TAIL; n=int(total*SR)
voice=np.zeros(n,np.float32)
for st,a in chunks: i=int(st*SR); voice[i:i+len(a)]+=a
voice/=max(1e-6,np.max(np.abs(voice)))*1.05
sf.write('audio_short/voice.wav',voice,SR)
json.dump({'total':round(total,3),'scenes':tl},open('timeline_short.json','w'),ensure_ascii=False,indent=1)
rn=np.random.default_rng(5)
def tt(d): return np.arange(int(d*SR))/SR
def add(buf,at,x):
    i=int(at*SR)
    if i<0 or i>=len(buf): return
    x=x[:len(buf)-i]; buf[i:i+len(x)]+=x
def note(m): return 440*2**((m-69)/12)
def pluck(f,d=.3,a=.12):
    x=tt(d); e=np.exp(-x*9)*(1-np.exp(-x*400)); return a*e*(np.sin(2*np.pi*f*x)+.5*np.sin(4*np.pi*f*x)+.25*np.sin(6*np.pi*f*x))
def bass(f,d=.45,a=.3):
    x=tt(d); e=np.exp(-x*4)*(1-np.exp(-x*200)); return a*e*np.sin(2*np.pi*f*x)
def kick(a=.55):
    x=tt(.25); f=50+110*np.exp(-x*32); return a*np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-x*13)
def clap(a=.2):
    x=tt(.14); return a*rn.standard_normal(len(x))*np.exp(-x*30)
def hat(a=.07):
    x=tt(.05); y=rn.standard_normal(len(x)); y=np.diff(y,prepend=0); return a*y*np.exp(-x*80)
bpm=124; beat=60/bpm; eighth=beat/2
chords=[[60,64,67,72],[59,62,67,71],[57,60,64,69],[57,60,65,69]]; roots=[36,31,33,29]
music=np.zeros(n,np.float32); bar=0; pos=0.0
pat=[0,1,2,3,2,1,2,3]
while pos<total:
    ch=chords[bar%4]; r=roots[bar%4]
    for e in range(8):
        at=pos+e*eighth
        add(music,at,pluck(note(ch[pat[e]]+(12 if e%4==3 else 0))))
        if e%2==1: add(music,at,hat())
        if e in (0,3,4,7): add(music,at,bass(note(r)))
    for b in range(4):
        add(music,pos+b*beat,kick())
        if b in (1,3): add(music,pos+b*beat,clap())
    pos+=beat*4; bar+=1
music/=max(1e-6,np.max(np.abs(music)))*1.25
x=np.arange(n)/SR; music*=np.minimum(1,x/.3)*np.minimum(1,(total-x)/1.0)
# SFX (tempos casados com as animações em src/shortWorld.js)
sc={s['id']:s for s in tl}; fx=np.zeros(n,np.float32)
def pop(f0=650,f1=220,d=.16,a=.5):
    x=tt(d); f=f1+(f0-f1)*np.exp(-x*25); return a*np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-x*22)
def whoosh(d=.6,a=.35):
    x=tt(d); y=rn.standard_normal(len(x)); k=np.convolve(y,np.ones(60)/60,'same'); return a*k*np.sin(np.pi*x/d)**2*4
def ding(a=.35):
    x=tt(.9); return a*(np.sin(2*np.pi*1318*x)+.6*np.sin(2*np.pi*1976*x))*np.exp(-x*5)
def tick(a=.25):
    x=tt(.09); return a*np.sin(2*np.pi*2200*x)*np.exp(-x*45)
for s in tl[1:]: add(fx,s['start']-.05,whoosh(.35,.25))
h=sc['hook']; add(fx,h['sentences'][1]['start']+.7,pop(900,200,.22,.7))
w=sc['wake']; add(fx,w['start']+.5,whoosh(.8,.35)); add(fx,w['start']+1.45,pop(500,900,.2,.6))
s_=sc['scale']; dur=s_['end']-s_['start']; dtc=max(.12,(dur-1.5)/12)
for i in range(12): add(fx,s_['start']+1.0+i*dtc,pop(500+i*70,300+i*40,.12,.35))
c_=sc['cost']; c0=c_['sentences'][0]['start']; c1=c_['sentences'][1]['start']
for i in range(8): add(fx,c0+.5+i*((c1-c0-1.0)/8)+.3,tick())
add(fx,c1+(c_['sentences'][1]['end']-c1)*.5,ding(.45))
voice_pad=voice
mus=music*0.40; out=np.stack([voice_pad+mus+fx*0.8]*2,1)
sf.write('audio_short/premix.wav',out,SR)
print('total',total); [print(s['id'],s['start'],s['end']) for s in tl]
