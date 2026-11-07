import * as THREE from 'three';

/* Cenas 3D alegres (vertical 1080x1920). Tudo é função do tempo t (segundos). */
export function createShortWorld(canvas, TL) {
  const W = 1080, H = 1920;
  const FONT = '"Liberation Sans","Helvetica Neue",Helvetica,Arial,"DejaVu Sans",sans-serif';
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const eo = x => 1 - Math.pow(1 - clamp(x), 3);
  const eb = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const rng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false); renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, W / H, .1, 100);
  const cam = (px, py, pz, lx = 0, ly = 0, lz = 0) => { camera.position.set(px, py, pz); camera.lookAt(lx, ly, lz); };
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c8ff, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(4, 8, 9); scene.add(key);

  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .4, metalness: 0, ...o });

  /* ---- texto ---- */
  function textCanvas(text, { size = 84, color = '#fff', bg = '#8b5cf6', pad = 34, radius = 44 } = {}) {
    const c = document.createElement('canvas'), x = c.getContext('2d');
    const font = `800 ${size}px ${FONT}`; x.font = font;
    const w = Math.ceil(x.measureText(text).width + pad * 2), h = Math.ceil(size * 1.3 + pad * .8);
    c.width = w; c.height = h; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(40,10,90,.25)'; x.beginPath(); x.roundRect(4, 10, w - 8, h - 10, radius); x.fill();
    x.fillStyle = bg; x.beginPath(); x.roundRect(4, 4, w - 8, h - 14, radius); x.fill();
    x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke();
    x.fillStyle = color; x.fillText(text, w / 2, h / 2 - 4);
    return c;
  }
  const mkTex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  function bubble(text, h = .8, o = {}) {
    const c = textCanvas(text, o);
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mkTex(c), transparent: true, depthWrite: false, toneMapped: false, fog: false }));
    m.userData.h = h; m.userData.asp = c.width / c.height; m.scale.set(.001, .001, 1); m.visible = false; return m;
  }
  function pop(m, p) { m.visible = p > .01; m.material.opacity = clamp(p * 2); m.scale.set(m.userData.h * m.userData.asp * p, m.userData.h * p, 1); }

  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const glow = (color, size, op = .8) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(size, size, 1); return s; };

  /* ---- personagens ---- */
  function makeEye(r) {
    const e = new THREE.Group();
    const w = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat(0xffffff, { roughness: .2 }));
    const p = new THREE.Mesh(new THREE.SphereGeometry(r * .5, 14, 10), mat(0x1a1033)); p.position.z = r * .72;
    e.add(w, p); e.userData.p = p; return e;
  }
  function bar3(a, b, th, depth, m) {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(len + th * .25, th, depth), m);
    mesh.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0); mesh.rotation.z = Math.atan2(dy, dx); return mesh;
  }
  function makeLambda(color, scale) {
    const g = new THREE.Group(); const m = mat(color, { emissive: color, emissiveIntensity: .35 });
    g.add(bar3([-.62, 1.05], [.62, -1.05], .3, .45, m)); g.add(bar3([-.03, .05], [-.66, -1.05], .3, .45, m));
    g.scale.setScalar(scale); return g;
  }
  function makeMascot(color) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1.1, 40, 28), mat(color, { roughness: .3 })));
    const eyes = [-1, 1].map(s => { const e = makeEye(.27); e.position.set(s * .44, .25, .9); g.add(e); return e; });
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(.27, .065, 10, 24, Math.PI), mat(0x5a1a00)); mouth.position.set(0, -.08, 1.02); mouth.rotation.z = Math.PI; g.add(mouth);
    [-1, 1].forEach(s => { const ch = new THREE.Mesh(new THREE.SphereGeometry(.18, 14, 10), mat(0xff7aa8)); ch.scale.set(1, .7, .3); ch.position.set(s * .72, -.12, .9); g.add(ch); });
    const lam = makeLambda(0xffffff, .62); lam.position.set(0, 1.78, 0); g.add(lam);
    g.userData = { eyes, mouth, lam }; return g;
  }
  function setMood(m, awake, smile) {
    m.userData.eyes.forEach(e => e.scale.y = Math.max(.08, lerp(.1, 1, awake)));
    m.userData.mouth.rotation.z = Math.PI; m.userData.mouth.scale.set(lerp(.6, 1.2, smile), lerp(.6, 1.2, smile), 1);
  }
  function makeServer() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.1, 1.2), mat(0x9db4ff)));
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.72, .12, 1.22), mat(0x6f86e0)); stripe.position.y = -.38; g.add(stripe);
    const led = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 10), mat(0xff4d4d, { emissive: 0xff4d4d, emissiveIntensity: 1 })); led.position.set(1.1, .35, .62); g.add(led);
    const eyes = [-.5, .5].map(x => { const e = makeEye(.2); e.position.set(x, .1, .62); g.add(e); return e; });
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(.18, .045, 8, 20, Math.PI), mat(0x3b1d7a)); mouth.position.set(0, -.2, .63); g.add(mouth);
    g.userData = { led, eyes, mouth }; return g;
  }
  function makeCoin(flat) {
    const geo = new THREE.CylinderGeometry(.3, .3, .08, 28); if (!flat) geo.rotateX(Math.PI / 2);
    return new THREE.Mesh(geo, mat(0xffc933, { metalness: .4, roughness: .3, emissive: 0x9a6a00, emissiveIntensity: .35 }));
  }
  function makeConfetti(n, seed) {
    const r = rng(seed), g = new THREE.Group(), items = [], cols = [0xff5fa2, 0xffd23f, 0x3ddcff, 0x8b5cf6, 0x3ddc84, 0xff9900];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(.16, .26, .03), mat(cols[i % 6], { roughness: .5 })); m.visible = false; g.add(m);
      items.push({ m, vx: (r() - .5) * 8, vy: 2 + r() * 6.5, vz: (r() - .2) * 3.5, rx: r() * 9, rz: r() * 9 });
    }
    g.userData.update = (t, t0, ox, oy) => items.forEach(it => {
      const dt = t - t0;
      if (dt < 0 || dt > 1.9) { it.m.visible = false; return; }
      it.m.visible = true; it.m.position.set(ox + it.vx * dt, oy + it.vy * dt - 4.6 * dt * dt, 1 + it.vz * dt);
      it.m.rotation.set(it.rx * dt, 0, it.rz * dt); it.m.scale.setScalar(1 - seg(dt, 1.3, 1.9));
    });
    return g;
  }

  /* ---- nuvens persistentes ---- */
  const clouds = [];
  { const r = rng(9);
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      [[0, 0, 1], [.9, -.15, .75], [-.9, -.2, .7], [.3, .4, .7]].forEach(([x, y, s]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 20, 14), mat(0xffffff, { roughness: .9, emissive: 0xffffff, emissiveIntensity: .3 })); m.position.set(x, y, 0); g.add(m); });
      g.userData = { base: r() * 22, sp: .25 + r() * .35, y: -1 + r() * 8, z: -9 - r() * 6, sc: .8 + r() * .8 };
      g.position.z = g.userData.z; g.scale.setScalar(g.userData.sc); scene.add(g); clouds.push(g);
    } }

  /* ---- cenas ---- */
  const cues = T => T.sentences.map(s => s.start).concat([T.sentences[T.sentences.length - 1].end]);
  const SC = {}; let HUD = null;

  SC.hook = T => {
    const c = cues(T), g = new THREE.Group(), tp = c[1] + .7;
    const servers = [0, 1, 2].map(i => { const s = makeServer(); g.add(s); return s; });
    const top = bubble('24h ligado', .75, { bg: '#ff5f6d' }); top.position.set(0, 5.95, .8); g.add(top);
    const coins = []; for (let i = 0; i < 8; i++) { const m = makeCoin(false); g.add(m); coins.push(m); }
    const bill = bubble('$$$', 1.1, { bg: '#ffd23f', color: '#3b1d7a' }); bill.position.set(2.1, .3, 1); g.add(bill);
    const chega = bubble('Chega!', 1.4, { bg: '#8b5cf6' }); chega.position.set(0, 3.0, 2); g.add(chega);
    const conf = makeConfetti(60, 3); g.add(conf);
    return { group: g, update(t) {
      const u = t - T.start;
      servers.forEach((s, i) => {
        const pin = eb(seg(t, i * .1, .45 + i * .1)), shake = sm(seg(t, c[1] - .35, c[1] + .1)) * (t < tp ? 1 : 0), out = sm(seg(t, tp, tp + .18));
        s.scale.setScalar(Math.max(.001, pin * (1 - out)));
        s.position.set(Math.sin(t * 55 + i) * .09 * shake, 3.55 - i * 1.4 + Math.sin(t * 3 + i) * .04, 0); s.rotation.z = Math.sin(t * 47 + i * 2) * .04 * shake;
        s.userData.led.material.emissiveIntensity = .6 + .6 * Math.abs(Math.sin(t * 6 + i));
        s.userData.eyes.forEach(e => e.userData.p.position.x = Math.sin(t * 2 + i) * .04);
      });
      pop(top, eb(seg(t, .25, .7)) * (1 - sm(seg(t, tp, tp + .15))));
      coins.forEach((m, i) => { const ph = ((t - .6) * .55 + i / 8) % 1, dir = i % 2 ? 1 : -1;
        m.visible = t > .6 && t < tp; m.position.set(dir * ph * 3.2, 2.5 + ph * 3.2 - ph * ph * 2.4, 1.2); m.rotation.y = t * 6 + i; m.scale.setScalar(.9 + .5 * Math.sin(ph * Math.PI)); });
      bill.material.rotation = Math.sin(t * 5) * .1; pop(bill, eb(seg(t, .9, 1.3)) * (1 - sm(seg(t, tp, tp + .15))));
      chega.position.y = 3.0 + Math.sin(u * 4) * .08; pop(chega, eb(seg(t, c[1] + .05, c[1] + .5)));
      conf.userData.update(t, tp, 0, 2.4);
      cam(Math.sin(u * .9) * .25, .9, 15.4 - .8 * sm(seg(t, 0, c[1])), 0, .9, 0);
    } };
  };

  SC.wake = T => {
    const c = cues(T), g = new THREE.Group();
    const tHit = T.start + 1.3, tWake = tHit + .15, tSleep = c[1] - .9;
    const m = makeMascot(0xff9900); g.add(m);
    const zs = [0, 1, 2].map(i => { const l = bubble(i ? 'z' : 'Z', .7 - .1 * i, { bg: '#7c6cf0' }); g.add(l); return l; });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.4, 20, 14), mat(0xffe14d, { emissive: 0xffd000, emissiveIntensity: .9 })); ball.add(glow(0xffdd44, 3.4, .9)); g.add(ball);
    const called = bubble('Chamou!', 1.0, { bg: '#ff5fa2' }); called.position.set(1.2, 5.3, 1.6); g.add(called);
    const done = bubble('Rodou!', 1.0, { bg: '#3ddc84' }); done.position.set(0, 5.5, 1.6); g.add(done);
    const conf = makeConfetti(50, 11); g.add(conf);
    return { group: g, update(t) {
      const u = t - T.start, pin = eb(seg(t, T.start - .05, T.start + .5));
      const awake = sm(seg(t, tWake, tWake + .15)) * (1 - sm(seg(t, tSleep, tSleep + .3)));
      const k = Math.max(0, t - tWake);
      m.position.y = 2.4 + awake * Math.abs(Math.sin(k * 6.5)) * .55;
      const sq = awake * Math.cos(k * 13) * .08, S = 1.4 * Math.max(.001, pin);
      m.scale.set(S * (1 - sq * .5), S * (1 + sq), S * (1 - sq * .5));
      setMood(m, awake, lerp(.6, 1, awake)); m.userData.lam.rotation.y = awake > 0 ? Math.sin(k * 6) * .7 : Math.sin(u * 2) * .3;
      zs.forEach((l, i) => { const ph = ((t * .8 + i * .45) % 1.35) / 1.35; l.position.set(1.4 + ph * .6 + i * .15, 3.7 + ph * 1.8, 1.4); pop(l, (1 - awake) * pin * Math.sin(ph * Math.PI) * 1.1); });
      const fl = seg(t, T.start + .5, tHit); ball.visible = t > T.start + .5 && t < tHit;
      ball.position.set(lerp(3.0, .9, eo(fl)), lerp(6.4, 3.4, eo(fl)), 1.6);
      pop(called, eb(seg(t, T.start + .75, T.start + 1.15)) * (1 - sm(seg(t, tWake + .4, tWake + .6))));
      pop(done, eb(seg(t, tWake + .9, tWake + 1.25)) * (1 - sm(seg(t, tSleep, tSleep + .2))));
      conf.userData.update(t, tHit, 0, 2.6);
      cam(Math.sin(u * .8) * .3, 1.0, 15.2 - .8 * sm(seg(u, 0, 3)), 0, 1.0, 0);
    } };
  };

  SC.scale = T => {
    const c = cues(T), g = new THREE.Group(), dur = c[1] - c[0];
    const cross = new THREE.Group(); const sv = makeServer(); sv.scale.setScalar(.55); cross.add(sv);
    const x1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, .3, .2), mat(0xff3b4f, { emissive: 0xff3b4f, emissiveIntensity: .4 })); x1.rotation.z = .6; x1.position.z = .9;
    const x2 = x1.clone(); x2.rotation.z = -.6; cross.add(x1, x2); cross.position.set(0, 5.4, 0); g.add(cross);
    const pal = [0xff9900, 0xff5fa2, 0x3ddcff, 0x8b5cf6, 0x3ddc84, 0xffd23f];
    const minis = []; for (let i = 0; i < 12; i++) { const mm = makeMascot(pal[i % 6]); mm.userData.bx = (i % 3 - 1) * 1.9; mm.userData.by = 4.6 - Math.floor(i / 3) * 1.55; g.add(mm); minis.push(mm); }
    const conf = makeConfetti(50, 21); g.add(conf);
    const t0 = T.start + 1.0, dtc = Math.max(.12, (dur - 1.5) / 12);
    return { group: g, update(t) {
      const u = t - T.start;
      cross.scale.setScalar(Math.max(.001, eb(seg(t, T.start - .05, T.start + .35)) * (1 - sm(seg(t, T.start + .95, T.start + 1.15)))));
      cross.rotation.z = Math.sin(u * 8) * .05;
      minis.forEach((mm, i) => { const ti = t0 + i * dtc, p = eb(seg(t, ti, ti + .4)), b = Math.sin(t * 7 + i);
        mm.scale.set(.5 * p * (1 + .05 * b), .5 * p * (1 - .05 * b), .5 * p); mm.position.set(mm.userData.bx, mm.userData.by + (p > .9 ? Math.abs(Math.sin(t * 4 + i * .5)) * .12 : 0), 0);
        setMood(mm, 1, 1); mm.userData.lam.rotation.y = Math.sin(t * 4 + i) * .7; });
      conf.userData.update(t, t0 + dtc * 6, 0, 3.0);
      cam(Math.sin(u) * .25, 1.9, 15.4 - .6 * sm(seg(u, 0, 2.5)), 0, 2.0, 0);
    } };
  };

  SC.cost = T => {
    const c = cues(T), g = new THREE.Group();
    const m = makeMascot(0xff9900); m.position.set(-1.0, 2.8, 0); g.add(m);
    const clock = new THREE.Group(); clock.position.set(1.75, 4.5, 0.2); g.add(clock);
    clock.add(new THREE.Mesh(new THREE.CircleGeometry(.85, 40), mat(0xffffff, { roughness: .6 })));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.88, .1, 12, 48), mat(0xffd23f)); clock.add(ring);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(.08, .62, .06), mat(0x3b1d7a)); hand.geometry.translate(0, .31, 0); hand.position.z = .08; clock.add(hand);
    const stack = []; for (let i = 0; i < 8; i++) { const cn = makeCoin(true); cn.position.set(1.75, 1.3 + i * .13, 0); g.add(cn); stack.push(cn); }
    const zero = bubble('US$ 0,00', 1.5, { bg: '#22c55e' }); zero.position.set(0, 5.2, 1.5); g.add(zero);
    const zs = [0, 1, 2].map(i => { const l = bubble(i ? 'z' : 'Z', .7 - .1 * i, { bg: '#7c6cf0' }); g.add(l); return l; });
    const conf = makeConfetti(70, 31); g.add(conf);
    const dropT = i => c[0] + .5 + i * ((c[1] - c[0] - 1.0) / 8), tSleep = c[1] + .3, tZero = c[1] + (c[2] - c[1]) * .5;
    return { group: g, update(t) {
      const u = t - T.start, pin = eb(seg(t, T.start - .05, T.start + .4));
      const awake = pin * (1 - sm(seg(t, tSleep, tSleep + .3)));
      m.position.y = 2.8 + awake * Math.abs(Math.sin(t * 5)) * .35;
      m.scale.setScalar(1.25 * Math.max(.001, pin)); setMood(m, awake, awake); m.userData.lam.rotation.y = awake > .5 ? Math.sin(t * 6) * .7 : 0;
      clock.scale.setScalar(Math.max(.001, pin)); hand.rotation.z = -Math.min(t, tSleep) * 6;
      stack.forEach((cn, i) => { const td = dropT(i), f = seg(t, td, td + .35), out = sm(seg(t, c[1] + .3 + i * .03, c[1] + .5 + i * .03));
        cn.position.y = lerp(1.3 + i * .13 + 3, 1.3 + i * .13, eo(f)); cn.visible = f > 0 && out < 1; cn.scale.setScalar(Math.max(.001, 1 - out)); });
      zs.forEach((l, i) => { const ph = ((t * .8 + i * .45) % 1.35) / 1.35; l.position.set(-1.0 + 1.4 + ph * .5 + i * .15, 3.9 + ph * 1.6, 1.4); pop(l, (1 - awake) * (t > tSleep ? 1 : 0) * Math.sin(ph * Math.PI) * 1.1); });
      pop(zero, eb(seg(t, tZero, tZero + .35))); zero.position.y = 5.2 + Math.sin(u * 4) * .06; zero.material.rotation = Math.sin(u * 3) * .03;
      conf.userData.update(t, tZero, 0, 5.0);
      const ms = t < tSleep ? Math.round(142 * sm(seg(t, c[0] + .3, c[1] - .2))) : 0;
      HUD = { text: `${ms} ms`, opacity: sm(seg(t, c[0] + .3, c[0] + .6)) * (1 - sm(seg(t, tZero - .1, tZero + .1))) };
      cam(Math.sin(u * .8) * .3, 1.4, 15.2 - .5 * sm(seg(u, 0, 3)), 0, 1.6, 0);
    } };
  };

  SC.outro = T => {
    const g = new THREE.Group();
    const servers = [0, 1, 2].map(i => { const s = makeServer(); g.add(s); return s; });
    const top = bubble('24h ligado', .75, { bg: '#ff5f6d' }); top.position.set(0, 5.95, .8); g.add(top);
    const qs = [0, 1, 2].map(i => { const l = bubble('?', 1.2, { bg: '#ffd23f', color: '#3b1d7a', pad: 44 }); g.add(l); return l; });
    const cta = bubble('Comenta aí!', 1.0, { bg: '#ff5fa2' }); cta.position.set(0, -.55, 1.5); g.add(cta);
    return { group: g, update(t) {
      const u = t - T.start;
      servers.forEach((s, i) => { const pin = eb(seg(t, T.start - .05 + i * .1, T.start + .4 + i * .1));
        s.scale.setScalar(Math.max(.001, pin)); s.position.set(0, 3.55 - i * 1.4 + Math.sin(t * 3 + i) * .04, 0);
        s.userData.led.material.emissiveIntensity = .6 + .6 * Math.abs(Math.sin(t * 6 + i)); s.userData.eyes.forEach(e => e.userData.p.position.x = Math.sin(t * 2 + i) * .04); });
      pop(top, eb(seg(t, T.start, T.start + .4)));
      qs.forEach((l, i) => { const a = u * 2.2 + i * 2.09; l.position.set(Math.cos(a) * 2.5, 2.4 + Math.sin(a * .7) * 1.4 + (i - 1) * .2, 1.8 + Math.sin(a)); pop(l, eb(seg(t, T.start + .3 + i * .15, T.start + .7 + i * .15)) * .9); });
      pop(cta, eb(seg(t, T.start + 1.0, T.start + 1.4)) * (1 + .04 * Math.sin(u * 8)));
      cam(Math.sin(u * .9) * .25, .9, 14.7, 0, .9, 0);
    } };
  };

  const scenes = TL.scenes.map(s => { const o = SC[s.id](s); o.group.visible = false; scene.add(o.group); return { ...o, T: s }; });

  function renderAt(t) {
    HUD = null;
    let idx = 0; scenes.forEach((s, i) => { if (t >= s.T.start - .05) idx = i; });
    scenes.forEach((s, i) => s.group.visible = i === idx);
    const S = scenes[idx]; S.update(t);
    clouds.forEach(cl => { const d = cl.userData; cl.position.set(((d.base + t * d.sp) % 24) - 12, d.y + Math.sin(t * .5 + d.base) * .2, d.z); });
    renderer.render(scene, camera);
    const flash = idx > 0 ? Math.max(0, 1 - (t - (S.T.start - .05)) / .2) * .6 : 0;
    return { flash, hud: HUD };
  }
  return { renderAt, dispose() { renderer.dispose(); } };
}
