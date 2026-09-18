// ANTARANGA · scene 03 — Parimala. Aksharas lift from a manuscript, become a
// stream, and the visitor reads his works one volume at a time on a rehal.
// (The Guru Paramparā name plates that stood along the corridor were removed
// in Sept 2026: under the works they could only ever be read as a second
// layer of type behind the column, and that is what made the chapter busy.)
import * as THREE from 'three';
import { palmLeafCanvas, tex, canvas, deepaLamp, glowSprite, glowTexture, mulberry, fbm, noise2, clamp, lerp, clamp01, remap, smooth, win, V3 } from '../util.js';
import { WORKS } from '../works.js';

export const PARIMALA_Y = 800;

const GLYPHS = ['ಅ', 'ಕ', 'ಶ', 'ರ', 'ಮ', 'ಧ', 'ವ', 'ಗ', 'ಯ', 'ತ', 'ಸ', 'ನ', 'श', 'ध', 'र', 'म', 'व', 'त', 'य', 'ज'];
/* the five selected works are presented editorially in the DOM layer,
   one at a time — the world behind carries the manuscript, the akṣara
   stream, and the volume itself on its reading stand */

function glyphTexture(ch) {
  const [c, g] = canvas(128, 128);
  g.font = '300 84px "Noto Sans Kannada","Noto Serif Devanagari","Nirmala UI",serif';
  g.fillStyle = '#e6ddc8';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(ch, 64, 70);
  return tex(c);
}

/* ---- the rehal kit, at module level so the reading stand can be built
   alone (world/objects.js) as well as here ---- */
const DEG = Math.PI / 180;
const BETA = 30 * DEG, L1 = .26, L2 = .30, TH = .018;   // board angle from horizontal, legs, wings, thickness
const PIV_Y = L1 * Math.sin(BETA);

/* sheesham: a warm, dark grain along the board */
const woodTex = (() => {
  const W = 256, H = 512;
  const [c, g] = canvas(W, H);
  const img = g.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const warpX = fbm(x / 70, y / 260, 2) * 2.6;
    const n = fbm(x / 13 + warpX, y / 230, 3);
    const ring = Math.sin((x / 22 + n * 3) * 1.7) * .5;
    const v = n * 34 + ring * 9 + (noise2(x * .9, y * .9)) * 7;
    const i = (y * W + x) * 4;
    d[i] = clamp(76 + v, 0, 255); d[i + 1] = clamp(41 + v * .8, 0, 255); d[i + 2] = clamp(24 + v * .55, 0, 255); d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = tex(c, { repeat: [1, 1] });
  return t;
})();
const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: .58, metalness: .02 });
const woodDark = new THREE.MeshStandardMaterial({ color: 0x3a2113, roughness: .7 });
const brassMat = new THREE.MeshStandardMaterial({ color: 0x5c4620, roughness: .6, metalness: .5 });
const paperMat = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: .95 });
const edgeMat = (() => {
  const [c, g] = canvas(64, 256);
  g.fillStyle = '#d2c5a6'; g.fillRect(0, 0, 64, 256);
  g.strokeStyle = 'rgba(70,50,30,.22)'; g.lineWidth = 1;
  for (let y = 1; y < 256; y += 2.6) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y + .3); g.stroke(); }
  return new THREE.MeshStandardMaterial({ map: tex(c, { repeat: [1, 1] }), roughness: .95 });
})();
const radialAlpha = (() => {
  const [c, g] = canvas(256, 256);
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, '#fff'); grd.addColorStop(.45, '#999'); grd.addColorStop(1, '#000');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  return tex(c, { srgb: false });
})();

/* the board: one shape (x across the width, y along the length, the
   pivot at y = 0), an ogee outline, fretwork holes, bevelled */
