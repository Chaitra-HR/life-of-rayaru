// ANTARANGA · the veena — Venkatanatha's instrument, laid on its cloth.
//
// A Saraswati veena, built from the owner's reference (18 Sept 2026): the
// large jackwood resonator (kudam) with its flat soundboard, bridge and two
// rosettes; the long hollow neck (dandi) carrying twenty-four brass frets
// set in wax on a dark board; the small second gourd hung under the head;
// the yali, the scroll carved as a dragon's head, curling at the end; the
// four main and three side tuning pegs; the strings. Jackwood, brass, a
// little bone. It is about 1.35 units long, laid on a folded cloth, and
// is meant to be read from a few paces: the household of Vedic learning
// and music, not a prop. He was known before his sannyāsa as a player of
// this instrument.
//
// Local frame: the resonator sits at the origin, the neck runs along +x,
// the cloth lies on y = 0.
import * as THREE from 'three';
import { canvas, tex, mulberry } from '../util.js';

function woodCanvas(seed = 3, { tone = [120, 66, 30] } = {}) {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry(seed);
  g.fillStyle = `rgb(${tone[0]},${tone[1]},${tone[2]})`; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const y = rnd() * 256, w = 1 + rnd() * 3, v = (rnd() - .5) * 34;
    g.fillStyle = `rgba(${tone[0] + v | 0},${tone[1] + v * .7 | 0},${tone[2] + v * .5 | 0},.75)`;
    g.fillRect(0, y, 256, w);
  }
  // the polish: a soft sheen band
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, 'rgba(255,230,190,0)'); grd.addColorStop(.45, 'rgba(255,230,190,.14)'); grd.addColorStop(1, 'rgba(255,230,190,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  return c;
}
function clothCanvas(seed = 9) {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry(seed);
  g.fillStyle = '#5a2c22'; g.fillRect(0, 0, 256, 256);            // a deep madder, the six's Kobicha side
  for (let i = 0; i < 256; i += 3) { g.fillStyle = `rgba(0,0,0,${.06 + rnd() * .06})`; g.fillRect(0, i, 256, 1); }
  for (let i = 0; i < 256; i += 4) { g.fillStyle = `rgba(255,220,180,${.03 + rnd() * .04})`; g.fillRect(i, 0, 1, 256); }
  // a gold border line
  g.fillStyle = 'rgba(201,164,104,.75)'; g.fillRect(0, 10, 256, 3); g.fillRect(0, 243, 256, 3);
  return c;
}

