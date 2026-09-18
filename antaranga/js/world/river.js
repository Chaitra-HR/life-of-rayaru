// ANTARANGA · exterior stage — the Tungabhadra at night (scene 00)
// and the same place at first light (scenes 09-end and 10).
import * as THREE from 'three';
import { buildBrindavana } from './brindavana.js';
import { stoneSet } from './opening.js';
import { createOpening, APPROACH_ROT, makeShoreMask, approachToWorld } from './hero.js';
import { createStations, sl } from './stations.js';
import { createPravesha } from './pravesha.js';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../../vendor/meshopt_decoder.module.js';
import { stoneCanvas, tex, glowSprite, glowTexture, deepaLamp, mulberry, remap, smooth, canvas } from '../util.js';
import { fbm } from '../math.js';

export const BRND_POS = new THREE.Vector3(0, 1.18, -26);

const waterVert = /* glsl */`
uniform mat4 uTextureMatrix;
uniform float uTime;
varying vec3 vWorld;
varying vec4 vRefl;
#include <clipping_planes_pars_vertex>
void main(){
  vec4 wp = modelMatrix * vec4(position,1.0);
  // a low, slow swell — river surface, never sea
  wp.y += 0.035 * sin(wp.x * 0.18 + wp.z * 0.07 + uTime * 0.35) + 0.022 * sin(wp.z * 0.23 - uTime * 0.27 + wp.x * 0.05);
  vWorld = wp.xyz;
  vRefl = uTextureMatrix * wp;
  vec4 mvPosition = viewMatrix * wp;
  #include <clipping_planes_vertex>
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

/* The river: small directional ripples running with the current, a planar
   reflection sampled through those ripples so it breaks rather than mirrors,
   amber only where the low sun and the lamps actually touch the water. */
const waterFrag = /* glsl */`
uniform float uTime;
uniform float uMode;      // 0 dawn → 1 full morning (return chapters)
uniform float uDawn;      // the opening's first light
uniform vec3 uLamp;       // warm lamp position (return chapters)
uniform vec3 uSunDir;     // direction toward the sunrise
uniform vec3 uMoonDir;    // direction toward the moon (the chapters' night)
uniform float uMoonAmt;   // how much of the moon is on the water
uniform vec3 uCam;
uniform sampler2D uReflect;
uniform float uHasRefl;
uniform sampler2D uShore;   // baked land-proximity mask in world xz
uniform vec4 uShoreRect;    // x0, z0, 1/w, 1/h  (z-scale 0 disables)
uniform vec3 uFog;
uniform float uFogD;
uniform float uLinear;
varying vec3 vWorld;
varying vec4 vRefl;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for(int i=0;i<3;i++){ s += a*vnoise(p); p *= 2.1; a *= 0.5; }
  return s;
}
// ripples elongated along the flow (+x), drifting slowly downstream
vec3 ripple(vec2 xz){
  vec2 flow = vec2(uTime*0.030, uTime*0.012);       // downstream drift: slow and directional
  vec2 p1 = xz*vec2(0.55, 1.9) + flow;                  // long, low swells
  vec2 p2 = xz*vec2(1.8, 5.2) - flow*1.6 + 7.3;         // fine directional ripples
  vec2 p3 = xz*vec2(4.5, 9.0) + flow*2.3 + 3.1;         // surface texture
  float h1 = fbm(p1), h2 = fbm(p2), h3 = vnoise(p3);
  float dx = (fbm(p1+vec2(0.03,0.0))-h1)*1.2 + (fbm(p2+vec2(0.02,0.0))-h2)*2.6 + (vnoise(p3+vec2(0.02,0.0))-h3)*0.9;
  float dz = (fbm(p1+vec2(0.0,0.03))-h1)*1.2 + (fbm(p2+vec2(0.0,0.02))-h2)*2.6 + (vnoise(p3+vec2(0.0,0.02))-h3)*0.9;
  return normalize(vec3(-dx*3.0, 1.0, -dz*3.0));
}

