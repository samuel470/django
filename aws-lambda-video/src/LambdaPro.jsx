import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig, delayRender, continueRender} from 'remotion';
import {createProWorld} from './proWorld.js';
import TL from './timeline-pro.json';

const FONT = '"Inter","Helvetica Neue",Helvetica,"Liberation Sans",Arial,sans-serif';
const ORANGE = '#ff9900';
const SENTENCES = TL.scenes.filter((s) => s.id !== 'outro').flatMap((s) => s.sentences);

export const LambdaPro = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  const [ui, setUi] = useState({fade: 1, hud: null, progress: 0});

  useLayoutEffect(() => {
    const handle = delayRender('three scene');
    if (!worldRef.current) worldRef.current = createProWorld(canvasRef.current, TL);
    setUi(worldRef.current.renderAt(frame / fps));
    continueRender(handle);
  }, [frame, fps]);

  const hud = ui.hud || {};
  return (
    <AbsoluteFill style={{background: '#04060d', fontFamily: FONT, overflow: 'hidden'}}>
      <Audio src={staticFile('pro-mix.mp3')} />
      <canvas ref={canvasRef} width={width} height={height} style={{position: 'absolute', inset: 0}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 560, background: 'linear-gradient(to top, rgba(3,5,12,.88), rgba(3,5,12,0))'}} />
      <div style={{position: 'absolute', left: 0, top: 0, height: 4, width: `${ui.progress * 100}%`, background: `linear-gradient(90deg, ${ORANGE}, #4da3ff)`}} />
      {hud.tag && (
        <div style={{position: 'absolute', left: 72, top: 96, display: 'flex', alignItems: 'center', gap: 20}}>
          <span style={{color: ORANGE, fontSize: 30, fontWeight: 700, letterSpacing: '.08em'}}>{hud.tag[0]}</span>
          <span style={{width: 44, height: 2, background: 'rgba(255,255,255,.35)'}} />
          <span style={{color: '#9fb0d8', fontSize: 28, fontWeight: 600, letterSpacing: '.24em'}}>{hud.tag[1]}</span>
        </div>
      )}
      {hud.stat && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 170, textAlign: 'center', opacity: hud.stat.o}}>
          <div style={{fontSize: 130, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-.02em', textShadow: '0 0 60px rgba(255,153,0,.4)'}}>{hud.stat.n}</div>
          <div style={{fontSize: 30, color: '#9fb0d8', fontWeight: 500, letterSpacing: '.2em', textTransform: 'uppercase', marginTop: 12}}>{hud.stat.label}</div>
        </div>
      )}
      {hud.counter && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 160, textAlign: 'center', opacity: hud.counter.o}}>
          <div style={{fontSize: 120, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-.02em', textShadow: '0 0 60px rgba(255,153,0,.45)'}}>{hud.counter.n.toLocaleString('pt-BR')}</div>
          <div style={{fontSize: 30, color: '#9fb0d8', fontWeight: 500, letterSpacing: '.2em', textTransform: 'uppercase', marginTop: 12}}>execuções simultâneas</div>
        </div>
      )}
      {hud.outro && <Outro o={hud.outro} />}
      {!hud.outro && <Captions t={t} />}
      <div style={{position: 'absolute', inset: 0, background: '#04060d', opacity: ui.fade, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};

const Outro = ({o}) => (
  <div style={{position: 'absolute', left: 60, right: 60, top: 1180, textAlign: 'center'}}>
    <div style={{fontSize: 118, fontWeight: 700, color: '#fff', letterSpacing: '-.02em', opacity: o.a, transform: `translateY(${(1 - o.a) * 24}px)`, textShadow: '0 0 50px rgba(255,153,0,.35)'}}>
      AWS <span style={{color: ORANGE}}>Lambda</span>
    </div>
    <div style={{width: 120, height: 3, margin: '34px auto 34px', background: `linear-gradient(90deg, ${ORANGE}, #4da3ff)`, opacity: o.a}} />
    <div style={{fontSize: 50, fontWeight: 500, color: '#dbe4ff', opacity: o.b, transform: `translateY(${(1 - o.b) * 20}px)`}}>Menos infraestrutura para gerenciar.</div>
    <div style={{fontSize: 50, fontWeight: 700, color: '#fff', marginTop: 14, opacity: o.c, transform: `translateY(${(1 - o.c) * 20}px)`}}>Mais tempo para construir.</div>
  </div>
);

const Captions = ({t}) => {
  const cur = SENTENCES.find((s) => t >= s.start - 0.05 && t <= s.end + 0.3);
  if (!cur) return null;
  const words = cur.show.split(' ');
  const weights = words.map((w) => w.length + 2);
  const sum = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const starts = weights.map((w) => { const s = cur.start + (acc / sum) * (cur.end - cur.start); acc += w; return s; });
  const enter = Math.min(1, Math.max(0, (t - cur.start + 0.05) / 0.25));
  const exit = Math.min(1, Math.max(0, (cur.end + 0.3 - t) / 0.2));
  return (
    <div style={{position: 'absolute', left: 84, right: 84, bottom: 200, textAlign: 'center', opacity: Math.min(enter, exit), transform: `translateY(${(1 - enter) * 20}px)`}}>
      {words.map((w, i) => {
        const spoken = t >= starts[i] - 0.02;
        return (
          <span key={i} style={{display: 'inline-block', margin: '0 9px', fontSize: cur.show.length > 90 ? 46 : 54, fontWeight: 600, lineHeight: 1.32, color: spoken ? '#ffffff' : 'rgba(255,255,255,.42)', textShadow: '0 2px 16px rgba(0,0,0,.7)', transition: 'none'}}>
            {w}
          </span>
        );
      })}
    </div>
  );
};
