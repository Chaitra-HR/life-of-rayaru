// ANTARANGA · the sand tray — river sand levelled in a teak tray, the ॐ
// written into it with a finger (Akṣarābhyāsa: the first lesson). Built
// alone so the threshold (threshold.js) can set it on the house's bench.
import * as THREE from 'three';
import { canvas, tex, mulberry } from '../util.js';

function sandCanvas() {
  const [c, g] = canvas(512, 384);
  const rnd = mulberry(27);
  g.fillStyle = '#b8a67c'; g.fillRect(0, 0, 512, 384);
  const img = g.getImageData(0, 0, 512, 384), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (rnd() - .5) * 34;
    d[i] += v; d[i + 1] += v * .92; d[i + 2] += v * .8;
  }
  g.putImageData(img, 0, 0);
  g.globalAlpha = .1; g.strokeStyle = '#7a6444';
  for (let y = 14; y < 384; y += 9) { g.beginPath(); g.moveTo(8, y); g.lineTo(504, y + (rnd() - .5) * 4); g.stroke(); }
  g.globalAlpha = 1;
  g.font = '400 200px "Noto Serif Devanagari", serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(232,214,176,.9)'; g.shadowBlur = 9; g.shadowOffsetX = -3; g.shadowOffsetY = -3;
  g.fillStyle = 'rgba(184,160,116,1)'; g.fillText('ॐ', 256, 196);
  g.shadowColor = 'rgba(64,44,26,.85)'; g.shadowBlur = 5; g.shadowOffsetX = 3; g.shadowOffsetY = 4;
  g.fillStyle = '#8a7250'; g.fillText('ॐ', 256, 196);
  g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.shadowOffsetX = 0; g.shadowOffsetY = 0;
  g.fillStyle = '#7b6443'; g.fillText('ॐ', 256, 196);
  g.globalAlpha = .34; g.fillStyle = '#8a3a26'; g.fillText('ॐ', 256, 196);
  g.globalAlpha = 1;
  return c;
}
/* a bump map: the groove of the letter pressed into the sand */
function sandBump() {
  const [c, g] = canvas(512, 384);
  g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 384);
  g.font = '400 200px "Noto Serif Devanagari", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 6; g.fillStyle = '#2a2a2a'; g.fillText('ॐ', 256, 196);
  return c;
}

/* the tray: its foot on y = 0, the sand's surface at .086 */
export function buildSandTray({ shadows = true } = {}) {
  const sand = new THREE.Group();
  const sh = (m) => { m.castShadow = m.receiveShadow = shadows; return m; };
  const teak = new THREE.MeshStandardMaterial({ color: 0x4a3218, roughness: .78 });
  const tray = sh(new THREE.Mesh(new THREE.BoxGeometry(1.16, .085, .84), teak)); tray.position.y = .0425; sand.add(tray);
  const rim = new THREE.MeshStandardMaterial({ color: 0x5a3d1e, roughness: .8 });
  for (const [w, d, x, z] of [[1.16, .06, 0, .39], [1.16, .06, 0, -.39], [.06, .84, .55, 0], [.06, .84, -.55, 0]]) {
    const r = sh(new THREE.Mesh(new THREE.BoxGeometry(w, .05, d), rim)); r.position.set(x, .11, z); sand.add(r);
  }
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(1.04, .72),
    new THREE.MeshStandardMaterial({ color: 0xc9b998, map: tex(sandCanvas()), bumpMap: tex(sandBump(), { srgb: false }), bumpScale: .014, roughness: 1 }));
  bed.rotation.x = -Math.PI / 2; bed.position.y = .086; bed.receiveShadow = shadows; sand.add(bed);
  return sand;
}
