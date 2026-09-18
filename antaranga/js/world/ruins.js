// ANTARANGA · ruins bundle — a slim extraction from "Temple Ruins Asset
// Pack" by Bl4ckGh0st (sketchfab.com/Bl4ckGh0st), CC-BY-4.0. Twelve rocks,
// eight grass tufts and their PBR atlas materials, repacked as raw buffers
// (models/ruins/) so the page never ships the 61 MB source file.
import * as THREE from 'three';

const BASE = './models/ruins/';

/* on a phone the nine 1024² maps of a few boulders are held at 512²: the
   same pictures at a quarter of the memory (19 Sept 2026) */
const SMALL = (typeof window !== 'undefined') && window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
function shrink(t, max = 512) {
  const im = t.image; if (!im || !(im.width > max)) return t;
  const c = document.createElement('canvas'); c.width = c.height = max;
  c.getContext('2d').drawImage(im, 0, 0, max, max);
  t.image = c; t.needsUpdate = true;
  return t;
}
async function loadTex(loader, file, srgb) {
  if (!file) return null;
  const t = await loader.loadAsync(BASE + file);
  if (SMALL) shrink(t);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;                                  // glTF convention: uv origin top-left
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export async function loadRuins() {
  const manifest = await (await fetch(BASE + 'manifest.json')).json();
  const bin = await (await fetch(BASE + 'geo.bin')).arrayBuffer();
  const texLoader = new THREE.TextureLoader();

  const materials = {};
  for (const [name, entry] of Object.entries(manifest.materials)) {
    const [map, normalMap, roughnessMap] = await Promise.all([
      loadTex(texLoader, entry.map, true),
      loadTex(texLoader, entry.normalMap, false),
      loadTex(texLoader, entry.roughnessMap, false),
    ]);
    const m = new THREE.MeshStandardMaterial({
      map, normalMap, roughnessMap,
      metalness: 0, roughness: 1,
      alphaTest: name === 'M_Grass' ? .45 : 0,
      side: name === 'M_Grass' ? THREE.DoubleSide : THREE.FrontSide,
    });
    if (roughnessMap) m.metalnessMap = roughnessMap;   // glTF packs metal/rough in one image
    materials[name] = m;
  }

  const geometries = {};
  for (const [name, e] of Object.entries(manifest.meshes)) {
    const { v, i } = e.counts;
    let o = e.offset;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(bin, o, v * 3), 3)); o += v * 12;
    if (e.hasNormal) { geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(bin, o, v * 3), 3)); o += v * 12; }
    if (e.hasUV) { geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(bin, o, v * 2), 2)); o += v * 8; }
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(bin, o, i), 1));
    if (!e.hasNormal) geo.computeVertexNormals();
    geo.computeBoundingBox();
    geometries[name] = { geo, material: e.material };
  }
  return { materials, geometries, credit: manifest.credit };
}

/* place a set of [meshName, x, y, z, rotY, scale] rows as one instanced mesh
   per distinct geometry (the counts here are small) */
export function placeRuins(ruins, rows, { shadows = true, tint = null } = {}) {
  const group = new THREE.Group();
  const byName = new Map();
  for (const r of rows) { (byName.get(r[0]) ?? byName.set(r[0], []).get(r[0])).push(r); }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
  for (const [name, list] of byName) {
    const entry = ruins.geometries[name];
    if (!entry) { console.warn('ruins: no mesh', name); continue; }
    let mat = ruins.materials[entry.material];
    if (tint) { mat = mat.clone(); mat.color = tint.clone(); }
    const inst = new THREE.InstancedMesh(entry.geo, mat, list.length);
    list.forEach(([, x, y, z, ry, sc], i) => {
      e.set(0, ry, 0); q.setFromEuler(e); s.setScalar(sc);
      m.compose(new THREE.Vector3(x, y, z), q, s);
      inst.setMatrixAt(i, m);
    });
    inst.castShadow = inst.receiveShadow = shadows;
    group.add(inst);
  }
  return group;
}
