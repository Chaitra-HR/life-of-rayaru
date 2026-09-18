// ANTARANGA · the grade — one pass over a linear render, for the whole site.
//
// 19 Sept 2026: the restrained photographic finish of Seijaku
// (seijaku.mengto.here.now; MengTo/seijaku FinalShader, makePost). The
// renderer tone-maps NOTHING (main.js setLinearMode: NoToneMapping, linear
// output); the scene is drawn once into a multisampled half-float target
// and this pass does everything, once:
//   ambient occlusion (half res, depth only, denoised; desktop) →
//   bloom (three levels, restrained) →
//   exposure, a small toe lift (the blacks keep their material) →
//   ACES (the RRT/ODT fit, as Seijaku's, never twice) → saturation →
//   a warm daylight bias that follows the hour → aerial depth (the far
//   drifts toward the air, lightly) → a soft vignette → sRGB.
// No chromatic aberration, no grain here (the CSS #grain tile stays as it
// was), nothing crushed, nothing orange.
import * as THREE from 'three';

const quadVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const hashFn = `float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }`;
const depthFns = `
  float viewZ(float d){ return (uNear * uFar) / ((uFar - uNear) * d - uFar); }   // perspective depth → view z (negative)
  vec3 viewPos(vec2 uv){ float d = texture2D(tD, uv).x; vec4 c = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); vec4 v = uProjInv * c; return v.xyz / v.w; }`;

