// ANTARANGA · scene 04 — Madhwa Siddhanta. Panchabheda as space, scale,
// material and orbit: one luminous centre, souls that approach and never
// merge, matter that is organised and never absorbed — all held inside a
// field of drawn contour rings, so the five distinctions read as parts of
// ONE ordered universe rather than five slides. The camera travels slowly
// forward through the field and, at the end, pulls back to see the whole.
import * as THREE from 'three';
import { stoneCanvas, tex, glowSprite, textMesh, mulberry, lerp, remap, smooth, V3 } from '../util.js';

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
      color: 0x1a0e05, roughness: .38, metalness: .05,
      emissive: 0x8a4a12, emissiveIntensity: .5,
    })
  );
  hari.add(hariCore);
  const hariGlow = glowSprite(0xd98a3a, 8, .22);
  hari.add(hariGlow);
  const hariGlow2 = glowSprite(0xffc880, 3.4, .5);
  hari.add(hariGlow2);
  const hariLight = new THREE.PointLight(0xd98a3a, 40, 60, 2);
  hari.add(hariLight);
  /* prabhā — a thin drawn ring standing behind the centre, the first hint
     that this space is authored, not empty */
  const prabha = new THREE.Mesh(
    new THREE.TorusGeometry(1.8, .012, 8, 96),
    new THREE.MeshBasicMaterial({
      color: 0xc8a66a, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  hari.add(prabha);
  g.add(hari);

  /* a soft key from off-frame right, so the sphere and the shards have FORM
     — without it the centre read as a flat disc */
  const form = new THREE.PointLight(0x9a7a4e, 46, 50, 2);
  form.position.set(8, 5, 10);
  g.add(form);

  /* the field — concentric hand-drawn contour rings, the manuscript's own
     line carried into space. They arrive with the orbits and settle into one
     shared plane as the composition organises: the ordered field the five
     distinctions belong to. */
  const rings = [];
  const ringsG = new THREE.Group();
  g.add(ringsG);
  {
    const SEGS = 160;
    for (let i = 0; i < 8; i++) {
      const R = 2.7 * Math.pow(1.23, i);
      const pts = [];
      const p1 = rnd() * Math.PI * 2, p2 = rnd() * Math.PI * 2;
      for (let s = 0; s <= SEGS; s++) {
        const a = s / SEGS * Math.PI * 2;
        const r = R * (1 + Math.sin(a * 3 + p1) * .014 + Math.sin(a * 7 + p2) * .009);
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color: 0x8a744c, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      line.rotation.x = (rnd() - .5) * .8;
      line.rotation.z = (rnd() - .5) * .5;
      line.position.y = (rnd() - .5) * 1.6;
      line.userData = {
        baseX: line.rotation.x, baseZ: line.rotation.z, baseY: line.position.y,
        spin: (rnd() - .5) * .05, i,
      };
      ringsG.add(line);
      rings.push(line);
    }
  }

  /* jivas — small warm embers, alive but never the source. Five of them,
     each with its own scale, rhythm and path: jīva–jīva is a difference of
     CHARACTER, not just count. */
  const JIVA = [
    { r: .16, dist: 1.9, sp: .30, inc: .50, ph: 0.0, in0: .00, in1: .18, em: 0x8a4416 },
    { r: .20, dist: 2.7, sp: .19, inc: -.28, ph: 2.4, in0: .38, in1: .58, em: 0x96521c },
    { r: .11, dist: 2.25, sp: .46, inc: .12, ph: 4.1, in0: .30, in1: .46, em: 0x7e3f12 },
    { r: .14, dist: 3.15, sp: .26, inc: -.55, ph: 1.2, in0: .44, in1: .62, em: 0x8a4a1a },
    { r: .18, dist: 3.55, sp: .13, inc: .30, ph: 5.3, in0: .52, in1: .70, em: 0x90481a },
  ];
  const jivas = JIVA.map(j => {
    const grp = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(j.r, 24, 16),
      new THREE.MeshStandardMaterial({
        color: 0x1a0d05, roughness: .5, emissive: j.em, emissiveIntensity: .8,
      })
    );
    grp.add(core);
    const gl = glowSprite(0xc87838, .9 * (j.r / .16), .18);
    grp.add(gl);
    grp.visible = false;
    g.add(grp);
    return grp;
  });

  /* matter — dark rough shards. Inert, no glow, no light of their own. */
  const shardMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [58, 54, 46], 14, 91)), roughness: 1 });
  const shards = [];
  for (let i = 0; i < 8; i++) {
    const geo = new THREE.IcosahedronGeometry(.2 + rnd() * .34, 0);
    const s = new THREE.Mesh(geo, shardMat);
    s.userData = {
      a: rnd() * Math.PI * 2, r: 2.6 + rnd() * 2.8, h: (rnd() - .5) * 2.2,
      sp: .3 + rnd() * .4, tilt: rnd() * Math.PI,
      /* each orbit is inclined so its FRONT crossing passes above or below
         the centre — matter moves through the field without ever eclipsing
         the Supreme on the camera's sightline */
      vt: (rnd() < .5 ? -1 : 1) * (1.25 + rnd() * .6),
    };
    s.scale.y = .7 + rnd() * .6;
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

  const amb = new THREE.AmbientLight(0x0e0b08, 1.8);
  g.add(amb);
  // cool rim so matter reads as form, not holes in the dark —
  // and a dim warm answer from the other side
  const rim = new THREE.DirectionalLight(0x2e3844, 1.2);
  rim.position.set(-6, 3, 8);
  g.add(rim);
  const rim2 = new THREE.DirectionalLight(0x4a3a2a, .55);
  rim2.position.set(7, -2, 6);
  g.add(rim2);

  /* the five distinctions, named in space as each becomes visible */
  const mkPair = (term, gloss, x, y, z) => {
    const grp = new THREE.Group();
    const a = textMesh(term, { font: 'serif', px: 88, worldH: .34, color: '#d8cdb2', blend: 'add' });
    const b = textMesh(gloss, { font: 'sans', px: 60, worldH: .17, color: '#8f8368', blend: 'add' });
    b.position.y = -.32;
    for (const m of [a, b]) { m.material.depthTest = false; m.renderOrder = 7; }
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
  /* a phone's frustum is barely ±1.8 wide here — the same names, pulled in
     and spread a little taller, or they would all stand outside the frame */
  if (ctx.isMobile) {
    for (const grp of pairLabels) {
      grp.position.x *= .3;
      grp.position.y *= 1.25;
      grp.scale.setScalar(.8);
    }
  }

  /* camera: one slow travel INTO the field — then, at the very end, a pull
     back to see all of it at once: five distinctions, one ordered whole */
  const cam = (u) => {
    const drift = smooth(u);
    const back = smooth(remap(u, .86, 1));
    return {
      /* one slow travel in, a hand's width of drift, and a short breath
         back at the end. The earlier full sine cycle in x returned the
         camera to where it began and read as decoration. */
      pos: V3(
        u * .3,
        .4 + drift * .8 + back * .5,
        13.4 - drift * 4.8 + back * 1.4
      ),
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
      /* the ending: labels withdraw, the field remains */
      const gone = smooth(remap(u, .78, .9));
      const finale = smooth(remap(u, .86, 1));

      hari.position.set(lerp(-3.4, 0, approach), 0, 0);
      const breathe = 1 + Math.sin(time * .7) * .02;
      hariCore.scale.setScalar(breathe);
      hariGlow.material.opacity = .16 + organise * .1;
      hariLight.intensity = 30 + organise * 26;
      prabha.material.opacity = (orbit * .28 + organise * .1) * (1 - finale * .4);
      prabha.rotation.z = time * .04;

      /* the drawn field arrives with the orbits, inner rings first, and
         settles into one shared plane as the composition organises */
      for (const line of rings) {
        const ud = line.userData;
        const arrive = smooth(remap(orbit, .1 + ud.i * .09, .45 + ud.i * .09));
        const flat = organise * .8;
        line.rotation.x = ud.baseX * (1 - flat);
        line.rotation.z = ud.baseZ * (1 - flat) + time * ud.spin;
        line.position.y = ud.baseY * (1 - flat);
        /* at the finale the widest ring holds — the line the journey will
           draw across the land — while the rest of the field recedes */
        const hold = ud.i === rings.length - 1 ? 1 : 1 - finale * .85;
        line.material.opacity = arrive * .22 * hold + (ud.i === rings.length - 1 ? finale * .3 : 0);
      }

      /* jivas: each on its own path — distinct from Hari, and from each
         other in scale, speed and rhythm. All stop short. Always. */
      for (let i = 0; i < JIVA.length; i++) {
        const J = JIVA[i], jv = jivas[i];
        const enter = i === 0
          ? approach
          : smooth(remap(u, J.in0, J.in1));
        jv.visible = enter > .01;
        if (!jv.visible) continue;
        const a = J.ph + time * J.sp * (1 + organise * .1) + orbit * (1.2 + i * .3);
        const dist = (i === 0 ? lerp(3.6, J.dist, approach) : J.dist) - organise * .15;
        const wob = Math.sin(a * (1.4 + i * .35)) * (.35 + i * .06) * orbit;
        jv.position.set(
          hari.position.x + Math.cos(a) * dist * (i === 0 ? 1 : enter) + (1 - enter) * (i === 0 ? 0 : 9),
          wob * Math.cos(J.inc) + Math.sin(a) * dist * Math.sin(J.inc) * .5,
          Math.sin(a) * dist * (.6 + .12 * i)
        );
      }

      // matter: slower, heavier, farther — organised but never absorbed
      for (let i = 0; i < shards.length; i++) {
        const s = shards[i], ud = s.userData;
        const enter = smooth(remap(u, .3 + i * .045, .5 + i * .045));
        const a = ud.a + time * .03 * ud.sp + orbit * (1.05 + i * .12);
        const r = lerp(ud.r + 6, ud.r + .6 - organise * .8, enter);
        const front = Math.max(0, Math.sin(a));       // 1 when nearest the camera
        s.position.set(
          Math.cos(a) * r,
          ud.h * (1 - organise * .55) + front * ud.vt,
          Math.sin(a) * r * .6
        );
        s.rotation.set(ud.tilt + time * .02, a * .3, 0);
        s.visible = enter > .01;
      }

      dust.rotation.y = time * .008;

      /* name each distinction as its participants become visible;
         all five withdraw as the composition organises */
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
