// ANTARANGA · scene 07 / The Journey — THE LANDMARKS.
// Five miniature buildings standing on the terrain in place of map pins.
// They are deliberately not the same model five times: Srirangam sets the
// Dravidian language, Kumbakonam answers it with different proportions,
// Madurai is the elaborate one, Udupi breaks into coastal Karnataka, and
// Manchale is quiet — a matha, not a monument.
//
// Each is built at three levels of detail: a silhouette that reads from far
// across the land, a mid model, and the near model with its carving.
import * as THREE from 'three';
import { mergeGeometries } from '../../../vendor/BufferGeometryUtils.js';
import { canvas, stoneCanvas, tex, lerp } from '../../util.js';
import { height } from './field.js';

/* ---------------- materials ---------------- */
function stone(base, variance, seed, extra = {}) {
  // 128 is plenty: these are miniature buildings and the map is a mottle,
  // not a pattern — at 256 the seven textures cost more to draw than the
  // whole terrain did to displace
  return new THREE.MeshStandardMaterial({
    map: tex(stoneCanvas(128, base, variance, seed)),
    roughness: .96, metalness: 0, ...extra,
  });
}

export function landmarkMaterials() {
  return {
    // aged sandstone — the Tamil temples
    sand: stone([150, 128, 96], 15, 41),
    // a greyer, harder granite for plinths and the northern stone
    granite: stone([120, 116, 104], 13, 57),
    // the tanks: still, dark, low-saturation water held inside stone steps
    tank: new THREE.MeshStandardMaterial({ color: 0x33403a, roughness: .22, metalness: .05 }),
    // weathered plaster of the coast
    plaster: stone([160, 143, 122], 11, 73),
    // muted, faded pigments — never a painted toy
    ochre: stone([154, 122, 70], 12, 89),
    terracotta: stone([116, 84, 68], 11, 97),
    verdigris: stone([92, 110, 102], 10, 113),
    tile: stone([104, 82, 68], 11, 131),
    dark: new THREE.MeshStandardMaterial({ color: 0x231c16, roughness: 1 }),
  };
}

/* ---------------- primitives ---------------- */
const B = (w, h, d, x, y, z) => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
};
const CYL = (r, h, seg, x, y, z) => {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  g.translate(x, y, z);
  return g;
};
// a square pyramid — the coastal roof, and every finial cap
const PYR = (r, h, x, y, z) => {
  const g = new THREE.ConeGeometry(r, h, 4);
  g.rotateY(Math.PI / 4);
  g.translate(x, y, z);
  return g;
};
const merge = (list) => {
  const l = list.filter(Boolean);
  return l.length ? mergeGeometries(l, false) : null;
};

/* a kalasha: the pot-and-spike finial that crowns everything here */
function kalasha(s, x, y, z) {
  const sph = new THREE.SphereGeometry(s * .85, 6, 5);
  sph.translate(x, y + s * 1.1, z);
  return [
    B(s * 1.5, s * .5, s * 1.5, x, y + s * .25, z),
    sph,
    CYL(s * .18, s * 1.1, 5, x, y + s * 1.9, z),
  ];
}

/* ---------------- the Dravidian gopuram ----------------
   A stepped, tapering tower: plinth, a tall vertical base storey, then
   diminishing tiers under a barrel-vaulted crown carrying a row of finials.
   Every proportion here is a parameter so no two towers repeat. */
