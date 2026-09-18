// ANTARANGA · small props the lamp world lights: things from the retired
// rooms, built alone so they can stand in the dark.
import * as THREE from 'three';
import { canvas, tex } from '../util.js';
import { sandOmCanvas } from './purvashrama.js';

/* the sand tray with the Om written into it (purvashrama.js), on its dais */
export function sandTray() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3b1e, roughness: .8 });
  const dais = new THREE.Mesh(new THREE.BoxGeometry(1.5, .14, 1.05), wood); dais.position.y = .07; g.add(dais);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(1.06, .07, .78), new THREE.MeshStandardMaterial({ color: 0x513920, roughness: .9 }));
  tray.position.y = .175; g.add(tray);
  const sc = sandOmCanvas();
  const [bc, bg] = canvas(512, 384);
  bg.fillStyle = '#808080'; bg.fillRect(0, 0, 512, 384);
  bg.font = '300 190px "Noto Serif Devanagari", serif'; bg.textAlign = 'center'; bg.textBaseline = 'middle';
  bg.shadowColor = 'rgba(0,0,0,.6)'; bg.shadowBlur = 5; bg.fillStyle = '#2a2a2a'; bg.fillText('ॐ', 256, 200);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(.96, .68),
    new THREE.MeshStandardMaterial({ color: 0xb8ae98, map: tex(sc), bumpMap: tex(bc, { srgb: false }), bumpScale: .012, roughness: 1 }));   // the tan tinted toward Bone, so the lamp's orange does not saturate it
  sand.rotation.x = -Math.PI / 2; sand.position.y = .215; g.add(sand);
  return g;
}
