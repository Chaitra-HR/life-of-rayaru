// RAYARA ANTARANGA · scene 04 — sannyāsa. The Matha at Kumbakonam: a
// lime-plastered corridor of study opening onto a shaded courtyard, low
// writing desks with their manuscripts and deepas, filtered daylight; then
// the saffron wash at the sannyāsa itself, and the changed chamber beyond.
// (Scenes 01–03 — the Pūrvāśrama house — live in purvashrama.js; this stage
// begins where that chapter stops, behind the veil at t .295.)
//
// Quiet, concentrated, scholarly. Nothing here is a monument: it is the
// working interior of a house of learning, and the props are the ones
// study needs — desks, leaves, lamps, mats — and no more.
import * as THREE from 'three';
import { stoneCanvas, palmLeafCanvas, canvas, tex, clayLamp, bracketLamp, glowSprite, glowTexture, mulberry, lerp, remap, smooth, win, camTrack, V3 } from '../util.js';
import { loadRayaru } from './opening.js';

export const INTERIOR_Y = 400;

/* a woven reed mat, the same idiom the house used */
function matCanvas(seed) {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry(seed);
  g.fillStyle = '#4a3b26'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 6) {
    g.fillStyle = rnd() > .5 ? 'rgba(30,20,10,.32)' : 'rgba(96,74,44,.25)';
    g.fillRect(0, y, 256, 3);
  }
  for (let x = 0; x < 256; x += 22) { g.fillStyle = 'rgba(26,17,8,.25)'; g.fillRect(x, 0, 2, 256); }
  g.strokeStyle = 'rgba(70,32,16,.35)'; g.lineWidth = 8; g.strokeRect(4, 4, 248, 248);
  return c;
}