function gopuram({
  tiers = 6, H = 3.0, baseW = 1.15, baseD = .8, taper = .6,
  baseStorey = .30, crown = .9, kalashas = 5,
}, detail) {
  const out = [];
  const bodyH = H * (1 - baseStorey);
  const tierH = bodyH / tiers;
  const y0 = H * baseStorey;

  // plinth (adhisthana): two receding courses
  out.push(B(baseW * 1.42, H * .045, baseD * 1.42, 0, H * .0225, 0));
  out.push(B(baseW * 1.24, H * .04, baseD * 1.24, 0, H * .065, 0));
  // the vertical base storey the whole tower rises from
  out.push(B(baseW, y0 - H * .085, baseD, 0, H * .085 + (y0 - H * .085) / 2, 0));

  for (let i = 0; i < tiers; i++) {
    const f = i / tiers;
    const w = baseW * (1 - f * taper), d = baseD * (1 - f * taper);
    const y = y0 + i * tierH;
    out.push(B(w, tierH * .82, d, 0, y + tierH * .41, 0));
    // the cornice slab that reads as a horizontal shadow line from far off
    out.push(B(w * 1.12, tierH * .14, d * 1.14, 0, y + tierH * .89, 0));
    if (detail >= 1) {
      // miniature shrines marching along each cornice — the texture of a
      // gopuram at a distance is this rhythm, not its ornament
      const n = Math.max(2, Math.round(w * (detail >= 2 ? 5.2 : 3.2)));
      for (let k = 0; k < n; k++) {
        const px = lerp(-w * .46, w * .46, n === 1 ? .5 : k / (n - 1));
        const s = tierH * .2;
        out.push(B(s * .9, s, s * .9, px, y + tierH * 1.0 + s * .5, d * .5));
        out.push(B(s * .9, s, s * .9, px, y + tierH * 1.0 + s * .5, -d * .5));
      }
    }
    if (detail >= 2) {
      // pilaster strips on the long faces
      const n = Math.max(2, Math.round(w * 4.4));
      for (let k = 0; k < n; k++) {
        const px = lerp(-w * .40, w * .40, n === 1 ? .5 : k / (n - 1));
        out.push(B(w * .045, tierH * .62, d * .06, px, y + tierH * .38, d * .5));
        out.push(B(w * .045, tierH * .62, d * .06, px, y + tierH * .38, -d * .5));
      }
      // the recessed niche at the centre of the tier
      out.push(B(w * .16, tierH * .46, d * .05, 0, y + tierH * .34, d * .52));
    }
  }

  // the barrel-vaulted crown (śāla) laid across the top
  const wTop = baseW * (1 - taper) * 1.06, dTop = baseD * (1 - taper) * 1.06;
  const yTop = y0 + bodyH;
  const vault = new THREE.CylinderGeometry(dTop * .55, dTop * .55, wTop * crown, 10, 1, false, 0, Math.PI);
  vault.rotateZ(Math.PI / 2);
  vault.rotateY(Math.PI / 2);
  vault.translate(0, yTop + dTop * .1, 0);
  out.push(vault);
  out.push(B(wTop * crown * 1.1, H * .022, dTop * 1.2, 0, yTop + H * .011, 0));
  // the row of kalashas along the ridge
  for (let k = 0; k < kalashas; k++) {
    const px = kalashas === 1 ? 0 : lerp(-wTop * crown * .40, wTop * crown * .40, k / (kalashas - 1));
    out.push(...kalasha(H * .035, px, yTop + dTop * .55, 0));
  }
  // the gateway itself: a dark recess through the base
  const door = [B(baseW * .22, y0 * .68, baseD * .34, 0, y0 * .34, 0)];

  return { stone: merge(out), dark: merge(door) };
}

/* a low tiled roof: a shallow hipped pyramid over a deep eave course —
   the coastal Karnataka roof, which is the whole point of Udupi */
function tiledRoof(w, d, h, x, y, z, eave = .16) {
  const W = w + eave * 2, D = d + eave * 2;
  // a coastal roof is steep; a shallow one reads as a flat plate from above
  const hh = h * 1.6;
  const p = PYR(Math.max(W, D) * .74, hh, 0, hh / 2, 0);
  p.scale(W / Math.max(W, D), 1, D / Math.max(W, D));
  p.translate(x, y, z);
  return [p, B(W * .98, hh * .09, D * .98, x, y + hh * .035, z)];
}