export function buildVeena({ shadows = true } = {}) {
  const G = new THREE.Group();
  const sh = (m) => { m.castShadow = m.receiveShadow = shadows; return m; };
  const wood = new THREE.MeshStandardMaterial({ map: tex(woodCanvas(3)), roughness: .42, metalness: .04 });
  const woodDark = new THREE.MeshStandardMaterial({ map: tex(woodCanvas(5, { tone: [84, 46, 22] })), roughness: .5 });
  const board = new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: .55 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xa8843c, roughness: .38, metalness: .55 });
  const bone = new THREE.MeshStandardMaterial({ color: 0xe6dcc4, roughness: .5 });
  const string = new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: .3, metalness: .5 });
  const cloth = new THREE.MeshStandardMaterial({ map: tex(clothCanvas(9)), roughness: 1 });

  /* the cloth it lies on: folded, a little larger than the instrument */
  const cl = sh(new THREE.Mesh(new THREE.BoxGeometry(1.62, .025, .52), cloth));
  cl.position.set(.55, .0125, 0); G.add(cl);
  const cl2 = sh(new THREE.Mesh(new THREE.BoxGeometry(.6, .02, .5), cloth));
  cl2.position.set(1.28, .033, .02); cl2.rotation.y = .06; G.add(cl2);

  const Y = .025;   // the cloth's top

  /* the kudam: a flattened sphere, its soundboard, the bridge, two rosettes */
  const kud = sh(new THREE.Mesh(new THREE.SphereGeometry(.205, 28, 20), wood));
  kud.scale.set(1, .58, 1); kud.position.set(0, Y + .119, 0); G.add(kud);
  const top = sh(new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .012, 32), woodDark));
  top.position.set(0, Y + .232, 0); G.add(top);
  const rim = sh(new THREE.Mesh(new THREE.TorusGeometry(.19, .008, 8, 40), bone));
  rim.rotation.x = Math.PI / 2; rim.position.set(0, Y + .238, 0); G.add(rim);
  const bridge = sh(new THREE.Mesh(new THREE.BoxGeometry(.05, .03, .12), bone));
  bridge.position.set(-.03, Y + .253, 0); G.add(bridge);
  const bridgeTop = sh(new THREE.Mesh(new THREE.BoxGeometry(.052, .008, .124), brass));
  bridgeTop.position.set(-.03, Y + .272, 0); G.add(bridgeTop);
  for (const z of [-.09, .09]) {
    const ro = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .006, 16), bone);
    ro.position.set(.06, Y + .240, z); G.add(ro);
    const ro2 = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .008, 12), board);
    ro2.position.set(.06, Y + .241, z); G.add(ro2);
  }
  // the tailpiece where the strings are tied, on the far side of the kudam
  const tail = sh(new THREE.Mesh(new THREE.BoxGeometry(.06, .04, .1), brass));
  tail.position.set(-.19, Y + .2, 0); G.add(tail);

  /* the dandi: the hollow neck, rounded below, the fret board on top */
  const neckLen = 1.0, nx0 = .17;
  const neck = sh(new THREE.Mesh(new THREE.CylinderGeometry(.052, .052, neckLen, 14, 1, false, Math.PI, Math.PI), wood));
  neck.rotation.z = -Math.PI / 2; neck.position.set(nx0 + neckLen / 2, Y + .2, 0); G.add(neck);
  const neckBox = sh(new THREE.Mesh(new THREE.BoxGeometry(neckLen, .08, .104), wood));
  neckBox.position.set(nx0 + neckLen / 2, Y + .2, 0); G.add(neckBox);
  const fb = sh(new THREE.Mesh(new THREE.BoxGeometry(neckLen, .014, .09), board));
  fb.position.set(nx0 + neckLen / 2, Y + .247, 0); G.add(fb);
  // the wax beds either side of the board, and twenty-four frets
  for (const z of [-.05, .05]) { const w = new THREE.Mesh(new THREE.BoxGeometry(neckLen, .02, .014), board); w.position.set(nx0 + neckLen / 2, Y + .25, z); G.add(w); }
  const fretGeo = new THREE.CylinderGeometry(.0035, .0035, .1, 6);
  let fx = nx0 + .04, step = .056;
  for (let i = 0; i < 24; i++) {
    const f = new THREE.Mesh(fretGeo, brass);
    f.rotation.x = Math.PI / 2; f.position.set(fx, Y + .258, 0); G.add(f);
    fx += step; step *= .965;
  }
  /* the head: the small gourd under it, the peg box, the yali scroll */
  const gourd = sh(new THREE.Mesh(new THREE.SphereGeometry(.095, 20, 14), wood));
  gourd.scale.set(1, .75, 1); gourd.position.set(1.02, Y + .09, 0); G.add(gourd);
  const gourdStem = new THREE.Mesh(new THREE.CylinderGeometry(.018, .022, .07, 8), woodDark);
  gourdStem.position.set(1.02, Y + .165, 0); G.add(gourdStem);
  const pegbox = sh(new THREE.Mesh(new THREE.BoxGeometry(.2, .09, .1), woodDark));
  pegbox.position.set(1.26, Y + .205, 0); G.add(pegbox);
  const pegGeo = new THREE.CylinderGeometry(.009, .012, .075, 8);
  const knobGeo = new THREE.SphereGeometry(.016, 8, 6);
  for (let i = 0; i < 4; i++) {
    const s = i % 2 ? 1 : -1, x = 1.20 + (i >> 1) * .08;
    const p = new THREE.Mesh(pegGeo, woodDark); p.rotation.x = Math.PI / 2; p.position.set(x, Y + .215, s * .08); G.add(p);
    const k = new THREE.Mesh(knobGeo, woodDark); k.position.set(x, Y + .215, s * .115); G.add(k);
  }
  for (let i = 0; i < 3; i++) {   // the three side pegs along the neck's near side
    const x = .55 + i * .14;
    const p = new THREE.Mesh(pegGeo, woodDark); p.rotation.x = Math.PI / 2; p.position.set(x, Y + .215, .085); G.add(p);
    const k = new THREE.Mesh(knobGeo, woodDark); k.position.set(x, Y + .215, .12); G.add(k);
  }
  // the yali: a curled scroll rising from the peg box, its head turned out
  const scroll = sh(new THREE.Mesh(new THREE.TorusGeometry(.06, .028, 10, 18, Math.PI * 1.45), wood));
  scroll.rotation.y = Math.PI / 2; scroll.rotation.z = Math.PI * .1; scroll.position.set(1.38, Y + .27, 0); G.add(scroll);
  const head = sh(new THREE.Mesh(new THREE.ConeGeometry(.032, .09, 10), woodDark));
  head.rotation.z = -Math.PI / 2 - .5; head.position.set(1.43, Y + .33, 0); G.add(head);
  const crest = new THREE.Mesh(new THREE.SphereGeometry(.02, 8, 6), brass);
  crest.position.set(1.36, Y + .335, 0); G.add(crest);

  /* the strings: four over the frets from the bridge to the peg box, three side strings */
  const sGeo = new THREE.CylinderGeometry(.0016, .0016, 1, 4);
  const strand = (x0, y0, z0, x1, y1, z1) => {
    const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1);
    const m = new THREE.Mesh(sGeo, string);
    const len = a.distanceTo(b);
    m.scale.y = len;
    m.position.lerpVectors(a, b, .5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    G.add(m);
  };
  for (let i = 0; i < 4; i++) { const z = -.03 + i * .02; strand(-.19, Y + .22, z, 1.18, Y + .26, z); }
  for (let i = 0; i < 3; i++) { const z = .065 + i * .012; strand(-.17, Y + .2, z, .55 + i * .14, Y + .215, z); }

  return G;
}
