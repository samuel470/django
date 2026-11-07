# AWS Lambda em 3D — Remotion + narração pt-BR

Vídeo explicativo de ~1min40 sobre o AWS Lambda. As cenas 3D (three.js) e as camadas de texto (legendas, títulos, HUD) são uma composição do [Remotion](https://www.remotion.dev); a narração é gerada localmente com o modelo neural Kokoro.

Resultado pronto: `aws-lambda-3d-pt.mp4`.

## Rodar
```bash
cd aws-lambda-video
npm install
npm run studio     # abre o Remotion Studio (preview em tempo real)
npm run render     # gera out/aws-lambda-3d-pt.mp4
```
No Mac/Windows o Remotion baixa o Chrome sozinho. Em ambientes sem rede/GPU use, por exemplo:
`npx remotion render src/index.jsx LambdaVideo out/video.mp4 --gl=swangle --browser-executable=/caminho/do/chrome`

## Estrutura
- `src/LambdaVideo.jsx` — composição (canvas 3D + overlays + áudio)
- `src/world.js` — todas as cenas 3D; cada cena é uma função do tempo `t` (fácil de editar)
- `src/timeline.json` — tempos de cada frase (gerado pela narração)
- `public/narration-mix.mp3` — narração + música ambiente
- `narration/` — roteiro (`script.json`) e scripts de áudio

## Mudar roteiro ou voz
Edite `narration/script.json` (campo `show` = legenda, `say` = texto falado, com grafia fonética para siglas) e rode:
```bash
VOICE=pf_dora ./narration/build_audio.sh   # vozes pt-BR: pm_alex (padrão), pm_santa, pf_dora
```
Isso atualiza `src/timeline.json` e o MP3; as cenas se ajustam ao novo ritmo. Para uma voz ainda mais natural, gere a narração em um serviço de TTS (ex.: ElevenLabs) e substitua `public/narration-mix.mp3` e os tempos em `src/timeline.json`.

Os números citados no vídeo (15 min, 128 MB a 10 GB, cobrança por requisição e ms) foram escritos de memória: confira na documentação da AWS antes de publicar.

## Short vertical (9:16, ~20 s)
Versão curta e alegre para Shorts/Reels/TikTok: `aws-lambda-short.mp4`.
```bash
npm run studio                      # escolha a composição "LambdaShort"
npx remotion render src/index.jsx LambdaShort out/aws-lambda-short.mp4
./narration/build_short_audio.sh    # refaz voz, trilha e efeitos (VOICE=pm_alex para voz masculina)
```
Roteiro em `narration/short_script.json`; cenas 3D em `src/shortWorld.js`; legendas palavra por palavra em `src/LambdaShort.jsx`.
