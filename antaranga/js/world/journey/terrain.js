// ANTARANGA · scene 07 / The Journey — THE TERRAIN.
// One sculpted sheet of land carrying the whole peninsula: coast, plain,
// delta, dry basin, the Ghats and the northern plateau. Colour is painted
// per vertex from the field's own moisture and slope, so the ground tells
// the story of the journey before any label does.
import * as THREE from 'three';
import { clamp01, lerp, smooth, win } from '../../util.js';
import { height, moisture, landness, riverField, trailNear, PAL } from './field.js';

/* the modelled land: a rectangle around the route, tall enough north and
   south that the horizon is always relief, never the sheet's own edge */
export const LAND = { cx: 4, cz: -11, w: 78, d: 152 };

const GLSL_NOISE = `
float jHash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
float jNoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(jHash(i), jHash(i+vec2(1.,0.)), f.x),
             mix(jHash(i+vec2(0.,1.)), jHash(i+vec2(1.,1.)), f.x), f.y);
}`;

export function createTerrain(ctx) {
  const segX = ctx.isMobile ? 80 : 122;
  const segZ = ctx.isMobile ? 154 : 236;

  const geo = new THREE.PlaneGeometry(LAND.w, LAND.d, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate(LAND.cx, 0, LAND.cz);

  const pos = geo.attributes.position;
  const n = pos.count;
  const H = new Float32Array(n);
  const M = new Float32Array(n);
  const L = new Float32Array(n);
  const W = new Float32Array(n);      // distance to the nearest water
  const R = new Float32Array(n);      // distance to the worn route

  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const rf = riverField(x, z);
    const h = height(x, z, rf);
    H[i] = h; M[i] = moisture(x, z, rf); L[i] = landness(x, z);
    W[i] = rf.near; R[i] = trailNear(x, z);
    pos.setY(i, h);
  }

  /* colour: mineral, desaturated, and read from the land itself */
  const colors = new Float32Array(n * 3);
  const c = new THREE.Color();
  const cDry = new THREE.Color(PAL.dry), cWarm = new THREE.Color(PAL.warmEarth);
  const cCult = new THREE.Color(PAL.cultivated), cScrub = new THREE.Color(PAL.scrub);
  const cForest = new THREE.Color(PAL.forest), cDeep = new THREE.Color(PAL.deepForest);
  const cRock = new THREE.Color(PAL.rock), cHigh = new THREE.Color(PAL.highRock);
  const cSand = new THREE.Color(PAL.sand);
  const cShallow = new THREE.Color(PAL.seaShallow), cDeepSea = new THREE.Color(PAL.seaDeep);
  const dx = LAND.w / segX, dz = LAND.d / segZ;
  const row = segX + 1;

  for (let i = 0; i < n; i++) {
    const ix = i % row, iy = (i / row) | 0;
    const hL = H[ix > 0 ? i - 1 : i], hR = H[ix < segX ? i + 1 : i];
    const hD = H[iy > 0 ? i - row : i], hU = H[iy < segZ ? i + row : i];
    const gx = (hR - hL) / (dx * (ix > 0 && ix < segX ? 2 : 1));
    const gz = (hU - hD) / (dz * (iy > 0 && iy < segZ ? 2 : 1));
    const slope = Math.hypot(gx, gz);
    const h = H[i], m = M[i], land = L[i];

    if (land < .4) {                          // the shelf beneath the water
      c.copy(cShallow).lerp(cDeepSea, clamp01(-land / 9));
      c.lerp(cSand, clamp01((land + .6) / 1.6) * .55);
    } else {
      // the base note: dry earth through cultivation into forest
      c.copy(cDry).lerp(cWarm, clamp01(1 - m) * .5);
      c.lerp(cCult, smooth(clamp01((m - .28) / .3)) * .62);
      c.lerp(cScrub, smooth(clamp01((m - .40) / .28)) * .6);
      c.lerp(cForest, smooth(clamp01((m - .56) / .26)) * .85);
      c.lerp(cDeep, smooth(clamp01((m - .78) / .22)) * .6);
      // stone shows where the land stands up — but the windward Ghats are
      // forest to the ridge line, so wet ground keeps its colour
      const bare = 1 - m * .72;
      c.lerp(cRock, clamp01((slope - .45) / .8) * .68 * bare);
      c.lerp(cHigh, clamp01((h - 4.2) / 4.0) * .60 * bare);
      // the steeper the ground, the less light it has ever had
      c.multiplyScalar(1 - clamp01((slope - .35) / 1.5) * .26);
      // the beach, and the pale silt of the riverbanks
      c.lerp(cSand, win(land, .2, .8, 1.4, 2.4) * .55);
      c.lerp(cSand, clamp01((1.0 - W[i]) / 1.0) * .15);
      // the route itself: earth walked pale, never a drawn line
      if (R[i] < 1.6) c.lerp(cSand, clamp01((.95 - R[i]) / .95) * .38);
    }
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  /* one material for the whole land; cloud shadows drift across it in the
     shader, which is the cheapest honest way to give the map weather */
  const uniforms = {
    uCloudT: { value: 0 },
    uCloud: { value: ctx.reduced ? .4 : .85 },
  };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCloudT = uniforms.uCloudT;
    shader.uniforms.uCloud = uniforms.uCloud;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vLandXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLandXZ = position.xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',
        `#include <common>\nvarying vec2 vLandXZ;\nuniform float uCloudT;\nuniform float uCloud;\n${GLSL_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 q = vLandXZ * 0.016 + vec2(uCloudT * 0.55, uCloudT * 0.21);
          float m = jNoise(q) * 0.66 + jNoise(q * 2.3 + 4.0) * 0.34;
          float shade = smoothstep(0.36, 0.66, m);
          diffuseColor.rgb *= mix(1.0, mix(1.0, 0.80, shade), uCloud);
        }`);
  };

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = true;
  mesh.renderOrder = 0;

  return {
    mesh, material: mat, uniforms,
    update(time) { uniforms.uCloudT.value = time * .012; },
  };
}