export class Grade {
  constructor(renderer, { ao = true } = {}) {
    this.renderer = renderer;
    this.ao = ao && !!renderer.capabilities.isWebGL2;
    const samples = renderer.capabilities.isWebGL2 ? 4 : 0;   // the antialias belongs to the target now, not the canvas
    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true, samples });
    this.sceneRT.texture.generateMipmaps = false;
    if (this.ao) {
      this.sceneRT.depthTexture = new THREE.DepthTexture(1, 1);
      this.sceneRT.depthTexture.type = THREE.UnsignedIntType;
    }
    const mkRT = (type = THREE.HalfFloatType) => { const rt = new THREE.WebGLRenderTarget(1, 1, { type, depthBuffer: false }); rt.texture.generateMipmaps = false; rt.texture.minFilter = THREE.LinearFilter; return rt; };
    this.levels = [];
    for (let i = 0; i < 3; i++) this.levels.push({ a: mkRT(), b: mkRT(), w: 1, h: 1 });
    this.aoRT = { a: mkRT(THREE.UnsignedByteType), b: mkRT(THREE.UnsignedByteType), w: 1, h: 1 };
    this.white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); this.white.needsUpdate = true;

    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    const mat = (uniforms, frag, defines = {}) => new THREE.ShaderMaterial({ uniforms, defines, vertexShader: quadVert, fragmentShader: frag, depthTest: false, depthWrite: false });

    /* ---- ambient occlusion: depth only, a normal from the depth's own
       derivatives, twelve samples on a spiral inside a world radius, the
       occluder's height over the tangent plane, range-checked so nothing
       far paints on anything near (Seijaku: GTAO at .6 res, blend .6) ---- */
    this.aoPass = mat({ tD: { value: null }, uProjInv: { value: new THREE.Matrix4() }, uP11: { value: 1 }, uNear: { value: .1 }, uFar: { value: 500 }, uRes: { value: new THREE.Vector2(1, 1) }, uRadius: { value: .55 }, uBias: { value: .03 }, uT: { value: 0 } }, `
      uniform sampler2D tD; uniform mat4 uProjInv; uniform float uP11, uNear, uFar, uRadius, uBias, uT; uniform vec2 uRes; varying vec2 vUv;
      ${hashFn} ${depthFns}
      void main(){
        vec3 p = viewPos(vUv);
        if (-p.z > uFar * 0.6) { gl_FragColor = vec4(1.0); return; }   // the sky
        vec3 n = normalize(cross(dFdx(p), dFdy(p)));
        float rUv = uRadius * uP11 / (-p.z) * 0.5;                    // the world radius in uv, vertical
        vec2 asp = vec2(uRes.y / uRes.x, 1.0);
        float a0 = hash(gl_FragCoord.xy + fract(uT * 0.37) * 61.0) * 6.2832;
        float occ = 0.0;
        for (int i = 0; i < 12; i++) {
          float f = (float(i) + 0.5) / 12.0;
          float a = a0 + f * 12.566;
          vec2 uv = vUv + vec2(cos(a), sin(a)) * sqrt(f) * rUv * asp;
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) continue;
          vec3 v = viewPos(uv) - p; float l = length(v);
          float h = max(0.0, dot(n, v) / max(l, 1e-4) - uBias);
          occ += h * (1.0 - smoothstep(0.0, 1.0, l / uRadius));
        }
        gl_FragColor = vec4(vec3(1.0 - occ / 12.0 * 1.6), 1.0);
      }`);
    /* denoise: a five-tap cross, weighted by depth, run once each way */
    this.aoBlur = mat({ tS: { value: null }, tD: { value: null }, uDir: { value: new THREE.Vector2() }, uNear: { value: .1 }, uFar: { value: 500 } }, `
      uniform sampler2D tS, tD; uniform vec2 uDir; uniform float uNear, uFar; varying vec2 vUv;
      float viewZ(float d){ return (uNear * uFar) / ((uFar - uNear) * d - uFar); }
      void main(){
        float z0 = viewZ(texture2D(tD, vUv).x);
        float s = texture2D(tS, vUv).r, w = 1.0;
        for (int i = 1; i <= 2; i++) {
          vec2 o = uDir * float(i);
          for (int k = 0; k < 2; k++) {
            vec2 uv = k == 0 ? vUv + o : vUv - o;
            float z = viewZ(texture2D(tD, uv).x);
            float wt = exp(-abs(z - z0) * 6.0) * (i == 1 ? 0.6 : 0.3);
            s += texture2D(tS, uv).r * wt; w += wt;
          }
        }
        gl_FragColor = vec4(vec3(s / w), 1.0);
      }`);

    /* ---- bloom: the bright pass with a soft knee, three halvings, a
       separable blur, summed ---- */
    this.bright = mat({ tS: { value: null }, uT: { value: 1.2 }, uK: { value: .3 } }, `
      uniform sampler2D tS; uniform float uT, uK; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(tS, vUv).rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        float w = smoothstep(uT - uK, uT + uK, l);
        gl_FragColor = vec4(c * w, 1.0);
      }`);
    this.down = mat({ tS: { value: null } }, `
      uniform sampler2D tS; varying vec2 vUv;
      void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb, 1.0); }`);
    this.blur = mat({ tS: { value: null }, uDir: { value: new THREE.Vector2() } }, `
      uniform sampler2D tS; uniform vec2 uDir; varying vec2 vUv;
      void main(){
        vec3 s = texture2D(tS, vUv).rgb * 0.2270;
        s += (texture2D(tS, vUv + uDir*1.3846).rgb + texture2D(tS, vUv - uDir*1.3846).rgb) * 0.3162;
        s += (texture2D(tS, vUv + uDir*3.2308).rgb + texture2D(tS, vUv - uDir*3.2308).rgb) * 0.0703;
        gl_FragColor = vec4(s, 1.0);
      }`);
    this.sum = mat({ t0: { value: null }, t1: { value: null }, t2: { value: null } }, `
      uniform sampler2D t0, t1, t2; varying vec2 vUv;
      void main(){ gl_FragColor = vec4(texture2D(t0, vUv).rgb + texture2D(t1, vUv).rgb * 0.8 + texture2D(t2, vUv).rgb * 0.6, 1.0); }`);

    /* ---- the composite: Seijaku's FinalShader, with the occlusion, the
       bloom and the aerial depth folded in before the curve ---- */
    this.composite = mat({
      tS: { value: null }, tB: { value: null }, tA: { value: this.white }, tD: { value: this.white },
      uProjInv: { value: new THREE.Matrix4() }, uNear: { value: .1 }, uFar: { value: 500 },
      uBloom: { value: .14 }, uAO: { value: this.ao ? .6 : 0 }, uHaze: { value: this.ao ? .10 : 0 },
      uExp: { value: 1.05 }, uLift: { value: .012 }, uSat: { value: 1.0 }, uWarm: { value: new THREE.Vector3(1, 1, 1) },
      uFog: { value: new THREE.Vector3(.5, .5, .5) }, uVig: { value: .5 }, uFade: { value: 1 },
    }, `
      uniform sampler2D tS, tB, tA, tD; uniform mat4 uProjInv; uniform float uNear, uFar;
      uniform float uBloom, uAO, uHaze, uExp, uLift, uSat, uVig, uFade; uniform vec3 uWarm, uFog;
      varying vec2 vUv;
      vec3 RRTAndODTFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
      vec3 aces(vec3 color){
        const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
        const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
        color = inM * (color / 0.6); color = RRTAndODTFit(color); color = outM * color; return clamp(color, 0.0, 1.0); }
      vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      float viewZ(float d){ return (uNear * uFar) / ((uFar - uNear) * d - uFar); }
      void main(){
        vec3 c = texture2D(tS, vUv).rgb;
        c *= mix(1.0, texture2D(tA, vUv).r, uAO);                       // the occlusion, in the light itself
        c += texture2D(tB, vUv).rgb * uBloom;
        /* aerial depth: with distance the picture drifts a little toward
           the colour of the air and its darks lift, over what the fog has
           already done: a lift, never a haze */
        float z = -viewZ(texture2D(tD, vUv).x);
        float h = uHaze * (1.0 - exp(-z * 0.014));
        c = mix(c, uFog * (0.55 + 0.45 * clamp(dot(c, vec3(0.3333)) * 2.0, 0.0, 1.0)), h);
        vec3 hdr = c * uExp + uLift;                                    // a small toe lift: shadows keep their material
        vec3 col = aces(hdr);
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722)); col = mix(vec3(l), col, uSat); col *= uWarm;
        vec2 q = (vUv - 0.5) * vec2(1.0, 0.82);
        float vig = 1.0 - smoothstep(0.12, 0.82, length(q) * 1.15);
        col *= mix(1.0, vig, uVig);
        col *= uFade;
        gl_FragColor = vec4(toSRGB(col), 1.0);
      }`);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.setSize(size.x, size.y);
  }
  setSize(w, h) {
    this.sceneRT.setSize(w, h);
    let lw = w, lh = h;
    for (const L of this.levels) {
      lw = Math.max(8, Math.round(lw / 2)); lh = Math.max(8, Math.round(lh / 2));
      L.w = lw; L.h = lh; L.a.setSize(lw, lh); L.b.setSize(lw, lh);
    }
    const aw = Math.max(8, Math.round(w / 2)), ah = Math.max(8, Math.round(h / 2));
    this.aoRT.w = aw; this.aoRT.h = ah; this.aoRT.a.setSize(aw, ah); this.aoRT.b.setSize(aw, ah);
    this.aoPass.uniforms.uRes.value.set(aw, ah);
  }
  pass(mat, target) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.cam);
  }
  /* scene (linear) → graded screen.
     fade: 1 normal → 0 black. bloom: strength; threshold/knee in linear
     luminance. day/night: the hour (river.js) for the warm bias. fog: the
     air's colour (linear) for the aerial depth. */
  render(scene, camera, { time = 0, fade = 1, bloom = .14, threshold = 1.3, knee = .3, day = 0, night = 0, fog = null } = {}) {
    const r = this.renderer;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    if (size.x !== this.sceneRT.width || size.y !== this.sceneRT.height) this.setSize(size.x, size.y);
    r.setRenderTarget(this.sceneRT); r.clear(); r.render(scene, camera);

    const u = this.composite.uniforms;
    if (this.ao) {
      const A = this.aoPass.uniforms, B = this.aoBlur.uniforms;
      A.tD.value = this.sceneRT.depthTexture; A.uProjInv.value.copy(camera.projectionMatrixInverse); A.uP11.value = camera.projectionMatrix.elements[5];
      A.uNear.value = camera.near; A.uFar.value = camera.far; A.uT.value = time % 100;
      this.pass(this.aoPass, this.aoRT.a);
      B.tD.value = this.sceneRT.depthTexture; B.uNear.value = camera.near; B.uFar.value = camera.far;
      B.tS.value = this.aoRT.a.texture; B.uDir.value.set(1 / this.aoRT.w, 0); this.pass(this.aoBlur, this.aoRT.b);
      B.tS.value = this.aoRT.b.texture; B.uDir.value.set(0, 1 / this.aoRT.h); this.pass(this.aoBlur, this.aoRT.a);
      u.tA.value = this.aoRT.a.texture; u.tD.value = this.sceneRT.depthTexture;
      u.uNear.value = camera.near; u.uFar.value = camera.far;
    }

    const L = this.levels;
    this.bright.uniforms.tS.value = this.sceneRT.texture; this.bright.uniforms.uT.value = threshold; this.bright.uniforms.uK.value = knee;
    this.pass(this.bright, L[0].a);
    for (let i = 0; i < L.length; i++) {
      if (i > 0) { this.down.uniforms.tS.value = L[i - 1].a.texture; this.pass(this.down, L[i].a); }
      this.blur.uniforms.tS.value = L[i].a.texture; this.blur.uniforms.uDir.value.set(1 / L[i].w, 0); this.pass(this.blur, L[i].b);
      this.blur.uniforms.tS.value = L[i].b.texture; this.blur.uniforms.uDir.value.set(0, 1 / L[i].h); this.pass(this.blur, L[i].a);
    }
    this.sum.uniforms.t0.value = L[0].a.texture; this.sum.uniforms.t1.value = L[1].a.texture; this.sum.uniforms.t2.value = L[2].a.texture;
    this.pass(this.sum, L[0].b);

    u.tS.value = this.sceneRT.texture; u.tB.value = L[0].b.texture;
    u.uFade.value = fade; u.uBloom.value = bloom;
    /* the daylight's warmth, only by day (Seijaku: 1+.05d, 1−.02d, 1−.14d; a touch less, the Bone haze is warm already) */
    u.uWarm.value.set(1 + .04 * day, 1 - .01 * day, 1 - .09 * day);
    if (fog) u.uFog.value.set(fog.r, fog.g, fog.b);
    this.pass(this.composite, null);
  }
}