/* ---------------- the five ---------------- */
function buildSrirangam(detail) {
  // tall, vertical, seven diminishing tiers — the tower that sets the
  // architectural language of the whole Tamil country in one silhouette
  const t = gopuram({
    tiers: 7, H: 3.05, baseW: 1.05, baseD: .72, taper: .64,
    baseStorey: .30, kalashas: 5,
  }, detail);
  const granite = [];
  if (detail >= 1) {
    // the concentric prakara walls Srirangam is known for
    for (const [r, hgt] of [[1.75, .13], [2.65, .09]]) {
      granite.push(B(r * 2, hgt, .07, 0, hgt / 2, r));
      granite.push(B(r * 2, hgt, .07, 0, hgt / 2, -r));
      granite.push(B(.07, hgt, r * 2, r, hgt / 2, 0));
      granite.push(B(.07, hgt, r * 2, -r, hgt / 2, 0));
    }
  }
  if (detail >= 2) {
    // a small shrine inside the first enclosure, with its own vimana
    granite.push(B(.46, .26, .46, -.80, .13, .95));
    granite.push(PYR(.31, .30, -.80, .41, .95));
    granite.push(...kalasha(.04, -.80, .55, .95));
  }
  return { stone: t.stone, dark: t.dark, granite: merge(granite) };
}

function buildKumbakonam(detail) {
  // broader and stouter than Srirangam: five heavy tiers over a wide base,
  // a lower subsidiary shrine, and the temple tank the town is named for
  const t = gopuram({
    tiers: 5, H: 2.35, baseW: 1.42, baseD: .92, taper: .48,
    baseStorey: .26, kalashas: 7, crown: .96,
  }, detail);
  const granite = [];
  const tank = [];
  if (detail >= 1) {
    // the mandapa behind the gate
    granite.push(B(1.5, .38, 1.1, 0, .19, -1.5));
    granite.push(B(1.62, .1, 1.22, 0, .43, -1.5));
    granite.push(PYR(.66, .5, 0, .68, -1.5));
    // the tank: three stepped banks around a sunk floor
    const T = { x: 2.5, z: 1.1, w: 1.9, d: 1.5 };
    for (let s = 0; s < 3; s++) {
      const k = s * .1, hgt = .07;
      granite.push(B(T.w - k * 2, hgt, .12, T.x, -s * hgt + hgt / 2, T.z + T.d / 2 - k));
      granite.push(B(T.w - k * 2, hgt, .12, T.x, -s * hgt + hgt / 2, T.z - T.d / 2 + k));
      granite.push(B(.12, hgt, T.d - k * 2, T.x + T.w / 2 - k, -s * hgt + hgt / 2, T.z));
      granite.push(B(.12, hgt, T.d - k * 2, T.x - T.w / 2 + k, -s * hgt + hgt / 2, T.z));
    }
    tank.push(B(T.w - .5, .02, T.d - .5, T.x, -.16, T.z));
  }
  if (detail >= 2) {
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      granite.push(CYL(.05, .34, 5, Math.cos(a) * .55, .17, -1.5 + Math.sin(a) * .38));
    }
  }
  return { stone: t.stone, dark: t.dark, granite: merge(granite), tank: merge(tank) };
}

function buildMadurai(detail) {
  // the elaborate one: nine tiers, denser carving, flanked by two smaller
  // towers on the enclosure. Colour arrives only as traces of old pigment.
  const t = gopuram({
    tiers: 9, H: 3.4, baseW: 1.3, baseD: .84, taper: .70,
    baseStorey: .24, kalashas: 9, crown: 1.0,
  }, detail);
  const stone = [t.stone];
  const granite = [];
  const pigment = [];
  if (detail >= 1) {
    for (const [sx, sz] of [[-2.5, -1.9], [2.5, -1.9]]) {
      const s2 = gopuram({
        tiers: 5, H: 1.55, baseW: .66, baseD: .46, taper: .6,
        baseStorey: .26, kalashas: 3,
      }, Math.max(0, detail - 1));
      s2.stone.translate(sx, 0, sz);
      stone.push(s2.stone);
    }
    const r = 2.25, hgt = .15;
    granite.push(B(r * 2, hgt, .08, 0, hgt / 2, r));
    granite.push(B(r * 2, hgt, .08, 0, hgt / 2, -r));
    granite.push(B(.08, hgt, r * 2, r, hgt / 2, 0));
    granite.push(B(.08, hgt, r * 2, -r, hgt / 2, 0));
  }
  if (detail >= 2) {
    // faded pigment survives in the horizontal bands, nowhere else
    const bodyH = 3.4 * .76, tierH = bodyH / 9, y0 = 3.4 * .24;
    for (let i = 0; i < 9; i += 2) {
      const f = i / 9, w = 1.3 * (1 - f * .70), d = .84 * (1 - f * .70);
      pigment.push(B(w * 1.13, tierH * .05, d * 1.15, 0, y0 + i * tierH + tierH * .9, 0));
    }
  }
  return {
    stone: merge(stone), dark: t.dark,
    granite: merge(granite), pigment: merge(pigment),
  };
}

