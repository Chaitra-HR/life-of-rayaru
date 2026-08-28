// ANTARANGA · scene 05 — Anugraha. Venkanna's letter, then the Nawab's vessels.
// The third beat (the branch) lives inside the Manchale stage so grace flows
// straight into the landscape.
import * as THREE from 'three';
import { canvas, tex, stoneCanvas, flame, glowSprite, mulberry, lerp, clamp01, remap, smooth, win, camTrack, V3 } from '../util.js';

export const ANUGRAHA_Y = 1600;

/* the letter's paper: blank vs written — legibility comes with the akshate */
function letterCanvas(withText) {
  const [c, g] = canvas(256, 384);
  g.fillStyle = '#c9b98f'; g.fillRect(0, 0, 256, 384);
  const rnd = mulberry(7);
  // paper mottling
  g.globalAlpha = .1;
  for (let i = 0; i < 300; i++) { g.fillStyle = rnd() > .5 ? '#8a7a52' : '#e6dcbc'; g.fillRect(rnd() * 256, rnd() * 384, 2, 2); }
  g.globalAlpha = 1;
  // fold shadows
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 122, 256, 5); g.fillRect(0, 252, 256, 5);
  if (withText) {
    g.strokeStyle = 'rgba(40,26,10,.85)'; g.lineWidth = 1.6; g.lineCap = 'round';
    for (let row = 0; row < 11; row++) {
      const y = 36 + row * 30;
      let x = 26;
      while (x < 226) {
        const w = 7 + rnd() * 14;
        g.beginPath();
        g.moveTo(x, y + (rnd() - .5) * 4);
        g.bezierCurveTo(x + w * .3, y - 6 + rnd() * 4, x + w * .6, y + 6 - rnd() * 4, x + w, y + (rnd() - .5) * 4);
        g.stroke();
        if (rnd() > .5) { g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + w, y - 7); g.stroke(); }
        x += w + 3 + rnd() * 5;
      }
    }
  } else {
    // ghost of unreadable marks
    g.strokeStyle = 'rgba(60,42,20,.16)'; g.lineWidth = 1.6;
    for (let row = 0; row < 11; row++) {
      const y = 36 + row * 30;
      g.beginPath(); g.moveTo(24, y); g.lineTo(226, y + (rnd() - .5) * 6); g.stroke();
    }
  }
  return c;
}