#include <clipping_planes_pars_fragment>
void main(){
  #include <clipping_planes_fragment>
  vec3 nrm = ripple(vWorld.xz);
  /* near land the water shallows out: ripples settle, the bed shows through,
     reflections weaken — the contact zone that locks water to terrain */
  float shal = 0.0;
  if (uShoreRect.z > 0.0) {
    vec2 suv = vec2((vWorld.x - uShoreRect.x) * uShoreRect.z, (vWorld.z - uShoreRect.y) * uShoreRect.w);
    shal = texture2D(uShore, clamp(suv, 0.0, 1.0)).r;
  }
  nrm = normalize(mix(nrm, vec3(0.0, 1.0, 0.0), shal * 0.45));
  vec3 V = normalize(uCam - vWorld);
  float fres = pow(1.0 - max(dot(nrm, V), 0.0), 3.5);

  vec3 deepDawn = vec3(0.014, 0.020, 0.046);
  vec3 deepMorn = vec3(0.040, 0.046, 0.046);
  vec3 deep = mix(deepDawn, deepMorn, uMode);
  deep = mix(deep, vec3(0.082, 0.070, 0.158), uDawn);   // first-light water: indigo, with the dawn's violet in it

  // planar reflection, displaced by the ripples so it tears and breaks
  vec2 ruv = vRefl.xy / vRefl.w;
  float dist = length(uCam - vWorld);
  float distort = 0.035 + 0.05 * (1.0 - exp(-dist*0.03));
  ruv += nrm.xz * distort;
  ruv = clamp(ruv, 0.002, 0.998);
  vec3 refl = texture2D(uReflect, ruv).rgb;
  if (uLinear > 0.5) refl = pow(max(refl, 0.0), vec3(1.0/2.2));
  // a second, offset tap streaked vertically: the reflection elongates
  vec3 refl2 = texture2D(uReflect, clamp(ruv + vec2(nrm.x*0.02, -0.035 - abs(nrm.z)*0.06), 0.002, 0.998)).rgb;
  if (uLinear > 0.5) refl2 = pow(max(refl2, 0.0), vec3(1.0/2.2));
  refl = mix(refl, refl2, 0.45);
  float reflAmt = (0.28 + 0.62*fres) * uHasRefl * (1.0 - shal * 0.55);
  // dark water swallows most of what it reflects
  vec3 col = mix(deep, refl * 0.66, reflAmt);
  // the near water is the darkest thing in the frame
  col *= mix(mix(0.55, 0.74, uDawn), 1.0, smoothstep(4.0, 30.0, dist));
  // the muddy shallows along every bank and around the platform footing
  vec3 bed = vec3(0.058, 0.062, 0.048) * (0.55 + 0.85 * uDawn + 0.6 * uMode);
  col = mix(col, bed, shal * 0.55);
  // cool sky fill on the ripple faces turned away from the viewer
  col += vec3(0.074, 0.058, 0.130) * (1.0 - fres) * 0.35 * (1.0 - uMode);

  // sun glints: tight specular along the sunrise direction, broken by noise
  vec3 H = normalize(V + uSunDir);
  float spec = pow(max(dot(nrm, H), 0.0), 520.0);
  float sparkle = smoothstep(0.42, 0.92, vnoise(vWorld.xz*vec2(3.0, 9.0) + vec2(uTime*0.2, -uTime*0.1)));
  vec3 sunCol = mix(vec3(0.95, 0.62, 0.30), vec3(1.0, 0.76, 0.48), uDawn);
  float calm = 1.0 - shal * 0.7;
  col += sunCol * spec * sparkle * (2.3 * uDawn + 1.6 * uMode) * calm;
  float specWide = pow(max(dot(nrm, H), 0.0), 36.0);
  col += sunCol * specWide * 0.05 * (uDawn + uMode) * (0.4 + 0.6*sparkle) * calm;

  /* the moon's path: the one light broken by the water into many, no two
     alike (Pañcabheda is told on this). A tight glitter along the moon's
     direction, cool, and a wider low sheen under it. */
  if (uMoonAmt > 0.001) {
    vec3 Hm = normalize(V + uMoonDir);
    float mspec = pow(max(dot(nrm, Hm), 0.0), 240.0);
    float msp = smoothstep(0.36, 0.9, vnoise(vWorld.xz*vec2(2.6, 8.0) + vec2(uTime*0.16, -uTime*0.08)));
    vec3 moonCol = vec3(0.82, 0.86, 0.96);
    col += moonCol * mspec * msp * 2.6 * uMoonAmt * calm;
    float mwide = pow(max(dot(nrm, Hm), 0.0), 28.0);
    col += moonCol * mwide * 0.075 * uMoonAmt * (0.5 + 0.5*msp) * calm;
  }

  // lamp streak across the water (return chapters)
  if (uMode > 0.001) {
    vec2 toLamp = uLamp.xz - vWorld.xz;
    float along = clamp(1.0 - abs(vWorld.x - uLamp.x + nrm.x*6.0) / (1.2 + fres*8.0), 0.0, 1.0);
    float distF = clamp(1.0 - length(toLamp)/70.0, 0.0, 1.0);
    float streak = pow(along, 3.0) * distF;
    col += vec3(1.0, 0.72, 0.4) * streak * 0.45 * uMode;
  }

  // exponential-squared fog, matching the scene
  float fogF = 1.0 - exp(-uFogD*uFogD*dist*dist);
  vec3 fogc = uLinear > 0.5 ? pow(max(uFog, 0.0), vec3(1.0/2.2)) : uFog;
  col = mix(col, fogc, fogF);
  if (uLinear > 0.5) col = pow(max(col, 0.0), vec3(2.2));
  gl_FragColor = vec4(col, 1.0);
}`;

const skyVert = /* glsl */`
varying vec3 vPos;
void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const skyFrag = /* glsl */`
uniform float uMode;
uniform float uDawn;
uniform float uRise;
uniform float uDay;
uniform float uNight;
uniform float uTime;
uniform float uLinear;
varying vec3 vPos;
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
float vn2(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x), mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x), f.y);
}
void main(){
  float h = normalize(vPos).y;
  float az = atan(vPos.x, -vPos.z);
  vec3 zenN = vec3(0.008,0.007,0.026);
  vec3 horN = vec3(0.050,0.038,0.088);
  vec3 zenM = vec3(0.045,0.06,0.13);
  vec3 horM = vec3(0.62,0.36,0.17);
  vec3 horCool = vec3(0.150,0.120,0.300);
  float warmSpread = exp(-pow((az - 0.30)*2.6, 2.0));
  float m2 = max(uMode, uDawn*0.5);
  vec3 zen = mix(zenN, zenM, m2);
  vec3 horDawn = mix(horCool, vec3(0.38, 0.21, 0.19), warmSpread);
  vec3 hor = mix(mix(horN, horM, uMode), horDawn, uDawn*(1.0-uMode));
  float f = pow(clamp(1.0 - h, 0.0, 1.0), 2.6);
  vec3 col = mix(zen, hor, f);
  // pre-dawn glow pocket behind the brindavana (morning chapters)
  float pocket = exp(-pow((atan(vPos.x, -vPos.z))*2.2, 2.0)) * pow(clamp(1.0-h,0.0,1.0), 3.0);
  col += vec3(0.55,0.3,0.12) * pocket * uMode;
  /* the hero: first light. A deep blue-grey zenith, desaturated blue mid
     sky, a pale warm band only at the horizon, the sun small and low on
     the LEFT. Haze sits on the horizon line. */
  float SUN_AZ = -0.09;   // low over the river, well left of the gateway — inside the frame at every breakpoint
  {
    /* early morning at the river: deep muted blue above, easing through
       blue-lavender into a dusty pink band and a restrained peach line at
       the horizon. The hold camera only ever sees the lowest ~0.3 of the
       dome, so the whole gradient lives in that band — mapped by elevation,
       on overlapping curves, no visible banding. */
    vec3 mZen = vec3(0.055, 0.052, 0.175), mMid = vec3(0.165, 0.135, 0.285);
    vec3 mRose = vec3(0.400, 0.235, 0.290), mHor = vec3(0.760, 0.450, 0.235);
    float k = clamp(1.0 - h, 0.0, 1.0);
    vec3 morning = mix(mZen, mMid, 1.0 - smoothstep(0.16, 0.50, h));
    morning = mix(morning, mRose, 1.0 - smoothstep(0.030, 0.135, h));
    morning = mix(morning, mHor, 1.0 - smoothstep(0.004, 0.050, h));
    float pocket = exp(-pow((az - SUN_AZ) * 1.5, 2.0)) * pow(k, 5.0);
    morning = mix(morning, vec3(0.95, 0.66, 0.38), pocket * 0.44);
    morning += vec3(0.44, 0.19, 0.05) * exp(-pow((az - SUN_AZ) * 2.2, 2.0)) * pow(k, 13.0);
    col = mix(col, morning, uDawn * (1.0 - uMode));
  }
  /* the sun CLIMBS through the arrival (uRise, held at 1 afterwards):
     below the horizon it is only a red stain in the haze, it crests as a
     deep-orange coal, then lifts into a small warm morning sun — dim enough
     that nothing near it fights the interface for the eye */
  /* it crests to barely clear the horizon line — a low pink morning sun,
     most of it still behind the river's far bank */
  float SUN_EL = mix(-0.050, 0.004, uRise);
  vec3 sunDir = normalize(vec3(sin(SUN_AZ)*cos(SUN_EL), sin(SUN_EL), -cos(SUN_AZ)*cos(SUN_EL)));
  float sunA = acos(clamp(dot(normalize(vPos), sunDir), -1.0, 1.0));
  float halo = exp(-sunA*sunA*10.0);
  float disc = 1.0 - smoothstep(0.013, 0.022, sunA);
  float crest = smoothstep(0.45, 0.90, uRise);   // the disc breaches at ~.56
  vec3 discCol = mix(vec3(1.0, 0.32, 0.10), vec3(1.0, 0.74, 0.50), crest);
  vec3 haloCol = mix(vec3(0.80, 0.22, 0.07), vec3(0.86, 0.45, 0.25), crest);
  col += haloCol * halo * (0.16 + 0.12 * uRise) * uDawn * (1.0 - uMode);

  /* storm-lit clouds: slate banks overhead, their undersides caught amber
     where they face the sun, edges burning where they thin */
  vec2 cuv = vec2(az*2.1, h*5.2);
  float cn = 0.0; { float a = .5; vec2 p2 = cuv*1.6 + vec2(uTime*0.004, 0.0);
    for(int i=0;i<4;i++){ cn += a*vn2(p2); p2 *= 2.15; a *= .5; } }
  float band = smoothstep(0.03, 0.12, h) * smoothstep(0.95, 0.40, h);
  float hero = uDawn * (1.0 - uMode);
  // in the hero the banks become thin low streaks: the upper sky stays a
  // clear deep blue, as it does before a real sunrise
  band *= mix(1.0, 1.0 - smoothstep(0.05, 0.20, h), hero);
  float cloud = smoothstep(0.40, 0.74, cn) * band * (1.0 - 0.45 * hero);
  // the sky clears in a pocket around the risen sun — no bank drifts over it
  cloud *= 1.0 - exp(-sunA*sunA*7.0) * 0.75 * hero;
  float warmSide = mix(exp(-pow((az - 0.50)*1.4, 2.0)), exp(-pow((az - 0.30)*2.0, 2.0)), uMode);
  warmSide = mix(warmSide, exp(-pow((az + 0.26)*1.5, 2.0)), hero);
  float under = pow(clamp(1.0-h,0.0,1.0), 2.0);
  // in the hero the banks are soft grey-blue morning cloud, not storm slate
  vec3 cloudDark = mix(vec3(0.030,0.038,0.070), vec3(0.24,0.205,0.330), hero);
  vec3 cloudCol = mix(cloudDark, mix(vec3(0.50,0.27,0.11), vec3(0.94,0.58,0.30), hero), warmSide*max(uDawn*pow(under, 2.2)*0.8, uMode*0.7));
  col = mix(col, cloudCol, cloud*mix(0.85, 0.15, hero));
  float rim = smoothstep(0.42,0.58,cn) - smoothstep(0.56,0.82,cn);

  col += vec3(0.42,0.27,0.13) * max(rim, 0.0) * band * warmSide * uMode * 0.45;   // (uMode only: the hero keeps a clean sky)
  /* a soft in-sky echo of the disc under the haze — the bright disc itself
     is a sprite held in front of the clouds (see the stage's sun group) */
  col += discCol * disc * (0.10 + 0.16 * crest) * uDawn * (1.0 - uMode);
  /* the same sky at two other hours (river.js update). Afternoon: pale,
     hazy, Bone at the horizon, the sun high on the left — Manchale before
     the Brindavana. Night: the pre-dawn dome without its horizon glow;
     the stars are drawn separately. */
  {
    float k2 = clamp(1.0 - h, 0.0, 1.0);
    /* a deeper zenith so the sky reads as a dome, a Bone haze band at the
       horizon, the same cloud banks as the dawn but pale and thin, and a
       warm pocket where the afternoon sun stands high on the left */
    vec3 dayCol = mix(vec3(0.40, 0.50, 0.62), vec3(0.62, 0.68, 0.74), 1.0 - smoothstep(0.12, 0.55, h));
    dayCol = mix(dayCol, vec3(0.89, 0.82, 0.66), 1.0 - smoothstep(0.0, 0.16, h));
    dayCol = mix(dayCol, vec3(0.94, 0.91, 0.84), cloud * 0.55);
    vec3 dsun = normalize(vec3(-0.45, 0.66, -0.60));
    float dA = acos(clamp(dot(normalize(vPos), dsun), -1.0, 1.0));
    dayCol += vec3(0.50, 0.38, 0.18) * exp(-dA * dA * 5.0) + vec3(0.9, 0.8, 0.6) * exp(-dA * dA * 60.0);
    col = mix(col, dayCol, uDay);
    vec3 nightCol = mix(vec3(0.030, 0.036, 0.072), vec3(0.135, 0.145, 0.205), pow(k2, 2.0));
    /* the moon's own glow in the night air, low over the far bank (river.js moonDisc) */
    vec3 mdir = normalize(vec3(-0.30, 0.13, -0.94));
    float mA = acos(clamp(dot(normalize(vPos), mdir), -1.0, 1.0));
    nightCol += vec3(0.16, 0.17, 0.22) * exp(-mA*mA*22.0) + vec3(0.05, 0.055, 0.08) * exp(-mA*mA*4.0);
    col = mix(col, nightCol, uNight);
  }
  if (uLinear > 0.5) col = pow(max(col, 0.0), vec3(2.2));
  gl_FragColor = vec4(col, 1.0);
}`;