function buildUdupi(detail) {
  // no gopuram here. Low massing, sloping tiled roofs, an inner court, and
  // the pavilion standing out in the tank — the coast announces itself by
  // its architecture before any label says Karnataka.
  const plaster = [];
  const tile = [];
  const granite = [];
  const tank = [];

  // the sanctum and its two-tier roof
  plaster.push(B(1.0, .46, 1.0, 0, .23, 0));
  tile.push(...tiledRoof(1.06, 1.06, .30, 0, .46, 0, .22));
  plaster.push(B(.66, .22, .66, 0, .82, 0));
  tile.push(...tiledRoof(.70, .70, .26, 0, 1.04, 0, .14));
  granite.push(...kalasha(.05, 0, 1.30, 0));

  if (detail >= 1) {
    // the enclosing court: a low wall with a roofed veranda inside it
    const W = 3.3, D = 2.7;
    const walls = [[0, D / 2, W, .12], [0, -D / 2, W, .12], [W / 2, 0, .12, D], [-W / 2, 0, .12, D]];
    for (const [x, z, w, d] of walls) {
      plaster.push(B(w, .30, d, x, .15, z));
      const wide = w > d;
      const rw = wide ? w : .55, rd = wide ? .55 : d;
      const rx = wide ? x : x - Math.sign(x) * .28;
      const rz = wide ? z - Math.sign(z) * .28 : z;
      tile.push(...tiledRoof(rw, rd, .16, rx, .30, rz, .10));
    }
    // the gate on the near side, a little taller
    plaster.push(B(.8, .46, .34, 0, .23, D / 2));
    tile.push(...tiledRoof(.86, .40, .24, 0, .46, D / 2, .14));

    // the tank, and the pavilion standing in it
    const T = { x: -.2, z: 2.6 };
    for (let s = 0; s < 3; s++) {
      const k = s * .11, hgt = .075, w = 2.4 - k * 2, d = 2.0 - k * 2;
      granite.push(B(w, hgt, .13, T.x, -s * hgt + hgt / 2, T.z + d / 2));
      granite.push(B(w, hgt, .13, T.x, -s * hgt + hgt / 2, T.z - d / 2));
      granite.push(B(.13, hgt, d, T.x + w / 2, -s * hgt + hgt / 2, T.z));
      granite.push(B(.13, hgt, d, T.x - w / 2, -s * hgt + hgt / 2, T.z));
    }
    tank.push(B(2.16, .02, 1.76, T.x, -.15, T.z));
    granite.push(B(.86, .16, .86, T.x, -.14, T.z));
    for (const [px, pz] of [[-.3, -.3], [.3, -.3], [-.3, .3], [.3, .3]]) {
      granite.push(CYL(.035, .38, 5, T.x + px, .13, T.z + pz));
    }
    plaster.push(B(.78, .07, .78, T.x, .35, T.z));
    tile.push(...tiledRoof(.72, .72, .26, T.x, .38, T.z, .16));
    granite.push(...kalasha(.03, T.x, .66, T.z));
  }
  if (detail >= 1) {
    /* the Ratha Beedi: the car street that rings the Matha, and the two
       wooden rathas standing on it — the one thing the eye knows Udupi by
       before any label. Tiered timber, restrained, no painted cloth. */
    const R = 2.45, ring = [];
    granite.push(B(2 * R + .3, .02, .34, 0, -.005, R + .05));
    granite.push(B(2 * R + .3, .02, .34, 0, -.005, -R - .05));
    granite.push(B(.34, .02, 2 * R + .3, R + .05, -.005, 0));
    granite.push(B(.34, .02, 2 * R + .3, -R - .05, -.005, 0));
    const ratha = (x, z, s) => {
      const parts = [];
      parts.push(B(.5 * s, .16 * s, .5 * s, x, .18 * s, z));
      for (let i = 0; i < 4; i++) {
        const k = 1 - i * .2;
        parts.push(B(.44 * s * k, .12 * s, .44 * s * k, x, (.32 + i * .12) * s, z));
      }
      parts.push(PYR(.22 * s, .22 * s, x, .9 * s, z));
      parts.push(...kalasha(.035 * s, x, 1.0 * s, z));
      for (const [wx, wz] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) {
        const wheel = new THREE.CylinderGeometry(.08 * s, .08 * s, .05 * s, 8);
        wheel.rotateZ(Math.PI / 2); wheel.translate(x + wx * s, .08 * s, z + wz * s);
        parts.push(wheel);
      }
      return parts;
    };
    tile.push(...ratha(R + .05, -.8, 1.0));
    tile.push(...ratha(R + .05, .6, .8));
  }
  if (detail >= 2) {
    // the pillared walk of the inner court
    for (let i = 0; i < 9; i++) {
      const f = -1.4 + i * .35;
      granite.push(CYL(.032, .30, 5, f, .15, 1.05));
      granite.push(CYL(.032, .30, 5, f, .15, -1.05));
    }
  }
  return { plaster: merge(plaster), tile: merge(tile), granite: merge(granite), tank: merge(tank) };
}

