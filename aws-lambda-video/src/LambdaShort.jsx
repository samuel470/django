import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig, delayRender, continueRender} from 'remotion';
import {createShortWorld} from './shortWorld.js';
import TL from './timeline-short.json';

const FONT = '"Liberation Sans","Helvetica Neue",Helvetica,Arial,"DejaVu Sans",sans-serif';
const SENTENCES = TL.scenes.flatMap((s) => s.sentences);

export const LambdaShort = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  const [ui, setUi] = useState({flash: 0, hud: null});

  useLayoutEffect(() => {
    const handle = delayRender('three scene');
    if (!worldRef.current) worldRef.current = createShortWorld(canvasRef.current, TL);
    setUi(worldRef.current.renderAt(frame / fps));
    continueRender(handle);
  }, [frame, fps]);

  const bg = `linear-gradient(170deg, hsl(${195 + 14 * Math.sin(frame / 80)},95%,66%) 0%, hsl(${268 + 14 * Math.cos(frame / 100)},88%,70%) 55%, hsl(${322 + 8 * Math.sin(frame / 70)},95%,76%) 100%)`;
  const bubbles = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const size = 180 + (i % 3) * 120;
    const x = ((i * 173 + frame * (0.6 + (i % 3) * 0.3)) % (width + size)) - size;
    const y = (i * 311) % height + Math.sin(frame / 40 + i) * 30;
    return <div key={i} style={{position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%', background: 'rgba(255,255,255,.14)'}} />;
  });

  return (
    <AbsoluteFill style={{background: bg, fontFamily: FONT, overflow: 'hidden'}}>
      <Audio src={staticFile('short-mix.mp3')} />
      {bubbles}
      <canvas ref={canvasRef} width={width} height={height} style={{position: 'absolute', inset: 0}} />
      {ui.hud && (
        <div style={{position: 'absolute', top: 230, left: 0, right: 0, textAlign: 'center', opacity: ui.hud.opacity}}>
          <span style={{display: 'inline-block', fontSize: 78, fontWeight: 800, color: '#fff', background: '#3b1d7a', border: '8px solid #fff', borderRadius: 40, padding: '6px 38px', boxShadow: '0 8px 0 rgba(40,10,90,.35)'}}>{ui.hud.text}</span>
        </div>
      )}
      <Captions t={t} />
      <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: ui.flash, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};

const Captions = ({t}) => {
  const cur = SENTENCES.find((s) => t >= s.start - 0.05 && t <= s.end + 0.25);
  if (!cur) return null;
  const words = cur.show.split(' ');
  const weights = words.map((w) => w.length + 2);
  const sum = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const starts = weights.map((w) => { const s = cur.start + (acc / sum) * (cur.end - cur.start); acc += w; return s; });
  let active = 0;
  starts.forEach((s, i) => { if (t >= s) active = i; });
  const enter = Math.min(1, Math.max(0, (t - cur.start + 0.05) / 0.18));
  const exit = Math.min(1, Math.max(0, (cur.end + 0.25 - t) / 0.15));
  return (
    <div style={{position: 'absolute', left: 70, right: 70, bottom: 330, textAlign: 'center', opacity: Math.min(enter, exit), transform: `translateY(${(1 - enter) * 40}px)`}}>
      {words.map((w, i) => {
        const isActive = i === active;
        const pop = isActive ? 1 + 0.22 * Math.max(0, 1 - (t - starts[i]) / 0.16) : 1;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block', margin: '0 20px', fontSize: 84, fontWeight: 800, lineHeight: 1.18,
              color: isActive ? '#ffe14d' : '#ffffff',
              WebkitTextStroke: '14px #2a1160', paintOrder: 'stroke fill',
              transform: `scale(${pop})`, textShadow: '0 8px 0 rgba(42,17,96,.35)',
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};