export function makeWater(w, h, segs = 1) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: waterVert, fragmentShader: waterFrag,
    uniforms: {
      uTime: { value: 0 }, uMode: { value: 0 }, uDawn: { value: 0 },
      uLamp: { value: new THREE.Vector3() }, uCam: { value: new THREE.Vector3() },
      uSunDir: { value: new THREE.Vector3(-.09, .03, -.99).normalize() },
      uMoonDir: { value: new THREE.Vector3(-.3, .12, -.94).normalize() }, uMoonAmt: { value: 0 },
      uReflect: { value: null }, uHasRefl: { value: 0 }, uTextureMatrix: { value: new THREE.Matrix4() },
      uShore: { value: null }, uShoreRect: { value: new THREE.Vector4(0, 0, 0, 0) },
      uFog: { value: new THREE.Color(0x141826) }, uFogD: { value: .008 }, uLinear: { value: 0 },
    },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h, segs, segs), mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/* Planar reflection — a mirrored camera renders the scene (minus the water)
   into a small target each frame; the water shader samples it through the
   ripples. Tone-mapped like the screen so the sample is display-ready. */
function makeReflector(ctx) {
  const w = ctx.isMobile ? 256 : 512, h = ctx.isMobile ? 144 : 288;
  const rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true });
  rt.isXRRenderTarget = true;                  // renderer: apply tone mapping + sRGB as for the screen
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  rt.texture.minFilter = THREE.LinearFilter; rt.texture.generateMipmaps = false;
  const cam = new THREE.PerspectiveCamera();
  const clip = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.03)];
  const view = new THREE.Vector3(), target = new THREE.Vector3();
  const camPos = new THREE.Vector3(), lookAt = new THREE.Vector3(), rot = new THREE.Matrix4();
  const texMat = new THREE.Matrix4();
  return {
    rt, texMat,
    render(renderer, scene, camera, hide) {
      camPos.setFromMatrixPosition(camera.matrixWorld);
      if (camPos.y < 0.05) return false;
      view.copy(camPos); view.y = -view.y;          // mirror across y = 0
      rot.extractRotation(camera.matrixWorld);
      lookAt.set(0, 0, -1).applyMatrix4(rot).add(camPos);
      target.copy(lookAt); target.y = -target.y;
      cam.position.copy(view);
      cam.up.set(0, 1, 0).applyMatrix4(rot); cam.up.y = -cam.up.y;
      cam.lookAt(target);
      cam.near = camera.near; cam.far = camera.far;
      cam.projectionMatrix.copy(camera.projectionMatrix);
      cam.updateMatrixWorld();
      texMat.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
      texMat.multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);

      const prevRT = renderer.getRenderTarget();
      const prevClip = renderer.clippingPlanes;
      const prevShadow = renderer.shadowMap.autoUpdate;
      for (const o of hide) o.visible = false;
      renderer.clippingPlanes = clip;
      renderer.shadowMap.autoUpdate = false;       // reuse this frame's shadow maps
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, cam);
      renderer.setRenderTarget(prevRT);
      renderer.clippingPlanes = prevClip;
      renderer.shadowMap.autoUpdate = prevShadow;
      for (const o of hide) o.visible = true;
      return true;
    },
  };
}