export function createInteriorStage(ctx) {
  const g = new THREE.Group();
  g.position.y = INTERIOR_Y;
  g.visible = false;

  const rnd = mulberry(101);

  /* ---- materials: lime plaster, red-oxide floor, old timber ---- */
  const plaster = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [148, 136, 114], 9, 71), { repeat: [10, 2] }), roughness: 1 });
  const plasterEnd = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [138, 126, 106], 9, 73), { repeat: [4, 2] }), roughness: 1 });
  const floorMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [92, 70, 54], 12, 31), { repeat: [3, 8] }), roughness: .95 });
  const woodMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [58, 42, 26], 14, 61), { repeat: [1, 3] }), roughness: .85 });
  const woodDark = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [40, 28, 18], 14, 62), { repeat: [1, 3] }), roughness: .9 });

  /* floor */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 40), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -28;
  floor.receiveShadow = true;
  g.add(floor);

  /* timber pillars + beams down the corridor, on stone bases */
  const pillarGeo = new THREE.BoxGeometry(.32, 3.6, .32);
  const capGeo = new THREE.BoxGeometry(.7, .16, .7);
  const baseGeo = new THREE.BoxGeometry(.5, .3, .5);
  const baseMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [104, 98, 88], 12, 33)), roughness: 1 });
  for (let i = 0; i < 7; i++) {
    for (const sx of [-1, 1]) {
      const z = -10 - i * 5.4;
      const p = new THREE.Mesh(pillarGeo, woodMat);
      p.position.set(sx * 2.3, 1.8, z);
      p.castShadow = true; p.receiveShadow = true;
      const cap = new THREE.Mesh(capGeo, woodDark); cap.position.set(sx * 2.3, 3.62, z);
      const base = new THREE.Mesh(baseGeo, baseMat); base.position.set(sx * 2.3, .15, z);
      g.add(p, cap, base);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.6, .22, .3), woodDark);
    beam.position.set(0, 3.78, -10 - i * 5.4);
    g.add(beam);
  }
  /* rafters and a dark ceiling: timber, not a void */
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 40), new THREE.MeshStandardMaterial({ color: 0x2b2117, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4.05, -28);
  g.add(ceil);
  const rafterGeo = new THREE.BoxGeometry(.12, .16, 10);
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Mesh(rafterGeo, woodDark);
    r.position.set(-3.5 + i * 1.4, 3.96, -28);
    g.add(r);
  }
  // the hall terminates on a plastered wall with a low doorway into the chamber
  const endWall = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 4.4), plasterEnd);
  endWall.position.set(0, 2.1, -47.2);
  g.add(endWall);
  // the left wall: continuous plaster with two small barred windows
  const wallL = new THREE.Mesh(new THREE.PlaneGeometry(40, 4.2), plaster);
  wallL.rotation.y = Math.PI / 2;
  wallL.position.set(-4.6, 2.05, -28);
  wallL.receiveShadow = true;
  g.add(wallL);
  /* the right side opens onto the courtyard: plaster panels between the
     pillars, with two wide openings the daylight comes through */
  const OPEN = [-20.5, -33.5];
  {
    let z0 = -8;
    const panels = [];
    for (const oz of OPEN) { panels.push([z0, oz - 1.6]); z0 = oz + 1.6; }
    panels.push([z0, -48]);
    for (const [a, b] of panels) {
      const len = Math.abs(b - a);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(len, 4.2), plaster);
      w.rotation.y = -Math.PI / 2;
      w.position.set(4.6, 2.05, (a + b) / 2);
      w.receiveShadow = true;
      g.add(w);
    }
    // lintels over the openings, and a low sill
    for (const oz of OPEN) {
      const lin = new THREE.Mesh(new THREE.BoxGeometry(.3, .3, 3.4), woodDark);
      lin.position.set(4.55, 3.1, oz); g.add(lin);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(.4, .6, 3.4), baseMat);
      sill.position.set(4.55, .3, oz); g.add(sill);
    }
  }
  /* the courtyard beyond the openings: sunlit plaster, packed earth, a
     tulasi kaṭṭe, the sky. Seen only through the openings — enough to
     say "a Matha with a court", never a second scene. */
  {
    const court = new THREE.Group();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 44), new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [122, 108, 88], 12, 75), { repeat: [3, 8] }), roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(11.5, -.01, -28);
    court.add(ground);
    const farWall = new THREE.Mesh(new THREE.PlaneGeometry(44, 3.2), new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [178, 160, 130], 8, 77), { repeat: [10, 1] }), roughness: 1 }));
    farWall.rotation.y = -Math.PI / 2; farWall.position.set(18.5, 1.6, -28);
    court.add(farWall);
    const roofLine = new THREE.Mesh(new THREE.BoxGeometry(.6, .5, 44), new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 1 }));
    roofLine.position.set(18.3, 3.35, -28);
    court.add(roofLine);
    const kMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [150, 132, 106], 10, 79)), roughness: 1 });
    const katte = new THREE.Group();
    const kb = new THREE.Mesh(new THREE.BoxGeometry(.7, .6, .7), kMat); kb.position.y = .3; katte.add(kb);
    const kc = new THREE.Mesh(new THREE.CylinderGeometry(.22, .25, .18, 10), kMat); kc.position.y = .69; katte.add(kc);
    const leaf = new THREE.MeshStandardMaterial({ color: 0x556238, roughness: 1 });
    for (let i = 0; i < 4; i++) {
      const cl = new THREE.Mesh(new THREE.IcosahedronGeometry(.16, 1), leaf);
      cl.position.set((rnd() - .5) * .24, .9 + rnd() * .12, (rnd() - .5) * .24);
      cl.scale.set(1, .8, 1);
      katte.add(cl);
    }
    katte.position.set(10.5, 0, -27);
    court.add(katte);
    // the sky, as a pale plane far behind the court wall
    const skyP = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshBasicMaterial({ color: 0xcfd6d8, fog: false }));
    skyP.rotation.y = -Math.PI / 2; skyP.position.set(30, 12, -28);
    court.add(skyP);
    g.add(court);
  }

  /* ---- the study: low writing desks along the corridor ---- */
  const leafMats = [0, 1, 2].map(i => new THREE.MeshStandardMaterial({ map: tex(palmLeafCanvas(3 + i)), roughness: .8 }));
  const bundleGeo = new THREE.BoxGeometry(.72, .085, .16);
  const deskLamps = [];
  const matTex = tex(matCanvas(5));
  const mkDesk = (x, z, ry, withLamp) => {
    const d = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(.92, .05, .5), woodMat);
    top.position.y = .30; top.castShadow = true; top.receiveShadow = true; d.add(top);
    for (const [dx, dz] of [[-.4, -.2], [.4, -.2], [-.4, .2], [.4, .2]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(.06, .28, .06), woodDark);
      leg.position.set(dx, .14, dz); d.add(leg);
    }
    // the leaves being read: one open bundle, two closed beside it
    const open = new THREE.Mesh(new THREE.BoxGeometry(.6, .03, .15), leafMats[0]);
    open.position.set(-.05, .34, .02); open.rotation.y = .06; d.add(open);
    const b1 = new THREE.Mesh(bundleGeo, leafMats[1]); b1.position.set(.28, .37, -.12); b1.rotation.y = -.2; b1.scale.setScalar(.6); d.add(b1);
    const b2 = new THREE.Mesh(bundleGeo, leafMats[2]); b2.position.set(-.3, .37, -.14); b2.rotation.y = .25; b2.scale.setScalar(.55); d.add(b2);
    // the reader's mat behind the desk
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(.8, .95), new THREE.MeshStandardMaterial({ map: matTex, roughness: 1 }));
    mat.rotation.x = -Math.PI / 2; mat.position.set(0, .012, .72); mat.receiveShadow = true; d.add(mat);
    if (withLamp) {
      // the reader's clay lamp at the desk's corner
      const dl = clayLamp({ scale: 1.15, intensity: 3.4, distance: 5.5, flameScale: .3, light: !ctx.isMobile });
      dl.position.set(.36, .325, .14); dl.rotation.y = -.4;
      d.add(dl); deskLamps.push(dl);
    }
    d.position.set(x, 0, z); d.rotation.y = ry;
    g.add(d);
    return d;
  };
  mkDesk(-1.55, -17.5, Math.PI / 2 + .15, true);
  mkDesk(1.55, -23.0, -Math.PI / 2 - .1, false);
  mkDesk(-1.5, -28.5, Math.PI / 2 - .1, true);
  mkDesk(1.5, -35.0, -Math.PI / 2 + .12, true);
  mkDesk(-1.45, -40.5, Math.PI / 2, true);
  /* two wall lamps on the end wall, either side of the chamber door */
  for (const sx of [-1.9, 1.9]) {
    const dl = bracketLamp({ scale: 1.1, intensity: 4.5, distance: 8, light: !ctx.isMobile });
    dl.position.set(sx, 1.5, -47.15);
    g.add(dl); deskLamps.push(dl);
  }
  /* on a phone the six lamps keep their flames and soot but not their
     lights: six forward point lights on every fragment was the study's
     cost. Two shared lights along the corridor carry the same pools. */
  const sharedLamps = [];
  if (ctx.isMobile) {
    for (const z of [-22, -38]) {
      const pl = new THREE.PointLight(0xffb070, 0, 16, 2);
      pl.position.set(0, 1.6, z);
      g.add(pl); sharedLamps.push(pl);
    }
  }
  /* the doorway the visitor has just come through: the study's Matha door
     from the far side. A plastered entrance wall closes the corridor's near
     end so the chapter is entered, not started. */
  {
    const entry = new THREE.Group();
    const ENTRY_Z = -13.4;
    for (const [a, b] of [[-4.6, -.85], [.85, 4.6]]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(b - a, 4.2), plasterEnd);
      w.position.set((a + b) / 2, 2.1, ENTRY_Z); w.receiveShadow = true;
      entry.add(w);
    }
    const over = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.5), plasterEnd);
    over.position.set(0, 3.45, ENTRY_Z); entry.add(over);
    for (const sx of [-1, 1]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(.24, 2.7, .26), woodDark);
      jamb.position.set(sx * .85, 1.35, ENTRY_Z + .02); jamb.castShadow = true; entry.add(jamb);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.1, .28, .3), woodDark);
    lintel.position.set(0, 2.82, ENTRY_Z + .02); entry.add(lintel);
    g.add(entry);
  }

  /* the manuscripts of the house: ordered on wall shelves along the left
     side — a library, kept, not a heap */
  const MS_N = ctx.isMobile ? 84 : 132;
  const inst = [0, 1, 2].map(i => new THREE.InstancedMesh(bundleGeo, leafMats[i], Math.ceil(MS_N / 3)));
  const _m = new THREE.Matrix4(), _e = new THREE.Euler();
  const per = [0, 0, 0];
  for (let k = 0; k < MS_N; k++) {
    const shelf = k % 3, along = Math.floor(k / 3);
    const z = -12.5 - along * .78 - rnd() * .12;
    if (z < -46) break;
    const y = .95 + shelf * .62;
    const mi = k % 3;
    _e.set(0, Math.PI / 2 + (rnd() - .5) * .18, 0);
    _m.makeRotationFromEuler(_e);
    _m.setPosition(-4.05 + rnd() * .1, y + .05, z);
    inst[mi].setMatrixAt(per[mi]++, _m);
  }
  inst.forEach((m, i) => { m.count = per[i]; m.frustumCulled = false; m.castShadow = true; g.add(m); });
  for (let i = 0; i < 3; i++) {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(.46, .05, 34.5), woodMat);
    sh.position.set(-4.15, .9 + i * .62, -29.5);
    sh.receiveShadow = true;
    g.add(sh);
  }
  for (let z = -13; z > -46; z -= 5.5) {
    const br = new THREE.Mesh(new THREE.BoxGeometry(.42, 1.35, .08), woodDark);
    br.position.set(-4.15, 1.55, z);
    g.add(br);
  }

  /* ---- light: filtered day through the openings, the lamps, and a lime-plaster lift ---- */
  const day = new THREE.DirectionalLight(0xf3e6cc, 0);
  day.position.set(14, 9, -27);
  day.target.position.set(0, .5, -27);
  day.castShadow = !ctx.isMobile;
  day.shadow.mapSize.setScalar(1024);
  Object.assign(day.shadow.camera, { left: -10, right: 10, top: 24, bottom: -24, near: 1, far: 60 });
  day.shadow.bias = -.0004;
  g.add(day, day.target);
  const hallHemi = new THREE.HemisphereLight(0xa99f8c, 0x2a1e12, 0);
  g.add(hallHemi);
  const hallCool = new THREE.DirectionalLight(0x5c6b80, 0);
  hallCool.position.set(-5, 8, -30);
  g.add(hallCool);

  /* the daylight itself made visible: two soft shafts through the openings */
  const [shaftCv, shaftG] = canvas(128, 256);
  {
    const grd = shaftG.createLinearGradient(0, 0, 128, 0);
    grd.addColorStop(0, 'rgba(232,214,178,0)');
    grd.addColorStop(.5, 'rgba(232,214,178,.5)');
    grd.addColorStop(1, 'rgba(232,214,178,0)');
    shaftG.fillStyle = grd; shaftG.fillRect(0, 0, 128, 256);
    const grd2 = shaftG.createLinearGradient(0, 0, 0, 256);
    grd2.addColorStop(0, 'rgba(0,0,0,0)');
    grd2.addColorStop(.35, 'rgba(0,0,0,.35)');
    grd2.addColorStop(1, 'rgba(0,0,0,.85)');
    shaftG.globalCompositeOperation = 'destination-out';
    shaftG.fillStyle = grd2; shaftG.fillRect(0, 0, 128, 256);
  }
  const shaftTex = tex(shaftCv);
  const shafts = OPEN.map(oz => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 6.4), new THREE.MeshBasicMaterial({
      map: shaftTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }));
    s.position.set(2.2, 2.2, oz);
    s.rotation.set(0, .3, .62);
    g.add(s);
    return s;
  });
  const hemi = new THREE.HemisphereLight(0x342c20, 0x0e0a07, .62);
  g.add(hemi);

  /* dust in the light */
  const dustN = ctx.isMobile ? 40 : 90;
  const dpos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dpos[i * 3] = (rnd() - .5) * 6;
    dpos[i * 3 + 1] = .3 + rnd() * 3;
    dpos[i * 3 + 2] = -13 - rnd() * 32;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xc0a878, size: .03, transparent: true, opacity: .32, map: glowTexture('rgba(220,190,140,1)', 'rgba(220,190,140,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  g.add(dust);

  /* ---- the changed chamber beyond the saffron ---- */
  const chamber = new THREE.Group();
  chamber.visible = false;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, .22, 1.1), woodMat);
  seat.position.set(0, .11, -40); chamber.add(seat);
  /* the presence: Rayaru in the shrine form — seated, the right hand raised
     in abhaya, the prabhāvalī behind him. The model arrives asynchronously
     and is dropped straight into the chamber, which is hidden until the
     saffron crosses; it is never late to its own scene. */
  const presence = new THREE.Group();
  presence.position.set(0, .22, -40);
  chamber.add(presence);
  loadRayaru(presence, { height: 1.62 });
  /* Lit, not silhouetted: a warm key from the lamps' side lands on the face
     and the raised hand, a rim from behind separates the canopy from the
     wall, and a low fill keeps the lap out of pure black. */
  const rim = new THREE.PointLight(0xffb060, 0, 8, 2);
  rim.position.set(0, 1.9, -41.7);
  chamber.add(rim);
  const key = new THREE.PointLight(0xffc182, 0, 7, 2);
  key.position.set(-.95, 1.62, -38.5);
  chamber.add(key);
  const fillP = new THREE.PointLight(0xe0a468, 0, 6, 2);
  fillP.position.set(-1.1, 1.3, -38.2);
  chamber.add(fillP);
  const rimGlow = glowSprite(0xd98a3a, 2.6, .12);
  rimGlow.position.set(0, 1.3, -41.2);
  chamber.add(rimGlow);
  // pedestal with a single manuscript — the bridge into the works
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(.7, .9, .55), new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [58, 56, 50], 12, 41)), roughness: .95 }));
  pedestal.position.set(0, .45, -44.4);
  chamber.add(pedestal);
  const loneMs = new THREE.Mesh(bundleGeo, leafMats[0]);
  loneMs.scale.setScalar(1.35);
  loneMs.position.set(0, .96, -44.4);
  chamber.add(loneMs);
  const msLamp = clayLamp({ scale: 1.3, light: false, flameScale: .32 });
  msLamp.position.set(.5, .9, -44.15);
  chamber.add(msLamp);
  const msLight = new THREE.PointLight(0xff9a45, 6, 6, 2);
  msLight.position.set(.5, 1.3, -44);
  chamber.add(msLight);
  g.add(chamber);

  /* the chapter's camera: the hall of learning → the chamber. One track. */
  /* the camera never passes through the seated form: it settles before
     the seat, then slides to its right to reach the pedestal beyond */
  /* it opens just inside the entrance doorway, still walking: the study's
     camera reaches that door from the other side (purvashrama.js camIn),
     and the seam is a wash of the door's own light (VEILS, scroll.js) */
  const cam04 = camTrack([
    { u: 0, pos: V3(0, 1.46, -13.75), look: V3(-.3, 1.3, -24), fov: 46 },
    { u: .10, pos: V3(.3, 1.52, -17.0), look: V3(-.4, 1.25, -25), fov: 46 },
    { u: .24, pos: V3(.2, 1.5, -22.5), look: V3(-.6, 1.0, -30), fov: 44 },
    { u: .66, pos: V3(0, 1.35, -35.5), look: V3(0, .95, -40), fov: 42 },
    { u: .84, pos: V3(.85, 1.3, -37.4), look: V3(-.1, 1.0, -40.3), fov: 42 },
    { u: 1, pos: V3(1.35, 1.2, -41.6), look: V3(.15, .96, -44.4), fov: 40 },
  ]);

  return {
    group: g,
    setVisible(v) { g.visible = v; },
    cam(u) { return cam04(u); },
    /* u02 is the corridor's original clock (scenes 03–04 span); scene 04
       occupies its second half, so every window below is unchanged */
    update(time, globalT, u02) {
      /* the sannyāsa is a change of light, not a cut: the desk lamps go out
         ONE BY ONE across the hall, the daylight retires behind them, and
         the frame is left to the one lamp at the pīṭha in the chamber */
      const hallOn = win(u02, 0, .1, .70, .84);
      for (let i = 0; i < deskLamps.length; i++) {
        const dl = deskLamps[i];
        dl.userData.flicker(time + i * 3.1);
        dl.userData.setOn(win(u02, 0, .1, .58 + i * .045, .66 + i * .045));
      }
      for (const pl of sharedLamps) pl.intensity = 7 * win(u02, 0, .1, .62, .78);
      /* daylight and plaster carry the architecture; the lamps carry the
         study. Both retire toward the sannyāsa with hallOn. */
      day.intensity = 2.3 * hallOn;
      hallCool.intensity = .35 + .6 * hallOn;
      hallHemi.intensity = .6 + 1.4 * hallOn;
      for (let i = 0; i < shafts.length; i++) shafts[i].material.opacity = .5 * hallOn;
      msLamp.userData.flicker(time + 1);

      if (!ctx.reduced) {
        const p = dust.geometry.attributes.position;
        for (let i = 0; i < dustN; i++) {
          p.setY(i, .3 + ((p.getY(i) - .3 + .0006) % 3));
          p.setX(i, p.getX(i) + Math.sin(time * .3 + i) * .0006);
        }
        p.needsUpdate = true;
      }

      /* chamber reveal — the frame washes saffron over this seam (the
         sannyāsa veil, scroll.js/main.js), and clears onto the changed
         chamber. */
      const reveal = smooth(remap(u02, .80, .90));
      chamber.visible = reveal > .01;
      rim.intensity = reveal * 8;
      key.intensity = reveal * 5.5;
      fillP.intensity = reveal * 2.6;
      rimGlow.material.opacity = .13 * reveal;
      msLight.intensity = 7 * smooth(remap(u02, .87, .96));
      hemi.intensity = .62 * (1 - smooth(remap(u02, .78, .92)) * .45);
    },
  };
}
