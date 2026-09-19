// RAYARA ANTARANGA · THE SURFACE: the whole site on one thin, calm skin.
//
// Not water. A transparent skin drawn OVER the artwork, which is rendered
// straight to the canvas and never bent, tinted or touched (the scenes are
// locked): the skin is light caught on the slope of a small height field,
// a wave equation run at low resolution on the GPU (ping-pong, RG: height,
// velocity). Everything that touches the site touches the
// field, and only there: the cursor's path (a wake along its motion, never
// a circle) or a finger's swipe. Nothing else touches it: not the scroll,
// not a seam, so the rest of the frame is always exactly the artwork and
// the outer edges never move. The wave dies within a few tenths of the
// frame (damp .95) and the field is flat again in a second or so. The
// same skin on a phone, a shade lighter.
// What is seen is only the field's own light and shade, blended over the
// frame with an alpha that is nothing where the field is flat.
import * as THREE from 'three';

const quadVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/* the field: h (r) and v (g). One step: v += k·(neighbours − h); v *= damp;
   h += v; plus this frame's injections into v */
const simFrag = `
  uniform sampler2D tex; uniform vec2 uTexel, uP0, uP1; uniform float uAspect, uK, uDamp, uStr, uR, uTime;
  varying vec2 vUv;
  float segDist(vec2 p, vec2 a, vec2 b){ vec2 ab = b - a; float t = clamp(dot(p - a, ab) / max(1e-6, dot(ab, ab)), 0.0, 1.0); return length(p - (a + ab * t)); }
  void main(){
    vec2 c = texture2D(tex, vUv).rg;
    float h = c.r, v = c.g;
    float l = texture2D(tex, vUv - vec2(uTexel.x, 0.0)).r, r = texture2D(tex, vUv + vec2(uTexel.x, 0.0)).r;
    float d = texture2D(tex, vUv - vec2(0.0, uTexel.y)).r, u = texture2D(tex, vUv + vec2(0.0, uTexel.y)).r;
    /* the edges hold still: the wave dies at the frame */
    float edge = smoothstep(0.0, 0.06, vUv.x) * smoothstep(0.0, 0.06, 1.0 - vUv.x) * smoothstep(0.0, 0.06, vUv.y) * smoothstep(0.0, 0.06, 1.0 - vUv.y);
    v += uK * ((l + r + d + u) * 0.25 - h);
    v *= uDamp;
    vec2 p = vec2(vUv.x * uAspect, vUv.y);
    /* the wake: a soft depression along the segment the cursor (or finger) just crossed */
    if (uStr != 0.0) { float dd = segDist(p, uP0, uP1); v -= uStr * exp(-dd * dd / (uR * uR)); }
    h += v;
    h *= edge;
    gl_FragColor = vec4(h, v, 0.0, 1.0);
  }`;

/* the skin: a transparent layer drawn OVER the scene (which is rendered
   straight to the canvas, untouched): light caught on the field's slope
   where it faces the light, shade where it faces away, and a soft body
   where the surface stands high; alpha from the same, so at rest it is
   nothing at all */
const compFrag = `
  uniform sampler2D hmap; uniform float uLight, uBody, uAlpha; uniform vec2 uTexel; uniform vec3 uLit, uDark;
  varying vec2 vUv;
  void main(){
    float h = texture2D(hmap, vUv).r;
    float l = texture2D(hmap, vUv - vec2(uTexel.x, 0.0)).r, r = texture2D(hmap, vUv + vec2(uTexel.x, 0.0)).r;
    float d = texture2D(hmap, vUv - vec2(0.0, uTexel.y)).r, u = texture2D(hmap, vUv + vec2(0.0, uTexel.y)).r;
    vec2 g = vec2(r - l, u - d);
    float s = (g.x * 0.45 + g.y * 0.85) * uLight + h * uBody;
    /* light on the slope that faces the light; only a trace of shade on the
       other, so the skin is a sheen over the picture, never a smudge on it */
    vec3 col = s > 0.0 ? uLit : uDark;
    float a = clamp(abs(s), 0.0, 1.0) * uAlpha * (s > 0.0 ? 1.0 : 0.18);
    gl_FragColor = vec4(col, a);
  }`;

