// ANTARANGA · scene 07 — Brindavana Pravesha. Time slows. The mala stops.
// Stone slabs move into place around a seated stillness.
import * as THREE from 'three';
import { stoneCanvas, palmLeafCanvas, tex, flame, glowSprite, mulberry, lerp, remap, smooth, V3 } from '../util.js';

export const PRAVESHA_Y = 2400;

export function createPraveshaStage(ctx) {
  const g = new THREE.Group();
  g.position.y = PRAVESHA_Y;
  g.visible = false;
  const rnd = mulberry(707);

  const stoneMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [38, 40, 38], 13, 17), { repeat: [2, 2] }), roughness: .95 });
  const darkStone = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [26, 28, 27], 11, 27), { repeat: [2, 2] }), roughness: .97 });
  const woodMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [42, 29, 17], 12, 37)), roughness: .88 });

  /* floor + back wall — a bare sanctum */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), stoneMat);
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(24, 8), darkStone);
  back.position.set(0, 4, -6);
  g.add(back);

  /* Vyasa Peetha — a low carved seat, beneath the seated form */
  const peetha = new THREE.Group();
  const pBase = new THREE.Mesh(new THREE.BoxGeometry(2.1, .3, 1.7), stoneMat);
  pBase.position.y = .15; peetha.add(pBase);
  const pTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, .22, 1.45), darkStone);
  pTop.position.y = .41; peetha.add(pTop);
  peetha.position.set(0, 0, -1.2);
  g.add(peetha);

  /* the seated presence — posture, cloth, mala. No face. */
  const robeMat = new THREE.MeshStandardMaterial({ color: 0x59371a, roughness: .97 });
  const seated = new THREE.Group();
  // crossed-leg base mass
  const lap = new THREE.Mesh(new THREE.SphereGeometry(.52, 18, 12), robeMat);
  lap.scale.set(1.12, .4, .88);
  lap.position.y = .68; seated.add(lap);
  // torso — narrower, so the head reads as a head
  const torsoPts = [];
  for (let s = 0; s <= 8; s++) {
    const t = s / 8;
    torsoPts.push(new THREE.Vector2(.335 * (1 - t * t * .68) + .012 * Math.sin(t * 7), t * .8));
  }
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoPts, 16), robeMat);
  torso.position.y = .78; seated.add(torso);
  // shoulders
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(.24, 14, 10), robeMat);
  shoulders.scale.set(1.25, .55, .85);
  shoulders.position.set(0, 1.42, .01);
  seated.add(shoulders);
  // head — unmodelled, bowed slightly, with the hint of a turban
  const head = new THREE.Mesh(new THREE.SphereGeometry(.115, 14, 10), robeMat);
  head.position.set(0, 1.64, .05);
  seated.add(head);
  const turban = new THREE.Mesh(new THREE.SphereGeometry(.135, 14, 10), robeMat);
  turban.scale.set(1.05, .68, 1.05);
  turban.position.set(0, 1.72, .04);
  seated.add(turban);
  // cloth fold draped over the left shoulder — diagonal, like an uttariya
  const fold = new THREE.Mesh(new THREE.TorusGeometry(.3, .045, 8, 18, Math.PI * .9), robeMat);
  fold.position.set(-.16, 1.28, .02);
  fold.rotation.set(.2, 1.35, 1.15);
  seated.add(fold);
  seated.position.set(0, .06, -1.2);
  g.add(seated);

  /* japa mala — beads circling slowly through the hand, then stopping */
  const beadN = 54;
  const malaGroup = new THREE.Group();
  malaGroup.position.set(.34, .78, -.82);
  malaGroup.rotation.set(.15, 0, -.25);
  g.add(malaGroup);
  const beadMat = new THREE.MeshStandardMaterial({ color: 0x2e2013, roughness: .55 });
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(.021, 8, 8), beadMat, beadN);
  malaGroup.add(beads);

  /* texts + saffron cloth + copper by the peetha */
  const msMat = new THREE.MeshStandardMaterial({ map: tex(palmLeafCanvas(19)), color: 0x9a8a70, roughness: .85 });
  const msGeo = new THREE.BoxGeometry(.6, .075, .14);
  for (let i = 0; i < 5; i++) {
    const ms = new THREE.Mesh(msGeo, msMat);
    ms.position.set(-1.7 + (i % 2) * .1, .07 + Math.floor(i / 2) * .085, -.5 - (i % 2) * .06);
    ms.rotation.y = rnd() * .4;
    g.add(ms);
  }
  const clothFold = new THREE.Mesh(new THREE.BoxGeometry(.7, .16, .5), new THREE.MeshStandardMaterial({ color: 0x6e3d15, roughness: 1 }));
  clothFold.position.set(1.6, .08, -.4);
  clothFold.rotation.y = -.3;
  g.add(clothFold);
  const copperPot = new THREE.Mesh(
    new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(.16, .02), new THREE.Vector2(.2, .14), new THREE.Vector2(.12, .28), new THREE.Vector2(.14, .32)], 16),
    new THREE.MeshStandardMaterial({ color: 0x5e3a1e, metalness: .65, roughness: .6 })
  );
  copperPot.position.set(1.15, 0, .3);
  g.add(copperPot);

  /* lamps — the only light */
  const lampL = flame(1);
  lampL.position.set(-1.5, .5, .9);
  g.add(lampL);
  const lightL = new THREE.PointLight(0xe8a860, 9, 11, 2);
  lightL.position.set(-1.5, .9, .9);
  g.add(lightL);
  const lampR = flame(.85);
  lampR.position.set(1.7, .5, 1);
  g.add(lampR);
  const lightR = new THREE.PointLight(0xe09a50, 7, 10, 2);
  lightR.position.set(1.7, .9, 1);
  g.add(lightR);
  // warm rim behind the form + a quiet neutral fill so cloth reads as cloth
  const rim = new THREE.PointLight(0xdd9448, 4.5, 8, 2);
  rim.position.set(0, 2.1, -2.8);
  g.add(rim);
  const rimGlow = glowSprite(0xc88a48, 3.6, .11);
  rimGlow.position.set(0, 1.6, -2.5);
  g.add(rimGlow);
  const frontFill = new THREE.DirectionalLight(0xa89070, 1.3);
  frontFill.position.set(1.5, 2.4, 4);
  g.add(frontFill);
  const hemi = new THREE.HemisphereLight(0x14100a, 0x040302, .55);
  g.add(hemi);

  /* the stone slabs that will enclose */
  const slabTex = tex(stoneCanvas(512, [33, 36, 34], 14, 47), { repeat: [1, 1] });
  const slabMat = new THREE.MeshStandardMaterial({ map: slabTex, roughness: .93 });
  const slabs = [];
  const mkSlab = (w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), slabMat);
  // four walls + cap; they arrive from outside, one after another
  const defs = [
    { m: mkSlab(2.9, 2.6, .35), from: V3(-8, 1.3, -1.2), to: V3(-1.62, 1.3, -1.2), d: 0 },     // left
    { m: mkSlab(2.9, 2.6, .35), from: V3(8, 1.3, -1.2), to: V3(1.62, 1.3, -1.2), d: .16 },     // right
    { m: mkSlab(3.6, 2.6, .35), from: V3(0, 1.3, -9), to: V3(0, 1.3, -2.72), d: .32, ry: 0 },  // back
    { m: mkSlab(3.6, 2.6, .35), from: V3(0, 1.3, 8), to: V3(0, 1.3, .35), d: .48, ry: 0 },     // front
    { m: mkSlab(3.8, .5, 3.6), from: V3(0, 8.5, -1.2), to: V3(0, 2.85, -1.2), d: .66 },        // cap
  ];
  for (const def of defs) {
    if (def.ry === 0) { /* box already axis-aligned */ }
    else if (def.to.x !== 0) def.m.rotation.y = Math.PI / 2;
    def.m.position.copy(def.from);
    def.m.visible = false;
    g.add(def.m);
    slabs.push(def);
  }

  /* the stone face we end on — the closed front slab, extremely close */
  const closeStone = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 2.6),
    new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(1024, [30, 33, 31], 18, 87), { repeat: [1, 1] }), roughness: .96 })
  );
  closeStone.position.set(0, 1.3, .56);
  closeStone.visible = false;
  g.add(closeStone);
  const closeLight = new THREE.PointLight(0x8a5a2a, 0, 4, 2);
  closeLight.position.set(.8, 1.7, 1.5);
  g.add(closeLight);

  /* camera — deliberately slowed */
  const cam = (u) => {
    if (u < .62) {
      const v = smooth(remap(u, 0, .62));
      // a long, quiet dolly across the sanctum toward the seated form
      return {
        pos: V3(lerp(2.6, .0, v), lerp(1.15, 1.05, v), lerp(4.6, 2.9, v)),
        look: V3(lerp(.4, 0, v), lerp(.9, 1.1, v), -1.2),
        fov: lerp(42, 38, v),
      };
    }
    if (u < .88) {
      const v = smooth(remap(u, .62, .88));
      // hold as the stone closes; drift very slightly closer
      return {
        pos: V3(0, lerp(1.05, 1.25, v), lerp(2.9, 2.55, v)),
        look: V3(0, 1.15, -1.2),
        fov: 38,
      };
    }
    const v = smooth(remap(u, .88, 1));
    // darkness, then the closed stone face extremely close
    return {
      pos: V3(0, 1.3, lerp(2.55, 1.02, v)),
      look: V3(0, 1.3, .56),
      fov: lerp(38, 34, v),
    };
  };

  const _m = new THREE.Matrix4();
  return {
    group: g,
    setVisible(v) { g.visible = v; },
    cam,
    malaStopped: false,
    update(time, globalT, u) {
      const fl = lampL.userData.flicker(time);
      lampR.userData.flicker(time + 5);
      lightL.intensity = 9 * (0.88 + fl * .16);

      /* rim eases up once we are close — presence, not portrait */
      rim.intensity = 4.5;

      /* mala: slow rotation, then stillness (u ≈ .3) */
      const malaSpeed = 1 - smooth(remap(u, .22, .32));
      this.malaStopped = malaSpeed <= 0;
      const rot = malaGroup.userData.rot = (malaGroup.userData.rot ?? 0) + malaSpeed * .0035;
      for (let i = 0; i < beadN; i++) {
        const a = i / beadN * Math.PI * 2 + rot;
        // a loop of beads hanging over the edge of the lap
        const r = .13 + Math.sin(a) * .012;
        _m.makeTranslation(Math.sin(a) * r, -Math.abs(Math.cos(a)) * .34 + .04, Math.cos(a) * r * .4);
        beads.setMatrixAt(i, _m);
      }
      beads.instanceMatrix.needsUpdate = true;

      /* ambient motion dies down toward the stillness */
      const quiet = smooth(remap(u, .15, .4));
      rim.intensity = 5 + Math.sin(time * .8) * .4 * (1 - quiet);

      /* slabs move into place (u .38 – .8) */
      const slabU = remap(u, .38, .8);
      for (const s of slabs) {
        const su = smooth(remap(slabU, s.d, s.d + .34));
        s.m.visible = su > 0.001;
        if (s.m.visible) s.m.position.lerpVectors(s.from, s.to, su);
      }

      /* light retreats as the enclosure closes */
      const closed = smooth(remap(u, .68, .84));
      lampL.scale.setScalar(Math.max(.001, 1 - closed));
      lampR.scale.setScalar(Math.max(.001, 1 - closed));
      lightL.intensity *= (1 - closed * .92);
      lightR.intensity = 7 * (0.9 + Math.sin(time * 7) * .06) * (1 - closed * .92);
      rim.intensity *= (1 - closed);
      rimGlow.material.opacity = .1 * (1 - closed);
      hemi.intensity = .55 * (1 - closed * .8);
      frontFill.intensity = 1.3 * (1 - closed);

      /* the close stone face at the very end */
      const near = smooth(remap(u, .9, 1));
      closeStone.visible = near > .01;
      closeLight.intensity = near * 2.4;
    },
  };
}
