// ANTARANGA · scene 07 / The Journey — AIR AND LIGHT.
// One sun for the whole landscape, a haze that carries distance, mist that
// gathers on the Ghats, dust on the dry legs, and now and then a few birds.
// Everything here is restrained: no halos, no glowing markers, no fantasy
// sky. The air is what makes a miniature read as a country.
import * as THREE from 'three';
import { canvas, tex, glowTexture, mulberry, clamp01, lerp, smooth } from '../../util.js';
import { height, westCoastX } from './field.js';

/* the seaward slope of the crest, where the cloud actually sits */
const ghatSlopeX = (z) => westCoastX(z) + 2.6 + Math.sin(z * .07) * 1.2;

/* One sun direction, fixed for the whole chapter: low and to the south-east.
   The journey runs north-west for most of its length, so this puts the light
   behind the traveller — the land is lit rather than silhouetted, and the
   shadows lie away from us. */
export const SUN = new THREE.Vector3(44, 34, 54);

const SKY_VERT = `
varying vec3 vDir;
void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const SKY_FRAG = `
varying vec3 vDir;
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uSun;
uniform float uDim;
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -1.0, 1.0);
  float f = pow(clamp(1.0 - h, 0.0, 1.0), 2.3);
  vec3 col = mix(uZenith, uHorizon, f);
  // a soft pocket of warmth where the sun stands — never a disc
  float s = max(dot(d, normalize(uSun)), 0.0);
  col += uHorizon * pow(s, 6.0) * 0.55 * pow(clamp(1.0 - h, 0.0, 1.0), 1.2);
  // the ground half of the dome only ever shows through haze
  col = mix(col, uHorizon * 0.78, smoothstep(0.0, -0.22, h));
  gl_FragColor = vec4(col * uDim, 1.0);
}`;

/* a soft, torn band — mist and cloud both use it */
function bandTexture(seed) {
  const W = 256, H = 64;
  const [c, g] = canvas(W, H);
  const rnd = mulberry(seed);
  g.clearRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W, y = H * (.35 + rnd() * .3);
    const rx = 24 + rnd() * 56, ry = 8 + rnd() * 16;
    const grd = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    grd.addColorStop(0, 'rgba(255,255,255,.30)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, Math.max(rx, ry), 0, 7); g.fill();
    g.restore();
  }
  return tex(c);
}

const _WARM = new THREE.Color(0xb2a894);
const _COOL = new THREE.Color(0x3a4553);

export function createAtmosphere(ctx) {
  const group = new THREE.Group();
  const rnd = mulberry(919);

  /* ---------------- sky ---------------- */
  const skyU = {
    uHorizon: { value: new THREE.Color(0x8a8071) },
    uZenith: { value: new THREE.Color(0x3d4450) },
    uSun: { value: SUN.clone().normalize() },
    uDim: { value: 1 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(300, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: skyU,
    })
  );
  sky.renderOrder = -1;
  group.add(sky);

  /* ---------------- light ---------------- */
  const sun = new THREE.DirectionalLight(0xd6c3aa, 3.0);
  sun.position.copy(SUN);
  group.add(sun);
  const hemi = new THREE.HemisphereLight(0x8a8574, 0x4a463c, 1.0);
  group.add(hemi);
  const amb = new THREE.AmbientLight(0x2b2a24, .34);
  group.add(amb);
  // a cool fill from the opposite side so shadowed slopes keep their form
  const fill = new THREE.DirectionalLight(0x74808e, .38);
  fill.position.set(-44, 16, -40);
  group.add(fill);

  /* ---------------- mist on the Ghats ----------------
     Seen from above, upright cards read as scratches across the sky. This
     is fog LYING in the country instead: near-horizontal sheets caught in
     the valleys along the crest, drifting very slowly. */
  const mistMat = new THREE.MeshBasicMaterial({
    map: bandTexture(31), transparent: true, depthWrite: false,
    opacity: .3, color: 0xd3d6cf, side: THREE.DoubleSide,
  });
  const mist = new THREE.Group();
  const mistCards = [];
  const nMist = ctx.isMobile ? 20 : 44;
  for (let i = 0; i < nMist; i++) {
    // strung along the seaward slope, from the far south to the northern hills
    const z = lerp(40, -30, i / (nMist - 1)) + (rnd() - .5) * 5;
    const x = ghatSlopeX(z) + (rnd() - .5) * 4;
    const w = 6 + rnd() * 8, d = 4 + rnd() * 5;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mistMat);
    card.rotation.x = -Math.PI / 2 + (rnd() - .5) * .28;
    card.rotation.z = (rnd() - .5) * .9;
    card.position.set(x, height(x, z) + .8 + rnd() * 1.8, z);
    card.userData.x0 = x;
    card.userData.z0 = z;
    card.userData.drift = .3 + rnd() * .7;
    mist.add(card);
    mistCards.push(card);
  }
  group.add(mist);

  /* ---------------- dust and haze, carried with the traveller ---------- */
  const hazeN = ctx.isMobile ? 70 : 160;
  const hpos = new Float32Array(hazeN * 3);
  for (let i = 0; i < hazeN; i++) {
    hpos[i * 3] = (rnd() - .5) * 46;
    hpos[i * 3 + 1] = rnd() * 6;
    hpos[i * 3 + 2] = (rnd() - .5) * 46;
  }
  const hGeo = new THREE.BufferGeometry();
  hGeo.setAttribute('position', new THREE.BufferAttribute(hpos, 3));
  const haze = new THREE.Points(hGeo, new THREE.PointsMaterial({
    color: 0xb59a6e, size: .085, transparent: true, opacity: .22,
    map: glowTexture('rgba(210,186,146,1)', 'rgba(210,186,146,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const hazeHost = new THREE.Group();
  hazeHost.add(haze);
  group.add(hazeHost);

  /* ---------------- birds ----------------
     Built lazily and hosted near the traveller, so a crossing always
     happens somewhere in the frame rather than off at the map's edge. */
  const birdHost = new THREE.Group();
  birdHost.scale.setScalar(.22);
  group.add(birdHost);
  let birds = null;

  const camXZ = new THREE.Vector3();

  return {
    group, sky, sun, hemi, fill, mist, uniforms: skyU,
    async warm() {
      if (birds || ctx.reduced) return;
      const { createBirds } = await import('../birds.js');
      birds = createBirds({ seed: 27, mobile: ctx.isMobile });
      birdHost.add(birds.group);
    },
    /* the air of the leg we are on */
    setAir(air, dim) {
      skyU.uHorizon.value.copy(air.sky).lerp(_WARM, .62);
      skyU.uZenith.value.copy(air.sky).lerp(_COOL, .72);
      skyU.uDim.value = dim;
      sun.color.copy(air.sun);
      sun.intensity = lerp(2.9, 3.4, air.warm) * dim;
      hemi.color.copy(air.sky);
      hemi.groundColor.copy(air.ground).lerp(_WARM, .38);
      hemi.intensity = lerp(1.05, .82, air.warm) * dim;
      fill.intensity = .38 * dim;
      amb.intensity = .34 * dim;
      mistMat.opacity = air.mist * .22 * dim;
      haze.material.opacity = lerp(.28, .16, air.mist) * dim;
    },
    update(time, dt, camera, camLocal) {
      if (camLocal) {
        camXZ.set(camLocal.x, 0, camLocal.z);
        hazeHost.position.lerp(camXZ, 1 - Math.exp(-1.2 * dt));
        birdHost.position.set(camLocal.x, 0, camLocal.z);
        // the mist cards keep their face to the traveller
        for (const c of mistCards) {
          c.rotation.y = Math.atan2(camLocal.x - c.position.x, camLocal.z - c.position.z);
        }
      }
      if (!ctx.reduced) {
        for (const c of mistCards) c.position.x = c.userData.x0 + Math.sin(time * .035 + c.userData.drift * 9) * 2.4;
        haze.position.x = Math.sin(time * .05) * 1.6;
        haze.position.z = Math.cos(time * .037) * 1.6;
        if (birds) birds.update(time, dt, camera);
      }
    },
  };
}
