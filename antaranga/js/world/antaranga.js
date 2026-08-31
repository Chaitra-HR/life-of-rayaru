// ANTARANGA · scene 08 — the signature sequence. A museum-quality, reverential
// architectural separation of the Brindavana, the presence within, and the
// 1,200 Lakshminarayana Shaligramas.
import * as THREE from 'three';
import { buildBrindavana } from './brindavana.js';
import { stoneCanvas, palmLeafCanvas, canvas, tex, textMesh, glowSprite, mulberry, lerp, remap, smooth, win, V3 } from '../util.js';

export const ANTARANGA_Y = 2800;

/* shaligrama surface: near-black stone with faint chakra ring markings */
function shaligramaCanvas(size = 512) {
  const [c, g] = canvas(size, size);
  g.fillStyle = '#151312'; g.fillRect(0, 0, size, size);
  const rnd = mulberry(1200);
  // mottling
  g.globalAlpha = .16;
  for (let i = 0; i < 900; i++) {
    g.fillStyle = rnd() > .5 ? '#221e1c' : '#0c0a09';
    const r = rnd() * 3;
    g.beginPath(); g.arc(rnd() * size, rnd() * size, r, 0, 7); g.fill();
  }
  // chakra-like ring markings — subtle, natural
  g.globalAlpha = .28; g.strokeStyle = '#060505'; g.lineWidth = 3;
  for (let k = 0; k < 3; k++) {
    const cx = size * (.25 + rnd() * .5), cy = size * (.3 + rnd() * .4);
    for (let r = 8; r < 46; r += 9) {
      g.beginPath(); g.arc(cx, cy, r, rnd() * 2, rnd() * 2 + 4.5); g.stroke();
    }
  }
  g.globalAlpha = 1;
  return c;
}

