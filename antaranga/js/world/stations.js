// ANTARANGA · the stations: what stands on the ghat and the river while
// the life is read (the chapters, 01–08).
//
// Nothing here is a card. Every picture of the middle is a thing in the
// opening's own world, built in its frame (hero.js approach coordinates;
// the flight of steps in the sacred group's local frame, `sl`), lit by its
// light, and reached by the one camera walk (main.js STATIONS):
//   · (the ॐ in its sand tray and the veena now stand at the house's own
//     threshold on the bank, threshold.js, where the first three beats are
//     read; they left the ghat on 18 Sept 2026)
//   · the five granthas as printed volumes lying on the landing between the
//     gateway and the Brindavana, a standing deepa lit beside them at night
//     (the works);
//   · the towns of the road as lamps and names coming out on the far bank;
//   · grass at the frame's lower corners that walks with the camera, and
//     (the owner's three pictures are no longer placed as planes: the
//     veena and the house's gate are BUILT, threshold.js / veena.js, and a
//     branch across the lens read as a cutout, not a place).
// Pañcabheda needs no object: it is told with the moon, its reflections on
// the river (river.js uMoon) and the stone of the ghat.
import * as THREE from 'three';
import { canvas, tex, mulberry, deepaLamp, smooth, remap, clamp01, lerp } from '../util.js';
import { BRND, SACRED_ROT, approachToWorld } from './hero.js';
import { grassCutout, grassSheet } from './opening.js';

/* the sacred group's local frame (the flight, the landing, the terrace) →
   the approach frame the cameras are authored in */
const _c = Math.cos(SACRED_ROT), _s = Math.sin(SACRED_ROT);
export function sl(x, y, z) { return [BRND.x + x * _c + z * _s, y, BRND.z - x * _s + z * _c]; }

/* the five, as they are printed: the cover image and the cloth of the binding */
export const VOLUMES = [
  { id: 'nyayasudha',       cover: 'assets/works/nyayasudha-1080.webp',       cloth: 0x6b2a1e, dn: 'न्यायसुधा परिमळ' },
  { id: 'tantradeepika',    cover: 'assets/works/tantradeepika-1080.webp',    cloth: 0x2e3140, dn: 'तन्त्रदीपिका' },
  { id: 'battasangraha',    cover: 'assets/works/battasangraha-1080.webp',    cloth: 0x7a3524, dn: 'भाट्टसङ्ग्रह' },
  { id: 'thatvamanjari',    cover: 'assets/works/thatvamanjari-1080.webp',    cloth: 0x3a2f2a, dn: 'मन्त्रार्थमञ्जरी' },
  { id: 'thatvaprakashika', cover: 'assets/works/thatvaprakashika-1080.webp', cloth: 0x4a2a1c, dn: 'तत्त्वप्रकाशिका भावदीप' },
];

/* the first page of a printed volume: cream paper, the work's name in
   Devanagari at its head, a rule, and the body as faint set lines (the
   register of a page, never a page that can be read) */
function pageCanvas(title, seed) {
  const [c, g] = canvas(512, 704);
  const rnd = mulberry(seed);
  g.fillStyle = '#e9dfc6'; g.fillRect(0, 0, 512, 704);
  const img = g.getImageData(0, 0, 512, 704), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = (rnd() - .5) * 10; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
  g.putImageData(img, 0, 0);
  g.fillStyle = '#3a2a1c'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = '400 44px "Noto Serif Devanagari", serif';
  g.fillText(title, 256, 118);
  g.fillStyle = 'rgba(58,42,28,.55)'; g.fillRect(120, 146, 272, 1.5);
  g.fillStyle = 'rgba(58,42,28,.42)';
  for (let y = 196; y < 640; y += 19) {
    let x = 64; const end = 448 - (y > 600 ? rnd() * 180 : 0);
    while (x < end) { const w = 10 + rnd() * 34; g.fillRect(x, y, w, 2.6); x += w + 6 + rnd() * 6; }
  }
  return c;
}

