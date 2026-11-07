import json, subprocess, wave, struct, math, os
import numpy as np
os.makedirs('audio', exist_ok=True)
scenes = json.load(open('script.json'))
SR = 44100
_K=None
def synth(text, path):
    global _K
    import soundfile as sf
    if _K is None:
        from kokoro_onnx import Kokoro
        _K=Kokoro('kokoro/kokoro-v1.0.onnx','kokoro/voices-v1.0.bin')
    voice=os.environ.get('VOICE','pm_alex')
    samples,sr=_K.create(text,voice=voice,speed=float(os.environ.get('SPEED','1.0')),lang='pt-br')
    sf.write(path,samples,sr)
def load(path):
    out = subprocess.run(['ffmpeg','-v','error','-i',path,'-f','f32le','-ac','1','-ar',str(SR),'-'],capture_output=True,check=True).stdout
    return np.frombuffer(out,dtype=np.float32).copy()
GAP_S, GAP_SCENE, LEAD, TAIL = 0.30, 0.95, 0.8, 1.6
t = LEAD
chunks=[]; timeline=[]
for si,sc in enumerate(scenes):
    scene_start = t
    sents=[]
    for k,s in enumerate(sc['sentences']):
        p=f'audio/s{si}_{k}.wav'; synth(s['say'],p)
        a=load(p)
        # trim silence at ends
        idx=np.where(np.abs(a)>0.01)[0]
        if len(idx): a=a[max(0,idx[0]-200):idx[-1]+400]
        d=len(a)/SR
        chunks.append((t,a))
        sents.append({'show':s['show'],'start':round(t,3),'end':round(t+d,3)})
        t+=d+GAP_S
    t+=GAP_SCENE-GAP_S
    timeline.append({'id':sc['id'],'start':round(scene_start,3),'end':round(t-GAP_SCENE+GAP_S,3),'sentences':sents})
total=t+TAIL-GAP_SCENE
n=int(total*SR)
voice=np.zeros(n,dtype=np.float32)
for st,a in chunks:
    i=int(st*SR); voice[i:i+len(a)]+=a
# normalize voice
voice/= max(1e-6,np.max(np.abs(voice)))*1.05
wave_path='audio/voice.wav'
with wave.open(wave_path,'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((voice*32767).astype(np.int16).tobytes())
# ambient pad music
tt=np.arange(n)/SR
chords=[(110,164.8,220,277.2),(87.3,130.8,174.6,220),(98,146.8,196,246.9),(110,164.8,220,277.2)]
seg=total/ (len(chords)*3)
pad=np.zeros(n,dtype=np.float32)
for i,f in enumerate(np.array([chords[(j)%len(chords)] for j in range(len(chords)*3)])):
    a=int(i*seg*SR); b=min(n,int((i+1)*seg*SR+SR*1.5))
    x=np.arange(b-a)/SR
    env=np.minimum(1,x/1.2)*np.minimum(1,(b-a)/SR-x if False else 1)
    env=np.minimum(np.minimum(1,x/1.5),np.clip(((b-a)/SR-x)/1.5,0,1))
    for fr in f:
        pad[a:b]+=(np.sin(2*np.pi*fr*x)+0.4*np.sin(2*np.pi*fr*2*x+0.5))*env*0.05
lfo=0.85+0.15*np.sin(2*np.pi*0.1*tt)
pad*=lfo
fade=np.minimum(1,tt/3)*np.minimum(1,(total-tt)/3)
pad*=fade
with wave.open('audio/music.wav','wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(pad,-1,1)*32767).astype(np.int16).tobytes())
json.dump({'total':round(total,3),'scenes':timeline},open('timeline.json','w'),ensure_ascii=False,indent=1)
print('total',total)
for s in timeline: print(s['id'],s['start'],s['end'],len(s['sentences']))
