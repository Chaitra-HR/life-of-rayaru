// ANTARANGA · scene 07 / The Journey — THE LABELS.
// Type in the landscape, not on top of it: a number, a name, a region, and
// one hairline reaching back toward the building. No card, no bubble, no
// pin. The architecture stays the subject; the words only say where we are.
import * as THREE from 'three';
import { textMesh } from '../../util.js';
import { height } from './field.js';

/* how high the block floats, how far it stands off, and the height on the
   building its hairline points to */
const PLACE = {
  srirangam:  { h: 2.60, off: 2.3, lead: 2.2 },
  kumbakonam: { h: 2.20, off: 2.4, lead: 1.7 },
  madurai:    { h: 3.00, off: 2.7, lead: 2.6 },
  udupi:      { h: 1.95, off: 2.9, lead: 1.05 },
  manchale:   { h: 1.60, off: 2.4, lead: .80 },
};

export function createLabels(destinations, ctx = {}) {
  const group = new THREE.Group();
  const items = [];
  /* A narrow screen is not the desktop composition shrunk. Type set to one
     side of a building runs off a portrait frame whichever side it is given,
     so on phones the block stands directly ABOVE the architecture instead —
     centred, set larger, with a short vertical leader down to it. */
  const stacked = !!ctx.isMobile;
  const SIZE = stacked ? 1.3 : 1;

  for (const d of destinations) {
    const P0 = PLACE[d.landmark];
    // stacked, the block has to clear the crown of the building itself
    const h = stacked ? P0.lead + 1.55 : P0.h;
    const off = stacked ? 0 : P0.off;
    const side = stacked ? 0 : (d.labelSide === 'left' ? -1 : 1);

    // the host sits on the landmark and turns to face the traveller, so
    // "left" and "right" stay true on screen wherever the camera comes from
    const host = new THREE.Group();
    host.position.set(d.x, height(d.x, d.z), d.z);
    group.add(host);

    const block = new THREE.Group();
    block.position.set(side * off, h, 0);
    host.add(block);

    const num = textMesh(d.num, { font: 'sans', px: 64, worldH: .23 * SIZE, color: '#cdba93' });
    const name = textMesh(d.name, { font: 'sans', px: 96, letter: .10, worldH: .46 * SIZE, color: '#f6efdd' });
    const reg = textMesh(d.region, { font: 'sans', px: 56, letter: .14, worldH: .19 * SIZE, color: '#bfae89' });

    // flush along the block edge nearest the architecture — or centred when
    // the block stands over it
    for (const [m, dy] of [[num, .60 * SIZE], [name, .14 * SIZE], [reg, -.34 * SIZE]]) {
      const w = m.geometry.parameters.width;
      m.position.set(side === 0 ? 0 : (side < 0 ? -w / 2 : w / 2), dy, 0);
      m.material.depthWrite = false;
      m.renderOrder = 6;
      block.add(m);
    }

    // the hairline: out of the block, toward the building
    const pts = side === 0
      ? [new THREE.Vector3(0, -.62 * SIZE, 0), new THREE.Vector3(0, P0.lead - h, 0)]
      : [new THREE.Vector3(0, .06, 0),
         new THREE.Vector3(-side * off * .40, .06, 0),
         new THREE.Vector3(-side * off, P0.lead - h, 0)];
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0xc9b894, transparent: true, opacity: .45, depthWrite: false })
    );
    line.renderOrder = 6;
    block.add(line);

    items.push({ d, host, meshes: [num, name, reg], line });
  }

  const rel = new THREE.Vector3();
  return {
    group, items,
    /* `w` carries one weight per destination, 0–1; `fade` withdraws them all
       together as the map gives way to Manchale itself */
    update(camLocal, w, fade) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const o = w[i] * fade;
        it.host.visible = o > .008;
        if (!it.host.visible) continue;
        if (camLocal) {
          rel.set(camLocal.x - it.d.x, 0, camLocal.z - it.d.z);
          it.host.rotation.y = Math.atan2(rel.x, rel.z);
        }
        it.meshes[0].material.opacity = o * .72;
        it.meshes[1].material.opacity = o * .95;
        it.meshes[2].material.opacity = o * .60;
        it.line.material.opacity = o * .40;
      }
    },
  };
}