/* the edge of a printed book: cream leaves, a faint line for each signature */
function leavesCanvas() {
  const [c, g] = canvas(256, 64);
  g.fillStyle = '#d9cfb6'; g.fillRect(0, 0, 256, 64);
  const rnd = mulberry(11);
  for (let y = 1; y < 64; y += 2) { g.fillStyle = `rgba(90,74,50,${.10 + rnd() * .16})`; g.fillRect(0, y, 256, 1); }
  return c;
}

export function createStations(ctx, { brndPos, fogColor }) {
  const G = new THREE.Group();
  G.position.copy(approachToWorld(brndPos, 0, 0, 0));
  /* world (the river group) → approach */
  const w2a = (x, y, z) => [x - brndPos.x + BRND.x, y, z - brndPos.z + BRND.z];
  G.visible = false;
  const sh = (m) => { m.castShadow = !ctx.isMobile; m.receiveShadow = !ctx.isMobile; return m; };
  const at = (o, p, ry = 0) => { o.position.set(p[0], p[1], p[2]); o.rotation.y = ry; return o; };

  /* ---------- the five volumes on the landing (the works) ---------- */
  const leaves = new THREE.MeshStandardMaterial({ map: tex(leavesCanvas()), roughness: 1 });
  const loader = new THREE.TextureLoader();
  const books = [], covers = [];
  const W = .58, T = .05, D = .80, TC = .008;
  VOLUMES.forEach((v, i) => {
    const cloth = new THREE.MeshStandardMaterial({ color: v.cloth, roughness: .82 });
    const coverMat = new THREE.MeshStandardMaterial({ color: v.cloth, roughness: .72 });
    const page = new THREE.MeshStandardMaterial({ map: tex(pageCanvas(v.dn, 40 + i)), roughness: 1 });
    const endpaper = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 1 });
    /* the volume is two pieces: the block (its leaves, the first page on
       top) and the cover, hinged at the spine so it OPENS as the walk
       reaches it (main.js winds.books): the object, then its page */
    const bk = new THREE.Group();
    // [+x fore-edge, -x spine, +y the first page, -y the back board, +z tail, -z head]
    const block = sh(new THREE.Mesh(new THREE.BoxGeometry(W, T - TC, D), [leaves, cloth, page, cloth, leaves, leaves]));
    block.position.y = (T - TC) / 2; bk.add(block);
    const hinge = new THREE.Group(); hinge.position.set(-W / 2, T - TC, 0); bk.add(hinge);
    const cover = sh(new THREE.Mesh(new THREE.BoxGeometry(W, TC, D), [cloth, cloth, coverMat, endpaper, cloth, cloth]));
    cover.position.set(W / 2, TC / 2, 0); hinge.add(cover);
    loader.load(v.cover, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.center.set(.5, .5); t.rotation = 0; /* the cover's head away from the reader, who stands at the flight (checked on the phone frame) */ coverMat.map = t; coverMat.color.setHex(0xffffff); coverMat.needsUpdate = true; }, undefined, () => {});
    // a loose row across the landing, each volume turned a little its own way
    const P = [[-2.55, 9.15, .16], [-1.30, 9.95, -.08], [-.05, 9.05, .10], [1.25, 9.9, -.14], [2.55, 9.2, .06]][i];
    at(bk, sl(P[0], .78, P[1]), SACRED_ROT + P[2]);
    G.add(bk); books.push(bk); covers.push(hinge);
  });
  /* the standing deepa beside the row: the brass lamp of the outdoors,
     lit only at night, its light what the covers are read by */
  const worksLamp = deepaLamp({ scale: 1.25, intensity: 2.8, distance: 8.5, wicks: 1, flameScale: .55 });
  at(worksLamp, sl(3.6, .78, 8.1), SACRED_ROT);
  G.add(worksLamp);

  /* (the road's device, the towns' names over the far bank's lamps, and
     MANCHALE over the gateway, left 19 Sept 2026 with the lamps: the places
     are named in the copy, the world stays a place) */
  const names = [];
  const nameSprite = (str, H = 2.2) => {
    const px = 84, f = `400 ${px}px "Karla", sans-serif`;
    const [mc, mg] = canvas(8, 8); mg.font = f;
    let width = 0; for (const ch of str) width += mg.measureText(ch).width + .18 * px;
    const w = Math.ceil(width + px), h = Math.ceil(px * 1.6);
    const [c, g] = canvas(w, h);
    g.font = f; g.fillStyle = '#e3d8c1'; g.textBaseline = 'middle';
    let x = px * .5; for (const ch of str) { g.fillText(ch, x, h / 2); x += g.measureText(ch).width + .18 * px; }
    // the gold dot of the eyebrow, under the name: the lamp it stands over
    g.fillStyle = '#c9a468'; g.beginPath(); g.arc(w / 2, h - 8, 5, 0, Math.PI * 2); g.fill();
    const t = tex(c); t.anisotropy = 8;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    s.scale.set(H * w / h, H, 1);
    return s;
  };

  /* ---------- Pañcabheda, named on its objects: each difference is a pair
     of things in the view, and a small name stands on each while its beat
     is read (the road's device, turned to the argument): the moon and its
     image on the water, the moon and the stone, the one light broken into
     many, the light and the step it falls on, course on course. ---------- */
  /* each name is sized for the distance it is read at: the moon's stands
     over the far bank, the stone's a few paces off, the step's at arm's length */
  /* (the names on the objects, sprites over the moon, its image, the stone,
     the step and the courses, were removed 19 Sept 2026: the owner found
     them unnecessary; the copy names the pair, the world shows it) */
  const PB = {};
  const tags = [];
  /* how far a cover lifts: past upright on a wide frame; on a phone it stands
     nearer upright, so the open volume stays inside the portrait frame */
  const OPEN = ctx.isMobile ? 2.3 : 2.75;

  /* (the "edges", two grass sheets carried a step ahead of the camera at
     the frame's lower corners, were removed 19 Sept 2026: grass that
     follows the lens travels across the ground with every move of the
     walk, which is exactly the drifting vegetation the owner saw. Every
     plant on the bank is rooted where it was planted, hero.js; only its
     tips move, in the wind, vegetation.js cardVert.) */
  const win = (dp, a, b, c, d) => smooth(remap(dp, a, b)) * (1 - smooth(remap(dp, c, d)));

  return {
    group: G, books, names, tags,
    /* dp: the chapters' progress 0..1; on: 0..1 the stations' own presence
       (0 before the first chapter and after the last); day/night: the hour
       (hero.js); winds: { sand, works, road, jasmine } windows in dp from
       main.js, measured from the page so they land on their beats */
    update(time, cam, { dp = 0, on = 0, day = 0, night = 0, fogD = .006, reduced = false, winds = null, dt = .016, moon = null } = {}) {
      G.visible = on > .001;
      if (!G.visible) return;
      const w = winds || {};
      const inW = (k, pad = .03) => (w[k] ? win(dp, w[k][0] - pad, w[k][0] + pad * .4, w[k][1] - pad * .4, w[k][1] + pad) : 0);
      /* the works: the volumes lie on the landing from the chapter's own arrival to the road; the deepa burns at night */
      const worksOn = inW('works', .012);
      for (const b of books) b.visible = worksOn > .01;
      worksLamp.visible = worksOn > .01;
      worksLamp.userData.setOn(worksOn * night);
      if (worksLamp.visible) worksLamp.userData.flicker(time + 3.1);
      /* the volumes open once the walk has ARRIVED at each (its beat centred
         in the frame, main.js winds.books[i][2]): the cover is seen closed
         first, then it lifts; it closes as the walk leaves */
      if (w.books) covers.forEach((h, i) => {
        const [r0, r1, rc = r0 + .5 * (r1 - r0)] = w.books[i], L = r1 - r0;
        /* the cover lifts as the walk lands on the volume (its beat centred,
           rc) and is down again before the walk reaches the next: one open
           book in the frame at a time, never the last one still closing
           behind the words of the next */
        const open = smooth(remap(dp, rc - .06 * L, rc + .10 * L)) * (1 - smooth(remap(dp, rc + .32 * L, rc + .46 * L)));
        h.rotation.z = open * OPEN;
      });
    },
  };
}