export class Surface {
  constructor(renderer, { mobile = false, reduced = false } = {}) {
    this.renderer = renderer;
    this.ok = !!renderer.capabilities.isWebGL2 && !reduced;   // the field needs a float target; under reduced motion the skin is still
    this.mobile = mobile;
    this.simA = null; this.simB = null;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.simScene = new THREE.Scene(); this.compScene = new THREE.Scene();
    this.simMat = new THREE.ShaderMaterial({
      uniforms: { tex: { value: null }, uTexel: { value: new THREE.Vector2() }, uP0: { value: new THREE.Vector2() }, uP1: { value: new THREE.Vector2() }, uAspect: { value: 1 }, uK: { value: .26 }, uDamp: { value: .950 }, uStr: { value: 0 }, uR: { value: .06 }, uTime: { value: 0 } },
      vertexShader: quadVert, fragmentShader: simFrag, depthTest: false, depthWrite: false,
    });
    this.compMat = new THREE.ShaderMaterial({
      uniforms: { hmap: { value: null }, uLight: { value: mobile ? 36 : 42 }, uBody: { value: 4.5 }, uAlpha: { value: mobile ? .58 : .62 }, uTexel: { value: new THREE.Vector2() }, uLit: { value: new THREE.Color(0xe3d8c1) }, uDark: { value: new THREE.Color(0x0d0d09) } },
      vertexShader: quadVert, fragmentShader: compFrag, depthTest: false, depthWrite: false, transparent: true, blending: THREE.NormalBlending,
    });
    const q = () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); m.frustumCulled = false; return m; };
    this.simQuad = q(); this.simQuad.material = this.simMat; this.simScene.add(this.simQuad);
    this.compQuad = q(); this.compQuad.material = this.compMat; this.compScene.add(this.compQuad);
    this._size = new THREE.Vector2();
    /* this frame's disturbances */
    this.wakes = [];            // [{ x0, y0, x1, y1, str }] in uv (y up), aspect-corrected in the shader
    this.energy = 0;            // how disturbed the skin is (for the words' own skin, main.js)
    this.calm = 0;              // frames without any disturbance
  }
  targets() {
    const r = this.renderer;
    r.getDrawingBufferSize(this._size);
    const w = Math.max(1, this._size.x | 0), h = Math.max(1, this._size.y | 0);
    /* the field at a sixth of the frame, never under 120 px across */
    const sw = Math.max(120, Math.round(w / 6)), sh = Math.max(68, Math.round(h / 6));
    if (!this.simA) {
      const mk = () => { const t = new THREE.WebGLRenderTarget(sw, sh, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }); t.texture.generateMipmaps = false; return t; };
      this.simA = mk(); this.simB = mk();
    } else if (this.simA.width !== sw || this.simA.height !== sh) { this.simA.setSize(sw, sh); this.simB.setSize(sw, sh); }
    this.simMat.uniforms.uTexel.value.set(1 / sw, 1 / sh);
    this.compMat.uniforms.uTexel.value.set(1 / sw, 1 / sh);
    this.simMat.uniforms.uAspect.value = w / h;
  }
  /* compiled and allocated during the boot, behind the loader, so the
     first movement of the cursor is answered without a hitch */
  warm(scene, camera) {
    if (!this.ok) return;
    const r = this.renderer;
    this.targets();
    const su = this.simMat.uniforms; su.uStr.value = 0; su.tex.value = this.simA.texture;
    r.setRenderTarget(this.simB); r.render(this.simScene, this.cam); r.setRenderTarget(null);
    this.compMat.uniforms.hmap.value = this.simA.texture;
    r.compile(this.compScene, this.cam);
  }
  /* a wake: the cursor or a finger moved from (x0, y0) to (x1, y1), uv with
     y up; speed in frame-widths per second sets its depth */
  wake(x0, y0, x1, y1, speed) {
    if (!this.ok) return;
    const str = Math.min(1, speed * .7) * (this.mobile ? .95 : 1);
    if (str < .02) return;
    this.wakes.push({ x0, y0, x1, y1, str });
    if (this.wakes.length > 6) this.wakes.shift();
  }
  render(scene, camera, time, dt) {
    const r = this.renderer;
    if (!this.ok) { r.setRenderTarget(null); r.render(scene, camera); return; }
    this.targets();
    /* is anything happening? the field is stepped while it carries energy
       or is being touched; once calm for a while the scene renders straight */
    const touched = this.wakes.length > 0;
    if (touched) this.calm = 0; else this.calm++;
    const asleep = this.calm > 150;   // ~2.5 s of nothing: the field is flat
    if (asleep) { this.energy = 0; r.setRenderTarget(null); r.render(scene, camera); return; }
    const su = this.simMat.uniforms;
    su.uTime.value = time;
    const steps = 2;   // two small steps a frame: a fluid wave at low cost
    for (let i = 0; i < steps; i++) {
      const w = this.wakes[i] || null;
      const asp = su.uAspect.value;
      if (w) { su.uP0.value.set(w.x0 * asp, w.y0); su.uP1.value.set(w.x1 * asp, w.y1); su.uStr.value = w.str * .02; }
      else su.uStr.value = 0;
      su.tex.value = this.simA.texture;
      r.setRenderTarget(this.simB); r.render(this.simScene, this.cam);
      const t = this.simA; this.simA = this.simB; this.simB = t;
    }
    /* the skin's energy, for the words: what was put in this frame, settling */
    let wk = 0; for (const w of this.wakes) wk = Math.max(wk, w.str);
    this.energy = Math.max(this.energy * Math.exp(-dt * 1.8), wk);
    this.wakes.length = 0;
    /* the scene, exactly as it is; then the skin over it */
    r.setRenderTarget(null); r.render(scene, camera);
    this.compMat.uniforms.hmap.value = this.simA.texture;
    r.autoClear = false; r.render(this.compScene, this.cam); r.autoClear = true;
  }
}
