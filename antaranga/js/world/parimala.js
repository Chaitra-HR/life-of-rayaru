// ANTARANGA · scene 03 — Parimala. Aksharas lift from a manuscript, become a
// stream, carry the visitor through the Guru Parampara, then form his works.
import * as THREE from 'three';
import { palmLeafCanvas, tex, canvas, textMesh, glowSprite, glowTexture, mulberry, lerp, clamp01, remap, smooth, win, camTrack, V3 } from '../util.js';

export const PARIMALA_Y = 800;

const GLYPHS = ['ಅ', 'ಕ', 'ಶ', 'ರ', 'ಮ', 'ಧ', 'ವ', 'ಗ', 'ಯ', 'ತ', 'ಸ', 'ನ', 'श', 'ध', 'र', 'म', 'व', 'त', 'य', 'ज'];
const GURUS = [
  ['Madhvācārya', 'the founder · Ānanda Tīrtha'],
  ['Jayatīrtha', 'the systematiser · the Nyāya Sudhā'],
  ['Vyāsatīrtha', 'the dialectician of Vijayanagara'],
  ['Vijayīndra Tīrtha', 'the debater · a hundred works'],
  ['Sudhīndra Tīrtha', 'the teacher of Venkatanatha'],
  ['Rāghavendra Tīrtha', 'the illuminator · Parimalāchārya'],
];
/* the five selected works are presented editorially in the DOM layer,
   one at a time — the world behind carries the manuscript, the akṣara
   stream and the paramparā the writing answers to */

function glyphTexture(ch) {
  const [c, g] = canvas(128, 128);
  g.font = '300 84px "Noto Sans Kannada","Noto Serif Devanagari","Nirmala UI",serif';
  g.fillStyle = '#e6ddc8';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(ch, 64, 70);
  return tex(c);
}

