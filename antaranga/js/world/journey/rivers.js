// ANTARANGA · scene 07 / The Journey — WATER.
// The sea and the four rivers are surfaces sitting inside channels the
// terrain itself has already cut. Nothing here is a blue line drawn on a
// map: the water lies below its banks, catches the sky at glancing angles
// and moves very slowly.
import * as THREE from 'three';
import { lerp } from '../../util.js';
import { RIVERS, height, widthAt } from './field.js';

export const SEA_LEVEL = -.12;

const _PALE = new THREE.Color(0xd7cdb6);

const WATER_NOISE = `
float wHash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
float wNoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(wHash(i), wHash(i+vec2(1.,0.)), f.x),
             mix(wHash(i+vec2(0.,1.)), wHash(i+vec2(1.,1.)), f.x), f.y);
}`;

/* one water material for sea and rivers: a standard surface with a slow
   ripple in its normal and a glancing-angle lift toward the sky. Built on
   MeshStandardMaterial so it answers the scene's own light and fog. */
export function waterMaterial({ color = 0x2e3c38, ripple = .30, sky = 0x8fa0a2, skyAmt = .30, freq = .9 } = {}) {
  const uniforms = {
    uWTime: { value: 0 },
    uRipple: { value: ripple },
    uSkyTint: { value: new THREE.Color(sky) },
    uSkyAmt: { value: skyAmt },
    uFreq: { value: freq },
  };
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: .17, metalness: .04,
  });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWaterXZ;')
      .replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvWaterXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',
        `#include <common>\nvarying vec2 vWaterXZ;\nuniform float uWTime;\nuniform float uRipple;\nuniform vec3 uSkyTint;\nuniform float uSkyAmt;\nuniform float uFreq;\n${WATER_NOISE}`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        {
          vec2 q = vWaterXZ * uFreq;
          float t = uWTime;
          vec2 a = vec2(wNoise(q + vec2(t*0.07, t*0.04)), wNoise(q + vec2(31.0 - t*0.05, 12.0 + t*0.03)));
          vec2 b = vec2(wNoise(q*2.7 - vec2(t*0.10, 0.0)), wNoise(q*2.7 + vec2(7.0, t*0.08)));
          vec3 rip = vec3((a.x - 0.5) * 0.62 + (b.x - 0.5) * 0.26, 0.0,
                          (a.y - 0.5) * 0.62 + (b.y - 0.5) * 0.26);
          normal = normalize(normal + (viewMatrix * vec4(rip * uRipple, 0.0)).xyz);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float fres = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 3.0);
          totalEmissiveRadiance += uSkyTint * fres * uSkyAmt;
        }`);
  };
  mat.userData.uniforms = uniforms;
  return mat;
}

/* the water level along a river: the channel floor, filled, and never
   allowed to run uphill */
function levels(r) {
  const n = r.pts.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const [x, z] = r.pts[i];
    out[i] = height(x, z) + .45 * r.d;
  }
  for (let i = 1; i < n; i++) out[i] = Math.min(out[i], out[i - 1]);
  for (let i = 0; i < n; i++) out[i] = Math.max(out[i], SEA_LEVEL);
  return out;
}

function ribbon(r, samples) {
  const curve = new THREE.CatmullRomCurve3(
    r.pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', .35);
  const lv = levels(r);
  const lvAt = (s) => {
    const f = s * (lv.length - 1);
    const i = Math.min(lv.length - 2, Math.floor(f));
    return lerp(lv[i], lv[i + 1], f - i);
  };
  const pos = [], uv = [], idx = [];
  const p = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i <= samples; i++) {
    const s = i / samples;
    curve.getPoint(s, p);
    curve.getTangent(s, t);
    const nx = -t.z, nz = t.x;                      // left normal in the plane
    const len = Math.hypot(nx, nz) || 1;
    const hw = widthAt(r, s) * .78;
    const y = lvAt(s);
    pos.push(p.x + nx / len * hw, y, p.z + nz / len * hw);
    pos.push(p.x - nx / len * hw, y, p.z - nz / len * hw);
    uv.push(0, s * r.len * .25, 1, s * r.len * .25);
    if (i < samples) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export function createWaters(ctx) {
  const group = new THREE.Group();

  /* the sea — one plane far past the fog, so the peninsula has an horizon */
  const seaMat = waterMaterial({ color: 0x3b4741, ripple: .24, sky: 0xa8b0a6, skyAmt: .52, freq: .55 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(760, 760), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, SEA_LEVEL, 4);
  sea.renderOrder = 1;
  group.add(sea);

  /* the rivers */
  const riverMat = waterMaterial({ color: 0x3a4842, ripple: .40, sky: 0xa3aba1, skyAmt: .34, freq: 1.5 });
  riverMat.polygonOffset = true;
  riverMat.polygonOffsetFactor = -2;
  riverMat.polygonOffsetUnits = -2;
  const meshes = {};
  for (const r of RIVERS) {
    const m = new THREE.Mesh(ribbon(r, ctx.isMobile ? 90 : 170), riverMat);
    m.renderOrder = 2;
    group.add(m);
    meshes[r.n] = m;
  }

  const us = [seaMat.userData.uniforms, riverMat.userData.uniforms];
  return {
    group, sea, meshes, materials: [seaMat, riverMat],
    update(time) {
      const t = ctx.reduced ? 0 : time;
      for (const u of us) u.uWTime.value = t;
    },
    /* the water answers the light of the leg we are travelling */
    setAir(air) {
      for (const u of us) u.uSkyTint.value.copy(air.sky).lerp(_PALE, .45);
    },
  };
}
