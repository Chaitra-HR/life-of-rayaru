// RAYARA ANTARANGA · scenes 01–04 — one continuous travel: Bhuvanagiri
// settlement (01), the gṛhastha household (02), the manuscript hall of
// Kumbhakonam (03), and the quiet mandapa of sannyāsa (04). The camera moves
// landscape → lane → the modest home → the hall → the chamber, so each scene
// grows out of the one before it with no cut.
import * as THREE from 'three';
import { stoneCanvas, palmLeafCanvas, canvas, tex, textMesh, flame, glowSprite, glowTexture, mulberry, lerp, clamp01, remap, smooth, win, camTrack, V3 } from '../util.js';

export const INTERIOR_Y = 400;

export function createInteriorStage(ctx) {
  const g = new THREE.Group();
  g.position.y = INTERIOR_Y;
  g.visible = false;

  const rnd = mulberry(101);

  /* ---------- the settlement outside (z 8 → 34) ---------- */
  const village = new THREE.Group();
  g.add(village);
  const earthMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [88, 68, 44], 14, 91), { repeat: [6, 5] }), roughness: 1 });
  const earth = new THREE.Mesh(new THREE.PlaneGeometry(80, 56), earthMat);
  earth.rotation.x = -Math.PI / 2;
  earth.position.set(0, -.01, 20);
  village.add(earth);

  const plasterMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [132, 116, 88], 10, 93)), roughness: 1 });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0x5e3524, roughness: 1 });
  const mkHouse = (w, hh, d) => {
    const house = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), plasterMat);
    body.position.y = hh / 2;
    house.add(body);
    // hip roof: a low squashed pyramid, overhanging the walls
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * .82, 1.05, 4), tileMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = (d + .8) / w;
    roof.position.y = hh + .5;
    house.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(.55, 1.15, .06), new THREE.MeshStandardMaterial({ color: 0x241708, roughness: 1 }));
    door.position.set(0, .58, d / 2 + .02);
    house.add(door);
    return house;
  };
  // houses along a lane that leads to the hall of learning
  for (const [hx, hz, w, hh, d, ry] of [
    [-5.2, 12, 3.4, 2.3, 3.2, .12], [5.4, 13.5, 3.8, 2.5, 3.6, -.1],
    [-6.4, 19, 4.2, 2.2, 3.8, .3], [6.6, 21, 3.4, 2.4, 3.2, -.28],
    [-4.8, 26, 3.6, 2.3, 3.4, .05], [5.8, 28.5, 4.4, 2.6, 4, -.15],
  ]) {
    const h = mkHouse(w, hh, d);
    h.position.set(hx, 0, hz);
    h.rotation.y = ry + Math.PI * (hx > 0 ? 1 : 0) * 0; // doors face the lane
    if (hx > 0) h.rotation.y = ry + Math.PI;
    village.add(h);
  }
  // tulasi katte in the courtyard before the hall
  const katte = new THREE.Group();
  const kBase = new THREE.Mesh(new THREE.BoxGeometry(.6, .7, .6), new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [96, 84, 66], 10, 95)), roughness: 1 }));
  kBase.position.y = .35;
  katte.add(kBase);
  const tulasi = new THREE.Mesh(new THREE.ConeGeometry(.18, .42, 6), new THREE.MeshStandardMaterial({ color: 0x3c5226, roughness: 1 }));
  tulasi.position.y = .9;
  katte.add(tulasi);
  katte.position.set(-1.9, 0, 10.5);
  village.add(katte);
  // courtyard tree
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18, .28, 2.6, 7), new THREE.MeshStandardMaterial({ color: 0x38281a, roughness: 1 }));
  trunk.position.y = 1.3;
  tree.add(trunk);
  const folMat = new THREE.MeshStandardMaterial({ color: 0x32431f, roughness: 1 });
  for (const [fx, fy, fz, fr] of [[0, 3.1, 0, 1.5], [-1.1, 2.7, .3, 1.05], [1, 2.8, -.3, 1.15], [.2, 3.6, .5, .95]]) {
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(fr, 1), folMat);
    f.position.set(fx, fy, fz);
    f.scale.y = .75;
    tree.add(f);
  }
  tree.position.set(3.4, 0, 10);
  village.add(tree);
  // veranda: sloped tiled awning + posts, bridging courtyard → hall
  const awn = new THREE.Mesh(new THREE.BoxGeometry(6.4, .12, 3.4), tileMat);
  awn.position.set(0, 3.35, 7.4);
  awn.rotation.x = .2;
  village.add(awn);
  // bushes at the edges
  const bushMat2 = new THREE.MeshStandardMaterial({ color: 0x33401f, roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(.7, 1), bushMat2);
    b.position.set((rnd() - .5) * 26, .2, 9 + rnd() * 22);
    if (Math.abs(b.position.x) < 2.4) b.position.x += 4 * Math.sign(b.position.x || 1);
    b.scale.set(1 + rnd(), .55 + rnd() * .5, 1 + rnd());
    village.add(b);
  }
  // the village temple gopuram, rising beyond the hall to the left
  const gopMat2 = new THREE.MeshStandardMaterial({ color: 0x6a5334, roughness: 1 });
  const gop2 = new THREE.Group();
  let gy3 = 0;
  for (const [w2, h2] of [[3.4, 1.4], [2.8, 1.2], [2.2, 1.05], [1.6, .9], [1, .75]]) {
    const t2 = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, w2 * .8), gopMat2);
    t2.position.y = gy3 + h2 / 2; gy3 += h2;
    gop2.add(t2);
  }
  gop2.position.set(-13.5, 0, 1.5);
  village.add(gop2);

  // facade framing the hall entrance, so the mandapa reads as a building
  const band = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.3, .32), plasterMat);
  band.position.set(0, 4.15, 6.15);
  village.add(band);
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4, .32), plasterMat);
    wing.position.set(sx * 3.9, 2, 6.15);
    village.add(wing);
  }
  // exterior shell of the hall — plaster walls + one long tiled roof,
  // so from the settlement it reads as a building, not a void
  for (const sx of [-1, 1]) {
    const shell = new THREE.Mesh(new THREE.BoxGeometry(.3, 4.3, 34), plasterMat);
    shell.position.set(sx * 4.85, 2.15, -10);
    village.add(shell);
  }
  const hallRoof = new THREE.Mesh(new THREE.BoxGeometry(10.6, .22, 35), tileMat);
  hallRoof.position.set(0, 4.42, -10.2);
  village.add(hallRoof);
  const hallRidge = new THREE.Mesh(new THREE.BoxGeometry(5.4, .5, 35.4), tileMat);
  hallRidge.position.set(0, 4.62, -10.2);
  village.add(hallRidge);

  /* akṣarābhyāsa — the ॐ itself, standing in the courtyard air. Not
     decorative typography: the first akṣara, met as a question. */
  const om = new THREE.Group();
  const omMark = textMesh('ॐ', { font: 'serif', px: 220, worldH: 1.15, color: '#ecdfc2', blend: 'add' });
  om.add(omMark);
  const omGlow = glowSprite(0xc89a55, 2.8, 0);
  omGlow.position.z = -.15;
  om.add(omGlow);
  om.position.set(-1.25, 2.0, 6.4);
  om.rotation.y = .18;
  om.visible = false;
  village.add(om);

  // settlement light: warm morning sun + open sky — fades at the threshold
  const villSun = new THREE.DirectionalLight(0xe0ab62, 2.8);
  villSun.position.set(18, 26, 30);
  village.add(villSun);
  const villHemi = new THREE.HemisphereLight(0xa8916c, 0x453522, 1.55);
  village.add(villHemi);

  /* stone floor */
  const floorMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [36, 34, 30], 12, 31), { repeat: [3, 10] }), roughness: .95 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 59), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -22.5;
  g.add(floor);

  /* timber pillars + beams */
  const woodMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [40, 28, 18], 14, 61), { repeat: [1, 3] }), roughness: .85 });
  const pillarGeo = new THREE.BoxGeometry(.34, 3.6, .34);
  const capGeo = new THREE.BoxGeometry(.72, .16, .72);
  const baseGeo = new THREE.BoxGeometry(.5, .3, .5);
  for (let i = 0; i < 7; i++) {
    for (const sx of [-1, 1]) {
      const z = 6 - i * 5.4;
      const p = new THREE.Mesh(pillarGeo, woodMat);
      p.position.set(sx * 2.3, 1.8, z);
      const cap = new THREE.Mesh(capGeo, woodMat); cap.position.set(sx * 2.3, 3.62, z);
      const base = new THREE.Mesh(baseGeo, woodMat); base.position.set(sx * 2.3, .15, z);
      g.add(p, cap, base);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.6, .22, .3), woodMat);
    beam.position.set(0, 3.78, 6 - i * 5.4);
    g.add(beam);
  }
  // dark ceiling hint
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 59), new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4.05, -22.5);
  g.add(ceil);
  // the hall terminates — without this the fog colour reads as a grey
  // rectangle hanging at the end of the corridor
  const endWall = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 4.4), new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [26, 22, 18], 10, 73), { repeat: [4, 2] }), roughness: 1 }));
  endWall.position.set(0, 2.1, -47.2);
  g.add(endWall);
  // side walls (dim)
  const wallMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [30, 26, 21], 10, 71), { repeat: [10, 2] }), roughness: 1 });
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(59, 4.2), wallMat);
    w.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    w.position.set(sx * 4.6, 2.05, -22.5);
    g.add(w);
  }

  /* low writing desk + ink + lamp */
  const desk = new THREE.Group();
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, .07, .8), woodMat);
  deskTop.position.y = .42; desk.add(deskTop);
  for (const [dx, dz] of [[-.6, -.3], [.6, -.3], [-.6, .3], [.6, .3]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.08, .42, .08), woodMat);
    leg.position.set(dx, .21, dz); desk.add(leg);
  }
  const ink = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, .09, 10), new THREE.MeshStandardMaterial({ color: 0x1a120a, roughness: .6 }));
  ink.position.set(.45, .5, -.15); desk.add(ink);
  desk.position.set(-.95, 0, -3.4);
  desk.rotation.y = .3;
  g.add(desk);

  /* veena resting against a pillar */
  const veena = new THREE.Group();
  const vwood = new THREE.MeshStandardMaterial({ color: 0x3a2413, roughness: .7 });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.045, .055, 1.7, 8), vwood);
  neck.rotation.z = Math.PI / 2; veena.add(neck);
  const gourd = new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 10), vwood);
  gourd.position.x = -.85; gourd.scale.y = .8; veena.add(gourd);
  const gourd2 = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 8), vwood);
  gourd2.position.x = .8; veena.add(gourd2);
  veena.position.set(1.75, .6, -6.2);
  veena.rotation.set(0, -.35, 1.12);
  g.add(veena);

  /* palm-leaf manuscripts — grow from a few to a world of learning */
  const leafMats = [0, 1, 2].map(i => new THREE.MeshStandardMaterial({ map: tex(palmLeafCanvas(3 + i)), roughness: .8 }));
  const bundleGeo = new THREE.BoxGeometry(.72, .085, .16);
  const MS_N = ctx.isMobile ? 120 : 210;
  const bundles = [];
  const inst = [0, 1, 2].map(i => new THREE.InstancedMesh(bundleGeo, leafMats[i], Math.ceil(MS_N / 3)));
  inst.forEach(m => { m.count = 0; m.frustumCulled = false; g.add(m); });
  // placement: early ones on/near the desk, then shelves & stacks lining the corridor
  const placements = [];
  placements.push([-1, .49, -3.35, .3], [-.8, .58, -3.45, .34], [-1.15, .58, -3.3, .28]);
  for (let i = placements.length; i < MS_N; i++) {
    const along = rnd();
    const z = 4 - along * 40;
    const side = rnd() > .5 ? 1 : -1;
    const x = side * (2.9 + rnd() * 1.3);
    const stack = Math.floor(rnd() * 7);
    const y = .1 + stack * .1 + Math.floor(rnd() * 3) * 1.1;
    placements.push([x, y, z, rnd() * .5 - .25 + (side > 0 ? Math.PI : 0)]);
  }
  // shuffle mid-to-late reveals so growth feels organic
  const order = placements.map((p, i) => i);
  for (let i = order.length - 1; i > 3; i--) { const j = 3 + Math.floor(rnd() * (i - 3)); [order[i], order[j]] = [order[j], order[i]]; }
  const _m = new THREE.Matrix4(), _e = new THREE.Euler();
  function setBundleCount(n) {
    const per = [0, 0, 0];
    for (let k = 0; k < Math.min(n, MS_N); k++) {
      const p = placements[order[k]];
      const mi = k % 3;
      _e.set(0, p[3], 0);
      _m.makeRotationFromEuler(_e);
      _m.setPosition(p[0], p[1], p[2]);
      inst[mi].setMatrixAt(per[mi]++, _m);
    }
    for (let i = 0; i < 3; i++) { inst[i].count = per[i]; inst[i].instanceMatrix.needsUpdate = true; }
  }
  setBundleCount(3);

  /* shelf planks for the stacks */
  for (let i = 0; i < 10; i++) {
    for (const sx of [-1, 1]) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(1.7, .06, 3.4), woodMat);
      sh.position.set(sx * 3.5, 1.05 + (i % 3) * 1.1, 2 - Math.floor(i / 3) * 9 - (sx > 0 ? 2 : 0));
      g.add(sh);
    }
  }

  /* lamps */
  const lampA = flame(1);
  lampA.position.set(-.6, .62, -3.3);
  g.add(lampA);
  const lightA = new THREE.PointLight(0xff9a45, 12, 12, 2);
  lightA.position.set(-.6, 1, -3.3);
  g.add(lightA);
  const lampB = flame(.9);
  lampB.position.set(1.9, 1.24, -14);
  g.add(lampB);
  const lightB = new THREE.PointLight(0xff8a3a, 9, 10, 2);
  lightB.position.set(1.9, 1.5, -14);
  g.add(lightB);

  /* Kumbhakonam: the hall of learning carries its own disciplined light —
     a rhythm of lamps down the corridor, raised only for scene 03 */
  const hallLamps = [];
  for (const [hx, hz] of [[-1.9, -20], [1.9, -27], [-1.9, -34]]) {
    const fl = flame(.85);
    fl.position.set(hx, 1.22, hz);
    g.add(fl);
    const li = new THREE.PointLight(0xf0a050, 0, 11, 2);
    li.position.set(hx, 1.6, hz);
    g.add(li);
    hallLamps.push({ fl, li });
  }
  // a cool architectural counterweight so the hall is not one warm wash
  const hallCool = new THREE.DirectionalLight(0x3a4a5c, 0);
  hallCool.position.set(-5, 8, -30);
  g.add(hallCool);

  /* daylight shaft — soft gradient, kept off the camera path */
  const [shaftCv, shaftG] = canvas(128, 256);
  {
    const grd = shaftG.createLinearGradient(0, 0, 128, 0);
    grd.addColorStop(0, 'rgba(150,125,88,0)');
    grd.addColorStop(.5, 'rgba(150,125,88,.5)');
    grd.addColorStop(1, 'rgba(150,125,88,0)');
    shaftG.fillStyle = grd; shaftG.fillRect(0, 0, 128, 256);
    const grd2 = shaftG.createLinearGradient(0, 0, 0, 256);
    grd2.addColorStop(0, 'rgba(0,0,0,0)');
    grd2.addColorStop(.35, 'rgba(0,0,0,.35)');
    grd2.addColorStop(1, 'rgba(0,0,0,.85)');
    shaftG.globalCompositeOperation = 'destination-out';
    shaftG.fillStyle = grd2; shaftG.fillRect(0, 0, 128, 256);
  }
  const shaftMat = new THREE.MeshBasicMaterial({
    map: tex(shaftCv), transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 6.5), shaftMat);
  shaft.position.set(3.1, 2.2, -7.2);
  shaft.rotation.set(0, .9, -.6);
  g.add(shaft);
  const dayLight = new THREE.DirectionalLight(0x9a835f, .35);
  dayLight.position.set(6, 8, -4);
  g.add(dayLight);
  const hemi = new THREE.HemisphereLight(0x2a241c, 0x0a0806, .45);
  g.add(hemi);

  /* dust motes */
  const dustN = ctx.isMobile ? 60 : 140;
  const dpos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dpos[i * 3] = (rnd() - .5) * 6;
    dpos[i * 3 + 1] = .3 + rnd() * 3;
    dpos[i * 3 + 2] = 6 - rnd() * 42;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xc0a878, size: .03, transparent: true, opacity: .4, map: glowTexture('rgba(220,190,140,1)', 'rgba(220,190,140,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  g.add(dust);

  /* ---------- scene 02 additions ---------- */
  /* saffron cloth that crosses the camera — the transition into sannyasa */
  const clothGeo = new THREE.PlaneGeometry(7, 4.4, 36, 20);
  /* woven saffron with a deeper border — so the wipe has texture, not flat colour */
  const [clothCv, clothG] = canvas(512, 512);
  {
    clothG.fillStyle = '#a1601e'; clothG.fillRect(0, 0, 512, 512);
    const crnd = mulberry(88);
    clothG.globalAlpha = .16;
    for (let i = 0; i < 512; i += 3) {
      clothG.fillStyle = crnd() > .5 ? '#7a4413' : '#c07a2c';
      clothG.fillRect(0, i, 512, 1.6);
    }
    for (let i = 0; i < 512; i += 4) {
      clothG.fillStyle = crnd() > .5 ? '#8a5018' : '#b5702a';
      clothG.fillRect(i, 0, 1.6, 512);
    }
    clothG.globalAlpha = .5;
    clothG.fillStyle = '#5e2f0c';
    clothG.fillRect(0, 0, 512, 34); clothG.fillRect(0, 478, 512, 34);
    clothG.globalAlpha = .35; clothG.fillStyle = '#3a1d06';
    clothG.fillRect(0, 40, 512, 6); clothG.fillRect(0, 466, 512, 6);
    clothG.globalAlpha = 1;
  }
  const clothMat = new THREE.MeshStandardMaterial({
    map: tex(clothCv, { repeat: [2, 1] }), roughness: .92, side: THREE.DoubleSide,
    emissive: 0x3a1c06, emissiveIntensity: .5,
  });
  const cloth = new THREE.Mesh(clothGeo, clothMat);
  cloth.visible = false;
  g.add(cloth);
  const clothBase = clothGeo.attributes.position.array.slice();
  // warm light that travels with the cloth so the passage never goes dead black
  const clothLight = new THREE.PointLight(0xd98a3a, 0, 12, 2);
  g.add(clothLight);

  /* the changed chamber beyond the cloth */
  const chamber = new THREE.Group();
  chamber.visible = false;
  // seated presence: silhouette only — cloth, posture, no face
  const silk = new THREE.MeshStandardMaterial({ color: 0x5a3413, roughness: .95 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, .22, 1.1), woodMat);
  seat.position.set(0, .11, -40); chamber.add(seat);
  const robePts = [];
  for (let s = 0; s <= 8; s++) {
    const t = s / 8;
    robePts.push(new THREE.Vector2(.52 * (1 - t * t * .78) + .02 * Math.sin(t * 9), t * .92));
  }
  const robe = new THREE.Mesh(new THREE.LatheGeometry(robePts, 16), silk);
  robe.position.set(0, .22, -40); chamber.add(robe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 10), silk);
  head.position.set(0, 1.18, -40); chamber.add(head);
  // danda (staff) leaning beside
  const danda = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1.9, 6), woodMat);
  danda.position.set(.75, .95, -40.1); danda.rotation.z = .1; chamber.add(danda);
  // rim light from behind — presence, not portrait
  const rim = new THREE.PointLight(0xffb060, 0, 8, 2);
  rim.position.set(0, 1.6, -41.6);
  chamber.add(rim);
  const rimGlow = glowSprite(0xd98a3a, 2.6, .12);
  rimGlow.position.set(0, 1.3, -41.2);
  chamber.add(rimGlow);
  // pedestal with a single manuscript — the bridge into Parimala
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(.7, .9, .55), new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [38, 40, 38], 12, 41)), roughness: .95 }));
  pedestal.position.set(0, .45, -44.4);
  chamber.add(pedestal);
  const loneMs = new THREE.Mesh(bundleGeo, leafMats[0]);
  loneMs.scale.setScalar(1.35);
  loneMs.position.set(0, .96, -44.4);
  chamber.add(loneMs);
  const msLamp = flame(.8);
  msLamp.position.set(.5, 1.05, -44.15);
  chamber.add(msLamp);
  const msLight = new THREE.PointLight(0xff9a45, 6, 6, 2);
  msLight.position.set(.5, 1.3, -44);
  chamber.add(msLight);
  g.add(chamber);

  /* camera paths (local coords; main adds group offset)
     scene 01: settlement → lane → veranda → the desk → the manuscript hall */
  const cam01 = camTrack([
    { u: 0, pos: V3(7.5, 6.4, 27.5), look: V3(-1.5, 1.4, 4), fov: 50 },
    { u: .28, pos: V3(2.2, 2.7, 18), look: V3(-.8, 1.5, 6), fov: 47 },
    { u: .5, pos: V3(.6, 1.78, 9.6), look: V3(-.5, 1.3, 2), fov: 45 },
    { u: .74, pos: V3(-.35, 1.38, 2.7), look: V3(-.95, .66, -3.3), fov: 44 },
    { u: 1, pos: V3(-.3, 1.8, -10), look: V3(.3, 1.6, -20), fov: 48 },
  ]);
  const cam02 = camTrack([
    { u: 0, pos: V3(-.3, 1.8, -10), look: V3(.3, 1.6, -20), fov: 48 },
    { u: .45, pos: V3(0, 1.6, -22), look: V3(0, 1.5, -30), fov: 46 },
    { u: .62, pos: V3(0, 1.5, -29.5), look: V3(0, 1.2, -40), fov: 44 },
    { u: .85, pos: V3(0, 1.35, -35.5), look: V3(0, .95, -40), fov: 42 },
    { u: 1, pos: V3(0, 1.15, -42.9), look: V3(0, .96, -44.45), fov: 40 },
  ]);

  return {
    group: g,
    setVisible(v) { g.visible = v; },
    /* four scenes ride the two authored tracks:
       01 Bhuvanagiri = approach, 02 Gṛhastha = the home,
       03 Kumbhakonam = the hall, 04 Raghavendra = the chamber */
    cam(chapter, u) {
      switch (chapter) {
        case 1: return cam01(u * .52);
        case 2: return cam01(.52 + u * .48);
        case 3: return cam02(u * .5);
        default: return cam02(.5 + u * .5);
      }
    },
    update(time, globalT, u01, u02) {
      // the settlement holds until we are inside, then yields to lamplight
      const indoors = smooth(remap(u01, .55, .82));
      village.visible = indoors < .98;
      villSun.intensity = 2.8 * (1 - indoors);
      villHemi.intensity = 1.55 * (1 - indoors * .9);

      /* the ॐ meets the visitor in the courtyard — scene 01's question */
      const omW = win(u01, .27, .34, .44, .52);
      om.visible = omW > .01;
      if (om.visible) {
        omMark.material.opacity = omW * .95;
        omGlow.material.opacity = omW * .12;
        om.position.y = 2.0 + Math.sin(time * .5) * .04;
      }

      /* the household stays sparse (scene 02); the manuscripts multiply only
         at Kumbhakonam, as the hall of learning opens (scene 03) */
      const grow = clamp01(remap(u02, .04, .45));
      setBundleCount(Math.floor(3 + smooth(grow) * (MS_N - 3)));

      lampA.userData.flicker(time);
      lampB.userData.flicker(time + 2);
      msLamp.userData.flicker(time + 1);
      lightA.intensity = 12 * (0.9 + Math.sin(time * 9) * .06);

      /* the hall's lamps rise for Kumbhakonam and retire toward sannyāsa */
      const hallOn = win(u02, 0, .1, .5, .68);
      for (let i = 0; i < hallLamps.length; i++) {
        const hl = hallLamps[i];
        hl.fl.userData.flicker(time + i * 3.1);
        hl.fl.scale.setScalar(Math.max(.001, .85 * hallOn));
        hl.li.intensity = 8.5 * hallOn * (0.9 + Math.sin(time * 7 + i * 2) * .08);
      }
      hallCool.intensity = .55 * hallOn;

      // daylight slowly swings (passing time)
      const dayU = clamp01(u01);
      shaft.rotation.z = -.6 - dayU * .3;
      shaft.material.opacity = .5 * win(dayU, 0, .18, .78, 1);
      dayLight.intensity = .38 * (1 - u02 * .9);

      // dust drift
      if (!ctx.reduced) {
        const p = dust.geometry.attributes.position;
        for (let i = 0; i < dustN; i++) {
          p.setY(i, .3 + ((p.getY(i) - .3 + .0006 + i * 0) % 3));
          p.setX(i, p.getX(i) + Math.sin(time * .3 + i) * .0006);
        }
        p.needsUpdate = true;
      }

      /* scene 04: cloth crossing — a wipe, not a curtain */
      const clothW = win(u02, .52, .6, .78, .86);
      cloth.visible = clothW > 0.001;
      clothLight.intensity = clothW * 9;
      if (cloth.visible) {
        const sweep = remap(u02, .56, .78);
        cloth.position.set(lerp(9, -10.5, sweep), 1.6, -30.6);
        clothLight.position.set(cloth.position.x * .4, 1.9, -29.2);
        cloth.rotation.set(.08, .22, lerp(.12, -.1, sweep));
        const pos = cloth.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const bx = clothBase[i * 3], by = clothBase[i * 3 + 1];
          pos.setZ(i, Math.sin(bx * 1.6 + time * 2.4) * .22 + Math.sin(by * 2.2 + time * 1.7) * .16);
        }
        pos.needsUpdate = true;
        cloth.geometry.computeVertexNormals();
      }

      /* chamber reveal after the cloth clears */
      const reveal = smooth(remap(u02, .64, .82));
      chamber.visible = reveal > .01;
      rim.intensity = reveal * 8;
      rimGlow.material.opacity = .13 * reveal;
      msLight.intensity = 7 * smooth(remap(u02, .8, .94));

      // interior lights dim as we pass into the chamber
      lightA.intensity *= (1 - smooth(remap(u02, .62, .86)) * .85);
      lightB.intensity = 9 * (1 - smooth(remap(u02, .62, .86)) * .8);
      hemi.intensity = .45 * (1 - smooth(remap(u02, .62, .88)) * .55);
    },
  };
}
