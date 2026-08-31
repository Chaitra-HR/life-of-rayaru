// ANTARANGA · exterior stage — the Tungabhadra at night (scene 00)
// and the same place at first light (scenes 09-end and 10).
import * as THREE from 'three';
import { buildBrindavana } from './brindavana.js';
import { stoneSet } from './opening.js';
import { createOpening, APPROACH_ROT, makeShoreMask } from './hero.js';
import { stoneCanvas, tex, glowSprite, glowTexture, flame, mulberry, remap, smooth } from '../util.js';

export const BRND_POS = new THREE.Vector3(0, 1.18, -26);

const waterVert = /* glsl */`
uniform mat4 uTextureMatrix;
uniform float uTime;
varying vec3 vWorld;
varying vec4 vRefl;
void main(){
  vec4 wp = modelMatrix * vec4(position,1.0);
  // a low, slow swell — river surface, never sea
  wp.y += 0.035 * sin(wp.x * 0.18 + wp.z * 0.07 + uTime * 0.35) + 0.022 * sin(wp.z * 0.23 - uTime * 0.27 + wp.x * 0.05);
  vWorld = wp.xyz;
  vRefl = uTextureMatrix * wp;
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

void main(){
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
  deep = mix(deep, vec3(0.10, 0.104, 0.15), uDawn);   // first-light water: slate blue with the dawn's rose in it

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
  col += vec3(0.068, 0.062, 0.115) * (1.0 - fres) * 0.35 * (1.0 - uMode);

  // sun glints: tight specular along the sunrise direction, broken by noise
  vec3 H = normalize(V + uSunDir);
  float spec = pow(max(dot(nrm, H), 0.0), 520.0);
  float sparkle = smoothstep(0.42, 0.92, vnoise(vWorld.xz*vec2(3.0, 9.0) + vec2(uTime*0.2, -uTime*0.1)));
  vec3 sunCol = mix(vec3(0.95, 0.62, 0.30), vec3(1.0, 0.78, 0.78), uDawn);
  float calm = 1.0 - shal * 0.7;
  col += sunCol * spec * sparkle * (2.3 * uDawn + 1.6 * uMode) * calm;
  float specWide = pow(max(dot(nrm, H), 0.0), 36.0);
  col += sunCol * specWide * 0.05 * (uDawn + uMode) * (0.4 + 0.6*sparkle) * calm;

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
  vec3 zenN = vec3(0.006,0.010,0.022);
  vec3 horN = vec3(0.038,0.048,0.078);
  vec3 zenM = vec3(0.045,0.06,0.13);
  vec3 horM = vec3(0.62,0.36,0.17);
  vec3 horCool = vec3(0.13,0.17,0.32);
  float warmSpread = exp(-pow((az - 0.30)*2.6, 2.0));
  float m2 = max(uMode, uDawn*0.5);
  vec3 zen = mix(zenN, zenM, m2);
  vec3 horDawn = mix(horCool, vec3(0.30, 0.21, 0.18), warmSpread);
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
    vec3 mZen = vec3(0.105, 0.175, 0.375), mMid = vec3(0.36, 0.385, 0.565);
    vec3 mRose = vec3(0.615, 0.455, 0.50), mHor = vec3(0.76, 0.585, 0.46);
    float k = clamp(1.0 - h, 0.0, 1.0);
    vec3 morning = mix(mZen, mMid, 1.0 - smoothstep(0.10, 0.34, h));
    morning = mix(morning, mRose, 1.0 - smoothstep(0.035, 0.15, h));
    morning = mix(morning, mHor, 1.0 - smoothstep(0.004, 0.05, h));
    float pocket = exp(-pow((az - SUN_AZ) * 1.5, 2.0)) * pow(k, 5.0);
    morning = mix(morning, vec3(1.0, 0.72, 0.46), pocket * 0.5);
    morning += vec3(0.46, 0.20, 0.07) * exp(-pow((az - SUN_AZ) * 2.2, 2.0)) * pow(k, 13.0);
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
  vec3 discCol = mix(vec3(1.0, 0.32, 0.10), vec3(1.0, 0.66, 0.70), crest);
  vec3 haloCol = mix(vec3(0.80, 0.22, 0.07), vec3(1.0, 0.52, 0.58), crest);
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
  vec3 cloudDark = mix(vec3(0.030,0.038,0.070), vec3(0.40,0.375,0.475), hero);
  vec3 cloudCol = mix(cloudDark, mix(vec3(0.50,0.27,0.11), vec3(0.88,0.62,0.36), hero), warmSide*max(uDawn*pow(under, 2.2)*0.8, uMode*0.7));
  col = mix(col, cloudCol, cloud*mix(0.85, 0.42, hero));
  float rim = smoothstep(0.42,0.58,cn) - smoothstep(0.56,0.82,cn);

  col += vec3(0.42,0.27,0.13) * max(rim, 0.0) * band * warmSide * uMode * 0.45;
  /* a soft in-sky echo of the disc under the haze — the bright disc itself
     is a sprite held in front of the clouds (see the stage's sun group) */
  col += discCol * disc * (0.10 + 0.16 * crest) * uDawn * (1.0 - uMode);
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
  const w = ctx.isMobile ? 320 : 512, h = ctx.isMobile ? 180 : 288;
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
  const g = new THREE.Group();
  g.visible = false;
  /* scenery of the return chapters (09-10) — hidden during the opening */
  const legacy = new THREE.Group();
  g.add(legacy);
  const fogCol = new THREE.Color(0x141826);

  /* sky dome */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(210, 24, 16),
    new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, uniforms: { uMode: { value: 0 }, uDawn: { value: 0 }, uRise: { value: 0 }, uTime: { value: 0 }, uLinear: { value: 0 } }, depthWrite: false })
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
  legacy.add(stars);

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

  const brnd = buildBrindavana({ withMala: true });
  brnd.group.position.copy(BRND_POS);
  g.add(brnd.group);

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
  const lampFlame = flame(1.4);
  lampFlame.position.copy(lampPos);
  legacy.add(lampFlame);
  const lampLight = new THREE.PointLight(0xff9a45, 30, 34, 2);
  lampLight.position.copy(lampPos).add(new THREE.Vector3(0, .3, 0));
  legacy.add(lampLight);
  // second lamp on other side, dimmer (morning seva)
  const lamp2 = flame(1.1);
  lamp2.position.set(BRND_POS.x - 2.6, BRND_POS.y + .5, BRND_POS.z + 4.4);
  lamp2.visible = false;
  legacy.add(lamp2);

  /* cool moon fill + warm key */
  const moon = new THREE.DirectionalLight(0x384754, .55);
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
  legacy.add(flies);

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
  // distant figures: simple draped forms, kept far and soft
  const figMat = new THREE.MeshStandardMaterial({ color: 0x181310, roughness: 1 });
  const figs = [];
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Group();
    const bodyPts = [];
    for (let s = 0; s <= 6; s++) bodyPts.push(new THREE.Vector2(.16 * (1 - s / 6 * .45) + .04 * Math.sin(s), s / 6 * 1.1));
    const body = new THREE.Mesh(new THREE.LatheGeometry(bodyPts, 10), figMat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.085, 10, 8), figMat);
    head.position.y = 1.2;
    f.add(body, head);
    f.position.set(BRND_POS.x - 6 + i * 2.1, 1.2, BRND_POS.z + 7 + (i % 2) * 1.4);
    f.scale.setScalar(.95 + i * .06);
    morning.add(f); figs.push(f);
  }
  // incense smoke: soft rising sprites
  const smokeSprites = [];
  for (let i = 0; i < 5; i++) {
    const s = glowSprite(0x777268, 1.2, .05);
    s.position.set(lampPos.x - .4 + i * .18, lampPos.y + .5 + i * .5, lampPos.z);
    morning.add(s); smokeSprites.push(s);
  }
  g.add(morning);

  /* the opening composition lives in opening.js */
  const opening = createOpening(ctx, { brndPos: BRND_POS, brnd, fogColor: fogCol });
  g.add(opening.group);

  const api = {
    group: g,
    brnd,
    lampPos,
    opening,
    setVisible(v) { g.visible = v; },
    /* t: global scroll; time: seconds; renderer+scene for the reflection pass */
    /* call after the camera is posed for the frame, before the main render */
    reflect(renderer, scene, cam) {
      const wu = water.material.uniforms;
      if (!g.visible || cam.position.y < .05) { wu.uHasRefl.value = 0; return; }
      cam.updateMatrixWorld();
      const ok = reflector.render(renderer, scene, cam, [water, ...(opening.group.visible ? opening.grass : [])]);
      wu.uHasRefl.value = ok ? 1 : 0;
    },
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

      // two states of light in one dial: the opening is first sunrise over
      // indigo water (uDawn), the return chapters full morning (uMode).
      // `rise` raises that first light out of darkness on arrival — the
      // scene composition stays put; only the light comes up.
      const morningMode = smooth(remap(globalT, .9, .965));
      const openRaw = globalT < .5 ? 1 - smooth(remap(globalT, .048, .070)) : 0;
      const openT = openRaw * rise;
      const mode = morningMode;
      wu.uMode.value = mode;
      wu.uDawn.value = openT;
      sky.material.uniforms.uMode.value = mode;
      sky.material.uniforms.uDawn.value = openT;
      sky.material.uniforms.uRise.value = rise;

      legacy.visible = openRaw < .02;
      stars.material.opacity = .75 * (1 - mode);
      dawn.intensity = mode * 1.6;
      hemi.intensity = (.5 + mode * .9) * (1 - openT);
      moon.intensity = .55 * (1 - mode * .8) * (1 - openT);
      lampLight.visible = openRaw < .5;
      lampFlame.visible = openRaw < .5;
      flies.material.opacity = .5 * (1 - mode);

      /* ------- the opening composition ------- */
      opening.setVisible(openRaw > .01);
      if (openRaw > .01) opening.update(time, openT, ctx.reduced, scene && scene.fog ? scene.fog.density : .01, cam, dt);

      morning.visible = morningMode > .02;
      if (morning.visible) {
        petalMat.opacity = morningMode; petalMat.transparent = true;
        for (let i = 0; i < smokeSprites.length; i++) {
          const s = smokeSprites[i];
          const ph = (time * .1 + i * .21) % 1;
          s.position.y = lampPos.y + .3 + ph * 3.4;
          s.position.x = lampPos.x - .4 + Math.sin(time * .4 + i * 2) * .3 * ph;
          s.material.opacity = .055 * morningMode * (1 - ph);
          s.scale.setScalar(.8 + ph * 2.4);
        }
        for (const f of figs) f.visible = morningMode > .35;
      }
      lamp2.visible = morningMode > .5;

      const fl = lampFlame.userData.flicker(time);
      lampLight.intensity = (30 - mode * 12) * (0.85 + fl * .2);
      if (lamp2.visible) lamp2.userData.flicker(time + 4);

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
