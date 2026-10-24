// 观辰 · A 夜观 background scene (P6). Ported from the approved particle test page (2026-10-23).
// cover: rotating compass of stars · star: particles converge into the natal star (while the reading loads) ·
// nature: the star dissolves into the ridgelines, far stars, flowing water and drifting lights; contour-line ink
// mountains condense out of the dark and light runs along the ridges. Needs THREE (r128) as a global.
export function createScene(canvas, { mobile = false, reduce = false } = {}) {
  const THREE = window.THREE;
  const CORE = mobile ? 4000 : 9000;
  const SKY = mobile ? 1400 : 3500;
  const METEORS = 5, TRAIL = 14;
  const EL = { 木: '#6DBF8B', 火: '#E8735A', 土: '#CFA25A', 金: '#E8E4DA', 水: '#6E98E8' };
  const GOLD = '#E2C078', IVORY = '#ECE6D8', BLUE = '#9FB4D8';
  let WEIGHT = { 木: 1, 火: 1, 土: 1, 金: 1, 水: 1 };   // neutral until a chart is set

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const DPR = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer.setPixelRatio(DPR); renderer.setClearColor('#070B15');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);

  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const col = new THREE.Color();
  const put = (arr, i, hex) => { col.set(hex); arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; };

  // One shader for every particle: morph between compass disk and pillars, differential rotation,
  // free drift, twinkle with occasional sparkle, meteors along a line.
  const vert = `
    uniform float uTime; uniform float uMorph; uniform float uScale; uniform float uBurst; uniform float uNature;
    attribute vec3 aPill; attribute vec3 aCol2; attribute vec4 aMisc; // misc: phase, size, kind, speed
    attribute vec3 aDir; attribute vec4 aNat; attribute vec3 aCol3;   // aNat: nature position + type (0 ridge, 1 far star, 2 water, 3 free light)
    varying vec3 vCol; varying float vAlpha;
    void main() {
      float phase = aMisc.x, size = aMisc.y, kind = aMisc.z, spd = aMisc.w;
      float m = uMorph;                 // spring-driven on the CPU: may overshoot slightly past 0 or 1
      float mc = clamp(m, 0., 1.);
      float n = uNature, nc = clamp(n, 0., 1.);   // 'nature': the star dissolves into mountains, sky, water and drifting light
      vec3 p = position;
      float alpha = 1.;
      if (kind < 2.5) {
        // compass disk: inner rings turn faster (galaxy-like), slight vertical breathing
        float r = length(p.xz);
        float a = uTime * spd / (0.6 + r);
        p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
        p.y += sin(uTime * .6 + phase) * .03 * r;
        if (kind > 0.5) {   // free drifters: wander on slow Lissajous paths
          p += vec3(sin(uTime*.23*spd*8. + phase)*.9, sin(uTime*.31*spd*8. + phase*1.7)*.5, cos(uTime*.19*spd*8. + phase*.6)*.9);
        }
        // spiral inward while converging
        float sw = m * 3.4 * (1. - m * .45);
        p.xz = mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * p.xz;
        vec3 tp = aPill;
        if (aDir.x > .5) {   // orbit ring (five-element colours), slow spin then tilt
          float ra = uTime * .42; tp.xz = mat2(cos(ra), -sin(ra), sin(ra), cos(ra)) * tp.xz;
          float c = cos(.5), s = sin(.5); tp = vec3(tp.x, tp.y * c - tp.z * s, tp.y * s + tp.z * c);
        } else {             // star core: swirling, breathing
          float ra = uTime * .9; tp.xz = mat2(cos(ra), -sin(ra), sin(ra), cos(ra)) * tp.xz;
          tp *= 1. + .07 * sin(uTime * 1.5 + phase * 6.2831);
        }
        p = mix(p, tp, kind > 1.5 ? 0. : m);
        if (kind < .5) size *= mix(1., aDir.x > .5 ? .85 : 1.45, mc * (1. - nc));
        if (kind < .5) {   // nebula burst when the star disperses: fly outward with a twist, then the spring pulls them home
          vec3 outDir = normalize(p + vec3(.0001, .0002, .0003));
          p += outDir * uBurst * (1.0 + fract(phase * 13.7) * 3.4);
          float bs = uBurst * 1.8 * (fract(phase * 5.3) - .5);
          p.xz = mat2(cos(bs), -sin(bs), sin(bs), cos(bs)) * p.xz;
        }
        if (kind < .5 && nc > .0005) {
          vec3 q = aNat.xyz; float ty = aNat.w, sp = .6 + spd * 8.;
          if (ty < .5) {            // rest on the ridgelines: slow glide and shimmer
            q.x += sin(uTime * .3 * sp + phase * 9.) * .12; q.y += sin(uTime * 1.2 + phase * 20.) * .025;
          } else if (ty < 1.5) {    // distant stars
            q.x += sin(uTime * .05 + phase * 6.) * .5;
          } else if (ty < 2.5) {    // light flowing across the water in front of the mountains
            q.x = mod(aNat.x + 16. + uTime * (.55 + spd * 3.5), 32.) - 16.;
            q.y += sin(q.x * .7 + uTime * 1.4 + phase * 6.) * .05;
            alpha *= mix(1., smoothstep(-16., -11., q.x) * (1. - smoothstep(11., 16., q.x)), nc);
          } else {                  // free lights drifting in the air
            q += vec3(sin(uTime * .32 * sp + phase * 6.) * 1.3, sin(uTime * .26 * sp + phase * 9.) * .7, cos(uTime * .29 * sp + phase * 4.) * 1.1);
          }
          p = mix(p, q, n);
          size *= mix(1., ty < .5 ? .75 : ty < 1.5 ? .6 : ty < 2.5 ? .85 : 1.25, nc);
        }
        if (kind > 1.5) alpha *= 1. - mc * .85;   // drifters fade a little when the pillars form
      } else if (kind < 3.5) {
        // far sky: fixed shell, slow rotation for parallax depth
        float a = uTime * .006;
        p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
      } else {
        // meteor: travel along aDir, trail points lag behind, fade in and out
        float cyc = fract(uTime * spd + phase);
        float lag = aMisc.y;                 // 0..1 position in trail
        p = position + aDir * (cyc * 26. - lag * 1.6);
        alpha = smoothstep(0., .08, cyc) * (1. - smoothstep(.55, .7, cyc)) * (1. - lag);
        alpha *= step(.0, .7 - cyc);
        size = 2.6 * (1. - lag * .7);
      }
      // twinkle: soft breathing for all, sharp sparkle peaks for some
      float tw = .65 + .35 * sin(uTime * (1.2 + spd * 20.) + phase * 6.2831);
      float sparkle = pow(max(0., sin(uTime * (.35 + spd * 3.) + phase * 12.)), 40.);
      float isStar = step(.5, fract(phase * 7.31)) * step(kind, 3.5);
      alpha *= mix(1., tw, isStar) ;
      float boost = 1. + sparkle * isStar * 2.2;
      vCol = mix(mix(color, aCol2, kind > 1.5 ? 0. : mc), aCol3, kind < .5 ? nc : 0.) * (1. + sparkle * isStar * .8) * (1. + (kind < .5 && aDir.x < .5 ? mc * .7 * (1. - nc) : 0.)) * (1. + uBurst * (kind < .5 ? .9 : 0.));
      vAlpha = alpha;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_PointSize = size * boost * uScale / -mv.z;
      gl_Position = projectionMatrix * mv;
    }`;
  const frag = `
    varying vec3 vCol; varying float vAlpha;
    void main() {
      vec2 d = gl_PointCoord - .5; float r = length(d);
      float core = 1. - smoothstep(.0, .5, r);
      float glow = pow(core, 2.2);
      if (core <= 0.) discard;
      gl_FragColor = vec4(vCol * glow, glow * vAlpha);
    }`;

  function makePoints(n, fill) {
    const pos = new Float32Array(n * 3), pill = new Float32Array(n * 3), c1 = new Float32Array(n * 3), c2 = new Float32Array(n * 3), misc = new Float32Array(n * 4), dir = new Float32Array(n * 3), nat = new Float32Array(n * 4), c3 = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) fill(i, pos, pill, c1, c2, misc, dir);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aPill', new THREE.BufferAttribute(pill, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c1, 3));
    g.setAttribute('aCol2', new THREE.BufferAttribute(c2, 3));
    g.setAttribute('aMisc', new THREE.BufferAttribute(misc, 4));
    g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
    g.setAttribute('aNat', new THREE.BufferAttribute(nat, 4));
    g.setAttribute('aCol3', new THREE.BufferAttribute(c3, 3));
    return g;
  }
  const uniforms = { uTime: { value: 0 }, uMorph: { value: 0 }, uScale: { value: 300 }, uBurst: { value: 0 }, uNature: { value: 0 } };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

  // core: compass disk -> four pillars
  const names = ['木', '火', '土', '金', '水'];
  let totalW = names.reduce((s, n) => s + WEIGHT[n], 0);
  let DM = '土';   // day master element colours the star (set per chart)
  const pickEl = () => { let x = rnd() * totalW; for (const n of names) { x -= WEIGHT[n]; if (x <= 0) return n; } return '土'; };
  const coreGeo = makePoints(CORE, (i, pos, pill, c1, c2, misc, dir) => {
    let e = null;
    if (rnd() > 0.35) { let x = rnd() * totalW; for (const n of names) { x -= WEIGHT[n]; if (x <= 0) { e = n; break; } } }
    const rings = [0.9, 1.6, 2.3, 3.0, 3.7];
    const r = rnd() < 0.68 ? rings[Math.floor(rnd() * rings.length)] + (rnd() - 0.5) * 0.2 : 0.3 + Math.pow(rnd(), 0.7) * 4.6;
    const a = rnd() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = (rnd() - 0.5) * 0.14 * (1 + r * 0.25); pos[i * 3 + 2] = Math.sin(a) * r;
    const ring = rnd() < 0.3;
    if (ring) {
      const rr = 1.2 + (rnd() - 0.5) * 0.3 + (rnd() < 0.15 ? 0.4 : 0), aa = rnd() * Math.PI * 2;
      pill[i * 3] = Math.cos(aa) * rr; pill[i * 3 + 1] = (rnd() - 0.5) * 0.05; pill[i * 3 + 2] = Math.sin(aa) * rr; dir[i * 3] = 1;
    } else {
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, rad = 0.46 * Math.pow(rnd(), 0.6), sq = Math.sqrt(1 - u * u);
      pill[i * 3] = Math.cos(th) * sq * rad; pill[i * 3 + 1] = u * rad; pill[i * 3 + 2] = Math.sin(th) * sq * rad; dir[i * 3 + 1] = rad;
    }
    const free = rnd() < 0.12;                       // ~12% wander freely and never join the pillars
    const diskHex = e ? EL[e] : (rnd() < 0.25 ? GOLD : rnd() < 0.3 ? BLUE : IVORY);
    put(c1, i, diskHex);
    put(c2, i, ring ? EL[pickEl()] : dir[i * 3 + 1] < 0.2 ? '#FFF4DC' : rnd() < 0.55 ? EL[DM] : GOLD);
    misc[i * 4] = rnd(); misc[i * 4 + 1] = (free ? 2.2 : 1.6) + rnd() * 2.2; misc[i * 4 + 2] = free ? 2 : 0; misc[i * 4 + 3] = 0.05 + rnd() * 0.08;
  });
  const core = new THREE.Points(coreGeo, material); core.rotation.x = 0.32; scene.add(core);
  const gc = document.createElement('canvas'); gc.width = gc.height = 128;
  const gg = gc.getContext('2d'); const gr0 = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr0.addColorStop(0, 'rgba(255,255,255,1)'); gr0.addColorStop(0.2, 'rgba(255,255,255,0.55)'); gr0.addColorStop(1, 'rgba(255,255,255,0)'); gg.fillStyle = gr0; gg.fillRect(0, 0, 128, 128);
  const glowTex = new THREE.CanvasTexture(gc);
  const mkGlow = (hex) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: hex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(sp); return sp; };
  const starCore = mkGlow('#FFE9BC'), starHalo = mkGlow('#C9A86A');

  // far star shell for depth
  const skyGeo = makePoints(SKY, (i, pos, pill, c1, c2, misc) => {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, R = 28 + rnd() * 30, s = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(th) * s * R; pos[i * 3 + 1] = u * R * 0.7 + 4; pos[i * 3 + 2] = Math.sin(th) * s * R;
    const hex = rnd() < 0.12 ? GOLD : rnd() < 0.25 ? BLUE : IVORY; put(c1, i, hex); put(c2, i, hex);
    misc[i * 4] = rnd(); misc[i * 4 + 1] = 9 + rnd() * (rnd() < 0.05 ? 40 : 14); misc[i * 4 + 2] = 3; misc[i * 4 + 3] = 0.02 + rnd() * 0.06;
  });
  scene.add(new THREE.Points(skyGeo, material));

  // meteors
  const meteorGeo = makePoints(METEORS * TRAIL, (i, pos, pill, c1, c2, misc, dir) => {
    const m = Math.floor(i / TRAIL), lag = (i % TRAIL) / TRAIL;
    let s2 = 1000 + m * 97; const rr = () => { s2 = (s2 * 16807) % 2147483647; return (s2 - 1) / 2147483646; };
    const sx = -14 + rr() * 10, sy = 6 + rr() * 8, sz = -18 - rr() * 10;
    const d = new THREE.Vector3(1, -0.45 - rr() * 0.3, 0.2).normalize();
    pos[i * 3] = sx; pos[i * 3 + 1] = sy; pos[i * 3 + 2] = sz;
    dir[i * 3] = d.x; dir[i * 3 + 1] = d.y; dir[i * 3 + 2] = d.z;
    put(c1, i, lag < 0.15 ? '#FFF6DE' : GOLD); put(c2, i, GOLD);
    misc[i * 4] = rr(); misc[i * 4 + 1] = lag; misc[i * 4 + 2] = 4; misc[i * 4 + 3] = 0.035 + rr() * 0.04;
  });
  scene.add(new THREE.Points(meteorGeo, material));

  // faint nebula light: a few large soft sprites (gold + deep blue), very low alpha
  const nc = document.createElement('canvas'); nc.width = nc.height = 128;
  const ng = nc.getContext('2d'); const gr = ng.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); ng.fillStyle = gr; ng.fillRect(0, 0, 128, 128);
  const nebTex = new THREE.CanvasTexture(nc);
  [[GOLD, 0.10, [6, 7, -20], 26], ['#3A5A9A', 0.12, [-10, 3, -24], 30], [GOLD, 0.07, [0, -1, 0], 9], ['#5B4A8A', 0.07, [12, -4, -30], 28]].forEach(([hex, op, p, s]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebTex, color: hex, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.position.set(p[0], p[1], p[2]); sp.scale.set(s, s, 1); scene.add(sp);
  });

  // ---- 观辰山水: contour-line ink mountains, generated once, revealed behind the pillars ----
  function makeMountains(W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    let s = 2026; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const tab = Array.from({ length: 512 }, r);
    const vn = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return tab[((i % 512) + 512) % 512] * (1 - u) + tab[(((i + 1) % 512) + 512) % 512] * u; };
    const fbm = x => vn(x) * .5 + vn(x * 2.1 + 7) * .25 + vn(x * 4.3 + 13) * .125 + vn(x * 8.7 + 29) * .0625;
    const base = H * .62, px = W / 2048;
    // four layers, back to front: far haze, mid, near massifs, islets in the water.
    // peaks flank a central valley that opens to the horizon light (x = .5)
    const M = [
      [0, .10, .06, .20, .2], [0, .24, .05, .24, -.1], [0, .37, .045, .27, .2], [0, .46, .035, .20, 0], [0, .55, .04, .23, -.2], [0, .66, .05, .28, .1], [0, .79, .05, .22, -.2], [0, .92, .06, .25, .2],
      [1, .04, .07, .26, .3], [1, .19, .06, .32, -.2], [1, .33, .05, .30, .25], [1, .63, .05, .34, -.25], [1, .76, .06, .30, .15], [1, .94, .07, .29, -.3],
      [2, .08, .11, .46, .3], [2, .27, .06, .30, -.2], [2, .71, .06, .33, .2], [2, .92, .11, .50, -.3],
      [3, .20, .025, .06, .1], [3, .40, .018, .045, .2], [3, .43, .012, .03, 0], [3, .58, .02, .05, -.2], [3, .62, .012, .028, 0], [3, .83, .022, .055, -.1]
    ];
    const peaks = M.map(m => { const n = m[0] === 3 ? 1 : 2 + Math.floor(r() * 3); return [{ c: 0, a: 1, w: 1 }].concat(Array.from({ length: n }, () => ({ c: (r() - .5) * 1.4, a: .35 + r() * .45, w: .35 + r() * .45 }))); });
    const height = (mi, x) => {
      const [, cx, w, h, sk] = M[mi]; let t = (x / W - cx) / w; t = t < 0 ? t * (1 + sk) : t * (1 - sk);
      let v = 0;
      for (const q of peaks[mi]) { const d = Math.abs(t - q.c) / q.w; if (d < 1.6) v = Math.max(v, q.a * Math.pow(Math.cos(d / 1.6 * Math.PI / 2), 1.5) * (1 - .25 * d / 1.6)); }
      if (v <= 0) return 0;
      const ridged = 1 - Math.abs(2 * fbm(x / W * 22 + cx * 31) - 1);
      return v * h * H * (.78 + .32 * ridged) + (fbm(x / W * 90 + cx * 7) - .5) * H * .012 * v;
    };
    const ICE = [196, 214, 236], GOLDC = [226, 192, 120];
    const LAYER = [   // base offset, body top/bottom, lines, gap, alpha, decay, gold ridge
      { b: -.03, top: 'rgba(30,42,72,0.72)', bot: 'rgba(24,34,60,0.8)', K: 16, gap: .0045, a: .15, d: 8, gold: false },
      { b: -.012, top: 'rgba(18,26,48,0.9)', bot: 'rgba(14,20,38,0.93)', K: 26, gap: .0055, a: .3, d: 11, gold: true },
      { b: 0, top: 'rgba(9,13,26,0.97)', bot: 'rgba(6,9,18,0.98)', K: 44, gap: .0064, a: .5, d: 15, gold: true },
      { b: .004, top: 'rgba(5,7,14,0.99)', bot: 'rgba(5,7,14,0.99)', K: 9, gap: .004, a: .55, d: 5, gold: true }
    ];
    const flows = [], ridge = [];
    const mist = (n, yLo, yHi, aLo, aHi) => {
      g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < n; i++) {
        const x = r() * W, y = base - H * (yLo + r() * (yHi - yLo)), rx = W * (.06 + r() * .12), ry = H * (.02 + r() * .04);
        const mg = g.createRadialGradient(x, y, 0, x, y, rx);
        mg.addColorStop(0, `rgba(150,176,214,${(aLo + r() * (aHi - aLo)).toFixed(3)})`); mg.addColorStop(1, 'rgba(150,176,214,0)');
        g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = mg; g.beginPath(); g.arc(x, y, rx, 0, Math.PI * 2); g.fill(); g.restore();
      }
    };
    M.forEach((m, mi) => m.push(mi));
    for (const L of [0, 1, 2, 3]) {
      const P = LAYER[L], lb = base + P.b * H;
      for (const m of M.filter(q => q[0] === L)) {
        const mi = m[5];
        const x0 = Math.max(0, (m[1] - m[2] * 2.4) * W), x1 = Math.min(W, (m[1] + m[2] * 2.4) * W), step = 2.5 * px;
        g.globalCompositeOperation = 'source-over';
        const body = g.createLinearGradient(0, lb - m[3] * H, 0, lb);
        body.addColorStop(0, P.top); body.addColorStop(1, P.bot);
        g.fillStyle = body; g.beginPath(); g.moveTo(x0, lb);
        for (let x = x0; x <= x1; x += step) g.lineTo(x, lb - height(mi, x));
        g.lineTo(x1, lb); g.closePath(); g.fill();
        // strata strokes follow the ridge downward like texture strokes
        g.globalCompositeOperation = 'lighter';
        for (let k = 0; k < P.K; k++) {
          const a = P.a * Math.exp(-k / P.d) + .01;
          const col = P.gold && k < 2 ? GOLDC : P.gold && k < 6 ? ICE.map((v, i) => Math.round(v + (GOLDC[i] - v) * (6 - k) / 8)) : ICE;
          g.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${a.toFixed(3)})`;
          g.lineWidth = (k === 0 ? 1.5 : 1) * px;
          const record = L >= 2 && k < 7 && r() < (L === 3 ? .6 : .5);
          let run = [];
          const flush = () => { if (record && run.length > 24) flows.push(run); run = []; };
          g.beginPath(); let on = false;
          for (let x = x0; x <= x1; x += step) {
            const h = height(mi, x);
            const y = lb - h + k * P.gap * H * (1 + .5 * fbm(x / W * 6 + k * .3)) + (fbm(x / W * 28 + k * .9 + mi) - .5) * H * .012 * Math.min(1, k / 10);
            if (h < 2 * px || y > lb - 2 * px) { on = false; flush(); continue; }
            if (!on) { g.moveTo(x, y); on = true; } else g.lineTo(x, y);
            if (record && Math.round(x / step) % 3 === 0) run.push([x / W, y / H]);
            if (k === 0 && L >= 1 && Math.round(x / step) % 4 === 0) ridge.push([x / W, y / H, L]);
          }
          flush();
          g.stroke();
          if (k === 0 && P.gold) { g.lineWidth = 6 * px; g.strokeStyle = 'rgba(226,192,120,0.07)'; g.stroke(); }
        }
      }
      // mist between layers, thicker behind, thinner in front
      if (L < 3) mist([30, 26, 34][L], .0, [.10, .08, .11][L], [.05, .05, .06][L], [.12, .11, .14][L]);
    }
    const band = g.createLinearGradient(0, base - H * .14, 0, base); band.addColorStop(0, 'rgba(120,150,200,0)'); band.addColorStop(1, 'rgba(120,150,200,0.16)');
    g.fillStyle = band; g.fillRect(0, base - H * .14, W, H * .14);
    // horizon light in the valley (观辰: the star seen between the mountains)
    const hl = g.createRadialGradient(W * .5, base, 0, W * .5, base, W * .16);
    hl.addColorStop(0, 'rgba(248,226,176,0.55)'); hl.addColorStop(.25, 'rgba(226,192,120,0.16)'); hl.addColorStop(1, 'rgba(226,192,120,0)');
    g.save(); g.translate(W * .5, base); g.scale(1, .32); g.translate(-W * .5, -base); g.globalCompositeOperation = 'lighter'; g.fillStyle = hl; g.beginPath(); g.arc(W * .5, base, W * .16, 0, Math.PI * 2); g.fill(); g.restore();
    // still water: faint reflection that fades with depth, plus glints
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = .12;
    g.save(); g.translate(0, base * 2); g.scale(1, -1); g.drawImage(c, 0, base - H * .3, W, H * .3, 0, base - H * .3, W, H * .3); g.restore(); g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-out';
    const fade = g.createLinearGradient(0, base, 0, base + H * .3); fade.addColorStop(0, 'rgba(0,0,0,0.1)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = fade; g.fillRect(0, base, W, H - base);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 160; i++) {
      const y = base + 2 * px + Math.pow(r(), 1.6) * H * .2, x = W * (.5 + (r() - .5) * (.25 + (y - base) / H * 2.2)), len = (10 + r() * 60) * px * (1 + (y - base) / H * 4);
      g.strokeStyle = r() < .5 ? `rgba(240,217,166,${(.05 + r() * .18).toFixed(3)})` : `rgba(196,214,236,${(.04 + r() * .12).toFixed(3)})`;
      g.lineWidth = px; g.beginPath(); g.moveTo(x - len / 2, y); g.lineTo(x + len / 2, y); g.stroke();
    }
    return { canvas: c, flows, ridge };
  }
  const TW = mobile ? 1536 : 2560;
  const MT = makeMountains(TW, TW / 2);
  const mtTex = new THREE.CanvasTexture(MT.canvas);
  mtTex.minFilter = THREE.LinearFilter;
  const mtMat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: mtTex }, uReveal: { value: 0 } }, transparent: true, depthWrite: true,
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform sampler2D uMap; uniform float uReveal; varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }
      void main() {
        vec4 c = texture2D(uMap, vUv);
        // patches condense out of the dark: mist and the lower slopes first, the peaks last
        float field = .42 * n(vUv * vec2(9., 5.)) + .2 * n(vUv * vec2(27., 15.)) + .38 * smoothstep(.2, .85, vUv.y);
        float a = smoothstep(field, field + .2, uReveal * 1.25);
        c.a *= a;
        if (c.a < .02) discard;
        gl_FragColor = c;
      }`
  });
  const mountains = new THREE.Mesh(new THREE.PlaneGeometry(34, 17), mtMat);
  let reveal = 0;
  mountains.position.set(0, 0.5, -9); mountains.renderOrder = -1; scene.add(mountains);
  // light that runs along some ridge / strata lines now and then
  const flowSel = MT.flows.sort(() => rnd() - 0.5).slice(0, mobile ? 26 : 44);
  const fPos = [], fU = [], fP = [];
  for (const run of flowSel) {
    const ph = rnd(), sp = 0.05 + rnd() * 0.06;   // medium pace
    for (let n = 0; n < run.length - 1; n++) for (const q of [n, n + 1]) {
      fPos.push((run[q][0] - 0.5) * 34, (0.5 - run[q][1]) * 17, 0.02); fU.push(q / (run.length - 1)); fP.push(ph, sp);
    }
  }
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3));
  fGeo.setAttribute('aU', new THREE.Float32BufferAttribute(fU, 1));
  fGeo.setAttribute('aP', new THREE.Float32BufferAttribute(fP, 2));
  const flowMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOp: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime; uniform float uOp; attribute float aU; attribute vec2 aP; varying float vA;
      void main() { float cyc = fract(uTime * aP.y + aP.x); float head = cyc * 2.2 - .3; float d = (head - aU);
        vA = (d > 0. ? exp(-d * 9.) : exp(d * 60.)) * step(cyc, .6) * uOp;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying float vA; void main() { gl_FragColor = vec4(vec3(1., .9, .68) * vA, vA); }`
  });
  mountains.add(new THREE.LineSegments(fGeo, flowMat));

  // ---- 'nature' targets: where each core particle goes when the reading appears ----
  const natA = coreGeo.getAttribute('aNat'), c3A = coreGeo.getAttribute('aCol3');
  seed = 4242;
  for (let i = 0; i < CORE; i++) {
    const r0 = rnd(), N = natA.array, o = i * 4;
    let ty, hex;
    if (r0 < 0.36 && MT.ridge.length) {
      const [u, v] = MT.ridge[Math.floor(rnd() * MT.ridge.length)];
      N[o] = (u - 0.5) * 34; N[o + 1] = 0.5 + (0.5 - v) * 17 + rnd() * 0.06; N[o + 2] = -8.85; ty = 0; hex = rnd() < 0.5 ? GOLD : '#C4D6EC';
    } else if (r0 < 0.58) {
      N[o] = (rnd() - 0.5) * 44; N[o + 1] = 3 + rnd() * 10; N[o + 2] = -14 - rnd() * 18; ty = 1; hex = rnd() < 0.2 ? GOLD : rnd() < 0.4 ? BLUE : IVORY;
    } else if (r0 < 0.84) {
      N[o] = (rnd() - 0.5) * 32; N[o + 1] = -1.62 - rnd() * 0.12; N[o + 2] = -8.4 + rnd() * 6.5; ty = 2; hex = rnd() < 0.3 ? GOLD : '#BFD3F0';
    } else {
      N[o] = (rnd() - 0.5) * 14; N[o + 1] = -1 + rnd() * 5; N[o + 2] = -6 + rnd() * 8.5; ty = 3; hex = EL[pickEl()];
    }
    N[o + 3] = ty; put(c3A.array, i, hex);
  }
  natA.needsUpdate = true; c3A.needsUpdate = true;
  // ---- per-chart colours: ring follows the five-element weights, the core follows the day master ----
  function setChart({ elements, dm } = {}) {
    if (elements) { WEIGHT = { ...elements }; for (const n of names) WEIGHT[n] = Math.max(0.15, WEIGHT[n] || 0); totalW = names.reduce((s, n) => s + WEIGHT[n], 0); }
    if (dm && EL[dm]) DM = dm;
    seed = 99;
    const c2 = coreGeo.getAttribute('aCol2'), dirA = coreGeo.getAttribute('aDir');
    for (let i = 0; i < CORE; i++) {
      const ring = dirA.array[i * 3] > 0.5, rad = dirA.array[i * 3 + 1];
      put(c2.array, i, ring ? EL[pickEl()] : rad < 0.2 ? '#FFF4DC' : rnd() < 0.55 ? EL[DM] : GOLD);
    }
    c2.needsUpdate = true;
    for (let i = 0; i < CORE; i++) if (natA.array[i * 4 + 3] === 3) put(c3A.array, i, EL[pickEl()]);
    c3A.needsUpdate = true;
    if (reduce) render();
  }

  // ---- motion: spring-driven morph, nebula burst, lagged mountain reveal, gentle parallax ----
  let target = 0, px = 0, py = 0, running = true;
  addEventListener('pointermove', e => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }, { passive: true });
  function resize() {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < h ? 64 : 50; camera.updateProjectionMatrix();
    uniforms.uScale.value = h * DPR * 0.5 / Math.tan(camera.fov * Math.PI / 360) * 0.012;
    if (reduce) render();
  }
  addEventListener('resize', resize);
  let t0 = performance.now(), prevNow = performance.now(), vel = 0, burstAt = -1e9, natTarget = 0, natVel = 0;
  const SPRING_K = 5.5, SPRING_C = 2 * Math.sqrt(5.5) * 0.6, NAT_K = 2.2, NAT_C = 2 * Math.sqrt(2.2) * 0.85;
  function render() {
    const t = uniforms.uTime.value;
    const raw = uniforms.uMorph.value, sm = Math.min(1, Math.max(0, raw)), b = uniforms.uBurst.value, nn = Math.min(1, Math.max(0, uniforms.uNature.value)), star = sm * (1 - nn);
    core.rotation.x = 0.32 * (1 - nn);
    const flare = 1 + Math.max(0, raw - 1) * 7 + b * 1.6, pulse = 1 + 0.06 * Math.sin(t * 1.5);
    starCore.material.opacity = Math.min(1, 0.9 * star + b * 0.8); starCore.scale.setScalar(Math.max(0.001, (star * 2.3 + b * 1.2) * pulse * flare));
    starHalo.material.opacity = Math.min(0.5, 0.22 * star + b * 0.25); starHalo.scale.setScalar(Math.max(0.001, (star * 7.5 + b * 9) * pulse));
    flowMat.uniforms.uTime.value = t; flowMat.uniforms.uOp.value = Math.max(0, (reveal - 0.75) / 0.25);
    mtMat.uniforms.uReveal.value = reveal; mountains.position.y = 0.5 - (1 - reveal) * 0.7; mountains.visible = reveal > 0.005;
    camera.position.set(Math.sin(t * 0.05) * 0.6 + px * 0.8, 2.2 + Math.sin(t * 0.07) * 0.15 - py * 0.5 + b * 0.9, 7.4 + Math.sin(t * 0.04) * 0.4 - star * 0.6 + b * 1.4);
    camera.lookAt(0, b * 1.1, 0);
    renderer.render(scene, camera);
  }
  let frames = 0, last = performance.now(), slow = 0, count = CORE;
  function tick(now) {
    if (!running) return;
    requestAnimationFrame(tick);
    uniforms.uTime.value = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - prevNow) / 1000); prevNow = now;
    for (let k = 0; k < 4; k++) {
      const h = dt / 4, x = uniforms.uMorph.value;
      vel += (SPRING_K * (target - x) - SPRING_C * vel) * h; uniforms.uMorph.value = x + vel * h;
    }
    if (Math.abs(target - uniforms.uMorph.value) < 0.0005 && Math.abs(vel) < 0.0005) { uniforms.uMorph.value = target; vel = 0; }
    for (let k = 0; k < 4; k++) {        // dissolving into nature: slower, softer spring
      const h = dt / 4, x = uniforms.uNature.value;
      natVel += (NAT_K * (natTarget - x) - NAT_C * natVel) * h; uniforms.uNature.value = x + natVel * h;
    }
    if (Math.abs(natTarget - uniforms.uNature.value) < 0.0005 && Math.abs(natVel) < 0.0005) { uniforms.uNature.value = natTarget; natVel = 0; }
    const bx = (now - burstAt) / 2200;
    uniforms.uBurst.value = bx >= 0 && bx < 1 ? Math.pow(Math.sin(Math.PI * Math.pow(bx, 0.55)), 1.4) * (1 - bx * 0.35) : 0;
    const want = target ? Math.min(1, Math.max(0, (uniforms.uMorph.value - 0.45) / 0.55)) : Math.min(1, Math.max(0, uniforms.uMorph.value));
    reveal += (want - reveal) * (target ? 0.014 : 0.03);
    render();
    frames++;
    if (now - last >= 1000) {            // keep it smooth on slower phones: shed particles while fps < 40
      const fps = frames * 1000 / (now - last); frames = 0; last = now;
      slow = fps < 40 ? slow + 1 : 0;
      if (slow >= 2 && count > 1200) { count = Math.floor(count * 0.6); coreGeo.setDrawRange(0, count); slow = 0; }
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (reduce) return;
    if (document.hidden) running = false; else if (!running) { running = true; prevNow = performance.now(); requestAnimationFrame(tick); }
  });
  // modes: 'cover' (star chart) · 'star' (natal star, used while the reading loads) · 'nature' (star dissolved into the landscape)
  function setMode(mode) {
    const next = mode === 'cover' ? 0 : 1, nat = mode === 'nature' ? 1 : 0;
    if (next === target && nat === natTarget) return;
    if (!next && target && !reduce) burstAt = performance.now();
    target = next; natTarget = nat;
    if (reduce) { uniforms.uMorph.value = target; uniforms.uNature.value = natTarget; reveal = target; render(); }
  }
  resize();
  if (reduce) { uniforms.uTime.value = 12; render(); } else requestAnimationFrame(tick);
  return { setMode, setChart };
}