function buildManchale(detail) {
  // an arrival, not a sight. A matha on the bank, a small stone shrine, a
  // few sheds, the ghat going down to the water. Nothing is revealed here
  // that belongs to the chapters after this one.
  const granite = [];
  const plaster = [];
  const tile = [];

  plaster.push(B(1.5, .38, .9, 0, .19, 0));                 // the matha hall
  tile.push(...tiledRoof(1.5, .9, .26, 0, .38, 0, .16));
  granite.push(B(.55, .34, .55, 1.35, .17, -.35));          // the little shrine
  granite.push(B(.44, .30, .44, 1.35, .48, -.35));
  granite.push(B(.32, .24, .32, 1.35, .74, -.35));
  granite.push(PYR(.26, .26, 1.35, .98, -.35));
  granite.push(...kalasha(.035, 1.35, 1.10, -.35));

  if (detail >= 1) {
    plaster.push(B(.7, .26, .55, -1.5, .13, .35));           // outbuildings
    tile.push(...tiledRoof(.7, .55, .18, -1.5, .26, .35, .12));
    plaster.push(B(.5, .22, .45, -1.1, .11, -.9));
    tile.push(...tiledRoof(.5, .45, .15, -1.1, .22, -.9, .1));
    // the ghat: a short flight of slabs going down toward the river
    for (let s = 0; s < 5; s++) {
      granite.push(B(1.5, .075, .26, .2, -s * .075 - .04, -1.0 - s * .24));
    }
  }
  if (detail >= 2) {
    for (let i = 0; i < 5; i++) granite.push(CYL(.03, .28, 5, -.6 + i * .3, .14, .48));
  }
  return { granite: merge(granite), plaster: merge(plaster), tile: merge(tile) };
}

const BUILDERS = {
  srirangam: buildSrirangam, kumbakonam: buildKumbakonam,
  madurai: buildMadurai, udupi: buildUdupi, manchale: buildManchale,
};

