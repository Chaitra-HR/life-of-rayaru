// ANTARANGA · scene 04 — Madhwa Siddhanta. Panchabheda as space, scale,
// material and orbit. Forms approach; they never merge.
import * as THREE from 'three';
import { stoneCanvas, tex, glowSprite, textMesh, mulberry, lerp, clamp01, remap, smooth, win, V3 } from '../util.js';

export const BHEDA_Y = 1200;

export function createBhedaStage(ctx) {
  const g = new THREE.Group();
  g.position.y = BHEDA_Y;
  g.visible = false;
  const rnd = mulberry(555);

  /* Hari — the one luminous centre. Warm, large, self-lit. */
  const hari = new THREE.Group();
  const hariCore = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 48, 32),
    new THREE.MeshStandardMaterial({
      color: 0x1a0e05, roughness: .42, metalness: .08,
      emissive: 0x8a4a12, emissiveIntensity: .42,
    })
  );
  hari.add(hariCore);
  const hariGlow = glowSprite(0xd98a3a, 8, .22);
  hari.add(hariGlow);
  const hariGlow2 = glowSprite(0xffc880, 3.4, .5);
  hari.add(hariGlow2);
  const hariLight = new THREE.PointLight(0xd98a3a, 40, 60, 2);
  hari.add(hariLight);
  g.add(hari);

  /* jivas — small warm embers, alive but not the source */
  const jivaMat = new THREE.MeshStandardMaterial({
    color: 0x1a0d05, roughness: .5, emissive: 0x8a4416, emissiveIntensity: .8,
  });
  const jivas = [];
  for (let i = 0; i < 2; i++) {
    const j = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(.16 + i * .04, 24, 16), jivaMat);
    j.add(core);
    const gl = glowSprite(0xc87838, .9, .18);
    j.add(gl);
    g.add(j);
    jivas.push(j);
  }

  /* matter — dark rough shards. Inert, no glow. */
  const shardMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [24, 24, 22], 12, 91)), roughness: 1 });
  const shards = [];
  for (let i = 0; i < 6; i++) {
    const geo = new THREE.IcosahedronGeometry(.22 + rnd() * .3, 0);
    const s = new THREE.Mesh(geo, shardMat);
    s.userData = { a: rnd() * Math.PI * 2, r: 2.6 + rnd() * 2.4, h: (rnd() - .5) * 2, sp: .3 + rnd() * .4, tilt: rnd() * Math.PI };
    g.add(s);
    shards.push(s);
  }

  /* barely-there dust */
  const dn = ctx.isMobile ? 60 : 140;
  const dp = new Float32Array(dn * 3);
  for (let i = 0; i < dn; i++) {
    dp[i * 3] = (rnd() - .5) * 26; dp[i * 3 + 1] = (rnd() - .5) * 12; dp[i * 3 + 2] = (rnd() - .5) * 26;
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({
    color: 0x5a4225, size: .03, transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  g.add(dust);

  const amb = new THREE.AmbientLight(0x0c0906, 1.4);
  g.add(amb);
  // cool rim so matter reads as form, not holes in the dark
  const rim = new THREE.DirectionalLight(0x2e3844, .7);
  rim.position.set(-6, 3, 8);
  g.add(rim);

  /* the five distinctions, named in space as each becomes visible */
  const mkPair = (term, gloss, x, y, z) => {
    const grp = new THREE.Group();
    const a = textMesh(term, { font: 'serif', px: 88, worldH: .34, color: '#d8cdb2', blend: 'add' });
    const b = textMesh(gloss, { font: 'sans', px: 60, worldH: .17, color: '#8f8368', blend: 'add' });
    b.position.y = -.32;
    grp.add(a, b);
    grp.position.set(x, y, z);
    grp.userData.mats = [a.material, b.material];
    grp.visible = false;
    g.add(grp);
    return grp;
  };
  const pairLabels = [
    mkPair('jīva–Īśvara', 'the soul and the Supreme', 2.6, 1.7, 2),
    mkPair('jaḍa–Īśvara', 'matter and the Supreme', -3.4, -1.6, 2.5),
    mkPair('jīva–jīva', 'one soul and another', 3.4, -1.3, 2.2),
    mkPair('jīva–jaḍa', 'soul and matter', -3.2, 1.9, 2.4),
    mkPair('jaḍa–jaḍa', 'one thing and another', .2, -2.4, 2.6),
  ];

  /* camera: transformation mode — nearly still, breathing slightly */
  const cam = (u) => {
    const drift = smooth(u);
    return {
      pos: V3(Math.sin(u * Math.PI * 2) * .8, .4 + drift * .8, 11.5 - drift * 2.2),
      look: V3(0, 0, 0),
      fov: 44,
    };
  };

  return {
    group: g,
    setVisible(v) { g.visible = v; },
    cam,
    update(time, globalT, u) {
      /* phase 1 (0–.3): two forms approach. They never merge. */
      const approach = smooth(remap(u, 0, .3));
      /* phase 2 (.3–.7): the five relations settle into orbits */
      const orbit = smooth(remap(u, .3, .7));
      /* phase 3 (.7–1): the whole composition organises around Hari */
      const organise = smooth(remap(u, .7, 1));

      hari.position.set(lerp(-3.4, 0, approach), 0, 0);
      const breathe = 1 + Math.sin(time * .7) * .02;
      hariCore.scale.setScalar(breathe);
      hariGlow.material.opacity = .16 + organise * .1;
      hariLight.intensity = 30 + organise * 26;

      // jiva 1: approaches from the right — stops short, always distinct
      const j1dist = lerp(3.6, 1.9, approach) - organise * .15;
      const a1 = orbit * Math.PI * .9 + time * .05 + organise * time * .02;
      jivas[0].position.set(
        hari.position.x + Math.cos(a1) * j1dist,
        Math.sin(a1 * .7) * .5 * orbit,
        Math.sin(a1) * j1dist * .6
      );
      // jiva 2: enters later — jiva and jiva are also distinct
      const j2in = smooth(remap(u, .38, .58));
      const a2 = 2.4 + time * .04 + orbit * 2;
      const j2dist = 2.7 - organise * .3;
      jivas[1].position.set(
        hari.position.x + Math.cos(a2) * j2dist * j2in + (1 - j2in) * 9,
        -.4 * orbit + Math.sin(a2 * .9) * .4,
        Math.sin(a2) * j2dist * .8
      );
      jivas[1].visible = j2in > .01;

      // matter: slower, heavier, farther — organised but never absorbed
      for (let i = 0; i < shards.length; i++) {
        const s = shards[i], ud = s.userData;
        const enter = smooth(remap(u, .3 + i * .05, .5 + i * .05));
        const a = ud.a + time * .03 * ud.sp + orbit * 1.2;
        const r = lerp(ud.r + 6, ud.r + .6 - organise * .8, enter);
        s.position.set(Math.cos(a) * r, ud.h * (1 - organise * .55), Math.sin(a) * r * .75);
        s.rotation.set(ud.tilt + time * .02, a * .3, 0);
        s.visible = enter > .01;
      }

      dust.rotation.y = time * .008;

      /* name each distinction as its participants become visible;
         all five withdraw as the composition organises */
      const gone = smooth(remap(u, .78, .9));
      for (let i = 0; i < pairLabels.length; i++) {
        const o = smooth(remap(u, .34 + i * .07, .42 + i * .07)) * (1 - gone);
        const [ma, mb] = pairLabels[i].userData.mats;
        ma.opacity = o * .85;
        mb.opacity = o * .6;
        pairLabels[i].visible = o > .01;
      }
    },
  };
}
