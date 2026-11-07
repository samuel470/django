# AWS Lambda em 3D (narração pt-BR)

Vídeo gerado por código: cenas 3D em three.js, capturadas quadro a quadro com Chromium (Playwright) e montadas com ffmpeg.

## Arquivos
- script.json  – roteiro (texto exibido e texto falado, por frase)
- make_audio.py – gera narração (espeak-ng + voz MBROLA mb-br1), música ambiente e timeline.json
- index.html – cenas 3D (todas as animações são função do tempo t)
- render.js – captura os quadros
- timeline.json – tempos de cada frase (gerado)

## Como refazer
1. sudo apt-get install -y espeak-ng mbrola mbrola-br1 ffmpeg
2. npm i three@0.160.0 playwright   (e npx playwright install chromium)
3. python3 make_audio.py
4. ffmpeg -y -i audio/voice.wav -i audio/music.wav -filter_complex "[0:a]highpass=f=90,acompressor=threshold=-18dB:ratio=3[v];[1:a]volume=0.5[m];[v][m]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-16:TP=-1.5,aformat=sample_rates=44100:channel_layouts=stereo" audio/mix.wav
5. python3 -m http.server 8765 &
6. node render.js 8765 frames 30 0 3643
7. ffmpeg -framerate 30 -i frames/f_%05d.jpg -i audio/mix.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest aws-lambda-3d-pt.mp4

Dica: para voz mais natural, gere a narração em um serviço de TTS e substitua audio/voice.wav.
