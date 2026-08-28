// ANTARANGA · the opening's grade — one pass over a linear render.
// Exposure → bloom → ACES → saturation → teal shadows / warm highs → vignette
// → grain → contrast. The rest of the site renders straight through the
// renderer's own tone mapping, so nothing outside the opening changes.
import * as THREE from 'three';

const quadVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export class Grade {
  constructor(renderer) {
    this.renderer = renderer;
    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true });
    this.sceneRT.texture.generateMipmaps = false;
    this.levels = [];
    for (let i = 0; i < 3; i++) {
      const mk = () => { const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false }); rt.texture.generateMipmaps = false; rt.texture.minFilter = THREE.LinearFilter; return rt; };
      this.levels.push({ a: mk(), b: mk(), w: 1, h: 1 });
    }
    const size = renderer.getSize(new THREE.Vector2());
    this.setSize(size.x, size.y);

    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    const mat = (uniforms, frag) => new THREE.ShaderMaterial({ uniforms, vertexShader: quadVert, fragmentShader: frag, depthTest: false, depthWrite: false });
    this.bright = mat({ tS: { value: null }, uT: { value: .9 }, uK: { value: .35 } }, `
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
    this.composite = mat({
      tS: { value: null }, tB: { value: null }, uRes: { value: new THREE.Vector2(size.x, size.y) },
      uT: { value: 0 }, uBloom: { value: .14 }, uCA: { value: .6 }, uGrain: { value: .005 },
      uVig: { value: 1 }, uExp: { value: 1.08 }, uSat: { value: .98 }, uFade: { value: 1 },
    }, `
      uniform sampler2D tS; uniform sampler2D tB; uniform vec2 uRes;
      uniform float uT, uBloom, uCA, uGrain, uVig, uExp, uFade, uSat;
      varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
      void main(){
        vec2 d = vUv - 0.5; float r2 = dot(d, d);
        float ca = uCA * (0.30 + r2*2.6) * 0.0013;
        vec3 c;
        c.r = texture2D(tS, vUv + d*ca).r;
        c.g = texture2D(tS, vUv).g;
        c.b = texture2D(tS, vUv - d*ca).b;
        c += texture2D(tB, vUv).rgb * uBloom;
        c *= uExp;
        c = aces(c);
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, uSat);
        c = mix(c, c*vec3(0.84, 0.94, 1.10), smoothstep(0.50, 0.0, l)*0.55);   // indigo shadows
        c = mix(c, c*vec3(1.08, 0.99, 0.90), smoothstep(0.55, 1.0, l)*0.35);   // warm highs only
        float v = smoothstep(1.22, 0.26, length(d*vec2(1.0, 0.94))*1.42);
        c *= mix(1.0, v, uVig);
        float g = fract(sin(dot(vUv*uRes + uT*137.0, vec2(12.9898, 78.233)))*43758.5453);
        c += (g-0.5)*uGrain;
        c *= uFade;
        vec3 e = pow(max(c, 0.0), vec3(1.0/2.2));
        e = clamp((e - 0.30) * 1.04 + 0.30, 0.0, 1.0);
        gl_FragColor = vec4(e, 1.0);
      }`);
  }
  setSize(w, h) {
    this.sceneRT.setSize(w, h);
    let lw = w, lh = h;
    for (const L of this.levels) {
      lw = Math.max(8, Math.round(lw / 2)); lh = Math.max(8, Math.round(lh / 2));
      L.w = lw; L.h = lh; L.a.setSize(lw, lh); L.b.setSize(lw, lh);
    }
    if (this.composite) this.composite.uniforms.uRes.value.set(w, h);
  }
  pass(mat, target) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.cam);
  }
  /* scene (linear) → graded screen. fade: 1 normal, → 0 to black. */
  render(scene, camera, { time = 0, fade = 1, bloom = .30 } = {}) {
    const r = this.renderer;
    const size = r.getSize(new THREE.Vector2());
    if (size.x !== this.sceneRT.width || size.y !== this.sceneRT.height) this.setSize(size.x, size.y);
    r.setRenderTarget(this.sceneRT); r.clear(); r.render(scene, camera);

    const L = this.levels;
    this.bright.uniforms.tS.value = this.sceneRT.texture; this.pass(this.bright, L[0].a);
    for (let i = 0; i < L.length; i++) {
      if (i > 0) { this.down.uniforms.tS.value = L[i - 1].a.texture; this.pass(this.down, L[i].a); }
      this.blur.uniforms.tS.value = L[i].a.texture; this.blur.uniforms.uDir.value.set(1 / L[i].w, 0); this.pass(this.blur, L[i].b);
      this.blur.uniforms.tS.value = L[i].b.texture; this.blur.uniforms.uDir.value.set(0, 1 / L[i].h); this.pass(this.blur, L[i].a);
    }
    this.sum.uniforms.t0.value = L[0].a.texture; this.sum.uniforms.t1.value = L[1].a.texture; this.sum.uniforms.t2.value = L[2].a.texture;
    this.pass(this.sum, L[0].b);

    const u = this.composite.uniforms;
    u.tS.value = this.sceneRT.texture; u.tB.value = L[0].b.texture;
    u.uT.value = time % 100; u.uFade.value = fade; u.uBloom.value = bloom;
    this.pass(this.composite, null);
  }
}