export function createParimalaStage(ctx) {
  const g = new THREE.Group();
  g.position.y = PARIMALA_Y;
  g.visible = false;
  const rnd = mulberry(404);

  /* the manuscript we pass into */
  const msTex = tex(palmLeafCanvas(8, 1024, 256));
  const manuscript = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, .9),
    new THREE.MeshBasicMaterial({ map: msTex, transparent: true })
  );
  manuscript.position.set(0, 1.4, 0);
  manuscript.rotation.x = -.28;
  g.add(manuscript);
  const msGlow = glowSprite(0xc89050, 3, .1);
  msGlow.position.set(0, 1.4, -.4);
  g.add(msGlow);

  /* akshara stream — one InstancedMesh per glyph */
  const perGlyph = ctx.isMobile ? 8 : 13;
  const total = GLYPHS.length * perGlyph;
  const planeGeo = new THREE.PlaneGeometry(.34, .34);
  const meshes = GLYPHS.map(ch => {
    const m = new THREE.InstancedMesh(planeGeo, new THREE.MeshBasicMaterial({
      map: glyphTexture(ch), transparent: true, depthWrite: false, opacity: .9,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }), perGlyph);
    m.frustumCulled = false;
    g.add(m);
    return m;
  });
  // per-instance data
  const inst = [];
  for (let gi = 0; gi < GLYPHS.length; gi++) {
    for (let k = 0; k < perGlyph; k++) {
      inst.push({
        mesh: meshes[gi], idx: k,
        startX: (rnd() - .5) * 3.2, startY: 1.4 + (rnd() - .5) * .7,
        seed: rnd(), radius: .9 + rnd() * 2.6, phase: rnd() * Math.PI * 2,
        speed: .55 + rnd() * .8, scale: .5 + rnd() * .9,
      });
    }
  }

  /* corridor spine for the stream + the camera */
  const spine = new THREE.CatmullRomCurve3([
    V3(0, 1.4, 0), V3(1.2, 1.6, -12), V3(-1.4, 1.8, -26),
    V3(1, 2, -40), V3(-.6, 1.8, -54), V3(0, 1.7, -66),
  ]);

  /* Guru Parampara gates */
  const gates = [];
  for (let i = 0; i < GURUS.length; i++) {
    const z = -13 - i * 8.6;
    const p = spine.getPoint(clamp01((13 + i * 8.6) / 66));
    const name = textMesh(GURUS[i][0], { font: 'serif', px: 130, worldH: .82, color: '#e2d7bd', blend: 'add' });
    name.position.set(p.x + (i % 2 ? 1.3 : -1.3), 2.15, z);
    name.material.opacity = 0;
    g.add(name);
    const role = textMesh(GURUS[i][1], { font: 'sans', px: 64, worldH: .24, color: '#9a8f76', blend: 'add' });
    role.position.set(name.position.x, 1.62, z);
    role.material.opacity = 0;
    g.add(role);
    const under = glowSprite(0xb87830, 2.6, .07);
    under.position.set(name.position.x, .4, z);
    g.add(under);
    gates.push({ name, role, under, z });
  }

  /* warm anchors along the spine — faint depth beacons */
  const beacons = [];
  for (let i = 0; i < 6; i++) {
    const p = spine.getPoint(i / 5 * .9 + .05);
    const b = glowSprite(0xa06828, 3.4, .05);
    b.position.set(p.x, p.y - .3, p.z - 2);
    g.add(b); beacons.push(b);
  }

  /* faint drifting ink specks */
  const inkN = ctx.isMobile ? 80 : 180;
  const ipos = new Float32Array(inkN * 3);
  for (let i = 0; i < inkN; i++) {
    ipos[i * 3] = (rnd() - .5) * 10;
    ipos[i * 3 + 1] = rnd() * 4;
    ipos[i * 3 + 2] = 2 - rnd() * 70;
  }
  const inkGeo = new THREE.BufferGeometry();
  inkGeo.setAttribute('position', new THREE.BufferAttribute(ipos, 3));
  const ink = new THREE.Points(inkGeo, new THREE.PointsMaterial({
    color: 0x8a7040, size: .035, transparent: true, opacity: .35, map: glowTexture('rgba(190,160,100,1)', 'rgba(190,160,100,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  g.add(ink);

  const amb = new THREE.AmbientLight(0x241c12, 2);
  g.add(amb);

  /* camera */
  const cam = (u) => {
    // ease along the spine with a slow start (leaving the manuscript)
    const s = smooth(clamp01(u * 1.06));
    const p = spine.getPoint(s * .97);
    const ahead = spine.getPoint(Math.min(s * .97 + .05, 1));
    const back = .9 - smooth(remap(u, 0, .12)) * 0;
    return {
      pos: new THREE.Vector3(p.x, p.y + .1, p.z + (u < .1 ? lerp(2.4, .8, remap(u, 0, .1)) : .8)),
      look: new THREE.Vector3(ahead.x, ahead.y, ahead.z - 2),
      fov: lerp(42, 50, smooth(remap(u, .1, .5))),
    };
  };

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  return {
    group: g,
    setVisible(v) { g.visible = v; },
    cam,
    update(time, globalT, u, camera) {
      /* 05 · The Works canvas owns t .374–.4775 — the corridor's lettering
         goes near-still and near-silent behind it, so the books and their
         typography are read against a quiet ground, not a glyph stream */
      const hush = smooth(remap(globalT, .371, .383)) * (1 - smooth(remap(globalT, .4735, .4815)));
      // manuscript fades once the letters have left it
      manuscript.material.opacity = 1 - smooth(remap(u, .1, .26));
      msGlow.material.opacity = .1 * (1 - smooth(remap(u, .1, .3))) * (1 - .6 * hush);
      ink.material.opacity = .35 * (1 - .8 * hush);

      const lift = smooth(remap(u, .02, .2));       // rise off the leaf
      const streamPhase = smooth(remap(u, .16, .3)); // join the corridor stream
      const fade = 1 - smooth(remap(u, .88, 1));

      _q.copy(camera.quaternion);
      for (const it of inst) {
        // start: on manuscript surface
        const sx = it.startX, sy = it.startY;
        // float: lifted above the leaf
        const fx = sx * 1.4, fy = sy + .5 + it.seed * 1.2, fz = -it.seed * 2;
        // stream: swirl along the spine, offset around it, cycling forward
        const sPos = (it.seed + u * it.speed * 1.1) % 1;
        const c = spine.getPoint(sPos);
        const ang = it.phase + time * .12 + sPos * 9;
        const stx = c.x + Math.cos(ang) * it.radius;
        const sty = c.y + Math.sin(ang * .8) * it.radius * .55 + .4;
        const stz = c.z + Math.sin(ang * .5) * .8;

        let x = lerp(sx, fx, lift), y = lerp(sy, fy, lift), z = lerp(0, fz, lift);
        x = lerp(x, stx, streamPhase); y = lerp(y, sty, streamPhase); z = lerp(z, stz, streamPhase);

        const sc = it.scale * (0.6 + lift * .4) * fade;
        _s.setScalar(Math.max(sc, .0001));
        _m.compose(new THREE.Vector3(x, y, z), _q, _s);
        it.mesh.setMatrixAt(it.idx, _m);
      }
      for (const m of meshes) { m.instanceMatrix.needsUpdate = true; m.material.opacity = .9 * fade * (0.35 + .65 * smooth(remap(u, 0, .08))) * (1 - .93 * hush); }

      // gates: fade in ahead of the camera, gone before we draw level (never edge-on)
      const camLocal = camera.userData.localPos;
      const camZ = camLocal ? camLocal.z : 10;
      for (const gt of gates) {
        const d = camZ - gt.z; // distance ahead along travel
        const o = win(d, 2.8, 5.5, 10, 15.5);
        const gateIn = smooth(remap(u, .2, .28)) * (1 - hush);
        gt.name.material.opacity = o * .95 * gateIn;
        gt.role.material.opacity = o * .6 * gateIn;
        gt.under.material.opacity = o * .09 * (1 - .7 * hush);
        if (camLocal) {
          const yaw = Math.atan2(camLocal.x - gt.name.position.x, camZ - gt.z) * .5;
          gt.name.rotation.y = yaw;
          gt.role.rotation.y = yaw;
        }
      }

    },
  };
}