export function createAntarangaStage(ctx) {
  const g = new THREE.Group();
  g.position.y = ANTARANGA_Y;
  g.visible = false;
  const rnd = mulberry(808);

  /* void floor: barely-there reflection plane */
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 48),
    new THREE.MeshStandardMaterial({ color: 0x050606, roughness: .35, metalness: .4 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.02;
  g.add(floor);

  /* the brindavana, complete, centered */
  const brnd = buildBrindavana({ withMala: true });
  g.add(brnd.group);

  /* the inner enclosure + presence, revealed by the separation */
  const inner = new THREE.Group();
  inner.position.y = 1.85;   // centred in the niche cavity of the rebuilt structure
  g.add(inner);
  const innerBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 1.5, 1.7),
    new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [22, 24, 23], 9, 57)), roughness: .97, transparent: true, opacity: 0 })
  );
  innerBox.position.y = .7;
  inner.add(innerBox);
  // presence: light, not body — a seated volume of quiet luminance
  const presence = new THREE.Group();
  presence.position.y = .28;
  inner.add(presence);
  const pGlowLow = glowSprite(0xc8874a, 1.15, 0);   // padmasana base
  pGlowLow.position.y = .28;
  const pGlowHigh = glowSprite(0xd8a068, .6, 0);    // stillness above
  pGlowHigh.position.y = .82;
  const pCone = new THREE.Mesh(
    new THREE.ConeGeometry(.42, 1.1, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x8a5526, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  pCone.position.y = .55;
  presence.add(pGlowLow, pGlowHigh, pCone);
  const pLight = new THREE.PointLight(0xcf8a45, 0, 5, 2);
  pLight.position.y = .7;
  presence.add(pLight);

  /* interior objects — introduced one by one */
  const items = new THREE.Group();
  g.add(items);
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x2e1d10, roughness: .9 });
  const mkLabel = (s, x, y, z) => {
    const t = textMesh(s, { font: 'sans', px: 44, worldH: .085, color: 'rgba(220,210,190,.9)', blend: 'add' });
    t.position.set(x, y, z);
    t.material.opacity = 0;
    items.add(t);
    return t;
  };
  // vyasa peetha
  const vp = new THREE.Group();
  const vpB = new THREE.Mesh(new THREE.BoxGeometry(.5, .09, .4), woodMat);
  const vpT = new THREE.Mesh(new THREE.BoxGeometry(.42, .06, .34), woodMat);
  vpT.position.y = .08; vp.add(vpB, vpT);
  vp.position.set(-1.35, 1.62, 1.5);
  items.add(vp);
  const vpLabel = mkLabel('Vyāsa Pīṭha', -1.35, 1.95, 1.5);
  // texts
  const msMat = new THREE.MeshStandardMaterial({ map: tex(palmLeafCanvas(23)), roughness: .8 });
  const texts = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const ms = new THREE.Mesh(new THREE.BoxGeometry(.4, .05, .1), msMat);
    ms.position.y = i * .055;
    ms.rotation.y = rnd() * .4;
    texts.add(ms);
  }
  texts.position.set(-.45, 1.62, 1.9);
  items.add(texts);
  const txLabel = mkLabel('granthas', -.45, 1.9, 1.9);
  // japa mala coiled
  const mala = new THREE.Group();
  const beadMat2 = new THREE.MeshStandardMaterial({ color: 0x2e2013, roughness: .5 });
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * Math.PI * 4.2;
    const b = new THREE.Mesh(new THREE.SphereGeometry(.018, 6, 6), beadMat2);
    b.position.set(Math.cos(a) * (.09 + a * .008), .012 * (i % 2), Math.sin(a) * (.09 + a * .008));
    mala.add(b);
  }
  mala.position.set(.5, 1.64, 1.9);
  items.add(mala);
  const mlLabel = mkLabel('japa mālā', .5, 1.9, 1.9);
  // copper vessel — the shaligrama container
  const copperMat = new THREE.MeshStandardMaterial({ color: 0x71431f, metalness: .8, roughness: .55 });
  const vesselPts = [];
  for (let s = 0; s <= 9; s++) {
    const t = s / 9;
    vesselPts.push(new THREE.Vector2(.34 * (0.55 + Math.sin(t * 2.6) * .5) + .06, t * .42));
  }
  const vessel = new THREE.Mesh(new THREE.LatheGeometry(vesselPts, 22), copperMat);
  vessel.position.set(1.4, 1.6, 1.5);
  items.add(vessel);
  const cvLabel = mkLabel('tāmra pātra', 1.4, 2.5, 1.9);
  const labels = [vpLabel, txLabel, mlLabel, cvLabel];

  /* slim floating pedestals beneath each object — museum stillness */
  const pedMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [20, 22, 21], 8, 67)), roughness: .96 });
  for (const [px, py, pz, pr] of [[-1.35, 1.585, 1.5, .38], [-.45, 1.585, 1.9, .3], [.5, 1.605, 1.9, .22], [1.4, 1.565, 1.5, .42]]) {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr * .92, .05, 22), pedMat);
    ped.position.set(px, py, pz);
    items.add(ped);
  }

  /* shaligramas — varied, dark, never shiny */
  const shalTex = tex(shaligramaCanvas());
  const shalMat = new THREE.MeshStandardMaterial({ map: shalTex, roughness: .62, metalness: .08 });
  const baseGeo = new THREE.IcosahedronGeometry(.08, 2);
  {
    // organic irregularity baked into the geometry
    const p = baseGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
      const d = 1 + (Math.sin(v.x * 31) + Math.sin(v.y * 27) + Math.sin(v.z * 23)) * .035;
      v.multiplyScalar(d);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    baseGeo.computeVertexNormals();
  }
  const SH_N = ctx.isMobile ? 90 : 170;
  const shals = new THREE.InstancedMesh(baseGeo, shalMat, SH_N);
  shals.frustumCulled = false;
  g.add(shals);
  const shalData = [];
  for (let i = 0; i < SH_N; i++) {
    // heap position: settled inside the vessel's mouth
    const a = rnd() * Math.PI * 2, r = Math.pow(rnd(), .6) * .2;
    const heap = new THREE.Vector3(1.4 + Math.cos(a) * r, 1.78 + rnd() * .16 - r * .3, 1.5 + Math.sin(a) * r);
    // risen position: a quiet field filling the dark
    const a2 = rnd() * Math.PI * 2, r2 = 1 + Math.pow(rnd(), .7) * 6;
    const rise = new THREE.Vector3(Math.cos(a2) * r2, 1.2 + rnd() * 3.4, Math.sin(a2) * r2 * .8 + 1);
    shalData.push({ heap, rise, s: .38 + rnd() * .72, rx: rnd() * 3, ry: rnd() * 3, ph: rnd() * 7 });
  }

  /* hero shaligrama */
  const heroGeo = new THREE.SphereGeometry(.5, ctx.isMobile ? 72 : 112, ctx.isMobile ? 48 : 72);
  {
    const p = heroGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
      const d = 1
        + Math.sin(v.x * 8.2) * .028 + Math.sin(v.y * 7.1 + 2) * .036
        + Math.sin(v.z * 9.3 + 4) * .028 + Math.sin((v.x + v.y) * 15) * .008;
      v.multiplyScalar(d);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    heroGeo.computeVertexNormals();
  }
  const hero = new THREE.Mesh(heroGeo, new THREE.MeshStandardMaterial({
    map: shalTex, roughness: .52, metalness: .1,
  }));
  hero.position.set(1.4, 2.6, 3.2);
  hero.scale.setScalar(0.001);
  hero.visible = false;
  g.add(hero);
  const heroLight = new THREE.PointLight(0xa87848, 0, 6, 2);
  heroLight.position.set(2.3, 3.3, 4.3);
  g.add(heroLight);

  /* lighting: one confident key, cool fill, darkness elsewhere */
  const key = new THREE.SpotLight(0xcfb890, 900, 70, .55, .6, 1.3);
  key.position.set(9, 12, 8);
  key.target.position.set(0, 2, 0);
  g.add(key, key.target);
  const fill = new THREE.DirectionalLight(0x2c3742, .85);
  fill.position.set(-8, 4, -6);
  g.add(fill);
  const warmBack = new THREE.DirectionalLight(0x8a5a2c, .5);
  warmBack.position.set(-6, 6, 9);
  g.add(warmBack);
  const under = new THREE.PointLight(0x3a2c18, 6, 14, 2);
  under.position.set(0, .4, 4);
  g.add(under);

  /* camera — one authored path through the whole sequence */
  const cam = (u) => {
    if (u < .14) {
      const v = smooth(remap(u, 0, .14));
      return { pos: V3(lerp(.5, 3.2, v), lerp(2.2, 2.8, v), lerp(13.5, 11, v)), look: V3(0, 2.3, 0), fov: lerp(36, 40, v) };
    }
    if (u < .52) {
      const v = smooth(remap(u, .14, .52));
      const a = lerp(.28, -.55, v);   // slow arc around the separating structure
      const r = lerp(11, 8.2, v);
      return {
        pos: V3(Math.sin(a) * r + 1, lerp(2.8, 4.4, v), Math.cos(a) * r),
        look: V3(0, lerp(2.3, 2.9, v), 0),
        fov: 40,
      };
    }
    if (u < .64) {
      const v = smooth(remap(u, .52, .64));
      // move in among the interior objects
      return {
        pos: V3(lerp(-4.4, -.6, v), lerp(4.2, 2.15, v), lerp(6.8, 3.9, v)),
        look: V3(lerp(0, .4, v), lerp(2.9, 1.75, v), lerp(0, 1.55, v)),
        fov: lerp(40, 38, v),
      };
    }
    if (u < .8) {
      const v = smooth(remap(u, .64, .8));
      // toward the copper vessel and the risen field of stones
      return {
        pos: V3(lerp(-.6, 1.4, v), lerp(2.15, 2.25, v), lerp(3.9, 4.6, v)),
        look: V3(lerp(.4, 1.4, v), lerp(1.75, 2.05, v), lerp(1.55, 1.6, v)),
        fov: lerp(38, 42, v),
      };
    }
    const v = smooth(remap(u, .8, 1));
    // isolate one — approach until its surface becomes a landscape
    // (hero surface faces the camera at z ≈ 3.7; stop just above it)
    return {
      pos: V3(1.4, lerp(2.25, 2.6, v), lerp(4.6, 3.79, easeInCubic(v))),
      look: V3(1.4, lerp(2.05, 2.6, v), lerp(1.6, 3.2, v)),
      fov: lerp(42, 26, v),
    };
  };

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();
  return {
    group: g,
    setVisible(v) { g.visible = v; },
    cam,
    update(time, globalT, u) {
      /* light rises out of darkness */
      const reveal = smooth(remap(u, .02, .12));
      key.intensity = 260 * reveal * (1 - smooth(remap(u, .84, .98)) * .85);
      fill.intensity = .5 * reveal;

      /* the slow, reverential separation */
      const ex = smooth(remap(u, .14, .52));
      brnd.explode(ex * 1);
      // the draped mala withdraws once the stone begins to move
      if (brnd.parts.mala) {
        const mv = 1 - smooth(remap(u, .14, .3));
        brnd.parts.mala.visible = mv > .01;
        for (const bm of brnd.parts.mala.userData.mats || []) { bm.transparent = true; bm.opacity = mv; }
      }

      /* inner enclosure becomes visible as parts clear */
      const innerVis = smooth(remap(u, .3, .5));
      innerBox.material.opacity = innerVis * .92;
      const pres = smooth(remap(u, .42, .56));
      pGlowLow.material.opacity = pres * .3;
      pGlowHigh.material.opacity = pres * .22;
      pCone.material.opacity = pres * .05 * (1 + Math.sin(time * .6) * .12);
      pLight.intensity = pres * 3.2;

      /* interior objects and their small annotations */
      const itemWins = [
        smooth(remap(u, .5, .56)) * (1 - smooth(remap(u, .9, 1))),
        smooth(remap(u, .54, .6)) * (1 - smooth(remap(u, .9, 1))),
        smooth(remap(u, .58, .64)) * (1 - smooth(remap(u, .9, 1))),
        smooth(remap(u, .6, .66)),
      ];
      items.visible = u > .46;
      vp.visible = itemWins[0] > 0; texts.visible = itemWins[1] > 0;
      mala.visible = itemWins[2] > 0; vessel.visible = itemWins[3] > 0;
      for (let i = 0; i < 4; i++) {
        labels[i].material.opacity = itemWins[i] * .55 * win(u, .5, .54, .78, .84);
      }

      /* shaligramas: heap, then a quiet risen field */
      const shVis = smooth(remap(u, .62, .68));
      shals.visible = shVis > .01;
      if (shals.visible) {
        const riseU = smooth(remap(u, .68, .8));
        const fadeHero = smooth(remap(u, .84, .94));
        for (let i = 0; i < SH_N; i++) {
          const d = shalData[i];
          // only a modest number rest in the vessel; the rest become visible
          // as the field rises — the count is felt, not crowded
          const inVessel = i < 44;
          const appear = inVessel ? 1 : smooth(remap(riseU, (i % 20) / 40, (i % 20) / 40 + .4));
          const px = lerp(d.heap.x, d.rise.x, riseU);
          const py = lerp(d.heap.y, d.rise.y, riseU) + Math.sin(time * .3 + d.ph) * .04 * riseU;
          const pz = lerp(d.heap.z, d.rise.z, riseU);
          _e.set(d.rx + time * .04 * riseU, d.ry, 0);
          _q.setFromEuler(_e);
          const sc = d.s * shVis * appear * (1 - fadeHero * .9);
          _s.setScalar(Math.max(sc, .001));
          _m.compose(new THREE.Vector3(px, py, pz), _q, _s);
          shals.setMatrixAt(i, _m);
        }
        shals.instanceMatrix.needsUpdate = true;
      }

      /* the one — held, approached, entered */
      const heroU = smooth(remap(u, .8, .88));
      hero.visible = heroU > .001;
      hero.scale.setScalar(Math.max(heroU, .001));
      hero.rotation.y = time * .05 * (1 - smooth(remap(u, .86, .94)));
      heroLight.intensity = heroU * 14 * (1 - smooth(remap(u, .96, 1)));

      /* labels/annotations face the camera */
      // handled cheaply: they are near-frontal already at these camera angles
    },
  };
}

function easeInCubic(t) { return t * t * t; }
