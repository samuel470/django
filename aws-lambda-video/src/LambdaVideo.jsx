import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig, delayRender, continueRender} from 'remotion';
import {createWorld} from './world.js';
import TL from './timeline.json';

const FONT = '"Liberation Sans","Helvetica Neue",Helvetica,Arial,"DejaVu Sans",sans-serif';
const ORANGE = '#ff9900';

export const LambdaVideo = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  const [ui, setUi] = useState(null);

  useLayoutEffect(() => {
    const handle = delayRender('three scene');
    if (!worldRef.current) worldRef.current = createWorld(canvasRef.current, TL);
    setUi(worldRef.current.renderAt(frame / fps));
    continueRender(handle);
  }, [frame, fps]);

  return (
    <AbsoluteFill style={{backgroundColor: '#05060d', fontFamily: FONT, color: '#fff'}}>
      <Audio src={staticFile('narration-mix.mp3')} />
      <canvas ref={canvasRef} width={width} height={height} style={{position: 'absolute', inset: 0}} />
      {ui && <Overlays ui={ui} />}
    </AbsoluteFill>
  );
};

const Overlays = ({ui}) => (
  <>
    {ui.chip && (
      <div style={{position: 'absolute', left: 34, top: 28, fontSize: 18, letterSpacing: '.16em', textTransform: 'uppercase', color: ORANGE, fontWeight: 700, opacity: ui.chip.opacity}}>
        {ui.chip.text}
      </div>
    )}
    {ui.title && (
      <div style={{position: 'absolute', left: 0, right: 0, top: 56, textAlign: 'center', opacity: ui.title.a}}>
        <div style={{fontSize: 92, fontWeight: 800, textShadow: '0 0 40px rgba(255,153,0,.55),0 4px 10px #000'}}>{ui.title.big}</div>
        <div style={{fontSize: 30, color: '#ffb84d', marginTop: 2, letterSpacing: '.2em', textTransform: 'uppercase', fontWeight: 700, opacity: ui.title.a2}}>{ui.title.small}</div>
      </div>
    )}
    {ui.hud && (
      <div
        style={{position: 'absolute', right: 34, top: 26, textAlign: 'right', fontSize: 24, fontWeight: 700, lineHeight: 1.5, padding: '8px 18px', borderRadius: 12, background: 'rgba(10,14,34,.7)', border: '1px solid rgba(120,150,255,.35)', opacity: ui.hud.opacity}}
        dangerouslySetInnerHTML={{__html: ui.hud.html.replace(/<b>/g, '<b style="color:#ffb84d">')}}
      />
    )}
    {ui.sub && (
      <div style={{position: 'absolute', left: '50%', bottom: 30, transform: 'translateX(-50%)', maxWidth: 1060, textAlign: 'center', fontSize: 30, fontWeight: 700, lineHeight: 1.25, padding: '10px 24px', borderRadius: 14, background: 'rgba(5,6,13,.66)', textShadow: '0 2px 6px #000', opacity: ui.sub.opacity, boxSizing: 'border-box'}}>
        {ui.sub.text}
      </div>
    )}
    <div style={{position: 'absolute', inset: 0, background: '#05060d', opacity: ui.fade, pointerEvents: 'none'}} />
    <div style={{position: 'absolute', left: 0, bottom: 0, height: 4, background: ORANGE, width: `${ui.progress * 100}%`}} />
  </>
);
