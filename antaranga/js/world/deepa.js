// ANTARANGA · the tall four-wick deepa of the opening (hero.js), as one
// object: a tiered bell base, a knopped baluster, the wide oil basin, a
// kalasha finial, four spouts and four flames, with its own point light.
// Call .userData.fls[i].userData.flicker(time) each frame.
import * as THREE from 'three';
import { flame } from '../util.js';

/* the tall four-wick deepa of the opening (hero.js), rebuilt here alone */
export function tallDeepa() {
  const brass = new THREE.MeshStandardMaterial({ color: 0x8a6226, roughness: .5, metalness: .45 });
  const brassDeep = new THREE.MeshStandardMaterial({ color: 0x4a350f, roughness: .55, metalness: .5 });
  const lathe = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 40);
  const d = new THREE.Group();
  const add = (geo, mat = brass) => d.add(new THREE.Mesh(geo, mat));
  add(lathe([[0, 0], [.30, 0], [.305, .035], [.25, .062], [.262, .10], [.21, .132], [.222, .17], [.16, .21], [.12, .26], [.096, .30]]));
  add(lathe([[.096, .30], [.052, .36], [.094, .42], [.05, .47], [.048, .58], [.098, .64], [.048, .70], [.045, .82], [.088, .88], [.048, .94], [.045, 1.06], [.078, 1.12], [.04, 1.18]]));
  add(lathe([[0, 1.175], [.09, 1.18], [.22, 1.205], [.30, 1.24], [.315, 1.285], [.285, 1.30], [.255, 1.262], [.09, 1.25], [0, 1.25]]));
  const oil = new THREE.Mesh(new THREE.CircleGeometry(.235, 32), brassDeep);
  oil.rotation.x = -Math.PI / 2; oil.position.y = 1.262; d.add(oil);
  add(lathe([[0, 1.25], [.03, 1.25], [.034, 1.36], [.065, 1.41], [.028, 1.47], [.036, 1.50], [0, 1.545]]));
  const spoutGeo = new THREE.BoxGeometry(.11, .034, .055);
  const fls = [];
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const sp = new THREE.Mesh(spoutGeo, brass);
    sp.position.set(Math.cos(a) * .32, 1.268, Math.sin(a) * .32); sp.rotation.y = -a; d.add(sp);
    const fl = flame(.22); fl.position.set(Math.cos(a) * .375, 1.315, Math.sin(a) * .375); d.add(fl); fls.push(fl);
  }
  const pl = new THREE.PointLight(0xffa850, 2.2, 4, 2); pl.position.y = 1.4; d.add(pl);
  d.userData.fls = fls;
  return d;
}

