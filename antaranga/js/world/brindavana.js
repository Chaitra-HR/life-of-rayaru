// ANTARANGA · procedural Brindavana — an original, art-directed reconstruction
// following the Moola Brindavana reference: dark krishna-shila; a broad flaring
// base of cushioned mouldings under a scallop band; stepped mouldings up to a
// pilastered niche level; a rosette medallion band; a tall framed upper block;
// a cornice flaring outward beneath a crown of pointed leaf merlons; and the
// tulasi-mani garland — two strands of large pale beads draped down the front.
import * as THREE from 'three';
import { stoneCanvas, rosetteCanvas, latticeCanvas, dentilCanvas, nichePanelCanvas, tex, mergeStatic } from '../util.js';

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

/* pointed leaf merlon (crown crenellation) — tall ogee silhouette */
function merlonGeo(w = .3, h = .56, d = .1) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, h * .3);
  s.quadraticCurveTo(-w / 2, h * .62, -w * .16, h * .8);
  s.quadraticCurveTo(0, h * .92, 0, h);
  s.quadraticCurveTo(0, h * .92, w * .16, h * .8);
  s.quadraticCurveTo(w / 2, h * .62, w / 2, h * .3);
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
 * Builds the brindavana. Returns { group, parts, explode(u), height, materials }.
 * Total height ≈ 5.5, base footprint ≈ 4.3.
 * parts: named groups so scenes can address/explode them.
 */