export function createAnugrahaStage(ctx) {
  const g = new THREE.Group();
  g.position.y = ANUGRAHA_Y;
  g.visible = false;
  const rnd = mulberry(303);

  /* ---------- beat A · the letter ---------- */
  const beatA = new THREE.Group();
  g.add(beatA);
  const woodMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [44, 30, 18], 12, 15), { repeat: [2, 2] }), roughness: .9 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(3, .12, 2), woodMat);
  table.position.y = -.06;
  beatA.add(table);

  const letter = new THREE.Group();
  const blankTex = tex(letterCanvas(false));
  const writtenTex = tex(letterCanvas(true));
  const paperGeo = new THREE.PlaneGeometry(.52, .78);
  const blank = new THREE.Mesh(paperGeo, new THREE.MeshStandardMaterial({ map: blankTex, roughness: .9, side: THREE.DoubleSide }));
  const written = new THREE.Mesh(paperGeo, new THREE.MeshStandardMaterial({ map: writtenTex, roughness: .9, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  written.position.z = .001;
  letter.add(blank, written);
  letter.rotation.x = -Math.PI / 2 + .06;
  letter.position.set(0, .015, .1);
  beatA.add(letter);

  const lampA = flame(.9);
  lampA.position.set(.9, .3, -.5);
  beatA.add(lampA);
  const lightA = new THREE.PointLight(0xff9a45, 7, 8, 2);
  lightA.position.set(.9, .6, -.5);
  beatA.add(lightA);
  // a soft light that stays with the letter as it lifts into the dark
  const letterLight = new THREE.PointLight(0xd9963f, 0, 6, 2);
  beatA.add(letterLight);
  const hemiA = new THREE.HemisphereLight(0x1a1410, 0x070503, .7);
  beatA.add(hemiA);

  /* mantrakshate — a few saffron-tinted grains drifting across */
  const grainN = 26;
  const grainGeo = new THREE.CapsuleGeometry(.006, .018, 2, 6);
  const grainMat = new THREE.MeshStandardMaterial({ color: 0xc8963c, roughness: .6, emissive: 0x442805, emissiveIntensity: .5 });
  const grains = new THREE.InstancedMesh(grainGeo, grainMat, grainN);
  grains.frustumCulled = false;
  beatA.add(grains);
  const grainData = [];
  for (let i = 0; i < grainN; i++) grainData.push({ x0: -1.6 - rnd() * .8, z: (rnd() - .5) * .7, h: .05 + rnd() * .25, sp: .8 + rnd() * .5, ph: rnd() * 7 });

  /* ---------- beat B · the vessels ---------- */
  const beatB = new THREE.Group();
  beatB.position.set(0, 0, -30);
  g.add(beatB);
  const stoneFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5, .2, 24),
    new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [40, 38, 34], 12, 55), { repeat: [3, 3] }), roughness: .95 })
  );
  stoneFloor.position.y = -.1;
  beatB.add(stoneFloor);

  const copper = new THREE.MeshStandardMaterial({ color: 0x5e3a1e, metalness: .68, roughness: .58 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0xb8a072, roughness: 1, side: THREE.DoubleSide });
  const vessels = [];
  const vesselProfile = [];
  for (let s = 0; s <= 8; s++) {
    const t = s / 8;
    vesselProfile.push(new THREE.Vector2(.28 * (1 + Math.sin(t * Math.PI) * .55) * (t > .9 ? .82 : 1), t * .5));
  }
  for (let i = 0; i < 5; i++) {
    const v = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.LatheGeometry(vesselProfile, 18), copper);
    v.add(pot);
    // cloth cover: soft dome
    const coverPts = [];
    for (let s = 0; s <= 6; s++) {
      const t = s / 6;
      coverPts.push(new THREE.Vector2(.34 * (1 - t * t * .9) + .02, .5 + t * .14 + Math.sin(t * 8) * .008));
    }
    const cover = new THREE.Mesh(new THREE.LatheGeometry(coverPts, 16), clothMat.clone());
    cover.material.transparent = true;
    v.add(cover);
    // hidden offering: flowers/fruit cluster
    const cluster = new THREE.Group();
    for (let k = 0; k < 7; k++) {
      const isFlower = k % 2 === 0;
      const bit = new THREE.Mesh(
        new THREE.SphereGeometry(isFlower ? .05 : .065, 8, 6),
        new THREE.MeshStandardMaterial({ color: isFlower ? 0xb35c1e : 0x5a6626, roughness: .8 })
      );
      const a = rnd() * 7, r = rnd() * .16;
      bit.position.set(Math.cos(a) * r, .52 + rnd() * .06, Math.sin(a) * r);
      cluster.add(bit);
    }
    cluster.visible = false;
    v.add(cluster);
    const a = (i / 5) * Math.PI * 1.15 - Math.PI * .58;
    v.position.set(Math.sin(a) * 1.7, 0, -Math.cos(a) * .9 + .3);
    beatB.add(v);
    vessels.push({ v, cover, cluster, delay: i * .12 });
  }

  const lampB = flame(1);
  lampB.position.set(-1.8, .5, 1.4);
  beatB.add(lampB);
  const lightB = new THREE.PointLight(0xff9a45, 13, 12, 2);
  lightB.position.set(-1.8, .8, 1.4);
  beatB.add(lightB);
  const lampB2 = flame(.8);
  lampB2.position.set(2.1, .5, .9);
  beatB.add(lampB2);
  const lightB2 = new THREE.PointLight(0xff8a3a, 8, 9, 2);
  lightB2.position.set(2.1, .8, .9);
  beatB.add(lightB2);
  const hemiB = new THREE.HemisphereLight(0x241d14, 0x0a0805, 1.1);
  beatB.add(hemiB);

  /* teertha: a thread of droplets entering across the vessels */
  const dropN = 30;
  const drops = new THREE.InstancedMesh(
    new THREE.SphereGeometry(.014, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0x9ab5a8, roughness: .1, metalness: .3, emissive: 0x22302a, emissiveIntensity: .6 }),
    dropN
  );
  drops.frustumCulled = false;
  beatB.add(drops);

  /* the letter arrives here too (carried by wind) then a petal leaves */
  const petal = new THREE.Mesh(
    new THREE.CircleGeometry(.07, 8),
    new THREE.MeshBasicMaterial({ color: 0xb35c1e, side: THREE.DoubleSide, transparent: true })
  );
  petal.visible = false;
  g.add(petal);

  const _m = new THREE.Matrix4();

  /* camera: beats A and B (u 0 → .66); the branch belongs to Manchale */
  const cam = (u) => {
    if (u < .34) {
      const v = remap(u, 0, .34);
      // close over the table, then follow the rising letter
      const liftU = smooth(remap(v, .68, 1));
      return {
        pos: V3(
          lerp(.25, -.1, smooth(v)),
          lerp(.75, .95, smooth(v)) + liftU * 2.6,
          lerp(1.15, .85, smooth(v)) + liftU * .4
        ),
        look: V3(0, .05 + liftU * 3.2, .1 - liftU * 1.2),
        fov: lerp(38, 46, liftU),
      };
    }
    const v = remap(u, .34, .66);
    // arrive above the vessels, settle, then follow the petal out
    const out = smooth(remap(v, .82, 1));
    return {
      pos: V3(
        lerp(-.4, 1.2, smooth(v)) + out * .8,
        lerp(3.4, 1.15, smooth(remap(v, 0, .5))),
        -30 + lerp(4.2, 2.6, smooth(v)) - out * 1.4
      ),
      look: V3(lerp(0, .4, v), lerp(.4, .5, v) + out * 1.2, -30 + out * -3),
      fov: 42,
    };
  };

  return {
    group: g,
    setVisible(v) { g.visible = v; },
    cam,
    update(time, globalT, u) {
      /* beat A (u 0–.34) */
      const a = remap(u, 0, .34);
      beatA.visible = u < .42;
      if (beatA.visible) {
        lampA.userData.flicker(time);
        // grains drift across the letter
        const gU = smooth(remap(a, .12, .5));
        for (let i = 0; i < grainN; i++) {
          const d = grainData[i];
          const x = d.x0 + (gU * 3.4 + Math.sin(time * .3 + d.ph) * .04) * d.sp;
          const y = d.h * (0.4 + Math.sin(time * d.sp + d.ph) * .3 + .3) * win(x, -2, -1.2, 1, 1.8);
          _m.makeRotationY(d.ph + time * .4);
          _m.setPosition(x, .03 + y, d.z);
          grains.setMatrixAt(i, _m);
        }
        grains.instanceMatrix.needsUpdate = true;
        // writing becomes legible as the akshate passes
        written.material.opacity = smooth(remap(a, .3, .62));
        // the letter lifts into the wind
        const lift = smooth(remap(a, .68, 1));
        letter.position.y = .015 + lift * 3.4;
        letter.position.z = .1 - lift * 1.4;
        letter.rotation.x = -Math.PI / 2 + .06 + lift * 1.2;
        letter.rotation.z = lift * .8 + Math.sin(time * 1.2) * .08 * lift;
        letterLight.intensity = lift * 5;
        letterLight.position.set(letter.position.x + .5, letter.position.y + .4, letter.position.z + .6);
      }

      /* beat B (u .34–.66) */
      const b = remap(u, .34, .66);
      beatB.visible = u > .28 && u < .78;
      if (beatB.visible) {
        lampB.userData.flicker(time + 3);
        lampB2.userData.flicker(time + 7);
        // teertha thread arcs in
        const tIn = win(b, .06, .18, .5, .66);
        drops.visible = tIn > .01;
        if (drops.visible) {
          for (let i = 0; i < dropN; i++) {
            const s = ((i / dropN) + time * .16) % 1;
            const x = lerp(-3.4, 1.6, s);
            const y = .5 + Math.sin(s * Math.PI) * 1.6;
            const z = -30 + lerp(1.8, -.4, s) + Math.sin(s * 9) * .1;
            _m.makeTranslation(x, y, z);
            drops.setMatrixAt(i, _m);
          }
          drops.instanceMatrix.needsUpdate = true;
          drops.material.opacity = tIn; drops.material.transparent = true;
        }
        // covers lift, offerings appear — quiet, no flash
        for (const vs of vessels) {
          const lu = smooth(remap(b, .34 + vs.delay, .58 + vs.delay));
          vs.cover.position.y = lu * .5;
          vs.cover.rotation.z = lu * .5;
          vs.cover.material.opacity = 1 - smooth(remap(lu, .6, 1));
          vs.cluster.visible = lu > .35;
        }
        // one petal leaves
        const pu = smooth(remap(b, .8, 1));
        petal.visible = pu > 0 && u < .78;
        if (petal.visible) {
          petal.position.set(
            .4 + pu * 2.2,
            .6 + pu * 2 + Math.sin(time * 2) * .05,
            -30 - pu * 5
          );
          petal.rotation.set(time * .8, time * .5, 0);
          petal.material.opacity = 1 - smooth(remap(pu, .85, 1));
        }
      }
    },
  };
}