const boardGeo = (() => {
  const S = new THREE.Shape();
  S.moveTo(0, -.262);
  S.quadraticCurveTo(.06, -.262, .10, -.245);
  S.quadraticCurveTo(.15, -.225, .17, -.20);
  S.bezierCurveTo(.16, -.15, .12, -.10, .085, -.05);
  S.quadraticCurveTo(.07, -.02, .07, 0);
  S.quadraticCurveTo(.07, .02, .085, .05);
  S.bezierCurveTo(.12, .11, .16, .17, .17, .23);
  S.quadraticCurveTo(.15, .27, .10, .29);
  S.quadraticCurveTo(.06, .302, 0, .302);
  S.quadraticCurveTo(-.06, .302, -.10, .29);
  S.quadraticCurveTo(-.15, .27, -.17, .23);
  S.bezierCurveTo(-.16, .17, -.12, .11, -.085, .05);
  S.quadraticCurveTo(-.07, .02, -.07, 0);
  S.quadraticCurveTo(-.07, -.02, -.085, -.05);
  S.bezierCurveTo(-.12, -.10, -.16, -.15, -.17, -.20);
  S.quadraticCurveTo(-.15, -.225, -.10, -.245);
  S.quadraticCurveTo(-.06, -.262, 0, -.262);
  S.closePath();
  const leaf = (cx, cy, len, wid, ang) => {
    const p = new THREE.Path();
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const P = (lx, ly) => [cx + lx * ca - ly * sa, cy + lx * sa + ly * ca];
    const [ax, ay] = P(0, -len / 2), [bx, by] = P(0, len / 2);
    const [c1x, c1y] = P(wid, 0), [c2x, c2y] = P(-wid, 0);
    p.moveTo(ax, ay); p.quadraticCurveTo(c1x, c1y, bx, by); p.quadraticCurveTo(c2x, c2y, ax, ay);
    return p;
  };
  const dot = (cx, cy, r) => { const p = new THREE.Path(); p.absarc(cx, cy, r, 0, Math.PI * 2, false); return p; };
  const lozenge = (cx, cy, w, h) => { const p = new THREE.Path(); p.moveTo(cx, cy - h / 2); p.lineTo(cx + w / 2, cy); p.lineTo(cx, cy + h / 2); p.lineTo(cx - w / 2, cy); p.closePath(); return p; };
  const pattern = (dir) => {   // dir -1 legs, +1 wings
    const y = (v) => dir * v;
    S.holes.push(lozenge(0, y(.16), .046, .092));
    S.holes.push(leaf(.084, y(.15), .10, .026, dir * -.2));
    S.holes.push(leaf(-.084, y(.15), .10, .026, dir * .2));
    S.holes.push(dot(.056, y(.226), .011));
    S.holes.push(dot(-.056, y(.226), .011));
    S.holes.push(leaf(.04, y(.075), .042, .011, dir * .6));
    S.holes.push(leaf(-.04, y(.075), .042, .011, dir * -.6));
  };
  pattern(-1); pattern(1);
  const geo = new THREE.ExtrudeGeometry(S, { depth: TH, bevelEnabled: true, bevelThickness: .0025, bevelSize: .0025, bevelSegments: 1, curveSegments: 10 });
  geo.translate(0, 0, -TH / 2);
  // map the wood once along the board: uv comes from the shape's (x, y)
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / .36 + .5, (uv.getY(i) + L1) / (L1 + L2));
  geo.computeVertexNormals();
  return geo;
})();
const starGeo = (() => {
  const s = new THREE.Shape();
  for (let k = 0; k < 10; k++) { const r = k % 2 ? .0065 : .015, a = k * Math.PI / 5 - Math.PI / 2; k ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  s.closePath();
  return new THREE.ShapeGeometry(s);
})();

/* a printed page: cream paper, a double rule, the work's Devanagari title
   and rows of abstract akṣara strokes (not readable text). Drawn rotated
   a half-turn, which is how the verso's top face and lifting leaf map it. */
function pageCanvas(title, seed) {
  const W = 512, H = 724;
  const [c, g] = canvas(W, H);
  g.translate(W, H); g.rotate(Math.PI);
  const rnd = mulberry(seed);
  g.fillStyle = '#e2d6ba'; g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W * .5, H * .5, H * .2, W * .5, H * .5, H * .75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(60,40,20,.14)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(58,40,22,.55)'; g.lineWidth = 1.2; g.strokeRect(30, 30, W - 60, H - 60);
  g.lineWidth = 2.2; g.strokeRect(38, 38, W - 76, H - 76);
  g.fillStyle = '#33241a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '400 30px "Noto Serif Devanagari", serif';
  g.fillText(title, W / 2, 92);
  g.fillStyle = 'rgba(58,40,22,.6)'; g.fillRect(W * .32, 122, W * .36, 1.2);
  g.strokeStyle = 'rgba(43,32,22,.8)'; g.lineWidth = 1.5; g.lineCap = 'round';
  for (let r = 0; r < 23; r++) {
    const y = 158 + r * 23;
    let x = 62 + (r % 6 === 0 ? 34 : 0);
    const xe = W - 62 - (r % 7 === 3 ? 60 : 0);
    while (x < xe) {
      const gw = 9 + rnd() * 26;
      if (x + gw > xe) break;
      g.beginPath();
      const seg = 1 + Math.floor(rnd() * 4);
      for (let s = 0; s < seg; s++) {
        const x0 = x + s * gw / seg, sw = gw / seg;
        g.moveTo(x0, y - 3 + rnd() * 3);
        g.bezierCurveTo(x0 + sw * .35, y - 8 + rnd() * 5, x0 + sw * .65, y + 6 - rnd() * 5, x0 + sw, y - 2 + rnd() * 5);
      }
      g.stroke();
      g.beginPath(); g.moveTo(x, y - 7.5); g.lineTo(x + gw, y - 7.5); g.stroke();   // the shirorekha
      x += gw + 6 + rnd() * 6;
    }
  }
  g.fillStyle = 'rgba(58,40,22,.7)'; g.font = '400 12px "Karla", sans-serif';
  g.fillText(String(6 + seed * 14), W / 2, H - 56);
  const t = tex(c); t.anisotropy = 8;
  return t;
}

/* The RECTO: a printed plate of the edition itself.

   The five editions are five different objects — two illustrated
   hardbacks, one typographic scholarly edition, one whose supplied image
   is literally its printed title page, one paperback with a painting
   across its foot — and five identical cream pages threw all of that
   away. So the recto carries the edition's own face, reproduced as a
   PLATE: inset inside the page's margins and its double rule, with a fine
   plate border and a caption beneath, the way a reprint reproduces the
   original. It is printed matter on a page. It is not the book's outside,
   which on an open volume is against the rehal.

   The page is drawn at once, with the plate area blank, and the plate is
   laid in when its image lands; the texture updates in place. Unlike
   pageCanvas this is NOT drawn rotated: the two halves of the volume are
   mirrored, so their top faces map the opposite way up. */
function platePageCanvas(w, seed) {
  const W = 512, H = 724;
  const [c, g] = canvas(W, H);
  const page = () => {
    g.fillStyle = '#e2d6ba'; g.fillRect(0, 0, W, H);
    const vg = g.createRadialGradient(W * .5, H * .5, H * .2, W * .5, H * .5, H * .75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(60,40,20,.14)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(58,40,22,.55)'; g.lineWidth = 1.2; g.strokeRect(30, 30, W - 60, H - 60);
    g.lineWidth = 2.2; g.strokeRect(38, 38, W - 76, H - 76);
  };
  /* the plate: the image's own proportion, fitted inside the measure */
  const MX = 92, MY = 96, PW = W - MX * 2, PH = H - MY * 2 - 70;
  const plate = (img) => {
    const ar = img.width / img.height;
    let pw = PW, ph = pw / ar;
    if (ph > PH) { ph = PH; pw = ph * ar; }
    const px = (W - pw) / 2, py = MY + (PH - ph) / 2;
    g.fillStyle = 'rgba(58,40,22,.10)'; g.fillRect(px + 4, py + 5, pw, ph);   // the plate's shadow on the page
    g.drawImage(img, px, py, pw, ph);
    g.strokeStyle = 'rgba(58,40,22,.62)'; g.lineWidth = 1.4; g.strokeRect(px - 2.5, py - 2.5, pw + 5, ph + 5);
    return py + ph;
  };
  const caption = (y) => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(58,40,22,.7)'; g.font = '400 17px "Noto Serif Devanagari", serif';
    g.fillText(w.original, W / 2, y + 30);
    g.fillStyle = 'rgba(58,40,22,.55)'; g.font = '400 11px "Karla", sans-serif';
    g.fillText(w.plain.toUpperCase().split('').join('\u2009'), W / 2, y + 54);
  };
  page();
  caption(MY + PH);
  const t = tex(c); t.anisotropy = 8;
  const img = new Image();
  img.onload = () => { page(); const y = plate(img); caption(Math.max(y, MY + PH - 40)); t.needsUpdate = true; };
  img.src = `${w.image}-640.webp`;
  return t;
}

/* the rehal itself, with the open volume on it. Built in a frame whose
   z is the hinge axis; the caller yaws it toward the camera. */
export function buildRehal(w, i) {
  const R = new THREE.Group();
  const halves = [];
  const PW = .24, PH = .28, COV = .006, BLK = .022, GAP = .014;   // page width along the wing, height along the hinge
  const cloth = new THREE.MeshStandardMaterial({ color: w.cloth, roughness: .85 });
  const spineMat = new THREE.MeshStandardMaterial({ color: w.spine, roughness: .8 });
  for (const sgn of [-1, 1]) {
    const cb = Math.cos(BETA), sb = Math.sin(BETA);
    const a = V3(sgn * cb, sb, 0);          // along the board, toward the wing tip
    const n = V3(-sgn * sb, cb, 0);         // the upper face, into the V
    const zx = a.clone().cross(n);          // the hinge axis, handed to match
    const basis = new THREE.Matrix4().makeBasis(zx, a, n);
    const q = new THREE.Quaternion().setFromRotationMatrix(basis);
    const board = new THREE.Mesh(boardGeo, woodMat);
    board.quaternion.copy(q); board.position.set(0, PIV_Y, 0);
    R.add(board);
    // brass stars on the legs
    for (const [sx, sy] of [[.06, -.205], [-.06, -.205], [0, -.10]]) {
      const st = new THREE.Mesh(starGeo, brassMat);
      st.quaternion.copy(q);
      st.position.set(0, PIV_Y, 0).addScaledVector(zx, sx).addScaledVector(a, sy).addScaledVector(n, TH / 2 + .0035);
      R.add(st);
    }
    // the half volume on this wing: cover board, then the block of leaves
    const bookBasis = new THREE.Matrix4().makeBasis(a, n, zx);
    const bq = new THREE.Quaternion().setFromRotationMatrix(bookBasis);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(PW + .012, COV, PH + .012), cloth);
    cover.quaternion.copy(bq);
    cover.position.set(0, PIV_Y, 0).addScaledVector(a, GAP + PW / 2).addScaledVector(n, TH / 2 + .0025 + COV / 2);
    R.add(cover);
    // verso: a page of text. recto: a plate of the edition. Two pages, as an open book has.
    const top = new THREE.MeshStandardMaterial({
      map: sgn < 0 ? pageCanvas(w.original, i + 1) : platePageCanvas(w, i + 1),
      roughness: .92,
    });
    const block = new THREE.Mesh(new THREE.BoxGeometry(PW, BLK, PH), [edgeMat, spineMat, top, paperMat, edgeMat, edgeMat]);
    block.quaternion.copy(bq);
    block.position.set(0, PIV_Y, 0).addScaledVector(a, GAP + PW / 2).addScaledVector(n, TH / 2 + .0025 + COV + BLK / 2);
    R.add(block);
    if (sgn < 0) {
      // the verso's top leaf, hinged at the spine edge, lifting toward the reader's hand
      const pivot = new THREE.Group();
      pivot.quaternion.copy(bq);
      pivot.position.set(0, PIV_Y, 0).addScaledVector(a, GAP).addScaledVector(n, TH / 2 + .0025 + COV + BLK + .0008);
      const swing = new THREE.Group();
      const front = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH).rotateX(-Math.PI / 2), top);
      front.position.x = PW / 2;
      const back = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH).rotateX(Math.PI / 2), paperMat);
      back.position.set(PW / 2, -.0006, 0);
      swing.add(front, back);
      pivot.add(swing);
      R.add(pivot);
      halves.push(swing);
    }
  }
  // the spine of the open volume, in the crotch of the V
  const sp = new THREE.Mesh(new THREE.BoxGeometry(.03, .014, PH + .012), spineMat);
  sp.position.set(0, PIV_Y + .017, 0);
  R.add(sp);
  // the wooden barrel hinge along the axis
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.021, .021, .19, 14).rotateX(Math.PI / 2), woodDark);
  barrel.position.set(0, PIV_Y, 0);
  R.add(barrel);
  for (const z of [-.06, .06]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .02, 14).rotateX(Math.PI / 2), woodMat);
    ring.position.set(0, PIV_Y, z);
    R.add(ring);
  }
  // the contact shadow the legs leave on the floor
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(.82, .5).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, alphaMap: radialAlpha, opacity: .8, depthWrite: false }));
  shade.position.y = .003;
  R.add(shade);
  return { R, leaf: halves[0] };
}

