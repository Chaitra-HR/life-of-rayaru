// ANTARANGA · procedural Brindavana — an original, art-directed reconstruction
// guided by the real structure's character: dark krishna-shila, stepped plinth,
// lotus base, pilastered body with arched niches, rosette medallion band,
// stepped cornices and a crown of pointed kalasha merlons.
import * as THREE from 'three';
import { stoneCanvas, rosetteCanvas, latticeCanvas, dentilCanvas, nichePanelCanvas, tex, mulberry } from '../util.js';

let _shared = null;
function sharedMaterials() {
  if (_shared) return _shared;
  const stoneTex = tex(stoneCanvas(512, [40, 44, 42], 15, 11), { repeat: [1, 1] });
  const stoneDarkTex = tex(stoneCanvas(512, [30, 33, 31], 12, 23));
  const stone = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: .92, metalness: .04 });
  const stoneDark = new THREE.MeshStandardMaterial({ map: stoneDarkTex, roughness: .95, metalness: .03 });
  const lattice = new THREE.MeshStandardMaterial({ map: tex(latticeCanvas()), roughness: .9, metalness: .05 });
  const rosette = new THREE.MeshStandardMaterial({ map: tex(rosetteCanvas()), roughness: .88, metalness: .05 });
  const dentil = new THREE.MeshStandardMaterial({ map: tex(dentilCanvas()), roughness: .9 });
  const niche = new THREE.MeshStandardMaterial({ map: tex(nichePanelCanvas()), roughness: .9 });
  const oxide = new THREE.MeshStandardMaterial({ color: 0x38201a, roughness: .96 }); // muted red-oxide bands
  _shared = { stone, stoneDark, lattice, rosette, dentil, niche, oxide };
  return _shared;
}

function box(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

/* lotus petal ring */
function lotusRing(radius, petalW, petalH, petalD, count, mat, up = true) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-petalW / 2, 0);
  shape.quadraticCurveTo(-petalW / 2, petalH * .55, 0, petalH);
  shape.quadraticCurveTo(petalW / 2, petalH * .55, petalW / 2, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: petalD, bevelEnabled: true, bevelThickness: .02, bevelSize: .015, bevelSegments: 1 });
  geo.translate(0, 0, -petalD / 2);
  const inst = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2;
    e.set(up ? -.42 : Math.PI + .42, a, 0, 'YXZ');
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(Math.sin(a) * radius, 0, Math.cos(a) * radius), q, new THREE.Vector3(1, 1, 1));
    inst.setMatrixAt(i, m);
  }
  g.add(inst);
  return g;
}

/* pointed merlon (crown crenellation) */
function merlonGeo(w = .3, h = .5, d = .12) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, h * .55);
  s.quadraticCurveTo(-w / 2, h * .8, 0, h);
  s.quadraticCurveTo(w / 2, h * .8, w / 2, h * .55);
  s.lineTo(w / 2, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

/* kalasha finial */
function kalasha(mat, scale = 1) {
  const pts = [];
  pts.push(new THREE.Vector2(0, 0));
  pts.push(new THREE.Vector2(.09, .01));
  pts.push(new THREE.Vector2(.11, .06));
  pts.push(new THREE.Vector2(.055, .14));
  pts.push(new THREE.Vector2(.1, .2));
  pts.push(new THREE.Vector2(.075, .28));
  pts.push(new THREE.Vector2(.02, .32));
  pts.push(new THREE.Vector2(.012, .42));
  pts.push(new THREE.Vector2(0, .46));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), mat);
  m.scale.setScalar(scale);
  return m;
}

/**
 * Builds the brindavana. Returns { group, parts, explode(u), setEnvIntensity }.
 * Total height ≈ 4.7, base footprint ≈ 4.4.
 * parts: named groups so scenes can address/explode them.
 */