export function createRiverStage(ctx) {
  /* where the dusk under the chapters' head is complete, in t (main.js syncSeams) */
  let duskEnd = .086;
  const g = new THREE.Group();
  g.visible = false;
  /* the earlier return scenery (a second Brindavana on a ghat, a second
     bank, rocks, a gopuram): RETIRED. The return is the opening's own
     composition, seen again (hero.js). The group is kept built but never
     shown, and its lamp's light sits at zero so no program ever changes. */
  const legacy = new THREE.Group();
  legacy.visible = false;
  g.add(legacy);
  const fogCol = new THREE.Color(0x141826);

  /* sky dome */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(210, 24, 16),
    new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, uniforms: { uMode: { value: 0 }, uDawn: { value: 0 }, uRise: { value: 0 }, uDay: { value: 0 }, uNight: { value: 0 }, uTime: { value: 0 }, uLinear: { value: 0 } }, depthWrite: false })
  );
  g.add(sky);

  /* the sun itself is painted by the sky shader (disc + halo at SUN_AZ /
     SUN_EL) — one sun, in the same space as the sky's own glow pocket, and
     carried into the water by the planar reflection. */

  /* stars */
  const starN = ctx.isMobile ? 260 : 520;
  const sp = new Float32Array(starN * 3);
  const rnd = mulberry(42);
  for (let i = 0; i < starN; i++) {
    const a = rnd() * Math.PI * 2, e = Math.acos(1 - rnd() * .82);
    const r = 195;
    sp[i * 3] = Math.cos(a) * Math.sin(e) * r;
    sp[i * 3 + 1] = Math.cos(e) * r * .9 + 8;
    sp[i * 3 + 2] = Math.sin(a) * Math.sin(e) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xcfd8dd, size: .7, sizeAttenuation: true, transparent: true, opacity: .7,
    map: glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  g.add(stars);   // the night on the bank (t .870–.912) is the one time they show

  /* water */
  const water = makeWater(420, 220, 96);
  water.position.set(0, 0, 28);
  g.add(water);

  /* far bank */
  const bankTex = tex(stoneCanvas(512, [22, 22, 20], 10, 5), { repeat: [8, 2] });
  const bankGeo = new THREE.PlaneGeometry(320, 60, 64, 12);
  {
    const pos = bankGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, Math.max(0, (y + 14) * .16) * (1.4 + Math.sin(x * .05) * .5) + Math.random() * .12);
    }
    bankGeo.computeVertexNormals();
  }
  const bank = new THREE.Mesh(bankGeo, new THREE.MeshStandardMaterial({ map: bankTex, roughness: 1 }));
  bank.rotation.x = -Math.PI / 2;
  bank.position.set(0, .02, -52);
  legacy.add(bank);

  /* rocky outcrops flanking (Tungabhadra boulders) */
  const rockMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [26, 26, 24], 12, 9)), roughness: 1 });
  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  {
    /* boulders, not blobs: push each vertex in or out so silhouettes break */
    const rp = rockGeo.attributes.position;
    const rr2 = mulberry(5);
    for (let i = 0; i < rp.count; i++) {
      const vx = rp.getX(i), vy = rp.getY(i), vz = rp.getZ(i);
      const len = Math.hypot(vx, vy, vz) || 1;
      const k = 1 + (rr2() - .5) * .16;
      rp.setXYZ(i, vx / len * k, vy / len * k, vz / len * k);
    }
    rockGeo.computeVertexNormals();
  }
  const rrnd = mulberry(77);
  for (let i = 0; i < 14; i++) {
    const r = new THREE.Mesh(rockGeo, rockMat);
    const side = i % 2 ? 1 : -1;
    r.position.set(side * (14 + rrnd() * 30), .1 + rrnd() * .4, -14 - rrnd() * 34);
    r.scale.set(1.5 + rrnd() * 3.5, .9 + rrnd() * 1.6, 1.2 + rrnd() * 2.8);
    r.rotation.set(rrnd() * 3, rrnd() * 3, rrnd() * 3);
    legacy.add(r);
  }

  /* ghat platform + brindavana */
  const ghatSet = stoneSet(12, { base: [72, 74, 76], courses: 6, cols: 3, vary: .2, cool: .06, warm: .02 });
  const platMat = new THREE.MeshStandardMaterial({
    map: ghatSet.map, normalMap: ghatSet.normalMap, normalScale: new THREE.Vector2(.8, .8),
    roughnessMap: ghatSet.roughnessMap, roughness: 1, metalness: 0,
  });
  const ghat = new THREE.Group();
  const stepDims = [[11, .5, 9.4]];
  let gy = 1.0;
  for (const [w, h, d] of stepDims) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let i = 0; i < uv.count; i++) { const f = Math.floor(i / 4); uv.setXY(i, uv.getX(i) * dims[f][0] / 2.6, uv.getY(i) * dims[f][1] / 2.6); }
    const s = new THREE.Mesh(geo, platMat);
    s.castShadow = s.receiveShadow = true;
    s.position.set(0, gy + h / 2, 0); ghat.add(s); gy += h;
  }
  ghat.position.set(BRND_POS.x, -.35, BRND_POS.z);
  ghat.rotation.y = APPROACH_ROT;   // turned with the opening's approach axis
  legacy.add(ghat);   // the hero builds its own platform; this is the return chapters' ghat

  const mark = (n) => { try { performance.mark('river:' + n); } catch (e) {} };
  const brnd = buildBrindavana({ withMala: true }); mark('brindavana');
  brnd.group.position.copy(BRND_POS);
  g.add(brnd.group);
  /* Brindavana Pravesha, in this world: the chamber under the pad, the layers, the cut (pravesha.js) */
  const pravesha = createPravesha(ctx, { brnd, brndPos: BRND_POS, sl, approachToWorld, world: g }); mark('pravesha');

  /* reflections come from the planar reflector sampled by the water */
  const reflector = makeReflector(ctx);
  water.material.uniforms.uReflect.value = reflector.rt.texture;
  water.material.uniforms.uTextureMatrix.value = reflector.texMat;

  /* the baked shore mask: shallows along every bank and the platform base */
  const shore = makeShoreMask(BRND_POS);
  water.material.uniforms.uShore.value = shore.tex;
  water.material.uniforms.uShoreRect.value.set(shore.rect[0], shore.rect[1], shore.rect[2], shore.rect[3]);

  /* the far small lamp — first thing the visitor sees */
  const lampPos = new THREE.Vector3(BRND_POS.x + 2.6, BRND_POS.y + .5, BRND_POS.z + 4.4);
  /* the ghat's standing deepas — the same brass lamp the whole site carries */
  const lampFlame = deepaLamp({ scale: 1.9, light: false, flameScale: .7 });
  lampFlame.position.set(lampPos.x, BRND_POS.y - .5, lampPos.z);
  legacy.add(lampFlame);
  const lampLight = new THREE.PointLight(0xff9a45, 0, 34, 2);
  lampLight.position.copy(lampPos).add(new THREE.Vector3(0, .3, 0));
  g.add(lampLight);   // in the live group at zero: never toggled, never recompiled
  // second lamp on other side, dimmer (morning seva)
  const lamp2 = deepaLamp({ scale: 1.7, light: false, flameScale: .6 });
  lamp2.position.set(BRND_POS.x - 2.6, BRND_POS.y - .5, BRND_POS.z + 4.4);
  lamp2.visible = false;
  legacy.add(lamp2);

  /* cool moon fill + warm key */
  const moon = new THREE.DirectionalLight(0x4a5c78, .55);
  moon.position.set(-30, 50, 20);
  g.add(moon);
  const hemi = new THREE.HemisphereLight(0x131a1e, 0x05070a, .5);
  g.add(hemi);
  const dawn = new THREE.DirectionalLight(0xffa050, 0);
  dawn.position.set(14, 10, -60);
  g.add(dawn);

  /* riverbank vegetation — bushes, grass, palms; the far temple cue */
  const veg = new THREE.Group();
  legacy.add(veg);
  {
    const vrnd = mulberry(31);
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x2f3a20, roughness: 1 });
    const bushGeo = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < (ctx.isMobile ? 10 : 18); i++) {
      const b = new THREE.Mesh(bushGeo, bushMat);
      const side = i % 2 ? 1 : -1;
      b.position.set(side * (10 + vrnd() * 34), .3, -18 - vrnd() * 36);
      b.scale.set(.8 + vrnd() * 1.8, .5 + vrnd() * .9, .8 + vrnd() * 1.4);
      b.rotation.y = vrnd() * 3;
      veg.add(b);
    }
    // palms on the far bank, leaning over the water
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2c1c, roughness: 1 });
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x2c3a1e, roughness: 1, side: THREE.DoubleSide });
    for (let i = 0; i < (ctx.isMobile ? 4 : 7); i++) {
      const palm = new THREE.Group();
      const h = 5 + vrnd() * 2.5;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.09, .16, h, 6), trunkMat);
      trunk.position.y = h / 2;
      palm.add(trunk);
      const crown = new THREE.Group();
      crown.position.y = h;
      for (let k = 0; k < 9; k++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(.14, 2.9, 4), frondMat);
        frond.scale.z = .16;
        const a = k / 9 * Math.PI * 2;
        // fronds arch outward and droop, hinged at the crown
        frond.position.set(Math.cos(a) * 1.15, -.15, Math.sin(a) * 1.15);
        frond.rotation.set(Math.sin(a) * 1.62, 0, -Math.cos(a) * 1.62);
        crown.add(frond);
      }
      palm.add(crown);
      const side = i % 2 ? 1 : -1;
      palm.position.set(side * (16 + vrnd() * 26), .1, -46 - vrnd() * 16);
      palm.rotation.z = (vrnd() - .5) * .3 * side;
      veg.add(palm);
    }
    // distant temple gopuram — the Matha across the land, kept far and soft
    const gopMat = new THREE.MeshStandardMaterial({ color: 0x5a4530, roughness: 1 });
    const gop = new THREE.Group();
    const tiers = [[6, 2.2, 4], [5, 1.9, 3.4], [4, 1.7, 2.8], [3, 1.5, 2.2], [2, 1.2, 1.6]];
    let gy2 = 0;
    for (const [w, hh, d] of tiers) {
      const tier = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), gopMat);
      tier.position.y = gy2 + hh / 2; gy2 += hh;
      gop.add(tier);
    }
    const crown2 = new THREE.Mesh(new THREE.CylinderGeometry(.16, .3, 1.2, 8), gopMat);
    crown2.position.y = gy2 + .6;
    gop.add(crown2);
    gop.position.set(46, 0, -74);
    gop.rotation.y = .3;
    veg.add(gop);
  }

  /* the dust: fine motes catching the low sun FAR off, over the water and
     around the gateway, never near the lens. A field of a thousand-odd
     one-to-two-pixel points, each at least ~14 units from the camera, carried
     by a slow wind entirely on the GPU (no per-frame CPU loop). Size is set in
     PIXELS, not world units, so nothing ever swells into a blob; each mote
     twinkles as it turns in the light, and fades in and out at the edges of
     its wrap so none ever pops. */
  const dustN = ctx.isMobile ? 900 : 2200;
  const dpos = new Float32Array(dustN * 3);
  const dseed = new Float32Array(dustN), dscale = new Float32Array(dustN);
  for (let i = 0; i < dustN; i++) {
    /* a deep band behind and beside the gateway: the opening camera stands
       near (-13, 1.5, 18) and looks down the bank toward (-5, 4.3, -22) */
    let x, y, z;
    do {
      x = -70 + rnd() * 120;
      z = -95 + rnd() * 92;
      y = -.5 + Math.pow(rnd(), 1.6) * 15;       // denser in the low air
    } while (Math.hypot(x + 13, z - 18) < 20);
    dpos[i * 3] = x; dpos[i * 3 + 1] = y; dpos[i * 3 + 2] = z;
    dseed[i] = rnd();
    dscale[i] = .55 + Math.pow(rnd(), 3) * .95;  // mostly tiny, a few catch more light
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(dseed, 1));
  dustGeo.setAttribute('aScale', new THREE.BufferAttribute(dscale, 1));
  const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uPx: { value: 1 }, uSize: { value: 2.2 },
      uColor: { value: new THREE.Color(0xffe2bd) }, uOpacity: { value: 0 },
    },
    vertexShader: /* glsl */`
      uniform float uTime, uPx, uSize;
      attribute float aSeed, aScale;
      varying float vA;
      void main(){
        vec3 p = position;
        float t = uTime;
        // a slow wind down the river, each mote at its own pace, wrapped in the band
        p.x = mod(p.x + 70.0 + t * (0.22 + 0.32 * aSeed), 120.0) - 70.0;
        p.y = mod(p.y + 0.5 + t * (0.03 + 0.07 * aSeed), 15.5) - 0.5;
        p.y += sin(t * (0.17 + 0.2 * aSeed) + aSeed * 41.0) * 0.45;
        p.z += sin(t * (0.11 + 0.1 * aSeed) + aSeed * 17.0) * 0.9;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        gl_Position = projectionMatrix * mv;
        // pixels, gently smaller with distance: 1–3 css px, never a blob
        gl_PointSize = max(1.0, uPx * uSize * aScale * clamp(34.0 / dist, 0.5, 1.15));
        // turning in the light: most of the time faint, now and then a glint
        float tw = 0.5 + 0.5 * sin(t * (0.5 + aSeed * 1.4) + aSeed * 93.0);
        tw = 0.35 + 0.65 * tw * tw;
        float ex = smoothstep(-70.0, -60.0, p.x) * (1.0 - smoothstep(40.0, 50.0, p.x));
        float ey = smoothstep(-0.5, 0.6, p.y) * (1.0 - smoothstep(12.5, 15.0, p.y));
        float ed = smoothstep(12.0, 24.0, dist) * (1.0 - smoothstep(85.0, 125.0, dist));
        vA = tw * ex * ey * ed;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vA;
      void main(){
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float a = 1.0 - smoothstep(0.0, 1.0, r);
        gl_FragColor = vec4(uColor, a * a * vA * uOpacity);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  dust.frustumCulled = false;      // the shader moves them; the CPU bounds are stale
  dust.renderOrder = 3;
  g.add(dust);

  /* fireflies (night) / dust motes */
  const flyN = ctx.isMobile ? 30 : 70;
  const fpos = new Float32Array(flyN * 3);
  for (let i = 0; i < flyN; i++) {
    fpos[i * 3] = (rnd() - .5) * 60;
    fpos[i * 3 + 1] = .4 + rnd() * 3;
    fpos[i * 3 + 2] = -34 + rnd() * 40;
  }
  const flyGeo = new THREE.BufferGeometry();
  flyGeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({
    color: 0xd8ffb0, size: .08, transparent: true, opacity: .5, map: glowTexture('rgba(230,255,190,1)', 'rgba(230,255,190,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  g.add(flies);   // fireflies over the water at night

  /* morning: marigold petals near the plinth + distant devotee silhouettes + smoke */
  const morning = new THREE.Group();
  morning.visible = false;
  const petalMat = new THREE.MeshBasicMaterial({ color: 0xb35c1e });
  const petalGeo = new THREE.CircleGeometry(.055, 6);
  const petals = new THREE.InstancedMesh(petalGeo, petalMat, 120);
  {
    const m = new THREE.Matrix4(), e = new THREE.Euler();
    const prnd = mulberry(9);
    for (let i = 0; i < 120; i++) {
      const a = prnd() * Math.PI * 2, r = 1.2 + prnd() * 4.6;
      e.set(-Math.PI / 2 + (prnd() - .5) * .4, prnd() * 3, 0);
      m.makeRotationFromEuler(e);
      m.setPosition(BRND_POS.x + Math.cos(a) * r, 1.22 + prnd() * .02, BRND_POS.z + 3 + Math.sin(a) * r * .5);
      petals.setMatrixAt(i, m);
    }
  }
  morning.add(petals);
  /* (the three draped lathe figures that stood by the plinth in the morning
     chapters were removed: at that distance they read as vessels, and the
     narrative gives the return no figures at all) */
  // incense smoke: soft rising sprites
  const smokeSprites = [];
  for (let i = 0; i < 5; i++) {
    const s = glowSprite(0x777268, 1.2, .05);
    s.position.set(lampPos.x - .4 + i * .18, lampPos.y + .5 + i * .5, lampPos.z);
    morning.add(s); smokeSprites.push(s);
  }
  g.add(morning);

  /* the opening composition lives in opening.js */
  const opening = createOpening(ctx, { brndPos: BRND_POS, brnd, fogColor: fogCol }); mark('opening');
  g.add(opening.group);

  /* (the night's foreground wall of kage's device, foreground.js, stood far
     left along the near bank until 18 Sept 2026: retired, since the house
     itself now stands on the bank, threshold.js, built into the opening) */
  /* THE MOON: a disc, not a glow. Limb-darkened, its maria drawn in, a
     soft edge one pixel wide, and only a faint halo about it: the one
     light Pañcabheda is told on has to read as a moon first */
  const moonDisc = (() => {
    const S = 256, [cv, g] = canvas(S, S), img = g.createImageData(S, S), d = img.data;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const u = (i + .5) / S * 2 - 1, v = (j + .5) / S * 2 - 1, r = Math.hypot(u, v);
      const k = (j * S + i) * 4;
      const a = 1 - smooth(remap(r, .90, .96));
      const limb = .78 + .22 * Math.sqrt(Math.max(0, 1 - r * r));          // brighter at the centre, soft at the limb
      const m1 = fbm(u * 2.2 + 3.1, v * 2.2 + 7.7, 4) + .5, m2 = fbm(u * 5 + 1.3, v * 5 + 2.2, 3) + .5;
      const maria = smooth(remap(m1, .48, .70)) * .30 + (m2 - .5) * .08;   // the dark seas, a little grain
      const L = limb * (1 - maria) * 255;
      d[k] = L; d[k + 1] = L * .985; d[k + 2] = L * .94; d[k + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
    const t = tex(cv);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color: 0xf6efdc, transparent: true, opacity: 0, depthWrite: false }));
    s.scale.setScalar(4.6);
    return s;
  })();
  /* on a phone the portrait framing has the gateway where the moon stood: raise it into the open sky */
  /* low over the far bank, left of the gateway: its path on the water lies
     across the bay in front of the camera (Pañcabheda is read on it). On a
     phone the portrait frame is narrower: a little nearer the axis, higher */
  moonDisc.position.set(ctx.isMobile ? -22 : -36, ctx.isMobile ? 22 : 16, -112);
  const moonHalo = glowSprite(0xd8dbe6, 30, 0);
  moonHalo.position.copy(moonDisc.position);
  /* drawn after the sky (renderOrder) but depth-tested, so the gateway stands
     in front of it when a framing puts the moon behind the stone (the phone's) */
  for (const m of [moonDisc, moonHalo]) { m.renderOrder = 12; m.material.depthTest = true; m.material.depthWrite = false; m.material.fog = false; }
  g.add(moonHalo, moonDisc);
  /* (the far bank's lamps for the road, four clusters of glow sprites over
     the far shore, were removed 19 Sept 2026: they read as an artificial
     scatter on the landscape. The towns are named in the copy; the far bank
     stays the far bank.) */

  /* ---- the lotus on the bay (the owner's model, models/lotus.glb, slimmed
     to 1.4 MB): two clusters of pink lotus standing out of the water in
     front of the composition, lily pads about them. Seen at the night on
     the bank and through the return; the footer's tilt brings them up into
     the lower frame as the last thing on the site. ---- */
  const lotus = new THREE.Group();
  lotus.visible = false;
  g.add(lotus);
  const pads = [];
  {
    const padMat = new THREE.MeshStandardMaterial({ color: 0x3b4a2a, roughness: .9, side: THREE.DoubleSide });
    const padGeo = new THREE.CircleGeometry(1, 28, .35, Math.PI * 2 - .7);   // a lily pad: round, split from the rim to its centre
    const prnd = mulberry(1671);
    const PADS = [[1.6, 34.6, .55], [-1.4, 32.2, .7], [2.9, 32.1, .48], [-3.3, 34.0, .62], [.4, 31.0, .5], [-6.2, 30.6, .58], [3.9, 34.9, .4], [-2.6, 30.2, .44], [-5.0, 33.4, .5], [1.0, 36.2, .38]];
    for (const [x, z, s] of PADS) {
      const p = new THREE.Mesh(padGeo, padMat);
      const a = approachToWorld(BRND_POS, x, -.86, z);
      p.position.copy(a); p.rotation.set(-Math.PI / 2 + (prnd() - .5) * .08, 0, prnd() * 6.3); p.scale.setScalar(s);
      p.userData.y0 = a.y; p.userData.ph = prnd() * 7;
      lotus.add(p); pads.push(p);
    }
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.loadAsync('./models/lotus.glb').then((gltf) => {
      const src = gltf.scene;
      src.traverse(o => { if (o.isMesh) { o.castShadow = !ctx.isMobile; o.receiveShadow = false; o.material.side = THREE.DoubleSide; o.frustumCulled = false; } });
      const place = (x, z, s, ry) => {
        const c = src.clone(true);
        const a = approachToWorld(BRND_POS, x, -.98, z);
        c.position.copy(a); c.scale.setScalar(s); c.rotation.y = ry;
        c.userData.y0 = a.y; c.userData.ph = Math.random() * 7;
        lotus.add(c); pads.push(c);
        pravesha.addClip(c);
      };
      place(.6, 33.2, 2.6, .4);
      place(-4.4, 31.4, 1.9, 2.3);
      place(3.4, 33.6, 1.5, 4.1);
    }).catch(e => console.warn('lotus failed to load', e));
  }

  /* ---- the stations: what stands on the ghat and the river while the
     chapters are read (stations.js); shown by the chapters' progress ---- */
  const stations = createStations(ctx, { brndPos: BRND_POS, fogColor: fogCol }); mark('stations');
  g.add(stations.group);

  /* the cut goes through everything of this world but the stone and what is built into it */
  pravesha.addClip(g, [brnd.group]);
  pravesha.boxFor(water.material);   // the water is boxed out of the platform's footprint and the strip before it, never cut by the section plane

  const api = {
    group: g,
    stations,
    pravesha,
    /* the chapters' progress 0..1 while they are read (main.js): the day's arc and the stations key off it */
    docP: 0,
    marks: null,    // the score's seams in t (main.js)
    travel: 0,      // 0..1: the camera is travelling over the water (main.js); the mist is carried ahead of it
    /* windows in docP for the stations' things, measured from the page by main.js */
    winds: null,
    /* the hour this frame, for main.js (the fog, the ink) */
    hour: { day: 0, night: 0 },
    /* how far the footer has come up (main.js): the lotus is the last thing seen */
    footerP: 0,
    /* the walk into the stone (main.js): the lamps' warmth grows and the air closes as the face fills the frame */
    tailP: 0,
    /* where the moon stands, in the approach frame the cameras are authored in */
    moonApproach() { return [moonDisc.position.x - BRND_POS.x + 11.4, moonDisc.position.y, moonDisc.position.z - BRND_POS.z + 2]; },
    brnd,
    lampPos,
    opening,
    setVisible(v) { g.visible = v; },
    /* t: global scroll; time: seconds; renderer+scene for the reflection pass */
    /* call after the camera is posed for the frame, before the main render */
    reflect(renderer, scene, cam) {
      /* the mirror is drawn on alternate frames (19 Sept 2026): a second
         full render of the world every frame was the desktop's largest
         single cost, and a reflection one frame old is not seen through the
         ripples; a real move of the camera (a cut) redraws it at once */
      this._rf = (this._rf || 0) + 1;
      const cp = cam.position, lp = this._rfPos || (this._rfPos = cp.clone().addScalar(1e3));
      const moved = cp.distanceToSquared(lp) > .25;
      if (!moved && (this._rf & 1)) return;
      lp.copy(cp);
      const wu = water.material.uniforms;
      if (!g.visible || cam.position.y < .05) { wu.uHasRefl.value = 0; return; }
      /* the mirror pass re-renders the whole world: the single most
         expensive thing a frame does. On a phone the ripples tear the
         reflection apart anyway, and the water shader carries the moon and
         the lamps on its own (uMoon, uLamp): the pass is desktop-only. */
      if (ctx.isMobile || this.noReflect) { wu.uHasRefl.value = 0; return; }
      cam.updateMatrixWorld();
      const ok = reflector.render(renderer, scene, cam, [water, ...stations.tags, ...(opening.group.visible ? opening.grass : [])]);   // the names stand in the air, never on the water
      wu.uHasRefl.value = ok ? 1 : 0;
    },
    setDusk(t) { duskEnd = t; },
    update(time, globalT, cam, renderer, scene, linear = false, rise = 1) {
      const dt = Math.min(.05, Math.max(.001, time - (this._last ?? time))); this._last = time;
      const wu = water.material.uniforms;
      wu.uLinear.value = linear ? 1 : 0;
      sky.material.uniforms.uLinear.value = linear ? 1 : 0;
      wu.uTime.value = time;
      sky.material.uniforms.uTime.value = time;
      wu.uLamp.value.copy(lampPos);
      wu.uCam.value.copy(cam.position);
      if (scene && scene.fog) { wu.uFog.value.copy(scene.fog.color); wu.uFogD.value = scene.fog.density; fogCol.copy(scene.fog.color); }

      /* ONE PLACE, FOUR HOURS. The opening is first sunrise over indigo
         water (uDawn, raised out of darkness by `rise` on arrival). The
         same bank returns twice more: in afternoon light with nothing
         standing on it (Manchale, .640–.740), and at night with the
         Brindavana and its deepas (.880–.925), out of which the dawn comes
         up a second time for the return. The composition never changes;
         only the light and what stands on the bank. */
      /* the dawn dial holds at full until the chapter boundary itself: the
         foliage cards fade with this dial, so winding it down early made
         the very leaves of the occlusion go transparent */
      /* every seam here is a mark of THE SCORE (score.js, main.js sets this.marks): the chapters' head and foot, the second dawn */
      const M = this.marks || { docA: .0703, docB: .725, dawn2: [.733, .775] };
      const openRaw = globalT < .5 ? 1 - smooth(remap(globalT, M.docA - .00035, M.docA)) : 0;
      /* ONE PLACE, ONE DAY. After the dawn the same bank is seen again
         EMPTY, the place before he came, and the light moves through a
         whole day while his life is read (01–08): morning, afternoon,
         the light going at the road's end, dusk at Manchale. The switch
         from the opening (the Brindavana standing) to the empty bank
         happens under the pale veil at .070 (scroll.js), never in view. */
      /* the chapters (01–08) are read over this same bank at NIGHT, the
         Brindavana and its deepas standing, stars out: the way kage keeps
         its temple under every section. The switch from the morning
         happens under the pale ground at the chapters' head (main.js). */
      const docNight = globalT >= M.docA && globalT < M.dawn2[0] + .2 * (M.dawn2[1] - M.dawn2[0]) ? 1 : 0;
      /* ONE DAY, THE WHOLE LIFE. The chapters are read on this bank while
         its day goes by: the opening's morning holds through Bhuvanagiri
         and the schooling, the light warms and turns through Madurai and
         Kumbakonam, dusk falls across the dream and the sannyāsa (the two
         deepas lit at the name), and the works, Tattvavāda, the road and
         Manchale are night, by lamplight and the moon. The darkness is
         earned by the story, never dropped on it. Keyed to the chapters'
         progress (docP, main.js), so the hours land on their beats. */
      const dpNow = docNight ? (this.docP || 0) : 0;
      const win = (a, b, c, d) => smooth(remap(dpNow, a, b)) * (1 - smooth(remap(dpNow, c, d)));
      const DAYARC = this.dayArc || { aft: [.14, .30], duskA: .33, duskB: .50 };
      const aft = docNight ? smooth(remap(dpNow, DAYARC.aft[0], DAYARC.aft[1])) * (1 - smooth(remap(dpNow, DAYARC.duskA, DAYARC.duskB))) : 0;
      const dusk = docNight ? smooth(remap(dpNow, DAYARC.duskA, DAYARC.duskB)) : 0;
      const life = 0, lifeDay = 0, lifeNight = 0;
      const manchale = 0;
      const late = globalT >= M.docB ? 1 : 0;   // Brindavana Pravesha and the return: the same bank, the day breaking over it
      const dawn2 = late ? smooth(remap(globalT, M.dawn2[0], M.dawn2[1])) : 0;   // the day of Brindavana Pravesha breaks over Manchale while its day is read (score.js b-day)
      const night = late ? 1 - dawn2 : dusk;
      let openT, hour = null, riseNow = rise;
      if (openRaw > .01) {
        /* A real sunrise does not reveal the land: the land is there before
           the sun. The dawn dial has a FLOOR and `rise` only carries it from
           that floor to morning. */
        openT = openRaw * (.34 + .66 * rise);
      } else if (manchale) {
        openT = 1; hour = { day: 1, night: 0 }; riseNow = 1;
      } else if (docNight) {
        openT = 1 - .66 * dusk; hour = { day: aft, night: dusk }; riseNow = 1 - dusk;
      } else {
        openT = .34 + .66 * dawn2; hour = { day: 0, night }; riseNow = dawn2;
      }
      /* the dream (below): the sky warms in a pocket behind the stone and the
         water carries a streak from it: the one light of the vision, before
         anyone lit a lamp. uMode is that pocket's dial and nothing else now. */
      const dw0 = this.winds && this.winds.dream ? this.winds.dream : null;
      const dreamSky = docNight && dw0 ? win(dw0[0], dw0[1], dw0[2], dw0[3]) : 0;
      wu.uMode.value = dreamSky * .55;
      wu.uDawn.value = openT;
      sky.material.uniforms.uMode.value = dreamSky * .55;
      sky.material.uniforms.uDawn.value = openT;
      sky.material.uniforms.uRise.value = riseNow;
      sky.material.uniforms.uDay.value = hour ? hour.day : 0;
      sky.material.uniforms.uNight.value = night;
      /* the leave-taking: the last of chapter 00 fills with morning light
         and river mist before the frame resolves into Bhuvanagiri */
      /* no mist flood at the leave-taking any more: the day simply goes to night */
      const glow = 0;

      stars.material.opacity = .75 * night;
      /* the chapters' foreground and the moon: up with the dusk, gone with the dawn */
      const nightOn = docNight ? dusk : night;
      moonDisc.material.opacity = .97 * nightOn;
      moonHalo.material.opacity = .13 * nightOn;
      /* the moon on the water: its direction from the bay, and how much of it the hour allows */
      wu.uMoonDir.value.set(moonDisc.position.x - 8, moonDisc.position.y, moonDisc.position.z + 20).normalize();
      wu.uMoonAmt.value = nightOn;
      dawn.intensity = 0;
      /* the moon is up: enough sky light for the bank, the stone and the far
         shore to be read by all night; the lamps are the warmth in it */
      hemi.intensity = .5 * (1 - openT) + 1.0 * night;
      moon.intensity = .55 * (1 - openT) + 1.35 * night;
      /* the night's events, by the chapters' progress: the fireflies thicken
         over the water while the schooling is read, and the far bank's lamps
         come out for the road and stay for Manchale */
      const dp = docNight ? (this.docP || 0) : 0;
      /* the dream (Kumbakonam): the vision comes as light. A gold air rises
         behind the stone, the two deepas glow before anyone has lit them,
         the fireflies and the motes thicken over the water; then it goes,
         and dusk falls into the name. Keyed to the beat's own window. */
      const dw = this.winds && this.winds.dream ? this.winds.dream : null;
      const dream = docNight && dw ? win(dw[0], dw[1], dw[2], dw[3]) : 0;
      opening.setDream(dream);
      opening.setTail(this.tailP || 0);
      opening.setFore(this.travel || 0);
      flies.material.opacity = .5 * Math.max(night, dream * .9) * (1 + .9 * win(.12, .22, .40, .50) + 1.6 * dream);

      /* ------- the composition ------- */
      const heroOn = openRaw > .01 || manchale || late || docNight;
      opening.setSacred(manchale ? 0 : 1);
      opening.setVisible(heroOn);
      if (heroOn) opening.update(time, openT, ctx.reduced, scene && scene.fog ? scene.fog.density : .01, cam, dt, glow, hour);

      /* the lotus: on the water from the night on the bank through the return,
         breathing very slightly with the swell */
      lotus.visible = late > 0;
      if (lotus.visible) for (const p of pads) p.position.y = p.userData.y0 + Math.sin(time * .35 + p.userData.ph) * .012;

      /* the stations on the ghat and the river, by the chapters' progress */
      this.hour.day = hour ? hour.day : 0; this.hour.night = night;
      stations.update(time, cam, { dp: dpNow, on: docNight ? 1 : 0, day: hour ? hour.day : 0, night, fogD: scene && scene.fog ? scene.fog.density : .006, reduced: ctx.reduced, winds: this.winds, dt, moon: this.moonApproach() });

      /* the dust drifts whatever the hour: a shade brighter against the
         dark of the night than against the morning, never absent */
      dust.material.uniforms.uOpacity.value = .8 * (.75 + .25 * night) * (1 + 1.1 * dream);
      if (!ctx.reduced) dust.material.uniforms.uTime.value = time;
      if (renderer) dust.material.uniforms.uPx.value = renderer.getPixelRatio();

      // firefly drift
      if (!ctx.reduced && flies.material.opacity > .01) {
        const p = flies.geometry.attributes.position;
        for (let i = 0; i < flyN; i++) {
          p.setY(i, .4 + (Math.sin(time * .4 + i * 1.7) * .5 + .5) * 2.6);
        }
        p.needsUpdate = true;
      }
    },
  };
  return api;
}