export function createParimalaStage(ctx) {
  const g = new THREE.Group();
  g.position.y = PARIMALA_Y;
  g.visible = false;
  const rnd = mulberry(404);

  /* the manuscript we pass into */
  const msTex = tex(palmLeafCanvas(8, 1024, 256));
  const manuscript = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, .9),
    new THREE.MeshBasicMaterial({ map: msTex, transparent: true })
  );
  manuscript.position.set(0, 1.4, 0);
  manuscript.rotation.x = -.28;
  g.add(manuscript);
  const msGlow = glowSprite(0xc89050, 3, .1);
  msGlow.position.set(0, 1.4, -.4);
  g.add(msGlow);

  /* akshara stream — one InstancedMesh per glyph */
  const perGlyph = ctx.isMobile ? 8 : 13;
  const total = GLYPHS.length * perGlyph;
  const planeGeo = new THREE.PlaneGeometry(.34, .34);
  const meshes = GLYPHS.map(ch => {
    const m = new THREE.InstancedMesh(planeGeo, new THREE.MeshBasicMaterial({
      map: glyphTexture(ch), transparent: true, depthWrite: false, opacity: .9,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }), perGlyph);
    m.frustumCulled = false;
    g.add(m);
    return m;
  });
  // per-instance data
  const inst = [];
  for (let gi = 0; gi < GLYPHS.length; gi++) {
    for (let k = 0; k < perGlyph; k++) {
      inst.push({
        mesh: meshes[gi], idx: k,
        startX: (rnd() - .5) * 3.2, startY: 1.4 + (rnd() - .5) * .7,
        seed: rnd(), radius: .9 + rnd() * 2.6, phase: rnd() * Math.PI * 2,
        speed: .55 + rnd() * .8, scale: .5 + rnd() * .9,
      });
    }
  }

  /* corridor spine for the stream + the camera */
  const spine = new THREE.CatmullRomCurve3([
    V3(0, 1.4, 0), V3(1.2, 1.6, -12), V3(-1.4, 1.8, -26),
    V3(1, 2, -40), V3(-.6, 1.8, -54), V3(0, 1.7, -66),
  ]);

  /* warm anchors along the spine — faint depth beacons */
  const beacons = [];
  for (let i = 0; i < 6; i++) {
    const p = spine.getPoint(i / 5 * .9 + .05);
    const b = glowSprite(0xa06828, 3.4, .05);
    b.position.set(p.x, p.y - .3, p.z - 2);
    g.add(b); beacons.push(b);
  }

  /* faint drifting ink specks */
  const inkN = ctx.isMobile ? 80 : 180;
  const ipos = new Float32Array(inkN * 3);
  for (let i = 0; i < inkN; i++) {
    ipos[i * 3] = (rnd() - .5) * 10;
    ipos[i * 3 + 1] = rnd() * 4;
    ipos[i * 3 + 2] = 2 - rnd() * 70;
  }
  const inkGeo = new THREE.BufferGeometry();
  inkGeo.setAttribute('position', new THREE.BufferAttribute(ipos, 3));
  const ink = new THREE.Points(inkGeo, new THREE.PointsMaterial({
    color: 0x8a7040, size: .035, transparent: true, opacity: .35, map: glowTexture('rgba(190,160,100,1)', 'rgba(190,160,100,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  g.add(ink);

  const amb = new THREE.AmbientLight(0x241c12, 2);
  g.add(amb);

  /* ---- the camera path (the corridor) ----
     Under the works (t .374–.4775) the corridor is hushed: the stream is
     frozen and the paramparā silent, so travel there was invisible except
     as the volumes rushing past. The path is time-warped instead: it slows
     to a drift of about half a unit per work, and the camera tilts down
     onto the reading stand, the way a reader looks down at a rehal. Both
     are pure functions of u; the pitch releases before the veil at .480. */
  const UP = V3(0, 1, 0), DEG = Math.PI / 180;
  const SPEED = (u) => 1 - .965 * win(u, .07, .13, .90, .96);
  const WARP_N = 256, WARP = new Float32Array(WARP_N + 1);
  { let acc = 0; for (let i = 1; i <= WARP_N; i++) { acc += (SPEED((i - 1) / WARP_N) + SPEED(i / WARP_N)) * .5 / WARP_N; WARP[i] = acc; } }
  const warp = (u) => { const x = clamp01(u) * WARP_N, i = Math.min(WARP_N - 1, Math.floor(x)); return lerp(WARP[i], WARP[i + 1], x - i); };
  const hushCam = (u) => smooth(remap(u, .009, .118)) * (1 - smooth(remap(u, .93, .985)));
  /* MEASURED against the column: a wide frame keeps the stand right of the
     copy and a little below the eye; a phone stacks it in the upper third,
     centred, above the column, which is why the phone tilts further */
  const RIG = ctx.isMobile
    ? { pitch: 51, dist: 2.4, elev: 38, yawR: 0 }
    : { pitch: 34, dist: 1.55, elev: 38, yawR: 13 };
  const cam = (u) => {
    const s = smooth(clamp01(warp(u) * 1.06));
    const p = spine.getPoint(s * .97);
    const ahead = spine.getPoint(Math.min(s * .97 + .05, 1));
    const pos = new THREE.Vector3(p.x, p.y + .1, p.z + (u < .1 ? lerp(2.4, .8, remap(u, 0, .1)) : .8));
    const look = new THREE.Vector3(ahead.x, ahead.y, ahead.z - 2);
    const h = hushCam(u);
    if (h > 0) {
      const f = look.clone().sub(pos); f.y = 0; f.normalize();
      const pr = RIG.pitch * DEG;
      const down = pos.clone().addScaledVector(f, 3 * Math.cos(pr)).addScaledVector(UP, -3 * Math.sin(pr));
      look.lerp(down, h);
    }
    return { pos, look, fov: lerp(42, 45, smooth(remap(u, .1, .5))) };
  };

  /* ---- the five granthas ----
     Each volume lies OPEN on a rehal, the folding reading stand of every
     matha: two carved boards crossed on a wooden barrel hinge, the wings
     above the pivot holding the book, the legs below spreading to the
     floor. The boards are extruded shapes with real fretwork holes and
     bevelled edges, sheesham-toned, with small brass star inlays on the
     legs. The volume lies open at its title page: the recto carries the
     work's name, the verso a page of text headed by the same title, and the
     verso's leaf lifts a little while the copy is read, as if the reader has
     just turned it. One deepa lights the whole rig; it is also the fader, so
     nothing pops. The type stays flat in the DOM column. ---- */
  const T05 = { a: .370, b: .480 };

  /* ONE lamp light and ONE fill for all five volumes: the fades are
     sequential, so a single volume is ever lit, and the pair follows it.
     Ten always-counted point lights would have cost every fragment in the
     chapter; two do, and the count never changes, so nothing recompiles. */
  const lampLight = new THREE.PointLight(0xffa850, 0, 3.4, 2);
  const fill = new THREE.PointLight(0xffd2a4, 0, 2.6, 2);
  g.add(lampLight, fill);
  const _lw = new THREE.Vector3(), _fw = new THREE.Vector3();
  const volumes = WORKS.map((w, i) => {
    const uMid = ((w.win[0] + w.win[1]) / 2 - T05.a) / (T05.b - T05.a);
    const shot = cam(uMid);
    const f = shot.look.clone().sub(shot.pos); f.y = 0; f.normalize();
    const r = V3(-f.z, 0, f.x);
    const yr = RIG.yawR * DEG, el = RIG.elev * DEG;
    const dir = f.clone().multiplyScalar(Math.cos(yr)).addScaledVector(r, Math.sin(yr)).multiplyScalar(Math.cos(el)).addScaledVector(UP, -Math.sin(el));
    const pos = shot.pos.clone().addScaledVector(dir, RIG.dist).addScaledVector(UP, -.17);   // the rig's floor, its centre on the line of sight
    const grp = new THREE.Group();
    grp.position.copy(pos);
    grp.lookAt(shot.pos.x, pos.y, shot.pos.z);   // +z toward the reader, yaw only
    /* the lights live on grp, which is always visible; only `body` (the
       stand, the floor, the lamp's brass) is shown and hidden. A light
       inside a toggled group changes the scene's light count and forces
       every lit program to recompile: a hitch per volume, ten per chapter. */
    const body = new THREE.Group();
    body.visible = false;
    grp.add(body);
    const { R, leaf } = buildRehal(w, i);
    R.rotation.y = 18 * DEG;                     // a little turned, so the recto reads and the X still shows
    body.add(R);
    // the floor under the reading: only what the lamp reaches
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 1, transparent: true, alphaMap: radialAlpha, depthWrite: false }));
    floor.position.y = -.001 - i * .0012;
    body.add(floor);
    // the deepa the reader reads by
    const lamp = deepaLamp({ scale: .5, light: false, flameScale: .38 });
    lamp.position.set(-.42, 0, -.06);
    body.add(lamp);
    lamp.userData.setOn(0);
    /* where the shared lights stand for this volume: over the deepa's flame,
       and over the reader's shoulder (the verso faces away from the deepa;
       without the fill it rendered black) */
    const lampAt = new THREE.Object3D(); lampAt.position.set(-.42, .31, -.06); grp.add(lampAt);
    const fillAt = new THREE.Object3D(); fillAt.position.set(.3, .8, .75); grp.add(fillAt);
    grp.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    g.add(grp);
    /* the fade windows are sequential (a dark beat between volumes, never
       two stands superimposed); the first comes up with the chapter's own
       copy so the tilt does not land on an empty floor */
    const inA = i === 0 ? w.win[0] - .012 : w.win[0] - .0005;
    const inB = i === 0 ? w.win[0] - .001 : w.win[0] + .005;
    return { grp, body, leaf, lamp, lampAt, fillAt, win: w.win, inA, inB, outA: w.win[1] - .004, outB: w.win[1] + .0005 };
  });

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Vector3();
  return {
    group: g,
    setVisible(v) { g.visible = v; },
    cam,
    update(time, globalT, u, camera) {
      /* 05 · The Works canvas owns t .374–.4775 — the corridor's lettering
         goes near-still and near-silent behind it, so the books and their
         typography are read against a quiet ground, not a glyph stream */
      const hush = smooth(remap(globalT, .371, .383)) * (1 - smooth(remap(globalT, .4735, .4815)));
      // manuscript fades once the letters have left it
      manuscript.material.opacity = 1 - smooth(remap(u, .1, .26));
      msGlow.material.opacity = .1 * (1 - smooth(remap(u, .1, .3))) * (1 - .6 * hush);
      ink.material.opacity = .35 * (1 - .97 * hush);   // drifting specks are motion too

      const lift = smooth(remap(u, .02, .2));       // rise off the leaf
      const streamPhase = smooth(remap(u, .16, .3)); // join the corridor stream
      const fade = 1 - smooth(remap(u, .88, 1));

      /* the volumes: each is lit up by its own lamp as its reading begins,
         the verso leaf lifting a little while the copy is read, and is dark
         again before the next */
      let lit = false;
      for (const v of volumes) {
        const w = smooth(remap(globalT, v.inA, v.inB)) * (1 - smooth(remap(globalT, v.outA, v.outB)));
        v.body.visible = w > .001;
        if (!v.body.visible) continue;
        v.body.scale.setScalar(.9 + .1 * w);
        const open = smooth(remap(globalT, v.win[0] + .002, v.win[1] - .004));
        v.leaf.rotation.z = (.04 + .5 * open) * w;
        const f = v.lamp.userData.flicker(time + v.win[0] * 40);
        v.lamp.userData.setOn(w);
        lampLight.position.copy(g.worldToLocal(v.lampAt.getWorldPosition(_lw)));
        fill.position.copy(g.worldToLocal(v.fillAt.getWorldPosition(_fw)));
        lampLight.intensity = 3.6 * (.84 + f * .2) * w;
        fill.intensity = 1.5 * w;
        lit = true;
      }
      if (!lit) { lampLight.intensity = 0; fill.intensity = 0; }

      /* Under the works the stream does not merely dim — it STOPS.
         At 6% opacity the glyphs were still legible as motion, and motion
         behind a reading column is what made the chapter feel busy. Once
         hushed we leave the matrices exactly where they were: a still,
         near-invisible ground. */
      const frozen = hush > .985;
      if (frozen) {
        for (const m of meshes) m.material.opacity = .06 * fade;   // a still, faint ground behind the volumes
      } else {
      _q.copy(camera.quaternion);
      for (const it of inst) {
        // start: on manuscript surface
        const sx = it.startX, sy = it.startY;
        // float: lifted above the leaf
        const fx = sx * 1.4, fy = sy + .5 + it.seed * 1.2, fz = -it.seed * 2;
        // stream: swirl along the spine, offset around it, cycling forward
        const sPos = (it.seed + u * it.speed * 1.1) % 1;
        const c = spine.getPoint(sPos, _c);
        const ang = it.phase + time * .12 + sPos * 9;
        const stx = c.x + Math.cos(ang) * it.radius;
        const sty = c.y + Math.sin(ang * .8) * it.radius * .55 + .4;
        const stz = c.z + Math.sin(ang * .5) * .8;

        let x = lerp(sx, fx, lift), y = lerp(sy, fy, lift), z = lerp(0, fz, lift);
        x = lerp(x, stx, streamPhase); y = lerp(y, sty, streamPhase); z = lerp(z, stz, streamPhase);

        const sc = it.scale * (0.35 + lift * .65) * fade;
        _s.setScalar(Math.max(sc, .0001));
        _m.compose(_p.set(x, y, z), _q, _s);
        it.mesh.setMatrixAt(it.idx, _m);
      }
      for (const m of meshes) { m.instanceMatrix.needsUpdate = true; m.material.opacity = .9 * fade * (0.12 + .88 * smooth(remap(u, .05, .2))) * (1 - .995 * hush); }
      }

    },
  };
}
