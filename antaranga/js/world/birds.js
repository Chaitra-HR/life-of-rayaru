// ANTARANGA · BirdSystem — now and then a few distant birds cross the sky
// on a gentle arc, flapping slowly and gliding. Tiny silhouettes, long
// irregular intervals, one instanced mesh; the wing beat is a vertex
// shader so nothing is rebuilt per frame.
import * as THREE from 'three';
import { mulberry } from '../util.js';

const MAX = 6;

function birdGeometry() {
  // two wings as four triangles; the x-extent drives the flap in the shader
  const v = [
    0, 0, .35,   0, 0, -.35,   -1.0, 0, -.05,     // left wing
    0, 0, .35,   -1.0, 0, -.05, -1.0, 0, .25,
    0, 0, -.35,  0, 0, .35,    1.0, 0, -.05,      // right wing
    0, 0, .35,   1.0, 0, .25,  1.0, 0, -.05,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

export function createBirds({ seed = 9, mobile = false } = {}) {
  const geo = birdGeometry();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x1a1d26) }, uFade: { value: 1 } },
    vertexShader: `
      uniform float uTime;
      attribute float aPhase;     // per-bird flap phase
      attribute float aGlide;     // 0 flapping … 1 gliding
      varying float vA;
      void main(){
        vec3 p = position;
        float beat = sin(uTime * 5.2 + aPhase);
        float flap = mix(beat, 0.25, aGlide);
        p.y += abs(p.x) * flap * 0.55;          // wingtips rise and fall
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
        vA = 1.0;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uFade; varying float vA;
      void main(){ gl_FragColor = vec4(uColor, 0.85 * uFade); }`,
    transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, MAX);
  mesh.frustumCulled = false;
  const phase = new Float32Array(MAX), glide = new Float32Array(MAX);
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
  geo.setAttribute('aGlide', new THREE.InstancedBufferAttribute(glide, 1));
  const rr = mulberry(seed);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < MAX; i++) mesh.setMatrixAt(i, hide);

  /* a flight: a small group following one arc, each bird offset a little */
  let flight = null, nextAt = 3 + rr() * 4;            // the first crossing arrives early
  const group = new THREE.Group();
  group.add(mesh);

  function spawn(time) {
    const n = 2 + Math.floor(rr() * (mobile ? 2 : 4));       // 2–5
    const dir = rr() < .5 ? 1 : -1;
    const z = -85 - rr() * 100;                              // near enough to read as birds
    const y0 = 17 + rr() * 13;
    const x0 = -dir * (200 + rr() * 60);
    const dur = 19 + rr() * 12;                              // seconds to cross
    const arc = (rr() - .5) * 16;                            // gentle rise or dip
    const birds = [];
    for (let i = 0; i < n; i++) {
      birds.push({ dx: -dir * i * (3 + rr() * 2.5), dy: (rr() - .5) * 3, dz: (rr() - .5) * 6, sc: 1.0 + rr() * .6 });
      phase[i] = rr() * 6.28; glide[i] = 0;
    }
    geo.attributes.aPhase.needsUpdate = true;
    flight = { t0: time, n, dir, z, y0, x0, dur, arc, birds, glideAt: 6 + rr() * 6, glideLen: 3 + rr() * 3 };
  }

  return {
    group,
    update(time, dt, camera) {
      mat.uniforms.uTime.value = time;
      if (!flight) {
        nextAt -= dt;
        if (nextAt <= 0) spawn(time);
        return;
      }
      const f = flight, u = (time - f.t0) / f.dur;
      if (u >= 1.05) {
        for (let i = 0; i < MAX; i++) mesh.setMatrixAt(i, hide);
        mesh.instanceMatrix.needsUpdate = true;
        flight = null; nextAt = 9 + rr() * 15;                 // 9–24 s until the next crossing
        return;
      }
      // a glide phase part-way across
      const tIn = time - f.t0;
      const g = (tIn > f.glideAt && tIn < f.glideAt + f.glideLen) ? 1 : 0;
      for (let i = 0; i < f.n; i++) glide[i] = THREE.MathUtils.lerp(glide[i], g, Math.min(1, dt * 2));
      geo.attributes.aGlide.needsUpdate = true;
      for (let i = 0; i < MAX; i++) {
        if (i >= f.n) { mesh.setMatrixAt(i, hide); continue; }
        const b = f.birds[i];
        const x = f.x0 + f.dir * (Math.abs(f.x0) * 2) * u + b.dx;
        const y = f.y0 + Math.sin(u * Math.PI) * f.arc + b.dy;
        p.set(x, y, f.z + b.dz);
        // face the travel direction, wings level
        q.setFromEuler(new THREE.Euler(0, f.dir > 0 ? -Math.PI / 2 : Math.PI / 2, 0));
        s.setScalar(b.sc);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    setVisible(v) { group.visible = v; },
  };
}