export function buildBrindavana({ withMala = false, detail = 1 } = {}) {
  const M = sharedMaterials();
  const root = new THREE.Group();
  const parts = {};
  const P = (name) => { const g = new THREE.Group(); parts[name] = g; root.add(g); return g; };

  let y = 0;

  /* ---- stepped plinth ---- */
  const plinth = P('plinth');
  const steps = [[4.4, .32], [3.95, .3], [3.55, .28]];
  for (const [w, h] of steps) {
    const b = box(w, h, w, M.stone);
    b.position.y = y + h / 2; plinth.add(b); y += h;
  }
  // oxide seam above plinth
  const seam0 = box(3.42, .07, 3.42, M.oxide); seam0.position.y = y + .035; plinth.add(seam0); y += .07;

  /* ---- lotus base ---- */
  const lotus = P('lotus');
  const lotusBase = box(3.3, .18, 3.3, M.stoneDark); lotusBase.position.y = y + .09; lotus.add(lotusBase);
  const ringUp = lotusRing(1.5, .36, .44, .14, 20, M.stone, true);
  ringUp.position.y = y + .2; lotus.add(ringUp);
  const lotusTop = box(2.9, .16, 2.9, M.stone); lotusTop.position.y = y + .66; lotus.add(lotusTop);
  y += .74;

  /* ---- lower molding ---- */
  const lower = P('lower');
  const lm = box(2.72, .34, 2.72, M.stoneDark); lm.position.y = y + .17; lower.add(lm);
  const seam1 = box(2.6, .06, 2.6, M.oxide); seam1.position.y = y + .37; lower.add(seam1);
  y += .4;

  /* ---- main body: niche walls + corner pilasters ---- */
  const body = P('body');
  const bodyH = 1.35, bodyW = 2.5;
  // four niche faces
  for (let f = 0; f < 4; f++) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(bodyW * .92, bodyH), M.niche);
    const a = f * Math.PI / 2;
    face.position.set(Math.sin(a) * (bodyW / 2), y + bodyH / 2, Math.cos(a) * (bodyW / 2));
    face.rotation.y = a;
    body.add(face);
  }
  const core = box(bodyW - .04, bodyH, bodyW - .04, M.stoneDark);
  core.position.y = y + bodyH / 2; body.add(core);
  // pilasters: corners + a slimmer central strip on each face
  const pw = .3;
  const half = bodyW / 2 + pw * .26;
  const pilPositions = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pilPositions.push([sx * half * .96, sz * half * .96, pw]);
  for (const s of [-1, 1]) {
    pilPositions.push([s * (bodyW / 2 + .07), 0, pw * .72], [0, s * (bodyW / 2 + .07), pw * .72]);
  }
  for (const [px, pz, w] of pilPositions) {
    const pil = box(w, bodyH + .06, w, M.lattice);
    pil.position.set(px, y + bodyH / 2, pz);
    body.add(pil);
    const cap = box(w + .1, .09, w + .1, M.stone);
    cap.position.set(px, y + bodyH + .04, pz);
    body.add(cap);
  }
  y += bodyH + .1;

  /* ---- rosette medallion band ---- */
  const band = P('band');
  const bandH = .42;
  const bandBox = box(2.8, bandH, 2.8, M.stoneDark);
  bandBox.position.y = y + bandH / 2; band.add(bandBox);
  const discGeo = new THREE.CylinderGeometry(.205, .205, .05, 24);
  discGeo.rotateX(Math.PI / 2);
  for (let f = 0; f < 4; f++) {
    const a = f * Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const off = (i - 2) * .52;
      const disc = new THREE.Mesh(discGeo, M.rosette);
      const nx = Math.sin(a), nz = Math.cos(a);
      disc.position.set(nx * 1.42 + Math.cos(a) * off, y + bandH / 2, nz * 1.42 - Math.sin(a) * off);
      disc.rotation.y = a;
      band.add(disc);
    }
  }
  y += bandH;

  /* ---- cornices ---- */
  const cornice = P('cornice');
  const c1 = box(3.0, .22, 3.0, M.stone); c1.position.y = y + .11; cornice.add(c1);
  const dentilBand = box(3.06, .12, 3.06, M.dentil); dentilBand.position.y = y + .28; cornice.add(dentilBand);
  const c2 = box(3.3, .2, 3.3, M.stoneDark); c2.position.y = y + .44; cornice.add(c2);
  const seam2 = box(3.1, .06, 3.1, M.oxide); seam2.position.y = y + .57; cornice.add(seam2);
  y += .6;

  /* ---- attic ---- */
  const attic = P('attic');
  const at = box(2.35, .5, 2.35, M.stone); at.position.y = y + .25; attic.add(at);
  // small relief squares
  const sqGeo = new THREE.PlaneGeometry(.3, .3);
  for (let f = 0; f < 4; f++) {
    const a = f * Math.PI / 2;
    for (let i = -2; i <= 2; i++) {
      const sq = new THREE.Mesh(sqGeo, M.lattice);
      sq.position.set(Math.sin(a) * 1.18 + Math.cos(a) * i * .42, y + .25, Math.cos(a) * 1.18 - Math.sin(a) * i * .42);
      sq.rotation.y = a;
      attic.add(sq);
    }
  }
  y += .5;

  /* ---- crown of merlons ---- */
  const crown = P('crown');
  const crownBase = box(2.5, .14, 2.5, M.stoneDark); crownBase.position.y = y + .07; crown.add(crownBase);
  const mGeo = merlonGeo(.32, .55, .12);
  const perSide = 6;
  crown.userData.merlons = [];
  for (let f = 0; f < 4; f++) {
    const a = f * Math.PI / 2;
    for (let i = 0; i < perSide; i++) {
      const off = (i - (perSide - 1) / 2) * .42;
      const mer = new THREE.Mesh(mGeo, M.stone);
      mer.position.set(Math.sin(a) * 1.2 + Math.cos(a) * off, y + .14, Math.cos(a) * 1.2 - Math.sin(a) * off);
      mer.rotation.y = a;
      crown.add(mer);
      crown.userData.merlons.push(mer);
    }
  }
  y += .58;

  /* ---- crown cap: the real Brindavana is flat-topped — a recessed slab
          inside the ring of merlons and one small kalasha, no dome ---- */
  const shikhara = P('shikhara');
  const cap = box(2.2, .16, 2.2, M.stoneDark); cap.position.y = y + .08; shikhara.add(cap);
  const capSeam = box(2.0, .05, 2.0, M.oxide); capSeam.position.y = y + .185; shikhara.add(capSeam);
  const capTop = box(1.2, .1, 1.2, M.stone); capTop.position.y = y + .26; shikhara.add(capTop);
  const k = kalasha(M.stoneDark, .8); k.position.y = y + .31; shikhara.add(k);

  /* ---- tulasi mala draped over the structure ---- */
  if (withMala) {
    const mala = P('mala');
    const beadMat = new THREE.MeshStandardMaterial({ color: 0x4a3d22, roughness: .8 });
    const makeStrand = (from, mid, to) => {
      const curve = new THREE.CatmullRomCurve3([from, mid, to]);
      const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 8, 8), beadMat, 46);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 46; i++) {
        const p = curve.getPoint(i / 45);
        m.makeTranslation(p.x, p.y, p.z);
        beads.setMatrixAt(i, m);
      }
      mala.add(beads);
    };
    makeStrand(new THREE.Vector3(-.45, y + .82, 1.3), new THREE.Vector3(-1.05, 2.5, 1.42), new THREE.Vector3(-1.3, 1.1, 1.3));
    makeStrand(new THREE.Vector3(.45, y + .82, 1.3), new THREE.Vector3(1.05, 2.5, 1.42), new THREE.Vector3(1.3, 1.1, 1.3));
    mala.userData.beadMat = beadMat;
  }

  const totalH = y + .7;

  /* explode: 0 = assembled, 1 = fully separated (slow, reverential drift) */
  const home = {};
  for (const k2 in parts) home[k2] = parts[k2].position.clone();
  const offsets = {
    plinth: new THREE.Vector3(0, -.9, 0),
    lotus: new THREE.Vector3(0, -.45, 0),
    lower: new THREE.Vector3(0, -.18, 0),
    body: new THREE.Vector3(0, 0, 0),
    band: new THREE.Vector3(0, .55, 0),
    cornice: new THREE.Vector3(0, 1.15, 0),
    attic: new THREE.Vector3(0, 1.8, 0),
    crown: new THREE.Vector3(0, 2.5, 0),
    shikhara: new THREE.Vector3(0, 3.3, 0),
    mala: new THREE.Vector3(0, .0, 0),
  };
  function explode(u) {
    for (const name in parts) {
      const off = offsets[name] || new THREE.Vector3();
      parts[name].position.copy(home[name]).addScaledVector(off, u);
    }
    // crown merlons breathe slightly outward
    if (crown.userData.merlons) {
      for (const mer of crown.userData.merlons) {
        const dir = new THREE.Vector3(mer.position.x, 0, mer.position.z).normalize();
        mer.position.addScaledVector(dir, 0); // positions are absolute; radial spread via scale of group
      }
      crown.scale.setScalar(1 + u * .12);
    }
  }

  return { group: root, parts, explode, height: totalH, materials: M };
}
