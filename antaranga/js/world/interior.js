// RAYARA ANTARANGA · scene 04 — sannyāsa. The manuscript corridor at
// Kumbhakonam, the saffron cloth crossing the frame, and the changed chamber
// beyond it. (Scenes 01–03 — the Pūrvāśrama house — live in purvashrama.js;
// this stage begins where that chapter stops, behind the veil at t .295.)
import * as THREE from 'three';
import { stoneCanvas, palmLeafCanvas, canvas, tex, flame, glowSprite, glowTexture, mulberry, lerp, remap, smooth, win, camTrack, V3 } from '../util.js';

export const INTERIOR_Y = 400;

export function createInteriorStage(ctx) {
  const g = new THREE.Group();
  g.position.y = INTERIOR_Y;
  g.visible = false;

  const rnd = mulberry(101);

  /* stone floor */
  const floorMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [36, 34, 30], 12, 31), { repeat: [3, 8] }), roughness: .95 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 40), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -28;
  g.add(floor);

  /* timber pillars + beams down the corridor */
  const woodMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [40, 28, 18], 14, 61), { repeat: [1, 3] }), roughness: .85 });
  const pillarGeo = new THREE.BoxGeometry(.34, 3.6, .34);
  const capGeo = new THREE.BoxGeometry(.72, .16, .72);
  const baseGeo = new THREE.BoxGeometry(.5, .3, .5);
  for (let i = 0; i < 7; i++) {
    for (const sx of [-1, 1]) {
      const z = -10 - i * 5.4;
      const p = new THREE.Mesh(pillarGeo, woodMat);
      p.position.set(sx * 2.3, 1.8, z);
      const cap = new THREE.Mesh(capGeo, woodMat); cap.position.set(sx * 2.3, 3.62, z);
      const base = new THREE.Mesh(baseGeo, woodMat); base.position.set(sx * 2.3, .15, z);
      g.add(p, cap, base);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.6, .22, .3), woodMat);
    beam.position.set(0, 3.78, -10 - i * 5.4);
    g.add(beam);
  }
  // dark ceiling hint
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 40), new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4.05, -28);
  g.add(ceil);
  // the hall terminates — without this the fog colour reads as a grey
  // rectangle hanging at the end of the corridor
  const endWall = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 4.4), new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [26, 22, 18], 10, 73), { repeat: [4, 2] }), roughness: 1 }));
  endWall.position.set(0, 2.1, -47.2);
  g.add(endWall);
  // side walls (dim)
  const wallMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [30, 26, 21], 10, 71), { repeat: [10, 2] }), roughness: 1 });
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(40, 4.2), wallMat);
    w.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    w.position.set(sx * 4.6, 2.05, -28);
    g.add(w);
  }

  /* palm-leaf manuscripts lining the hall of learning — fully grown here */
  const leafMats = [0, 1, 2].map(i => new THREE.MeshStandardMaterial({ map: tex(palmLeafCanvas(3 + i)), roughness: .8 }));
  const bundleGeo = new THREE.BoxGeometry(.72, .085, .16);
  const MS_N = ctx.isMobile ? 100 : 180;
  const inst = [0, 1, 2].map(i => new THREE.InstancedMesh(bundleGeo, leafMats[i], Math.ceil(MS_N / 3)));
  const _m = new THREE.Matrix4(), _e = new THREE.Euler();
  const per = [0, 0, 0];
  for (let k = 0; k < MS_N; k++) {
    const z = -13 - rnd() * 32;
    const side = rnd() > .5 ? 1 : -1;
    const x = side * (2.9 + rnd() * 1.3);
    const stack = Math.floor(rnd() * 7);
    const y = .1 + stack * .1 + Math.floor(rnd() * 3) * 1.1;
    const mi = k % 3;
    _e.set(0, rnd() * .5 - .25 + (side > 0 ? Math.PI : 0), 0);
    _m.makeRotationFromEuler(_e);
    _m.setPosition(x, y, z);
    inst[mi].setMatrixAt(per[mi]++, _m);
  }
  inst.forEach((m, i) => { m.count = per[i]; m.frustumCulled = false; g.add(m); });

  /* shelf planks for the stacks */
  for (let i = 0; i < 10; i++) {
    for (const sx of [-1, 1]) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(1.7, .06, 3.4), woodMat);
      sh.position.set(sx * 3.5, 1.05 + (i % 3) * 1.1, -14 - Math.floor(i / 3) * 9 - (sx > 0 ? 2 : 0));
      g.add(sh);
    }
  }

  /* the hall's lamps — lit as the chapter opens, retiring toward sannyāsa */
  const hallLamps = [];
  for (const [hx, hz] of [[-1.9, -20], [1.9, -27], [-1.9, -34], [1.9, -16.5], [-1.9, -41]]) {
    const fl = flame(1);
    fl.position.set(hx, 1.22, hz);
    g.add(fl);
    const li = new THREE.PointLight(0xf0a050, 0, 12, 2);
    li.position.set(hx, 1.6, hz);
    g.add(li);
    hallLamps.push({ fl, li });
  }
  // a cool architectural counterweight so the hall is not one warm wash
  const hallCool = new THREE.DirectionalLight(0x3a4a5c, 0);
  hallCool.position.set(-5, 8, -30);
  g.add(hallCool);
  // and a low warm lift of its own, so the corridor reads as a hall of
  // learning rather than a black void with embers in it
  const hallHemi = new THREE.HemisphereLight(0x594430, 0x120d08, 0);
  g.add(hallHemi);

  /* daylight shaft deep in the hall — raised with the lamps so the far
     corridor is never a void */
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
  const shaft2 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 5.8), new THREE.MeshBasicMaterial({
    map: tex(shaftCv), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  shaft2.position.set(-2.9, 2.3, -24);
  shaft2.rotation.set(0, -.9, .55);
  g.add(shaft2);
  const hemi = new THREE.HemisphereLight(0x2a241c, 0x0a0806, .45);
  g.add(hemi);

  /* dust motes */
  const dustN = ctx.isMobile ? 50 : 110;
  const dpos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dpos[i * 3] = (rnd() - .5) * 6;
    dpos[i * 3 + 1] = .3 + rnd() * 3;
    dpos[i * 3 + 2] = -13 - rnd() * 32;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xc0a878, size: .03, transparent: true, opacity: .4, map: glowTexture('rgba(220,190,140,1)', 'rgba(220,190,140,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  g.add(dust);

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

  /* the chapter's camera: the hall of learning → the chamber. One track. */
  const cam04 = camTrack([
    { u: 0, pos: V3(0, 1.55, -24.5), look: V3(0, 1.5, -32), fov: 46 },
    { u: .24, pos: V3(0, 1.5, -29.5), look: V3(0, 1.2, -40), fov: 44 },
    { u: .7, pos: V3(0, 1.35, -35.5), look: V3(0, .95, -40), fov: 42 },
    { u: 1, pos: V3(0, 1.15, -42.9), look: V3(0, .96, -44.45), fov: 40 },
  ]);

  return {
    group: g,
    setVisible(v) { g.visible = v; },
    cam(u) { return cam04(u); },
    /* u02 is the corridor's original clock (scenes 03–04 span); scene 04
       occupies its second half, so every window below is unchanged */
    update(time, globalT, u02) {
      const hallOn = win(u02, 0, .1, .5, .68);
      for (let i = 0; i < hallLamps.length; i++) {
        const hl = hallLamps[i];
        hl.fl.userData.flicker(time + i * 3.1);
        hl.fl.scale.setScalar(Math.max(.001, hallOn));
        hl.li.intensity = 14 * hallOn * (0.9 + Math.sin(time * 7 + i * 2) * .08);
      }
      hallCool.intensity = .9 * hallOn;
      hallHemi.intensity = .8 * hallOn;
      shaft2.material.opacity = .4 * hallOn;
      msLamp.userData.flicker(time + 1);

      // dust drift
      if (!ctx.reduced) {
        const p = dust.geometry.attributes.position;
        for (let i = 0; i < dustN; i++) {
          p.setY(i, .3 + ((p.getY(i) - .3 + .0006) % 3));
          p.setX(i, p.getX(i) + Math.sin(time * .3 + i) * .0006);
        }
        p.needsUpdate = true;
      }

      /* the cloth crossing — a wipe, not a curtain */
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
      hemi.intensity = .45 * (1 - smooth(remap(u02, .62, .88)) * .55);
    },
  };
}
