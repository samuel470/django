import React from 'react';
import {Composition} from 'remotion';
import {LambdaVideo} from './LambdaVideo.jsx';
import TL from './timeline.json';

export const FPS = 30;
export const Root = () => (
  <Composition
    id="LambdaVideo"
    component={LambdaVideo}
    durationInFrames={Math.ceil(TL.total * FPS)}
    fps={FPS}
    width={1280}
    height={720}
  />
);
