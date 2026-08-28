// ANTARANGA · CloudLayer — a few large, almost invisible cloud formations
// drifting at different depths and speeds. Camera-facing sprites with a
// soft procedural texture; wrapped outside the frustum so they never reset
// on screen. Tens of seconds to cross, not seconds.
import * as THREE from 'three';
import { mulberry, fbm } from '../util.js';

function cloudTexture(seed) {
  const W = 512, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), img = x.createImageData(W, H), d = img.data;
  const rr = mulberry(seed), ox = rr() * 100, oy = rr() * 100;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = i / W, v = j / H;
    // an elongated soft mass, denser in the middle, ragged at the edges
    const ell = 1 - Math.pow((u - .5) * 2.1, 2) - Math.pow((v - .52) * 2.6, 2);
    const n = fbm(u * 5.5 + ox, v * 6 + oy, 4) + .5;
    const n2 = fbm(u * 14 + ox * 2, v * 14 + oy * 2, 3) + .5;
    let a = THREE.MathUtils.clamp(ell * 1.3 + (n - .55) * 1.4 + (n2 - .5) * .35, 0, 1);
    a = Math.pow(a, 1.6);
    // the underside is a touch warmer, the crown a touch cooler
    const warm = THREE.MathUtils.clamp((v - .4) * 1.4, 0, 1);
    const k = (j * W + i) * 4;
    d[k] = 236 + warm * 12; d[k + 1] = 236 + warm * 4; d[k + 2] = 242 - warm * 10; d[k + 3] = a * 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createClouds({ count = 5, seed = 5, mobile = false } = {}) {
  const g = new THREE.Group();
  const rr = mulberry(seed);
  const n = mobile ? Math.min(count, 3) : count;
  const textures = [cloudTexture(11), cloudTexture(17), cloudTexture(23)];
  const clouds = [];
  for (let i = 0; i < n; i++) {
    const far = i / Math.max(1, n - 1);                         // 0 nearer … 1 farthest
    const mat = new THREE.SpriteMaterial({
      map: textures[i % textures.length], transparent: true, depthWrite: false, fog: false,
      opacity: .24 + (1 - far) * .14,                           // clearly present, quietly adrift
      color: new THREE.Color().setHSL(.6, .06, .97 - far * .05),
    });
    const s = new THREE.Sprite(mat);
    const w = 70 + far * 120 + rr() * 40;
    s.scale.set(w, w * (.22 + rr() * .1), 1);
    const z = -150 - far * 260;
    // spawned inside the visible sky, not scattered half off-frame
    s.position.set((rr() - .5) * 300, 34 + far * 34 + rr() * 10, z);
    s.renderOrder = 1;
    g.add(s);
    clouds.push({ s, z, speed: (.16 + (1 - far) * .38) * (rr() < .5 ? 1 : .85), w, range: 320 + far * 220 });
  }
  return {
    group: g,
    update(time, dt) {
      for (const c of clouds) {
        c.s.position.x += c.speed * dt;                         // world units per second: a crossing takes tens of seconds
        const lim = c.range;
        if (c.s.position.x > lim + c.w) c.s.position.x = -lim - c.w;   // recycled while off-frustum
      }
    },
    setVisible(v) { g.visible = v; },
  };
}
