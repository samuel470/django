import React from 'react';
import {Composition} from 'remotion';
import {LambdaVideo} from './LambdaVideo.jsx';
import {LambdaShort} from './LambdaShort.jsx';
import TL from './timeline.json';
import TLS from './timeline-short.json';

export const FPS = 30;
export const Root = () => (
  <>
    <Composition id="LambdaVideo" component={LambdaVideo} durationInFrames={Math.ceil(TL.total * FPS)} fps={FPS} width={1280} height={720} />
    <Composition id="LambdaShort" component={LambdaShort} durationInFrames={Math.ceil(TLS.total * FPS)} fps={FPS} width={1080} height={1920} />
  </>
);
