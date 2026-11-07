#!/usr/bin/env bash
# Narração + trilha + efeitos do Short (voz Kokoro pf_dora). Uso: VOICE=pm_alex ./build_short_audio.sh
set -e
cd "$(dirname "$0")"
pip install -q kokoro-onnx soundfile numpy
[ -f kokoro/kokoro-v1.0.onnx ] || ./build_audio.sh >/dev/null 2>&1 || true
python3 make_short_audio.py
ffmpeg -y -i audio_short/premix.wav -af "acompressor=threshold=-16dB:ratio=2.5,loudnorm=I=-14:TP=-1.5" -c:a libmp3lame -b:a 192k ../public/short-mix.mp3
cp timeline_short.json ../src/timeline-short.json
echo "Pronto. Rode: npm run studio  (composição LambdaShort)"
