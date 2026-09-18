// ANTARANGA · CloudLayer — cumulus over the river, drifting far off.
//
// Painted banks with a lit crown and a shaded base (the light from above
// and a little to the left, as the sun's), soft-edged, on camera-facing
// sprites well behind the far bank and high enough to stand over the
// gateway. They take the hour's light (setHour): the dawn catches their
// tops in rose-cream over a mauve base, the day whitens them, the dusk
// reddens them, the night keeps them as faint grey shapes against the
// stars. Wrapped outside the frustum so they never reset on screen; tens
// of seconds to cross, not seconds.
import * as THREE from 'three';
import { mulberry, fbm } from '../util.js';

function cumulusTexture(seed) {
  const W = 512, H = 288, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), img = x.createImageData(W, H), d = img.data;
  const rr = mulberry(seed), ox = rr() * 100, oy = rr() * 100;
  /* the bank: a flat-bottomed heap of billows, the biggest near the middle */
  const N = 22, blobs = [];
  for (let i = 0; i < N; i++) {
    const u = .12 + (i / (N - 1)) * .76 + (rr() - .5) * .05;
    const mid = 1 - Math.abs(u - .5) * 1.7;
    const r = (.10 + .16 * Math.max(0, mid) + rr() * .06) * (.8 + rr() * .3);
    blobs.push([u, .70 - r * (.55 + rr() * .5), r]);
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = i / W, v = j / H;
    let s = 0, top = 1;
    for (const [bu, bv, br] of blobs) {
      const dx = (u - bu) * (W / H), dy = v - bv;
      const dd = Math.hypot(dx, dy) / br;
      if (dd < 1.3) { s = Math.max(s, 1 - dd); top = Math.min(top, (v - (bv - br)) / (2 * br)); }
    }
    const n = fbm(u * 6 + ox, v * 8 + oy, 4) + .5, n2 = fbm(u * 18 + ox * 2, v * 22 + oy * 2, 3) + .5;
    let a = THREE.MathUtils.clamp(s * 2.6 + (n - .5) * 1.2 + (n2 - .5) * .5 - .25, 0, 1);
    { const b0 = .66 + (n - .5) * .22; a *= 1 - THREE.MathUtils.smoothstep(v, b0, b0 + .22); }   // the base, level but never a ruled line (a straight edge read as a band at night)
    a = Math.pow(a, 1.25);
    /* the light: the crown bright, the base in its own shadow, the noise breaking it into billows */
    const lit = THREE.MathUtils.clamp(1.0 - top * .38 - (v - .3) * .22 + (n2 - .5) * .28, .56, 1);
    const k = (j * W + i) * 4;
    const L = 255 * lit;
    d[k] = L; d[k + 1] = L * (.985 + top * .01); d[k + 2] = L * (.96 + top * .04); d[k + 3] = a * 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createClouds({ count = 6, seed = 5, mobile = false } = {}) {
  const g = new THREE.Group();
  const rr = mulberry(seed);
  const n = mobile ? Math.min(count, 4) : count;
  const textures = [cumulusTexture(11), cumulusTexture(17), cumulusTexture(23), cumulusTexture(29)];
  const clouds = [];
  for (let i = 0; i < n; i++) {
    const far = i / Math.max(1, n - 1);                         // 0 nearer … 1 farthest
    const mat = new THREE.SpriteMaterial({ map: textures[i % textures.length], transparent: true, depthWrite: false, fog: false, opacity: 0, color: 0xffffff });
    const s = new THREE.Sprite(mat);
    const w = 60 + far * 90 + rr() * 50;
    s.scale.set(w, w * (288 / 512), 1);
    const z = -170 - far * 240;
    s.position.set((rr() - .5) * 340, 16 + far * 22 + rr() * 10, z);
    s.renderOrder = 1;
    g.add(s);
    clouds.push({ s, z, far, speed: (.14 + (1 - far) * .30) * (rr() < .5 ? 1 : .85), w, range: 300 + far * 200 });
  }
  const C = {
    dawnHi: new THREE.Color(0xf4dccb), dawnLo: new THREE.Color(0x8a7690),
    day: new THREE.Color(0xf6f4ef), dayFar: new THREE.Color(0xdfe2e4),
    dusk: new THREE.Color(0xc99a84), night: new THREE.Color(0x767c8e),
  };
  const tmp = new THREE.Color();
  return {
    group: g,
    update(time, dt) {
      for (const c of clouds) {
        c.s.position.x += c.speed * dt;                         // world units per second: a crossing takes tens of seconds
        const lim = c.range;
        if (c.s.position.x > lim + c.w) c.s.position.x = -lim - c.w;   // recycled while off-frustum
      }
    },
    /* dawn: the opening's dial 0..1 (pre-dawn → morning); day, night: the chapters' hours */
    setHour({ dawn = 1, day = 0, night = 0 } = {}) {
      for (const c of clouds) {
        tmp.copy(C.dawnLo).lerp(C.dawnHi, THREE.MathUtils.clamp(dawn * 1.1, 0, 1) * (1 - c.far * .25));
        tmp.lerp(c.far > .5 ? C.dayFar : C.day, day);
        tmp.lerp(C.dusk, Math.min(1, night * 2) * (1 - night));   // reddened through the dusk, then grey
        tmp.lerp(C.night, night);
        c.s.material.color.copy(tmp);
        c.s.material.opacity = (.34 + .30 * dawn) * (1 - c.far * .3) * (1 - night * .74) * (1 - day * .15);
      }
    },
    setVisible(v) { g.visible = v; },
  };
}
