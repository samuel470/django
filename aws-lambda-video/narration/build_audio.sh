#!/usr/bin/env bash
# Gera a narração (Kokoro, pt-BR), mixa com a música e copia para o projeto Remotion.
# Uso: VOICE=pm_alex ./build_audio.sh     (vozes pt-BR: pm_alex, pm_santa, pf_dora)
set -e
cd "$(dirname "$0")"
pip install -q kokoro-onnx soundfile numpy
if [ ! -f kokoro/kokoro-v1.0.onnx ]; then
  mkdir -p kokoro
  B=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
  curl -L -o kokoro/kokoro-v1.0.onnx $B/kokoro-v1.0.onnx
  curl -L -o kokoro/voices-v1.0.bin  $B/voices-v1.0.bin
fi
VOICE=${VOICE:-pm_alex} python3 make_audio.py
ffmpeg -y -i audio/voice.wav -i audio/music.wav -filter_complex \
 "[0:a]highpass=f=70,acompressor=threshold=-18dB:ratio=2.5[v];[1:a]volume=0.45[m];[v][m]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-16:TP=-1.5,aformat=sample_rates=44100:channel_layouts=stereo" audio/mix.wav
ffmpeg -y -i audio/mix.wav -c:a libmp3lame -b:a 192k ../public/narration-mix.mp3
cp timeline.json ../src/timeline.json
echo "Pronto. Rode: npm run studio"
