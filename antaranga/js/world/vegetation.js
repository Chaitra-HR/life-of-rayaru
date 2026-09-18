// ANTARANGA · Vegetation — painted cards for the Tungabhadra's plants:
// coconut palms, banana plants, reeds and a low far-bank tree line. One
// shared card material with shader wind (tips only), fog and a tint; the
// repeated far palms are a single InstancedMesh.
import * as THREE from 'three';
import { mulberry, fbm } from '../util.js';

/* ------------------------------------------------------------------ card material */
const cardVert = `
  uniform float uTime, uSway;
  varying vec2 vUv; varying float vDepth;
  void main(){
    vUv = uv;
    vec3 p = position;
    float h = uv.y;
    // only the tips move: a slow broad sway plus a faster small flutter
    float w = (sin(uTime * 0.6 + uv.x * 7.0) * 0.5 + sin(uTime * 1.7 + uv.x * 13.0) * 0.18) * uSway * h * h;
    p.x += w * 0.06;
    p.y += abs(w) * 0.012;
    #ifdef USE_INSTANCING
      vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
    #else
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
    #endif
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const cardFrag = `
  uniform sampler2D map; uniform float uFade, uFogD, uTint; uniform vec3 uFog;
  varying vec2 vUv; varying float vDepth;
  void main(){
    vec4 c = texture2D(map, vUv);
    float a = c.a * uFade;
    if (a < 0.02) discard;
    vec3 col = c.rgb * uTint;
    float f = 1.0 - exp(-uFogD * uFogD * vDepth * vDepth);
    col = mix(col, uFog, f);
    col = pow(max(col, 0.0), vec3(1.0 / 2.2));
    gl_FragColor = vec4(col, a);
  }`;
export function cardMaterial(tex, fogColor, { tint = 1, sway = 1 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { map: { value: tex }, uTime: { value: 0 }, uSway: { value: sway }, uFade: { value: 1 }, uTint: { value: tint }, uFog: { value: fogColor }, uFogD: { value: .008 } },
    vertexShader: cardVert, fragmentShader: cardFrag,
  });
}
const tex = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; return t; };

/* ------------------------------------------------------------------ palm */
export function palmTexture(seed, { haze = 0, fronds = 18 } = {}) {
  const W = 1024, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'); const t = mulberry(seed);
  const mixc = (r, g, b) => `rgb(${(r * (1 - haze) + 150 * haze) | 0},${(g * (1 - haze) + 160 * haze) | 0},${(b * (1 - haze) + 176 * haze) | 0})`;
  /* trunk: a slender grey-brown column with a gentle sway and ring bands */
  const lean = (t() - .5) * 200, topX = W * .5 + lean, topY = H * .30;
  const trunkAt = u => [W * .5 + lean * u * u, H - (H - topY) * u];
  x.lineCap = 'round';
  for (let u = 0; u < 1; u += .025) {
    const [ax, ay] = trunkAt(u), [bx, by] = trunkAt(u + .03);
    const wdt = 26 - u * 12;
    x.strokeStyle = mixc(96 - u * 14, 84 - u * 12, 68 - u * 10);
    x.lineWidth = wdt; x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
  }
  for (let i = 0; i < 30; i++) {                       // leaf-scar rings
    const u = i / 30, [ax, ay] = trunkAt(u), wdt = (26 - u * 12) * .55;
    x.strokeStyle = i % 2 ? mixc(70, 60, 48) : mixc(112, 100, 82);
    x.lineWidth = 2.2; x.beginPath(); x.moveTo(ax - wdt, ay); x.quadraticCurveTo(ax, ay + 3, ax + wdt, ay); x.stroke();
  }
  /* the crown: many feathered fronds, each a spine carrying dozens of fine
     drooping leaflets; sun (screen-left in the scene) lights one side */
  const crownX = topX, crownY = topY;
  /* a soft dark mass tucked under the frond fan so the crown reads full, not
     stringy — kept low and inside the fan, never leaking above it */
  for (let k = 0; k < 40; k++) {
    const a0 = t() * 6.3, rr0 = Math.pow(t(), .6);
    x.globalAlpha = .34;
    x.fillStyle = mixc(24 + t() * 10, 32 + t() * 12, 18 + t() * 8);
    x.beginPath();
    x.ellipse(crownX + Math.cos(a0) * rr0 * 170, crownY + 55 + Math.abs(Math.sin(a0)) * rr0 * 100,
              20 + t() * 30, 12 + t() * 20, t() * 6.3, 0, 6.3);
    x.fill();
    x.globalAlpha = 1;
  }
  const NF = fronds;
  const order = [];
  for (let f = 0; f < NF; f++) order.push(f);
  order.sort((a, b) => Math.abs(a / NF - .5) - Math.abs(b / NF - .5));   // back fronds first
  for (const f of order) {
    const q0 = f / (NF - 1);
    const dir = q0 < .5 ? -1 : 1;
    const spread = (q0 - .5) * 2;                                        // -1..1 across the fan
    const len = (300 + t() * 120) * (.72 + .5 * Math.abs(spread));
    const ex = crownX + spread * len * 1.05, ey = crownY + len * (.16 + Math.abs(spread) * .68);
    const mx = crownX + spread * len * .5, my = crownY - len * (.44 - Math.abs(spread) * .3);
    const lit = .45 + .55 * Math.max(0, -spread) + (t() - .5) * .12;     // lit from the left
    const P = u => [
      (1 - u) * (1 - u) * crownX + 2 * (1 - u) * u * mx + u * u * ex,
      (1 - u) * (1 - u) * crownY + 2 * (1 - u) * u * my + u * u * ey,
    ];
    const T = u => {
      const tx = 2 * (1 - u) * (mx - crownX) + 2 * u * (ex - mx);
      const ty = 2 * (1 - u) * (my - crownY) + 2 * u * (ey - my);
      const L2 = Math.hypot(tx, ty) || 1; return [tx / L2, ty / L2];
    };
    // leaflets first (under the spine): broad, dense and overlapping — a
    // coconut leaflet is a ribbon, not a wire
    const NL = 34;
    for (let k = 1; k <= NL; k++) {
      const u = .05 + (k / NL) * .95;
      const [px, py] = P(u); const [dx2, dy2] = T(u);
      const prof = Math.pow(Math.sin(Math.PI * Math.min(.06 + u * .86, .94)), .8);
      const ll = len * .25 * prof * (.8 + t() * .4);
      for (const sgn of [-1, 1]) {
        const wx = -dy2 * sgn, wy = dx2 * sgn;
        // the leaflet leaves the spine swept toward the tip, then droops
        const bendx = px + (wx * .58 + dx2 * .52) * ll * .5, bendy = py + (wy * .58 + dy2 * .52) * ll * .5 + ll * .10;
        const tipx = px + (wx * .42 + dx2 * .72) * ll, tipy = py + (wy * .42 + dy2 * .72) * ll + ll * .42;
        const l2 = lit * (.8 + t() * .45) * (sgn > 0 ? .88 : 1.02);
        const g = 40 + l2 * 48, r = 28 + l2 * 34, b = 24 + l2 * 26;
        x.strokeStyle = mixc(r, g, b);
        x.lineWidth = 4.8 - u * 2.2;
        x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(bendx, bendy, tipx, tipy); x.stroke();
      }
    }
    // the spine over the leaflets
    x.strokeStyle = mixc(42 + lit * 30, 52 + lit * 34, 28 + lit * 18);
    x.lineWidth = 5; x.beginPath(); x.moveTo(crownX, crownY); x.quadraticCurveTo(mx, my, ex, ey); x.stroke();
  }
  /* two dead ochre fronds hanging below the crown */
  for (const sgn of [-1, 1]) {
    const len = 140 + t() * 40;
    const ex = crownX + sgn * len * .30, ey = crownY + 34 + len * 1.05;
    const mx = crownX + sgn * len * .44, my = crownY + 34 + len * .40;
    x.globalAlpha = .5;
    x.strokeStyle = mixc(128, 100, 46); x.lineWidth = 2.6;
    x.beginPath(); x.moveTo(crownX, crownY + 30); x.quadraticCurveTo(mx, my, ex, ey); x.stroke();
    x.lineWidth = 1.6;
    for (let k = 2; k <= 12; k++) {
      const u = k / 13;
      const qx = (1 - u) * (1 - u) * crownX + 2 * (1 - u) * u * mx + u * u * ex;
      const qy = (1 - u) * (1 - u) * (crownY + 8) + 2 * (1 - u) * u * my + u * u * ey;
      const ll = 26 * Math.sin(Math.PI * Math.min(.1 + u * .8, .95));
      x.strokeStyle = mixc(118 + (u * 30 | 0), 92, 42);
      x.beginPath(); x.moveTo(qx, qy); x.lineTo(qx + sgn * ll * .5, qy + ll); x.stroke();
      x.beginPath(); x.moveTo(qx, qy); x.lineTo(qx - sgn * ll * .3, qy + ll * .9); x.stroke();
    }
    x.globalAlpha = 1;
  }
  /* coconut cluster nested where the fronds meet */
  for (let c = 0; c < 6; c++) {
    const a = (c / 6 - .5) * 2.2, cx2 = crownX + Math.sin(a) * 30, cy2 = crownY + 22 + Math.cos(a) * 9;
    const rad = 12 + t() * 4;
    const grad = x.createRadialGradient(cx2 - 4, cy2 - 4, 1, cx2, cy2, rad);
    grad.addColorStop(0, mixc(96, 78, 46)); grad.addColorStop(1, mixc(46, 36, 22));
    x.fillStyle = grad; x.beginPath(); x.arc(cx2, cy2, rad, 0, 6.3); x.fill();
  }
  return tex(cv);
}

/* ------------------------------------------------------------------ banana
   A banana CLUMP, drawn from the user's SketchUp reference (cay chuoi): a
   tall mother stem flanked by shorter pups, broad blades arching hard
   downward around a thin dark midrib, the blade painted as DENSE fine ribs
   swept toward the tip — the striping, the frayed edge and the wind-splits
   all come from the ribs themselves. Muted olive/sage, never astroturf. */
export function bananaTexture(seed, { haze = 0 } = {}) {
  const W = 1024, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'); const t = mulberry(seed);
  const mixc = (r, g, b) => `rgb(${(r * (1 - haze) + 150 * haze) | 0},${(g * (1 - haze) + 160 * haze) | 0},${(b * (1 - haze) + 176 * haze) | 0})`;
  x.lineCap = 'round';

  /* pseudostem: overlapping pale green-tan sheaths with dried brown patches */
  const stem = (bx, footY, topY, w0) => {
    for (let i = 0; i < 6; i++) {
      const off = (i - 2.5) * w0 * .15;
      const lit = .52 + .42 * Math.max(0, -(i - 2.5) / 2.5) + (t() - .5) * .12;
      x.strokeStyle = mixc(80 * lit + 24, 90 * lit + 30, 54 * lit + 17);
      x.lineWidth = w0 * (.40 - Math.abs(i - 2.5) * .055);
      x.beginPath();
      x.moveTo(bx + off * 1.6, footY);
      x.quadraticCurveTo(bx + off * 1.1, (footY + topY) / 2, bx + off * .45, topY);
      x.stroke();
    }
    x.save();
    x.beginPath(); x.rect(bx - w0 * .52, topY, w0 * 1.04, footY - topY);   // mottle stays on the stem
    x.clip();
    for (let i = 0; i < 9; i++) {                        // dried sheath mottling
      const u = .12 + t() * .74, py = footY + (topY - footY) * u;
      x.globalAlpha = .34 * (1 - u * .4);
      x.fillStyle = mixc(98 + t() * 28, 74 + t() * 18, 44);
      x.beginPath();
      x.ellipse(bx + (t() - .5) * w0 * .56, py, 4 + t() * w0 * .15, 12 + t() * 28, (t() - .5) * .5, 0, 6.3);
      x.fill();
      x.globalAlpha = 1;
    }
    x.restore();
  };

  /* a leaf: arched midrib; the blade is nothing but ribs */
  const leaf = (ax, ay, ang, len, wid, droop, opts = {}) => {
    const dry = opts.dry || 0;
    const litBase = opts.lit ?? (.52 + .48 * Math.max(0, -Math.cos(ang)));   // lit from the left
    const ex = ax + Math.cos(ang) * len, ey = ay + Math.sin(ang) * len + droop * len;
    const mx = ax + Math.cos(ang) * len * .5, my = ay + Math.sin(ang) * len * .5 - len * (.30 - droop * .5);
    const P = u => [
      (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * ex,
      (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my + u * u * ey,
    ];
    const T = u => {
      const tx = 2 * (1 - u) * (mx - ax) + 2 * u * (ex - mx);
      const ty = 2 * (1 - u) * (my - ay) + 2 * u * (ey - my);
      const L2 = Math.hypot(tx, ty) || 1; return [tx / L2, ty / L2];
    };
    // the blade narrows to the petiole and carries its breadth mid-blade —
    // without the taper the leaves fuse into one canopy mass at the crown
    const wProf = u => wid * Math.pow(Math.sin(Math.PI * Math.min(.10 + u * .90, 1)), .62) * (.42 + .58 * Math.min(1, u * 1.8));
    // wind-splits: the blade tears BETWEEN ribs, so a split is simply a gap
    const splits = [];
    const nSplit = dry ? 4 : 1 + (t() * 2.4 | 0);
    for (let s = 0; s < nSplit; s++) splits.push(.24 + t() * .68);
    const N = Math.max(40, len * .5 | 0);
    for (let k = 0; k <= N; k++) {
      const u = .045 + (k / N) * .95;
      const [px, py] = P(u), [dx2, dy2] = T(u);
      let gap = false; for (const s of splits) if (Math.abs(u - s) < .014) gap = true;
      for (const sgn of [-1, 1]) {
        if (gap && t() < .8) continue;
        const w = wProf(u) * (.92 + t() * .12);
        const lit2 = litBase * (sgn < 0 ? 1.04 : .80) * (.88 + t() * .24);
        let R, G, B;
        if (dry) { R = 98 + t() * 22; G = 78 + t() * 15; B = 42; }
        else {
          // the same muted olive family as the broadleaf canopies — the
          // banana must sit inside the grove's palette, never above it
          R = 24 + lit2 * 40; G = 36 + lit2 * 50; B = 22 + lit2 * 26;
          if ((k / 3 | 0) % 2) { R *= .90; G *= .93; B *= .90; }   // the fine two-tone striping
        }
        x.strokeStyle = mixc(R, G, B);
        x.lineWidth = 2.2 + t() * 1.2;
        // ribs run nearly perpendicular off the midrib — that breadth is what
        // makes the blade a paddle rather than a frond — with a slight sweep
        // toward the tip and a droop at the outer edge
        const bx2 = px + (-dy2 * sgn * .66 + dx2 * .28) * w * .55;
        const by2 = py + (dx2 * sgn * .66 + dy2 * .28) * w * .55 + w * .10;
        const tx2 = px + (-dy2 * sgn * .86 + dx2 * .34) * w;
        const ty2 = py + (dx2 * sgn * .86 + dy2 * .34) * w + w * .26;
        x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(bx2, by2, tx2, ty2); x.stroke();
      }
    }
    // the midrib: one thin dark line, as in the reference — never a bright stripe
    x.strokeStyle = dry ? mixc(92, 72, 40) : mixc(44, 52, 28);
    x.lineWidth = 2.6;
    x.beginPath(); x.moveTo(ax, ay); x.quadraticCurveTo(mx, my, ex, ey); x.stroke();
    // soft dappling over the ribs — the same painterly mottle the broadleaf
    // canopies carry, so the two textures read as one hand
    if (!dry) {
      x.save(); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = .11;
      for (let k = 0; k < 5; k++) {
        const u = .22 + t() * .68, [px, py] = P(u), [dx2, dy2] = T(u);
        const w = wProf(u), sgn = t() < .5 ? -1 : 1, off = .15 + t() * .6;
        x.fillStyle = t() < .5 ? 'rgb(16,26,14)' : 'rgb(96,116,64)';
        x.beginPath();
        x.ellipse(px - dy2 * sgn * w * off, py + dx2 * sgn * w * off + w * .12, 12 + t() * 24, 7 + t() * 13, t() * 6.3, 0, 6.3);
        x.fill();
      }
      x.restore();
    }
  };

  /* the hanging fruit: curved stalk, tiers of fingers, maroon bud below */
  const fruit = (fx0, fy0, fx, fy, sc) => {
    x.strokeStyle = mixc(88, 88, 48); x.lineWidth = 8 * sc;
    x.beginPath(); x.moveTo(fx0, fy0); x.quadraticCurveTo(fx - 6 * sc, fy - 110 * sc, fx, fy - 46 * sc); x.stroke();
    for (let tier = 0; tier < 4; tier++) {
      const ty = fy - 38 * sc + tier * 17 * sc, n = 8 - tier;
      for (let k = 0; k < n; k++) {
        const a = (k / (n - 1) - .5) * 2.4;
        const bxx = fx + Math.sin(a) * (23 - tier * 3) * sc, byy = ty + Math.cos(a) * 4 * sc;
        const lit2 = .55 + .45 * Math.max(0, -Math.sin(a)) + tier * .05;
        x.strokeStyle = mixc(56, 62, 22); x.lineWidth = 12.5 * sc;
        x.beginPath(); x.moveTo(bxx, byy + 10 * sc);
        x.quadraticCurveTo(bxx + Math.sin(a) * 6 * sc, byy - 3 * sc, bxx + Math.sin(a) * 10 * sc, byy - 13 * sc);
        x.stroke();
        x.strokeStyle = mixc(60 * lit2 + 24, 64 * lit2 + 22, 30); x.lineWidth = 9 * sc;
        x.beginPath(); x.moveTo(bxx, byy + 9 * sc);
        x.quadraticCurveTo(bxx + Math.sin(a) * 6 * sc, byy - 3 * sc, bxx + Math.sin(a) * 10 * sc, byy - 12 * sc);
        x.stroke();
      }
    }
    const by0 = fy + 44 * sc;
    x.strokeStyle = mixc(88, 88, 48); x.lineWidth = 4.5 * sc;
    x.beginPath(); x.moveTo(fx, fy + 8 * sc); x.lineTo(fx, by0 - 16 * sc); x.stroke();
    for (const [dx3, dy3, s2, cR, cG, cB] of [[0, 0, 1, 84, 28, 40], [-8, -11, .7, 112, 38, 50], [7, -7, .55, 66, 20, 32]]) {
      x.fillStyle = mixc(cR, cG, cB);
      x.beginPath(); x.moveTo(fx + dx3 * sc, by0 + (dy3 - 15 * s2) * sc);
      x.quadraticCurveTo(fx + (dx3 + 18 * s2) * sc, by0 + (dy3 + 11 * s2) * sc, fx + dx3 * sc, by0 + (dy3 + 42 * s2) * sc);
      x.quadraticCurveTo(fx + (dx3 - 18 * s2) * sc, by0 + (dy3 + 11 * s2) * sc, fx + dx3 * sc, by0 + (dy3 - 15 * s2) * sc);
      x.closePath(); x.fill();
    }
  };

  /* ---- the clump, back to front, as in the reference model: stout stems,
          crowns starting low, blades broad and overlapping ---- */
  const foot = H * .96;
  const mA = [W * .485, foot, H * .47, 80];    // the mother stem
  const pL = [W * .335, foot, H * .645, 52];   // left pup
  const pR = [W * .640, foot, H * .70, 42];    // right pup

  // shaded back leaves first — depth inside the clump
  leaf(mA[0], mA[2] + 14, -Math.PI * .63, 250, 84, .10, { lit: .34 });
  leaf(mA[0], mA[2] + 14, -Math.PI * .33, 240, 80, .12, { lit: .30 });
  leaf(pL[0], pL[2] + 10, -Math.PI * .82, 155, 54, .24, { lit: .34 });

  stem(pL[0], pL[1], pL[2], pL[3]);
  stem(pR[0], pR[1], pR[2], pR[3]);
  stem(mA[0], mA[1], mA[2], mA[3]);

  // left pup's crown
  leaf(pL[0], pL[2], -Math.PI * .92, 170, 56, .50);
  leaf(pL[0], pL[2], -Math.PI * .58, 185, 58, .02);
  leaf(pL[0], pL[2], -Math.PI * .28, 160, 50, .34);
  // right pup's crown
  leaf(pR[0], pR[2], -Math.PI * .10, 150, 46, .50);
  leaf(pR[0], pR[2], -Math.PI * .46, 155, 48, .04);
  leaf(pR[0], pR[2], -Math.PI * .78, 135, 42, .38);
  // the small bunch hanging off the left pup
  fruit(pL[0] + 6, pL[2] + 18, pL[0] - 54, pL[2] + 158, .62);

  // the mother's crown: air between the leaves — upright hearts, wide
  // arching sides, hard droopers, every tip finding its own space
  leaf(mA[0], mA[2], -Math.PI * .55, 325, 92, -.03);
  leaf(mA[0], mA[2], -Math.PI * .80, 285, 84, .20);
  leaf(mA[0], mA[2], -Math.PI * .24, 290, 84, .22);
  leaf(mA[0], mA[2], -Math.PI * .965, 255, 76, .56);
  leaf(mA[0], mA[2], -Math.PI * .045, 265, 78, .60);
  leaf(mA[0], mA[2], -Math.PI * .685, 300, 88, .06);
  leaf(mA[0], mA[2], -Math.PI * .385, 245, 76, .14);
  leaf(mA[0], mA[2], -Math.PI * 1.02, 155, 42, .92, { dry: 1 });   // one dried leaf hanging low
  // the mother's bunch, hanging front-right as in the model
  fruit(mA[0] + 12, mA[2] + 28, mA[0] + 98, mA[2] + 175, 1);

  return tex(cv);
}

/* ------------------------------------------------------------------ far bank line
   An irregular continuous tree line for the far shore. Canopies gather in
   clusters and thin to breaks between them; heights and silhouettes vary;
   palms are rare, subdued and never umbrella-shaped. Three close haze
   tones — at this distance the atmosphere separates, not contrast. */
export function farBankTexture(seed, { palms = 3, trees = 24 } = {}) {
  const W = 2048, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'); const t = mulberry(seed);
  const deep = [62, 71, 84], mid = [72, 82, 94], light = [80, 90, 102];   // three CLOSE tones: at this distance the line is one mass, and a crown lighter than its band floats as a dot
  const tone = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  x.lineCap = 'round';
  const bandAt = i => H - 12 - 30 * (fbm(i / W * 3.2 + seed, 0, 3) + .5) - 10 * (fbm(i / W * 16 + seed * 2, 1, 2) + .5);
  /* the line clusters: trees gather around a few centres, spacing uneven */
  const NC = 6, centres = [];
  for (let c = 0; c < NC; c++) centres.push({ x: ((c + .15 + t() * .7) / NC) * W, s: 110 + t() * 240, d: .35 + t() });
  const density = px => { let d = .60; for (const c of centres) d += c.d * Math.exp(-Math.pow((px - c.x) / c.s, 2)); return Math.min(d, 1.5); };
  const place = () => { for (let k = 0; k < 40; k++) { const px = t() * W; if (t() * 1.4 < density(px)) return px; } return t() * W; };
  const canopy = (px, by, r, col, stretch = 1) => {
    x.fillStyle = tone(col);
    const n = 6 + (t() * 7 | 0);
    for (let k = 0; k < n; k++) {
      const a2 = t() * 6.3, rr2 = r * (.30 + t() * .45);
      x.beginPath();
      x.ellipse(px + Math.cos(a2) * r * .9 * stretch, by - r * .35 + Math.sin(a2) * r * .40, rr2 * stretch, rr2 * .72, 0, 0, 6.3);
      x.fill();
    }
  };
  /* back layer: light, half-dissolved — a raised scrub line where trees mass */
  x.fillStyle = tone(light);
  x.beginPath(); x.moveTo(0, H);
  for (let i = 0; i <= W; i += 8) x.lineTo(i, bandAt(i) - 8 - 24 * (fbm(i / W * 7 + seed * 3, 2, 3) + .5) * Math.max(.4, Math.min(1, density(i))));
  x.lineTo(W, H); x.closePath(); x.fill();
  /* its crowns sit ON the scrub line and overlap it, wide and low: a crown
     lifted clear of its band reads as a detached blob (cotton at night) */
  for (let i = 0; i < trees * .6; i++) {
    const px = place(), base = bandAt(px);
    canopy(px, base - 6 - t() * 10, 11 + t() * 12, t() < .5 ? light : mid, 1.1 + t() * .6);
  }
  /* mid layer: the body of the line */
  x.fillStyle = tone(mid);
  x.beginPath(); x.moveTo(0, H);
  for (let i = 0; i <= W; i += 8) x.lineTo(i, bandAt(i) - 3 - 14 * (fbm(i / W * 11 + seed * 5, 3, 2) + .5) * Math.min(1, density(i) + .2));
  x.lineTo(W, H); x.closePath(); x.fill();
  for (let i = 0; i < trees; i++) {
    const px = place(), base = bandAt(px);
    const tall = t() < .07;                              // emergents are rare — detached crowns read as balloons
    const r = tall ? 14 + t() * 8 : 9 + t() * 12;
    const by = base - (tall ? 20 + t() * 10 : 3 + t() * 11);
    if (tall) { x.strokeStyle = tone(mid); x.lineWidth = 2.5; x.beginPath(); x.moveTo(px, base + 4); x.lineTo(px + (t() - .5) * 6, by + r * .5); x.stroke(); }
    canopy(px, by, r, t() < .7 ? mid : deep, .85 + t() * .5);
  }
  /* a few palms, subdued: loose curved strokes leaning with the river wind */
  for (let i = 0; i < palms; i++) {
    const px = place(), base = bandAt(px);
    const hgt = 28 + t() * 22, leanp = (t() - .5) * 30;
    const cx2 = px + leanp, cy2 = base - hgt;
    x.strokeStyle = tone(mid); x.lineWidth = 2.2;
    x.beginPath(); x.moveTo(px, base + 6); x.quadraticCurveTo(px + leanp * .3, base - hgt * .55, cx2, cy2); x.stroke();
    const nf = 7 + (t() * 3 | 0);
    for (let f = 0; f < nf; f++) {
      const q0 = f / (nf - 1), spread = (q0 - .5) * 2;
      const L = hgt * .34 * (.6 + t() * .5) * (.7 + .4 * Math.abs(spread));
      const ex = cx2 + spread * L * 1.2 + (t() - .5) * 8, ey = cy2 + L * (.18 + Math.abs(spread) * .6);
      const mx2 = cx2 + spread * L * .55, my2 = cy2 - L * (.5 - Math.abs(spread) * .3) * (.7 + t() * .5);
      x.strokeStyle = tone(t() < .6 ? mid : deep); x.lineWidth = 2.3 - Math.abs(spread) * 1.0;
      x.beginPath(); x.moveTo(cx2, cy2); x.quadraticCurveTo(mx2, my2 + L * .18, ex, ey + L * .22); x.stroke();
    }
  }
  /* front: a deep low scrub band knitting every base into one grounded line */
  x.fillStyle = tone(deep);
  x.beginPath(); x.moveTo(0, H);
  for (let i = 0; i <= W; i += 8) x.lineTo(i, bandAt(i) + 6 - 16 * (fbm(i / W * 13 + seed * 7, 4, 2) + .5));
  x.lineTo(W, H); x.closePath(); x.fill();
  for (let i = 0; i < trees * .5; i++) {
    const px = place(), base = bandAt(px);
    canopy(px, base - 2 - t() * 8, 6 + t() * 8, deep, 1 + t() * .6);
  }
  const tx = tex(cv);
  tx.wrapS = THREE.MirroredRepeatWrapping;               // doubles the visible period across wide strips
  return tx;
}

/* ------------------------------------------------------------------ river tree
   A broadleaf riverside tree: short forking trunk, full lobed canopy in
   muted olive, lit gently from the left, a few sky holes. */
export function riverTreeTexture(seed) {
  const W = 1024, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'); const t = mulberry(seed);
  x.lineCap = 'round';
  const bx0 = W * .5 + (t() - .5) * 50, by0 = H * .985;
  /* silhouette first: one coherent crown mass — foliage gathers in lobed
     clusters around the branch tips, lit from the upper left, the whole
     canopy denser toward the heart and ragged at the rim, with two or
     three genuine sky holes. */
  const crownCX = bx0 + (t() - .5) * 60, crownCY = H * .38, crownR = W * .315;
  const crownRY = crownR * .78;

  /* skeleton: a tapering, slightly curved trunk forking low into three or
     four main limbs, each subdividing once — drawn so the lower crown
     shows real branching through the foliage gaps */
  const limb = (x0, y0, x1, y1, w0, w1, tone) => {
    const n = 10, bend = (t() - .5) * 46;
    let px = x0, py = y0;
    for (let k = 1; k <= n; k++) {
      const u = k / n;
      const qx = x0 + (x1 - x0) * u + Math.sin(u * Math.PI) * bend * .35;
      const qy = y0 + (y1 - y0) * u;
      x.strokeStyle = `rgb(${tone + 14 * (1 - u) | 0},${tone - 6 + 10 * (1 - u) | 0},${tone - 16 + 8 * (1 - u) | 0})`;
      x.lineWidth = w0 + (w1 - w0) * u;
      x.beginPath(); x.moveTo(px, py); x.lineTo(qx, qy); x.stroke();
      px = qx; py = qy;
    }
    return [px, py];
  };
  // root flare
  x.fillStyle = 'rgb(56,46,36)';
  x.beginPath(); x.moveTo(bx0 - 34, by0);
  x.quadraticCurveTo(bx0 - 10, by0 - 40, bx0, by0 - 46);
  x.quadraticCurveTo(bx0 + 10, by0 - 40, bx0 + 34, by0);
  x.closePath(); x.fill();
  const forkY = H * .64 + (t() - .5) * 40;
  const [tx0, ty0] = limb(bx0, by0, bx0 + (t() - .5) * 30, forkY, 34, 20, 62);
  const tips = [];
  const NL = 3 + (t() * 2 | 0);
  for (let i = 0; i < NL; i++) {
    const a = -Math.PI / 2 + (i / (NL - 1) - .5) * 1.7 + (t() - .5) * .25;
    const len = 150 + t() * 130;
    const ex = tx0 + Math.cos(a) * len, ey = ty0 + Math.sin(a) * len * .95;
    const [mx2, my2] = limb(tx0, ty0, ex, ey, 16, 6, 56);
    // one subdivision per limb — a thinner branch reaching on into the crown
    const u2 = .5 + t() * .25;
    const sx = tx0 + (ex - tx0) * u2, sy = ty0 + (ey - ty0) * u2;
    const [fx2, fy2] = limb(sx, sy, sx + (t() - .5) * 150, sy - 70 - t() * 90, 7, 2.5, 50);
    // clamp every foliage centre into the crown envelope so the clusters
    // always merge into one canopy instead of scattering as loose dots
    const clampIn = (px, py, r) => {
      const dx = (px - crownCX) / crownR, dy = (py - crownCY) / crownRY;
      const d = Math.hypot(dx, dy);
      if (d > .85) { const s = .85 / d; return [crownCX + dx * s * crownR, crownCY + dy * s * crownRY, r]; }
      return [px, py, r];
    };
    tips.push(clampIn(mx2, my2, crownR * (.34 + t() * .18)));
    tips.push(clampIn(fx2, fy2, crownR * (.24 + t() * .14)));
  }
  tips.push([crownCX, crownCY - crownRY * .28, crownR * .50]);          // the high heart of the crown
  tips.push([crownCX - crownR * .3, crownCY + crownRY * .1, crownR * .38]);
  tips.push([crownCX + crownR * .3, crownCY, crownR * .38]);

  /* sky holes: foliage avoids these two or three windows */
  const holes = [];
  for (let k = 0; k < 2 + (t() * 2 | 0); k++) {
    holes.push([crownCX + (t() - .5) * crownR * 1.4, crownCY + (t() - .3) * crownRY, crownR * (.10 + t() * .09)]);
  }
  const inHole = (px, py) => {
    for (const [hx, hy, hr] of holes) if ((px - hx) * (px - hx) + (py - hy) * (py - hy) < hr * hr) return true;
    return false;
  };

  /* the canopy body first: a soft dark union silhouette so the crown reads
     as one mass, with the clusters modelled over it */
  x.fillStyle = 'rgb(29,38,25)';
  for (const [cx, cy, r] of tips) {
    for (let k = 0; k < 44; k++) {
      const a2 = t() * 6.3, rad = Math.pow(t(), .7) * r * .9;
      const px = cx + Math.cos(a2) * rad, py = cy + Math.sin(a2) * rad * .74;
      if (inHole(px, py)) continue;
      // many smaller patches, never one big smooth ball
      x.beginPath(); x.ellipse(px, py, r * (.14 + t() * .13), r * (.10 + t() * .10), t() * 6.3, 0, 6.3); x.fill();
    }
  }
  /* then the leafage — shadow, mid and lit lobes; density falls to the rim */
  const lobes = [];
  for (const [cx, cy, r] of tips) {
    const n = 220 * (r / crownR) + 90;
    for (let k = 0; k < n; k++) {
      const a2 = t() * 6.3, rad = Math.pow(t(), .62) * r;
      const px = cx + Math.cos(a2) * rad * 1.02, py = cy + Math.sin(a2) * rad * .74;
      if (inHole(px, py)) continue;
      lobes.push([px, py]);
    }
  }
  lobes.sort((p, q) => q[1] - p[1]);                       // shadowed underside painted first
  for (const [px, py] of lobes) {
    const up = (crownCY - py) / crownRY, left = (crownCX - px) / crownR;
    const lit = Math.max(0, Math.min(1, .28 + .34 * up + .30 * left + (t() - .5) * .38));
    const rl = 8 + t() * 13;
    const R2 = 24 + lit * 50, G2 = 33 + lit * 60, B2 = 22 + lit * 32;
    x.fillStyle = `rgb(${R2 | 0},${G2 | 0},${B2 | 0})`;
    const nb = 3 + (t() * 3 | 0);
    for (let k = 0; k < nb; k++) {
      x.beginPath();
      x.ellipse(px + (t() - .5) * rl * 1.7, py + (t() - .5) * rl * 1.2,
                rl * (.30 + t() * .40), rl * (.20 + t() * .26), t() * 6.3, 0, 6.3);
      x.fill();
    }
  }
  /* silhouette erosion: small transparent bites punched along the outer
     edge — the outline breaks into leafage instead of smooth rounded arcs */
  x.save(); x.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 260; k++) {
    const [lx, ly] = lobes[(t() * lobes.length) | 0];
    let dx = (lx - crownCX) / crownR, dy = (ly - crownCY) / crownRY;
    const d = Math.hypot(dx, dy) || 1;
    if (d < .70) continue;
    dx /= d; dy /= d;
    const px = lx + dx * (5 + t() * 11), py = ly + dy * (4 + t() * 8);
    x.globalAlpha = .9;
    x.beginPath(); x.ellipse(px, py, 2 + t() * 5, 1.5 + t() * 4, t() * 6.3, 0, 6.3); x.fill();
  }
  x.restore(); x.globalAlpha = 1;
  /* the ragged rim: every tick grows off an ACTUAL edge lobe, offset a few
     pixels outward — attached leafage, never dots floating in the sky */
  for (let k = 0; k < 460; k++) {
    const [lx, ly] = lobes[(t() * lobes.length) | 0];
    let dx = (lx - crownCX) / crownR, dy = (ly - crownCY) / crownRY;
    const d = Math.hypot(dx, dy) || 1;
    if (d < .55) continue;                                   // only the canopy's edge sprouts
    dx /= d; dy /= d;
    const px = lx + dx * (3 + t() * 9), py = ly + dy * (2 + t() * 7);
    const up = (crownCY - py) / crownRY, left = (crownCX - px) / crownR;
    const lit = Math.max(0, Math.min(1, .34 + .3 * up + .26 * left + (t() - .5) * .3));
    x.fillStyle = `rgb(${(30 + lit * 46) | 0},${(40 + lit * 54) | 0},${(26 + lit * 30) | 0})`;
    x.beginPath();
    x.ellipse(px, py, 2.2 + t() * 4.4, 1.6 + t() * 3, t() * 6.3, 0, 6.3);
    x.fill();
  }
  /* leaf speckle over the whole crown — thousands of tiny flecks so no
     region ever reads as flat plain green */
  x.save(); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = .5;
  for (let k = 0; k < 2600; k++) {
    const [lx, ly] = lobes[(t() * lobes.length) | 0];
    const px = lx + (t() - .5) * 26, py = ly + (t() - .5) * 20;
    const up = (crownCY - py) / crownRY, left = (crownCX - px) / crownR;
    const lit = Math.max(0, Math.min(1, .30 + .34 * up + .30 * left + (t() - .5) * .55));
    x.fillStyle = `rgb(${(22 + lit * 58) | 0},${(30 + lit * 68) | 0},${(20 + lit * 36) | 0})`;
    x.beginPath(); x.ellipse(px, py, 1.6 + t() * 3.4, 1.2 + t() * 2.4, t() * 6.3, 0, 6.3); x.fill();
  }
  x.globalAlpha = 1; x.restore();
  return tex(cv);
}

/* ------------------------------------------------------------------ bush
   A shrub mound of overlapping leaf lobes, lit from the upper left with a
   dark core; blade strokes break the silhouette. dark:1 for undergrowth. */
export function bushTexture(seed, { dark = 0, wide = 1 } = {}) {
  const W = 1024, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'); const t = mulberry(seed);
  const cx0 = W * .5, cy0 = H * .88, R = W * .36 * wide, Ry = H * .60;
  const base = dark ? [26, 33, 22] : [36, 46, 30];
  const pts = [];
  for (let k = 0; k < 240; k++) {
    const a = t() * Math.PI, rr2 = Math.pow(t(), .5);
    const wob = 1 + .4 * (fbm(a * 1.7 + seed, rr2, 2) - .5);
    pts.push([cx0 + Math.cos(a) * rr2 * R * wob, cy0 - Math.sin(a) * rr2 * Ry * wob]);
  }
  pts.sort((p, q) => q[1] - p[1]);                       // low shadowed lobes first
  for (const [px, py] of pts) {
    const lit = Math.max(0, Math.min(1, .30 + .45 * ((cy0 - py) / Ry) + .30 * ((cx0 - px) / R) + (t() - .5) * .22));
    const r = 10 + t() * 22;
    x.fillStyle = `rgb(${(base[0] + lit * 38) | 0},${(base[1] + lit * 48) | 0},${(base[2] + lit * 26) | 0})`;
    const nb = 2 + (t() * 3 | 0);
    for (let k2 = 0; k2 < nb; k2++) { x.beginPath(); x.arc(px + (t() - .5) * r, py + (t() - .5) * r * .6, r * (.35 + t() * .4), 0, 6.3); x.fill(); }
  }
  x.lineCap = 'round';
  for (let k = 0; k < 46; k++) {
    const a = t() * Math.PI;
    const px = cx0 + Math.cos(a) * R * (.55 + t() * .5), py = cy0 - Math.sin(a) * Ry * (.55 + t() * .5);
    const lit = .35 + t() * .5;
    x.strokeStyle = `rgb(${(base[0] + lit * 34) | 0},${(base[1] + lit * 44) | 0},${(base[2] + lit * 24) | 0})`;
    x.lineWidth = 1.6 + t() * 2;
    x.beginPath(); x.moveTo(px, py);
    x.quadraticCurveTo(px + Math.cos(a) * 14, py - 16, px + Math.cos(a) * 26 + (t() - .5) * 10, py - 26 - t() * 18);
    x.stroke();
  }
  return tex(cv);
}

/* ------------------------------------------------------------------ reeds
   A waterline reed clump: tapering blades leaning outward from the base,
   a few dry seed heads, muted khaki-olive. */
export function reedTexture(seed) {
  const W = 512, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'); const t = mulberry(seed);
  x.lineCap = 'round';
  const bx0 = W * .5, by0 = H * .98;
  for (let k = 0; k < 60; k++) {
    const off = (t() - .5) * W * .55;
    const lean = (t() - .5) * .9 + off / W * 1.2;
    const len = H * (.45 + t() * .5);
    const tipx = bx0 + off + lean * len * .45, tipy = by0 - len;
    const midx = bx0 + off * .8 + lean * len * .16, midy = by0 - len * .55;
    const lit = .3 + .7 * t();
    x.strokeStyle = `rgb(${(40 + lit * 46) | 0},${(52 + lit * 52) | 0},${(30 + lit * 30) | 0})`;
    x.lineWidth = 2 + t() * 3.4;
    x.beginPath(); x.moveTo(bx0 + off, by0); x.quadraticCurveTo(midx, midy, tipx, tipy); x.stroke();
    if (t() < .3) {                                      // a dry seed head
      x.lineWidth *= 2.1;
      x.strokeStyle = `rgb(${(96 + lit * 40) | 0},${(84 + lit * 34) | 0},${(52 + lit * 20) | 0})`;
      x.beginPath(); x.moveTo(tipx, tipy); x.lineTo(tipx + lean * 8, tipy - 18 - t() * 14); x.stroke();
    }
  }
  return tex(cv);
}

/* ------------------------------------------------------------------ assembly helpers */
export function card(mat, w, h, x, y, z, rot = 0, repeatX = 1) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  if (repeatX !== 1) { const uv = m.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * repeatX); }
  m.position.set(x, y, z); m.rotation.y = rot; m.frustumCulled = false; m.renderOrder = 3;
  return m;
}
export function instancedCards(mat, w, h, placements) {
  const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(w, h), mat, placements.length);
  const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  placements.forEach(([x, y, z, rot, sc], i) => {
    q.setFromEuler(new THREE.Euler(0, rot, 0)); s.setScalar(sc);
    mm.compose(new THREE.Vector3(x, y, z), q, s); m.setMatrixAt(i, mm);
  });
  m.frustumCulled = false; m.renderOrder = 3;
  return m;
}