export function buildBrindavana({ withMala = false } = {}) {
  const M = sharedMaterials();
  const root = new THREE.Group();
  const parts = {};
  const P = (name) => { const g = new THREE.Group(); parts[name] = g; root.add(g); return g; };

  /* half-width of the structure's face at height y — the built silhouette the
     garland rests against (kept in step with the courses below) */
  const surf = (y) =>
    y > 5.03 ? 1.50 :        // crown ring
    y > 4.58 ? 1.53 :        // cornice courses
    y > 3.24 ? 1.37 :        // rosette band + upper block (one shoulder)
    y > 1.92 ? 1.38 :        // niche level (pilasters proud of the face)
    y > 1.52 ? 1.44 :        // stepped mouldings and ledge
    y > .62 ? 1.92 :         // cushion base
    2.16;                    // plinth

  let y = 0;

  /* ---- plinth ---- */
  const plinth = P('plinth');
  for (const [w, h] of [[4.3, .30], [4.0, .26]]) {
    const b = box(w, h, w, M.stone);
    b.position.y = y + h / 2; plinth.add(b); y += h;
  }
  const seam0 = box(3.86, .06, 3.86, M.oxide); seam0.position.y = y + .03; plinth.add(seam0); y += .06;

  /* ---- the flaring base: two cushioned torus courses + a scallop band ---- */
  const lotus = P('lotus');
  const cushion = (widths, sliceH) => {
    for (const w of widths) {
      const b = box(w, sliceH, w, M.stoneDark);
      b.position.y = y + sliceH / 2; lotus.add(b); y += sliceH;
    }
  };
  cushion([3.5, 3.78, 3.84, 3.62], .10);               // the great lower cushion
  const fillet = box(3.2, .05, 3.2, M.stone); fillet.position.y = y + .025; lotus.add(fillet); y += .05;
  cushion([3.2, 3.4, 3.24], .09);                      // the upper cushion
  // scallop band: a row of round bosses on each face — the lotus rim
  const scallops = box(2.95, .18, 2.95, M.stoneDark);
  scallops.position.y = y + .09; lotus.add(scallops);
  const bossGeo = new THREE.CylinderGeometry(.105, .105, .06, 14);
  bossGeo.rotateX(Math.PI / 2);
  const bosses = new THREE.InstancedMesh(bossGeo, M.stone, 32);
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let i = 0;
    for (let f = 0; f < 4; f++) {
      const a = f * Math.PI / 2, nx = Math.sin(a), nz = Math.cos(a);
      for (let k = 0; k < 8; k++) {
        const off = (k - 3.5) * .335;
        e.set(0, a, 0); q.setFromEuler(e);
        m.compose(new THREE.Vector3(nx * 1.475 + Math.cos(a) * off, y + .09, nz * 1.475 - Math.sin(a) * off), q, new THREE.Vector3(1, 1, 1));
        bosses.setMatrixAt(i++, m);
      }
    }
  }
  lotus.add(bosses);
  y += .18;

  /* ---- stepped mouldings + the dentilled lower ledge ---- */
  const lower = P('lower');
  for (const [w, h, mat] of [[2.85, .13, M.stone], [2.72, .11, M.stoneDark]]) {
    const b = box(w, h, w, mat); b.position.y = y + h / 2; lower.add(b); y += h;
  }
  const ledge = box(2.88, .16, 2.88, M.dentil); ledge.position.y = y + .08; lower.add(ledge); y += .16;

  /* ---- niche level: arched faces + corner pilasters ---- */
  const body = P('body');
  const bodyH = 1.22, bodyW = 2.4;
  for (let f = 0; f < 4; f++) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(bodyW * .92, bodyH), M.niche);
    const a = f * Math.PI / 2;
    face.position.set(Math.sin(a) * (bodyW / 2), y + bodyH / 2, Math.cos(a) * (bodyW / 2));
    face.rotation.y = a;
    body.add(face);
  }
  const core = box(bodyW - .04, bodyH, bodyW - .04, M.stoneDark);
  core.position.y = y + bodyH / 2; body.add(core);
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
  const bandH = .40;
  const bandBox = box(2.7, bandH, 2.7, M.stoneDark);
  bandBox.position.y = y + bandH / 2; band.add(bandBox);
  const discGeo = new THREE.CylinderGeometry(.195, .195, .05, 24);
  discGeo.rotateX(Math.PI / 2);
  for (let f = 0; f < 4; f++) {
    const a = f * Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const off = (i - 2) * .5;
      const disc = new THREE.Mesh(discGeo, M.rosette);
      const nx = Math.sin(a), nz = Math.cos(a);
      disc.position.set(nx * 1.37 + Math.cos(a) * off, y + bandH / 2, nz * 1.37 - Math.sin(a) * off);
      disc.rotation.y = a;
      band.add(disc);
    }
  }
  y += bandH;

  /* ---- the tall upper block: a framed panel between latticed strips.
          Same width as the rosette band below — one continuous shoulder. ---- */
  const attic = P('attic');
  const atH = .80, atW = 2.7;
  const at = box(atW, atH, atW, M.stone); at.position.y = y + atH / 2; attic.add(at);
  const panelGeo = new THREE.PlaneGeometry(1.5, atH * .74);
  const stripGeo = new THREE.PlaneGeometry(.36, atH * .82);
  for (let f = 0; f < 4; f++) {
    const a = f * Math.PI / 2, nx = Math.sin(a), nz = Math.cos(a);
    const panel = new THREE.Mesh(panelGeo, M.niche);
    panel.position.set(nx * (atW / 2 + .005), y + atH / 2, nz * (atW / 2 + .005));
    panel.rotation.y = a;
    attic.add(panel);
    for (const s of [-1, 1]) {
      const strip = new THREE.Mesh(stripGeo, M.lattice);
      strip.position.set(nx * (atW / 2 + .005) + Math.cos(a) * s * 1.0, y + atH / 2, nz * (atW / 2 + .005) - Math.sin(a) * s * 1.0);
      strip.rotation.y = a;
      attic.add(strip);
    }
  }
  y += atH;

  /* ---- cornice: a carved border, then courses flaring outward ---- */
  const cornice = P('cornice');
  const border = box(2.42, .14, 2.42, M.dentil); border.position.y = y + .07; cornice.add(border); y += .14;
  for (const [w, h, mat] of [[2.6, .13, M.stone], [2.82, .13, M.stoneDark], [3.06, .14, M.stone]]) {
    const c = box(w, h, w, mat); c.position.y = y + h / 2; cornice.add(c); y += h;
  }
  const seam2 = box(2.9, .05, 2.9, M.oxide); seam2.position.y = y + .025; cornice.add(seam2); y += .05;

  /* ---- crown of leaf merlons ---- */
  const crown = P('crown');
  const crownBase = box(3.0, .10, 3.0, M.stoneDark); crownBase.position.y = y + .05; crown.add(crownBase);
  const mGeo = merlonGeo(.3, .52, .1);
  const perSide = 7;
  for (let f = 0; f < 4; f++) {
    const a = f * Math.PI / 2;
    for (let i = 0; i < perSide; i++) {
      const off = (i - (perSide - 1) / 2) * .42;
      const mer = new THREE.Mesh(mGeo, M.stone);
      mer.position.set(Math.sin(a) * 1.42 + Math.cos(a) * off, y + .10, Math.cos(a) * 1.42 - Math.sin(a) * off);
      mer.rotation.y = a;
      crown.add(mer);
    }
  }
  y += .62;

  /* ---- crown cap: the real Brindavana is flat-topped — a recessed slab
          inside the ring of merlons and one small kalasha, no dome ---- */
  const shikhara = P('shikhara');
  const cap = box(2.2, .14, 2.2, M.stoneDark); cap.position.y = y - .28; shikhara.add(cap);
  const capTop = box(1.2, .09, 1.2, M.stone); capTop.position.y = y - .17; shikhara.add(capTop);
  const k = kalasha(M.stoneDark, .75); k.position.y = y - .13; shikhara.add(k);

  const totalH = y + .22;

  /* ---- tulasi-mani garland: ONE strand hung from the crown and falling
          into a deep U down the front — large cream tulasi-wood beads
          alternating with coils of brass wire, resting just proud of every
          ledge it crosses ---- */
  if (withMala) {
    const mala = P('mala');
    const beadMat = new THREE.MeshStandardMaterial({ color: 0xa8977a, roughness: .82, metalness: 0 });
    const coilMat = new THREE.MeshStandardMaterial({ color: 0x8f7226, roughness: .42, metalness: .65 });
    const BR = .041;                                   // bead radius — true to scale against the structure
    /* the hanging U in x/y. Its z runs from the ledge it hangs off down to
       the ledge its bottom rests on, never passing inside a course between
       them — the drape of real weight against stepped stone. */
    const x0 = 1.05, y0 = totalH - .34, yBot = 1.05;
    const zTop = surf(y0) + BR + .02;
    const zBot = surf(yBot) + BR + .06;
    const raw = [];
    const cy = 2 * yBot - y0;                          // quadratic control for the sag
    for (let i = 0; i <= 30; i++) {
      const u = i / 30;
      const x = (1 - 2 * u) * -x0;
      const yy = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cy + u * u * y0;
      const drop = (y0 - yy) / Math.max(y0 - yBot, .001);
      const z = Math.max(surf(yy) + BR + .02, zTop + (zBot - zTop) * drop);
      raw.push(new THREE.Vector3(x, yy, z));
    }
    const curve = new THREE.CatmullRomCurve3(raw);
    /* stations every half bead-pitch: beads on the even stations, a brass
       coil in each gap between them — the reference garland's rhythm */
    const nBead = Math.max(2, Math.round(curve.getLength() / (BR * 3.2)));
    const pts = curve.getSpacedPoints(nBead * 2);
    const beadGeo = new THREE.SphereGeometry(BR, 12, 10);
    beadGeo.scale(1, 1, 1.3);                          // oval, long axis along the strand
    const coilGeo = new THREE.TorusGeometry(BR * .42, BR * .17, 6, 12);
    const beads = new THREE.InstancedMesh(beadGeo, beadMat, nBead + 1);
    const coils = new THREE.InstancedMesh(coilGeo, coilMat, nBead * 2);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const Z = new THREE.Vector3(0, 0, 1), T = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    let bi = 0, ci = 0;
    for (let i = 0; i < pts.length; i++) {
      T.subVectors(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]).normalize();
      q.setFromUnitVectors(Z, T);
      if (i % 2 === 0) {
        m.compose(pts[i], q, one);
        beads.setMatrixAt(bi++, m);
      } else {
        // two wire rings per gap read as a wound coil at any distance
        for (const s of [-.55, .55]) {
          m.compose(new THREE.Vector3().copy(pts[i]).addScaledVector(T, s * BR * .5), q, one);
          coils.setMatrixAt(ci++, m);
        }
      }
    }
    beads.count = bi; coils.count = ci;
    beads.castShadow = coils.castShadow = true;
    mala.add(beads, coils);
    mala.userData.mats = [beadMat, coilMat];
  }

  /* explode: 0 = assembled, 1 = fully separated (slow, reverential drift) */
  const home = {};
  for (const k2 in parts) home[k2] = parts[k2].position.clone();
  const offsets = {
    plinth: new THREE.Vector3(0, -.9, 0),
    lotus: new THREE.Vector3(0, -.45, 0),
    lower: new THREE.Vector3(0, -.18, 0),
    body: new THREE.Vector3(0, 0, 0),
    band: new THREE.Vector3(0, .55, 0),
    attic: new THREE.Vector3(0, 1.15, 0),
    cornice: new THREE.Vector3(0, 1.8, 0),
    crown: new THREE.Vector3(0, 2.5, 0),
    shikhara: new THREE.Vector3(0, 3.3, 0),
    mala: new THREE.Vector3(0, 0, 0),
  };
  function explode(u) {
    for (const name in parts) {
      const off = offsets[name] || new THREE.Vector3();
      parts[name].position.copy(home[name]).addScaledVector(off, u);
    }
    // the crown ring breathes slightly outward as it lifts
    parts.crown.scale.setScalar(1 + u * .12);
  }

  /* each course as one mesh per material (the courses lift and come down as
     groups in Brindavana Pravesha, so the merge is per part, never across) */
  for (const g of Object.values(parts)) mergeStatic(g);
  return { group: root, parts, explode, height: totalH, materials: M };
}
