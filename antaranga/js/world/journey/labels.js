// ANTARANGA · scene 07 / The Road — THE WORDS ON THE LAND.
// A place is named the way the opening names Mantralaya: one word standing
// in the landscape, and a hairline down to the ground it names. No number,
// no region, no card, no pin, no building under it. The land is the
// subject; the word only says where we are.
import * as THREE from 'three';
import { textMesh } from '../../util.js';
import { height } from './field.js';

export function createLabels(destinations, ctx = {}) {
  const group = new THREE.Group();
  const items = [];
  /* a portrait frame is narrow: the word is set smaller there, not larger,
     so the longest name still stands whole */
  const SIZE = ctx.isMobile ? .72 : 1;

  for (const d of destinations) {
    if (d.unnamed) { items.push(null); continue; }
    // the host stands on the place and turns to face the traveller
    const host = new THREE.Group();
    host.position.set(d.x, height(d.x, d.z), d.z);
    group.add(host);

    /* sized so the longest name (KUMBAKONAM) stands whole inside the frame
       from the road's station a few units short of the place */
    const h = 1.45 * SIZE;
    const name = textMesh(d.name, { font: 'sans', px: 96, letter: .12, worldH: .46 * SIZE, color: '#f4ecd8' });
    name.position.set(0, h, 0);
    name.material.depthWrite = false;
    name.renderOrder = 6;
    host.add(name);

    // the hairline: from under the word to the ground
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, h - .55 * SIZE, 0), new THREE.Vector3(0, .05, 0)]),
      new THREE.LineBasicMaterial({ color: 0xe3d8c1, transparent: true, opacity: .45, depthWrite: false })
    );
    line.renderOrder = 6;
    host.add(line);

    items.push({ d, host, name, line });
  }

  const rel = new THREE.Vector3();
  return {
    group, items,
    /* `w` carries one weight per destination, 0–1; `fade` withdraws them all
       together as the map gives way to Manchale itself. `camera` lets each
       word FIT the frame: the road's station is a few units short of the
       place, and in a portrait frame a ten-letter name at any fixed size
       ran off the edge, so the word is scaled to the width the camera can
       see at that distance, never larger than authored. */
    update(camLocal, w, fade, camera = null) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it) continue;
        const o = w[i] * fade;
        it.host.visible = o > .008;
        if (!it.host.visible) continue;
        if (camLocal) {
          rel.set(camLocal.x - it.d.x, 0, camLocal.z - it.d.z);
          it.host.rotation.y = Math.atan2(rel.x, rel.z);
          if (camera) {
            const dist = Math.hypot(rel.x, rel.z);
            const seen = 2 * dist * Math.tan(camera.fov * Math.PI / 360) * camera.aspect * .82;
            const wordW = it.name.geometry.parameters.width;
            it.host.scale.setScalar(Math.min(1, Math.max(.35, seen / wordW)));
          }
        }
        it.name.material.opacity = o * .95;
        it.line.material.opacity = o * .40;
      }
    },
  };
}
