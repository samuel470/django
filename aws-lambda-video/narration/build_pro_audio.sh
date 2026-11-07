#!/usr/bin/env bash
# Narração + trilha + efeitos do vídeo profissional (voz Kokoro pm_alex). Uso: VOICE=pm_alex ./build_pro_audio.sh
set -e
cd "$(dirname "$0")"
pip install -q kokoro-onnx soundfile numpy
[ -f kokoro/kokoro-v1.0.onnx ] || ./build_audio.sh >/dev/null 2>&1 || true
python3 make_pro_audio.py
ffmpeg -y -i audio_pro/premix.wav -af "acompressor=threshold=-18dB:ratio=2.2,loudnorm=I=-16:TP=-1.5" -c:a libmp3lame -b:a 192k ../public/pro-mix.mp3
cp timeline_pro.json ../src/timeline-pro.json
echo "Pronto. Rode: npm run studio  (composição LambdaPro)"