/* the material each part group is drawn in */
const PART_MAT = {
  stone: 'sand', pigment: 'ochre', granite: 'granite',
  plaster: 'plaster', tile: 'tile', dark: 'dark', tank: 'tank',
};

/* a soft contact shadow so the architecture sits on the ground rather than
   hovering above it — no halo, no glow, only the dark the sun leaves */
function contactShadow(size) {
  const [c, g] = canvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,0,0,.55)');
  grd.addColorStop(.55, 'rgba(0,0,0,.26)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size * .82),
    new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, opacity: .62 })
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 3;
  return m;
}

/* ---------------- assembly ---------------- */
/* the haze each quiet destination is drawn back into */
const _HAZE = new THREE.Color(0x8d8877);

export function createLandmarks(ctx, destinations) {
  const group = new THREE.Group();
  const mats = landmarkMaterials();
  const built = [];

  for (const d of destinations) {
    /* one material set per destination — the maps are shared, only the tint
       differs, so the place we have arrived at can hold more contrast than
       the ones behind and ahead of us (see the brief, §05) */
    const own = {};
    for (const k in mats) { own[k] = mats[k].clone(); own[k].userData.base = own[k].color.clone(); }
    const lod = new THREE.LOD();
    const y = height(d.x, d.z);
    lod.position.set(d.x, y - .06, d.z);
    lod.scale.setScalar(d.scale);
    lod.rotation.y = d.facing || 0;

    // near / mid / far. On phones the far tier is dropped: the camera is
    // closer there and the silhouette level would never be reached.
    const levels = ctx.isMobile ? [[2, 0], [1, 15]] : [[2, 0], [1, 11], [0, 30]];
    for (const [detail, dist] of levels) {
      const g = new THREE.Group();
      const parts = BUILDERS[d.landmark](detail);
      for (const key in parts) {
        if (!parts[key]) continue;
        g.add(new THREE.Mesh(parts[key], own[PART_MAT[key]]));
      }
      lod.addLevel(g, dist);
    }
    group.add(lod);

    // the shadow the building leaves on its own ground
    const sh = contactShadow(d.landmark === 'udupi' ? 4.0 : d.landmark === 'manchale' ? 3.0 : 3.2);
    sh.position.set(d.x - .40 * d.scale, y + .035, d.z - .30 * d.scale);
    sh.scale.setScalar(d.scale);
    group.add(sh);

    built.push({ d, lod, shadow: sh, y, mats: own });
  }

  /* the destination we have arrived at simply catches a little more of the
     same sun. It is a light, not a marker: no halo, no sprite. */
  const focusLight = new THREE.PointLight(0xffc98a, 0, 17, 2);
  focusLight.visible = false;
  group.add(focusLight);

  return {
    group, built, materials: mats, focusLight,
    update(camera, focus) {
      for (const b of built) b.lod.update(camera);
      let best = -1, bestW = 0;
      for (let i = 0; i < built.length; i++) {
        if (focus[i] > bestW) { bestW = focus[i]; best = i; }
      }
      if (best >= 0 && bestW > .04) {
        const b = built[best];
        focusLight.position.set(b.d.x + 1.7, b.y + 2.8, b.d.z + 1.9);
        focusLight.intensity = bestW * 8;
      } else {
        focusLight.intensity = 0;   // never .visible: a light-count change recompiles every lit program
      }
      /* the place we are at keeps its full colour; the others are drawn
         back toward the haze until they read as silhouettes in the country */
      /* Drawn back toward the haze — but a tint lerped toward grey MULTIPLIES
         the stone darker; real haze is the fog, which is additive and already
         there with distance. So the pull is kept shallow: enough that the
         place we have left goes quiet, never enough to crush a shaded face
         seen from the road into near-black. */
      for (let i = 0; i < built.length; i++) {
        const k = .66 + .34 * focus[i];
        const m = built[i].mats;
        for (const key in m) m[key].color.copy(m[key].userData.base).lerp(_HAZE, 1 - k);
        built[i].shadow.material.opacity = .30 + .32 * focus[i];
      }
    },
  };
}
