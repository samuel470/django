import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/* Vídeo institucional vertical (1080x1920) — dark tech premium. Tudo é função do tempo t. */
export function createProWorld(canvas, TL) {
  const W = 1080, H = 1920;
  const FONT = '"Inter","Helvetica Neue",Helvetica,"Liberation Sans",Arial,sans-serif';
  const ORANGE = 0xff9900, BLUE = 0x4da3ff, GREEN = 0x7bc96f, PURPLE = 0xa78bfa, PINK = 0xf472b6;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const eo = x => 1 - Math.pow(1 - clamp(x), 3);
  const eo4 = x => 1 - Math.pow(1 - clamp(x), 4);
  const rng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const hot = (c, k) => new THREE.Color(c).multiplyScalar(k);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false); renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x04060d, 16, 44);
  const camera = new THREE.PerspectiveCamera(40, W / H, .1, 100);
  const cam = (px, py, pz, lx = 0, ly = 0, lz = 0) => { camera.position.set(px, py, pz); camera.lookAt(lx, ly, lz); };

  // ambiente com reflexos suaves (RoomEnvironment é gerado localmente, sem rede)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.AmbientLight(0x6070a0, .5));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 7, 9); scene.add(key);
  const rimL = new THREE.DirectionalLight(0x4d8dff, 1.4); rimL.position.set(-6, 3, -4); scene.add(rimL);

  // fundo em degradê
  { const c = document.createElement('canvas'); c.width = 16; c.height = 512; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#0b1230'); g.addColorStop(.55, '#070b1c'); g.addColorStop(1, '#03050c');
    x.fillStyle = g; x.fillRect(0, 0, 16, 512);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }
  const grid = new THREE.GridHelper(70, 70, 0x1c2d63, 0x101a3d); grid.position.y = -2.7; scene.add(grid);
  const dust = (() => { const r = rng(5), n = 260, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { p[i * 3] = (r() - .5) * 16; p[i * 3 + 1] = -2 + r() * 11; p[i * 3 + 2] = -6 + r() * 9; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb7ff, size: .035, transparent: true, opacity: .55, depthWrite: false })); scene.add(pts); return pts; })();

  /* ---- pós-processamento: bloom ---- */
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
  composer.setSize(W, H); composer.setPixelRatio(1);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), .55, .65, .92));
  composer.addPass(new OutputPass());

  /* ---- texto / ícones em canvas (alta resolução) ---- */
  const mkTex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  function label(text, h = .3, { color = '#cfd8f5', weight = 600, size = 110, spacing = 0 } = {}) {
    const c = document.createElement('canvas'), x = c.getContext('2d');
    const font = `${weight} ${size}px ${FONT}`; x.font = font; if (spacing) x.letterSpacing = spacing + 'px';
    const w = Math.ceil(x.measureText(text).width + 40), hh = Math.ceil(size * 1.4);
    c.width = w; c.height = hh; x.font = font; if (spacing) x.letterSpacing = spacing + 'px';
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = color; x.fillText(text, w / 2, hh / 2);
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mkTex(c), transparent: true, depthWrite: false, toneMapped: false, fog: false }));
    m.userData.h = h; m.userData.asp = w / hh; m.scale.set(.001, .001, 1); m.visible = false; return m;
  }
  function show(m, p, s = 1) { m.visible = p > .01; m.material.opacity = clamp(p); const k = lerp(.94, 1, clamp(p)) * s; m.scale.set(m.userData.h * m.userData.asp * k, m.userData.h * k, 1); }
  function icon(x, type, cx, cy, s, color) {
    x.save(); x.strokeStyle = color; x.fillStyle = color; x.lineWidth = s * .09; x.lineCap = 'round'; x.lineJoin = 'round';
    if (type === 'bucket') { x.beginPath(); x.ellipse(cx, cy - s * .32, s * .42, s * .13, 0, 0, Math.PI * 2); x.stroke();
      x.beginPath(); x.moveTo(cx - s * .42, cy - s * .32); x.lineTo(cx - s * .34, cy + s * .38); x.quadraticCurveTo(cx, cy + s * .55, cx + s * .34, cy + s * .38); x.lineTo(cx + s * .42, cy - s * .32); x.stroke(); }
    if (type === 'api') { x.font = `700 ${s * 1.05}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('{ }', cx, cy); }
    if (type === 'queue') { for (let i = 0; i < 3; i++) { x.beginPath(); x.roundRect(cx - s * .52 + i * s * .38, cy - s * .2, s * .28, s * .4, s * .06); x.stroke(); }
      x.beginPath(); x.moveTo(cx - s * .5, cy + s * .42); x.lineTo(cx + s * .5, cy + s * .42); x.lineTo(cx + s * .38, cy + s * .32); x.moveTo(cx + s * .5, cy + s * .42); x.lineTo(cx + s * .38, cy + s * .52); x.stroke(); }
    x.restore();
  }
  function cardFace(w, h, title, sub, accent, ic) {
    const c = document.createElement('canvas'); const K = 400; c.width = Math.round(w * K); c.height = Math.round(h * K); const x = c.getContext('2d');
    const hex = '#' + new THREE.Color(accent).getHexString();
    if (ic) icon(x, ic, c.width / 2, c.height * .34, c.width * .3, hex);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#ffffff'; x.font = `700 ${c.width * .125}px ${FONT}`; x.fillText(title, c.width / 2, c.height * .68);
    x.fillStyle = '#8fa3d6'; x.font = `500 ${c.width * .075}px ${FONT}`; x.fillText(sub, c.width / 2, c.height * .84);
    return c;
  }
  function roundedShape(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  function card(w, h, { accent = BLUE, r = .2, canvasFace = null, depth = .07, fill = 0x0d1430, opacity = .86 } = {}) {
    const g = new THREE.Group(), shape = roundedShape(w, h, r);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: fill, transparent: true, opacity, roughness: .3, metalness: .35, envMapIntensity: .6 }));
    body.position.z = -depth / 2;
    const pts = shape.getPoints(20).map(p => new THREE.Vector3(p.x, p.y, depth / 2 + .003));
    const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: hot(accent, 1.7), transparent: true, opacity: .9 }));
    g.add(body, outline); const mats = [[body.material, opacity], [outline.material, .9]];
    if (canvasFace) { const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: mkTex(canvasFace), transparent: true, toneMapped: false, depthWrite: false })); face.position.z = depth / 2 + .006; g.add(face); mats.push([face.material, 1]); }
    g.userData = { mats, outline };
    return g;
  }
  function showCard(g, p) { g.visible = p > .01; g.userData.mats.forEach(([m, b]) => m.opacity = b * clamp(p)); g.scale.setScalar(Math.max(.001, lerp(.92, 1, eo(p)))); }

  /* ---- marca λ 3D ---- */
  function makeMark(scale = 1) {
    const g = new THREE.Group();
    const m = new THREE.MeshPhysicalMaterial({ color: ORANGE, metalness: .55, roughness: .22, clearcoat: .6, clearcoatRoughness: .2, emissive: ORANGE, emissiveIntensity: .08, envMapIntensity: .55 });
    const bar = (a, b, th, depth) => { const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(len + th * .3, th, depth, 5, .1), m); mesh.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0); mesh.rotation.z = Math.atan2(dy, dx); return mesh; };
    g.add(bar([-.62, 1.05], [.62, -1.05], .3, .42)); g.add(bar([-.03, .05], [-.66, -1.05], .3, .42));
    g.userData.mat = m; g.scale.setScalar(scale); return g;
  }
  function makeHex(r = 1.65, color = ORANGE) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, .022, 8, 6), new THREE.MeshBasicMaterial({ color: hot(color, 1.8), transparent: true, opacity: .9, fog: false }));
    m.rotation.z = Math.PI / 6; return m;
  }
  function pulse(color = ORANGE, size = .09) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(size, 14, 10), new THREE.MeshBasicMaterial({ color: hot(color, 3), toneMapped: false })));
    return g;
  }
  function beam(a, b, color) {
    const mid = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, .2);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)), new THREE.LineBasicMaterial({ color: hot(color, 1.3), transparent: true, opacity: .45 }));
    return { curve, line };
  }
  function wordStart(s, rx) {
    const words = s.show.split(' '), w = words.map(q => q.length + 2), tot = w.reduce((a, b) => a + b, 0); let acc = 0;
    for (let i = 0; i < words.length; i++) { if (rx.test(words[i])) return s.start + acc / tot * (s.end - s.start); acc += w[i]; }
    return s.start;
  }
  const cues = T => T.sentences.map(s => s.start).concat([T.sentences[T.sentences.length - 1].end]);
  const SC = {}; let HUD = null;

  /* 1 — contexto: servidores sempre ligados */
  SC.intro = T => {
    const c = cues(T), g = new THREE.Group(), racks = [];
    for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) {
      const rk = new THREE.Group();
      const body = new THREE.Mesh(new RoundedBoxGeometry(1.55, 1.05, .5, 3, .06), new THREE.MeshStandardMaterial({ color: 0x131c3f, metalness: .7, roughness: .35, envMapIntensity: .8 }));
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.2, .05, .02), new THREE.MeshBasicMaterial({ color: hot(BLUE, 1.2), toneMapped: false })); strip.position.set(-.1, -.28, .27);
      const leds = [0, 1, 2].map(i => { const l = new THREE.Mesh(new THREE.BoxGeometry(.09, .09, .02), new THREE.MeshBasicMaterial({ color: hot(0xffb020, 2.2), toneMapped: false })); l.position.set(.52, .25 - i * .17, .27); rk.add(l); return l; });
      rk.add(body, strip); rk.position.set((k - 1) * 1.85, 4.55 - r * 1.3, 0); rk.userData = { leds, i: r * 3 + k }; g.add(rk); racks.push(rk);
    }
    
    return { group: g, update(t) {
      const u = t - T.start;
      racks.forEach(rk => { const i = rk.userData.i, p = eo4(seg(t, .05 + i * .06, .7 + i * .06));
        rk.scale.setScalar(Math.max(.001, p)); rk.position.z = (1 - p) * -2;
        rk.userData.leds.forEach((l, j) => l.material.color.copy(hot(0xffb020, 1.2 + 1.2 * Math.abs(Math.sin(t * 2.4 + i * .7 + j)))));
        rk.rotation.y = Math.sin(u * .5 + i) * .05; });
      HUD = { tag: ['01', 'O PROBLEMA'], stat: { n: '24/7', label: 'servidores ligados', o: sm(seg(t, 1.0, 1.7)) * (1 - sm(seg(t, c[1] - .4, c[1] - .05))) } };
      cam(Math.sin(u * .4) * .3, 2.3, 14.5 - 1.2 * sm(seg(u, 0, 4.4)), 0, 2.3, 0);
    } };
  };

  /* 2 — a função */
  SC.func = T => {
    const c = cues(T), g = new THREE.Group();
    const mark = makeMark(1.25); mark.position.set(0, 4.55, 0); g.add(mark);
    const hex1 = makeHex(1.65), hex2 = makeHex(2.0, BLUE); hex1.position.copy(mark.position); hex2.position.copy(mark.position); g.add(hex1, hex2);
    // cartão de código
    const cc = document.createElement('canvas'); cc.width = 1200; cc.height = 560; const x = cc.getContext('2d');
    x.font = `500 50px "DejaVu Sans Mono","Liberation Mono",monospace`; x.textBaseline = 'middle';
    const L = [[['def ', '#c586c0'], ['handler', '#dcdcaa'], ['(event, context):', '#d4d4d4']], [['    pedido = ', '#d4d4d4'], ['event', '#9cdcfe'], ['["detalhe"]', '#ce9178']], [['    salvar', '#dcdcaa'], ['(pedido)', '#d4d4d4']], [['    ', '#d4d4d4'], ['return ', '#c586c0'], ['{"status": "ok"}', '#ce9178']]];
    [0, 1, 2].forEach(i => { x.fillStyle = ['#ff5f56', '#ffbd2e', '#27c93f'][i]; x.beginPath(); x.arc(70 + i * 46, 62, 14, 0, 7); x.fill(); });
    L.forEach((ln, i) => { let px = 130; x.fillStyle = '#4b5578'; x.fillText(String(i + 1), 60, 190 + i * 82); ln.forEach(([s, col]) => { x.fillStyle = col; x.fillText(s, px, 190 + i * 82); px += x.measureText(s).width; }); });
    const code = card(5.4, 2.25, { accent: ORANGE, canvasFace: cc, fill: 0x0a1028 }); code.position.set(0, 1.05, 0); g.add(code);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(4.6, .05, .05), new THREE.MeshBasicMaterial({ color: hot(ORANGE, 1.8), toneMapped: false })); bar.geometry.translate(2.3, 0, 0); bar.position.set(-2.3, -.2, .1); g.add(bar);
    const ok = label('Função publicada', .36, { color: '#ffd9a0', weight: 600, size: 100 }); ok.position.set(0, -.58, .2); g.add(ok);
    return { group: g, update(t) {
      const u = t - T.start, pin = eo4(seg(t, -.05, .8));
      mark.scale.setScalar(Math.max(.001, 1.25 * pin)); mark.rotation.y = Math.sin(u * .9) * .55; mark.position.y = 4.55 + Math.sin(u * 1.3) * .08;
      hex1.scale.setScalar(Math.max(.001, pin)); hex2.scale.setScalar(Math.max(.001, pin)); hex1.rotation.z = Math.PI / 6 + u * .25; hex2.rotation.z = Math.PI / 6 - u * .18;
      hex1.position.y = hex2.position.y = mark.position.y;
      showCard(code, seg(t, .35, .95)); code.position.y = 1.05 + (1 - eo(seg(t, .35, 1.1))) * -.6;
      bar.scale.x = Math.max(.001, sm(seg(t, 1.2, c[1] - .5))); show(ok, sm(seg(t, c[1] - .6, c[1] - .2)));
      HUD = { tag: ['02', 'A FUNÇÃO'] };
      cam(Math.sin(u * .5) * .3, 2.3, 14.2 - .8 * sm(seg(u, 0, 3)), 0, 2.3, 0);
    } };
  };

  /* 3 — eventos → função */
  SC.events = T => {
    const c = cues(T), g = new THREE.Group(), S = T.sentences[0];
    const defs = [['Amazon S3', 'armazenamento', GREEN, 'bucket', /^S3/], ['API Gateway', 'requisição HTTP', PURPLE, 'api', /^API/], ['Amazon SQS', 'fila de mensagens', PINK, 'queue', /^fila/]];
    const nodes = defs.map((d, i) => { const cd = card(1.62, 1.75, { accent: d[2], canvasFace: cardFace(1.62, 1.75, d[0], d[1], d[2], d[3]) }); cd.position.set((i - 1) * 1.95, 4.65, 0); g.add(cd); return { cd, at: wordStart(S, d[4]) - .15, color: d[2] }; });
    const lam = card(2.4, 2.4, { accent: ORANGE, r: .26, fill: 0x14100a }); lam.position.set(0, 1.45, 0); g.add(lam);
    const mk = makeMark(.62); mk.position.set(0, 1.63, .2); g.add(mk);
    const lt = label('AWS Lambda', .32, { color: '#ffffff', weight: 700, size: 110 }); lt.position.set(0, .57, .2); g.add(lt);
    const hex = makeHex(1.75); hex.position.set(0, 1.45, -.1); g.add(hex);
    const beams = nodes.map(n => { const a = new THREE.Vector3(n.cd.position.x, 3.65, .1), b = new THREE.Vector3(n.cd.position.x * .25, 2.7, .1); const bm = beam(a, b, n.color); g.add(bm.line); const p = pulse(n.color); g.add(p); return { ...bm, p }; });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.53, 64), new THREE.MeshBasicMaterial({ color: hot(ORANGE, 2), transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false })); ring.position.set(0, 1.45, 0); g.add(ring);
    const outLbl = label('Código executado', .34, { color: '#ffd9a0', weight: 600, size: 100 }); outLbl.position.set(0, -.55, .2); g.add(outLbl);
    return { group: g, update(t) {
      const u = t - T.start; let flash = 0;
      showCard(lam, seg(t, -.05, .6)); show(lt, seg(t, .2, .7)); mk.scale.setScalar(Math.max(.001, .62 * eo4(seg(t, 0, .7)))); mk.rotation.y = Math.sin(u) * .35; hex.rotation.z = Math.PI / 6 + u * .2;
      hex.scale.setScalar(Math.max(.001, eo4(seg(t, 0, .7))));
      nodes.forEach((n, i) => { const p = seg(t, n.at, n.at + .5); showCard(n.cd, p); n.cd.position.y = 4.65 + (1 - eo(p)) * .4;
        beams[i].line.visible = p > .3; beams[i].line.material.opacity = .45 * sm(seg(p, .3, 1));
        const st = n.at + .55, per = 1.7;
        if (t > st) { const ph = ((t - st) % per) / per, q = eo(seg(ph, 0, .62)); beams[i].p.position.copy(beams[i].curve.getPoint(q)); beams[i].p.visible = ph < .62; if (ph > .55 && ph < .7) flash = Math.max(flash, 1 - Math.abs(ph - .62) / .08); } else beams[i].p.visible = false; });
      lam.userData.outline.material.color.copy(hot(ORANGE, 1.7 + flash * 3)); mk.userData.mat.emissiveIntensity = .08 + flash * .7;
      const w = seg(t, c[1] - 1.3, c[1] - .2); ring.scale.setScalar(.6 + w * 1.4); ring.material.opacity = (1 - w) * .9 * (w > 0 ? 1 : 0);
      show(outLbl, sm(seg(t, c[1] - 1.0, c[1] - .5)));
      HUD = { tag: ['03', 'EVENTOS'] };
      cam(Math.sin(u * .45) * .35, 2.3, 14.6 - .6 * sm(seg(u, 0, 5)), 0, 2.3, 0);
    } };
  };

  /* 4 — escala */
  SC.scale = T => {
    const c = cues(T), g = new THREE.Group(), COLS = 9, ROWS = 9, N = COLS * ROWS, dur = c[1] - c[0];
    const inst = new THREE.InstancedMesh(new RoundedBoxGeometry(.43, .43, .08, 2, .07), new THREE.MeshBasicMaterial({ toneMapped: false }), N);
    inst.frustumCulled = false; g.add(inst);
    const info = [], cx = (COLS - 1) / 2, cy = (ROWS - 1) / 2, maxd = Math.hypot(cx, cy);
    for (let i = 0; i < N; i++) { const col = i % COLS, row = Math.floor(i / COLS); const d = Math.hypot(col - cx, row - cy); info.push({ x: (col - cx) * .6, y: 2.5 + (row - cy) * .55, d, ph: (i * 7.31) % 6.28 }); }
    const t0 = T.start + .7, k = (dur - 1.9) / maxd;
    
    const dummy = new THREE.Object3D(), color = new THREE.Color();
    return { group: g, update(t) {
      const u = t - T.start; let active = 0;
      info.forEach((o, i) => {
        const ta = t0 + o.d * k, a = t - ta, p = a < 0 ? 0 : eo4(a / .45);
        if (a >= 0) active++;
        const s = .35 + .65 * p; dummy.position.set(o.x, o.y, 0); dummy.scale.set(s, s, 1); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
        const settle = sm(seg(a, .15, 1.4)), shimmer = .75 + .25 * Math.sin(t * 2.2 + o.ph);
        if (a < 0) color.setRGB(.05, .08, .18);
        else { const hotc = 3.2 * (1 - settle), coolc = settle * shimmer; color.setRGB(.06 + hotc * 1.0 + coolc * .15, .12 + hotc * .55 + coolc * .55, .3 + hotc * .05 + coolc * 1.3); }
        inst.setColorAt(i, color);
      });
      inst.instanceMatrix.needsUpdate = true; inst.instanceColor.needsUpdate = true;
      const frac = active / N, count = Math.max(1, Math.round(Math.pow(1000, sm(frac))));
      HUD = { tag: ['04', 'ESCALA'], counter: { n: frac > 0 ? count : 1, o: sm(seg(t, T.start + .2, T.start + .7)) } };
      cam(Math.sin(u * .35) * .3, 2.3, 12.0 + 3.2 * sm(seg(u, 0, dur)), 0, 2.3, 0);
    } };
  };

  /* 5 — custo */
  SC.cost = T => {
    const c = cues(T), g = new THREE.Group();
    const axisY = 1.2;
    const axis = new THREE.Mesh(new THREE.BoxGeometry(5.0, .03, .03), new THREE.MeshBasicMaterial({ color: 0x4a5a95, toneMapped: false })); axis.position.set(0, axisY, 0); g.add(axis);
    const tcap = label('tempo', .26, { color: '#7a8ac0', weight: 500, size: 90 }); tcap.position.set(0, axisY - 1.1, 0); g.add(tcap);
    const blocks = [[-1.95, .3, '142 ms'], [-.95, .5, '89 ms'], [.9, .22, '210 ms'], [1.9, .36, '64 ms']];
    const bl = blocks.map(([bx, bw, txt]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, .55, .12), new THREE.MeshBasicMaterial({ color: hot(ORANGE, 2.2), toneMapped: false })); m.position.set(bx, axisY + .3, 0); g.add(m);
      const l = label(txt, .3, { color: '#ffd9a0', weight: 600, size: 100 }); l.position.set(bx, axisY - .55, .1); g.add(l); return { m, l, bx }; });
    // curva de custo acumulado (sobe só durante as execuções)
    const baseY = 3.6, pts = [], NPT = 90;
    const stepAt = x => bl.reduce((s, b) => s + .22 * sm((x - (b.bx - .3)) / .6), 0);
    for (let i = 0; i < NPT; i++) { const x = -2.5 + 5.0 * i / (NPT - 1); pts.push(new THREE.Vector3(x, baseY + stepAt(x), 0)); }
    const lg = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: hot(ORANGE, 2), toneMapped: false })); g.add(line);
    const head = pulse(ORANGE, .1); g.add(head);
    const ccap = label('custo acumulado', .26, { color: '#7a8ac0', weight: 500, size: 90 }); ccap.position.set(-1.45, baseY + .9, 0); g.add(ccap);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 2.9), new THREE.MeshBasicMaterial({ color: hot(BLUE, .9), transparent: true, opacity: 0, toneMapped: false, depthWrite: false })); band.position.set(0, 2.3, -.1); g.add(band);
    const zero = label('US$ 0,00', .75, { color: '#ffffff', weight: 700, size: 190 }); zero.position.set(0, 2.95, .3); g.add(zero);
    const idle = label('ociosidade = sem custo', .3, { color: '#9cc4ff', weight: 500, size: 100 }); idle.position.set(0, 2.3, .3); g.add(idle);
    const tS = T.sentences[1].start;
    return { group: g, update(t) {
      const u = t - T.start; show(tcap, sm(seg(t, T.start + .1, T.start + .5)));
      bl.forEach((b, i) => { const p = eo4(seg(t, T.start + .5 + i * .45, T.start + .85 + i * .45)); b.m.scale.set(1, Math.max(.001, p), 1); b.m.position.y = axisY + .3 * p + .005; show(b.l, sm(seg(t, T.start + .75 + i * .45, T.start + 1.1 + i * .45))); });
      const prog = seg(t, T.start + .5, tS + .8), n = Math.max(2, Math.round(NPT * prog)); lg.setDrawRange(0, n);
      head.position.copy(pts[n - 1]); head.visible = prog > 0;
      show(ccap, sm(seg(t, T.start + .2, T.start + .6)));
      band.material.opacity = .13 * sm(seg(t, tS + .1, tS + .7)); show(zero, sm(seg(t, tS + .4, tS + .9))); show(idle, sm(seg(t, tS + .7, tS + 1.2)));
      HUD = { tag: ['05', 'CUSTO'] };
      cam(Math.sin(u * .5) * .3, 2.3, 14.2 - .6 * sm(seg(u, 0, 5)), 0, 2.3, 0);
    } };
  };

  /* 6 — encerramento */
  SC.outro = T => {
    const c = cues(T), g = new THREE.Group();
    const mark = makeMark(1.05); mark.position.set(0, 4.5, 0); g.add(mark);
    const h1 = makeHex(1.4), h2 = makeHex(1.75, BLUE), h3 = makeHex(2.1, ORANGE); [h1, h2, h3].forEach(h => { h.position.copy(mark.position); g.add(h); });
    return { group: g, update(t) {
      const u = t - T.start, pin = eo4(seg(t, -.05, .9));
      mark.scale.setScalar(Math.max(.001, 1.05 * pin)); mark.rotation.y = Math.sin(u * .8) * .5; mark.position.y = 4.5 + Math.sin(u * 1.2) * .08;
      [h1, h2, h3].forEach((h, i) => { h.scale.setScalar(Math.max(.001, pin * (1 + i * .02))); h.rotation.z = Math.PI / 6 + u * (.2 - i * .12) * (i % 2 ? -1 : 1); h.position.y = mark.position.y; h.material.opacity = .9 - i * .25; });
      HUD = { outro: { a: sm(seg(t, c[0] + .1, c[0] + .6)), b: sm(seg(t, c[1] + .0, c[1] + .5)), c: sm(seg(t, c[2] + .0, c[2] + .5)) } };
      cam(Math.sin(u * .4) * .3, 2.3, 14.2 - .8 * sm(seg(u, 0, 5)), 0, 2.3, 0);
    } };
  };

  const scenes = TL.scenes.map(s => { const o = SC[s.id](s); o.group.visible = false; scene.add(o.group); return { ...o, T: s }; });

  function renderAt(t) {
    HUD = null;
    let idx = 0; scenes.forEach((s, i) => { if (t >= s.T.start - .1) idx = i; });
    scenes.forEach((s, i) => s.group.visible = i === idx);
    const S = scenes[idx]; S.update(t);
    dust.position.y = Math.sin(t * .25) * .3; dust.rotation.y = t * .02;
    grid.position.z = (t * .4) % 1;
    composer.render();
    const edge = idx === 0 ? 0 : Math.max(0, 1 - (t - (S.T.start - .1)) / .3);
    const fade = Math.max(edge * .85, 1 - sm(seg(t, 0, .35)), sm(seg(t, TL.total - .6, TL.total)));
    return { fade, hud: HUD, progress: t / TL.total };
  }
  return { renderAt, dispose() { renderer.dispose(); } };
}
