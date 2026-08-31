// RAYARA ANTARANGA · scenes 01–03 — Pūrvāśrama. One house carries the whole
// chapter: the Bhuvanagiri home outside (the editorial cover), and within it
// the small rooms of a life — akṣarābhyāsa, study, the gṛhastha household,
// and finally the ordered manuscripts of Kumbhakonam, ending at the Matha's
// inner doorway. Sannyāsa is NOT shown here; it belongs to scene 04.
//
// The house is the supplied model (models/purvashrama-house.glb — an
// optimised copy; the original asset is untouched). It is a solid shell with
// no interior, so the small interior required by the camera path is built
// here and entered through an occluded cut: the camera pushes into the dark
// open doorway, and resolves inside.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { stoneCanvas, palmLeafCanvas, canvas, tex, flame, glowSprite, glowTexture, mulberry, clamp01, remap, smooth, win, camTrack, V3 } from '../util.js';

export const PURVA_Y = 3200;

/* chapter spans in global t, and the door-cut position in scene progress v */
const T0 = .070, T1 = .150, T2 = .225, T3 = .295;
const V_DOOR = .235;
const tToV = (t) => clamp01((t - T0) / (T3 - T0));

/* the sand tray: warm river sand with ॐ already written in kumkum — still,
   and treated reverentially (it never animates) */
function sandOmCanvas() {
  const [c, g] = canvas(512, 384);
  const rnd = mulberry(27);
  g.fillStyle = '#b39a6e'; g.fillRect(0, 0, 512, 384);
  const img = g.getImageData(0, 0, 512, 384), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (rnd() - .5) * 34;
    d[i] += v; d[i + 1] += v * .92; d[i + 2] += v * .8;
  }
  g.putImageData(img, 0, 0);
  // combed edge where the sand was levelled
  g.globalAlpha = .1; g.strokeStyle = '#7a6444';
  for (let y = 14; y < 384; y += 9) { g.beginPath(); g.moveTo(8, y); g.lineTo(504, y + (rnd() - .5) * 4); g.stroke(); }
  g.globalAlpha = 1;
  // the akṣara, written in kumkum — a soft powdered edge, no clean vector line
  g.shadowColor = 'rgba(122,26,10,.85)'; g.shadowBlur = 7;
  g.fillStyle = '#8e1f0c';
  g.font = '300 210px "Noto Serif Devanagari", serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('ॐ', 256, 200);
  g.shadowBlur = 0;
  return c;
}

/* a woven seating mat */
function matCanvas(seed, warm) {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry(seed);
  g.fillStyle = warm ? '#4e3a22' : '#443727'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 6) {
    g.fillStyle = rnd() > .5 ? 'rgba(30,20,10,.32)' : 'rgba(96,74,44,.25)';
    g.fillRect(0, y, 256, 3);
  }
  for (let x = 0; x < 256; x += 22) { g.fillStyle = 'rgba(26,17,8,.25)'; g.fillRect(x, 0, 2, 256); }
  g.strokeStyle = 'rgba(70,32,16,.35)'; g.lineWidth = 8; g.strokeRect(4, 4, 248, 248);
  return c;
}

/* deterministic 2-D value noise for the courtyard terrain */
const vHash = (ix, iz) => { const q = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453; return q - Math.floor(q); };
function vNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return vHash(ix, iz) * (1 - u) * (1 - v) + vHash(ix + 1, iz) * u * (1 - v)
       + vHash(ix, iz + 1) * (1 - u) * v + vHash(ix + 1, iz + 1) * u * v;
}

/* the packed-earth courtyard map: muted clay, ochre and umber mottling with
   a lighter compacted band where feet pass between the courtyard and steps */
function earthCanvas() {
  const [c, g] = canvas(1024, 768);
  const rnd = mulberry(83);
  g.fillStyle = '#796853'; g.fillRect(0, 0, 1024, 768);
  for (let i = 0; i < 120; i++) {
    const x = rnd() * 1024, y = rnd() * 768, r = 40 + rnd() * 150;
    const tone = ['106,90,70', '128,112,88', '114,98,76', '96,82,64', '122,108,88'][(rnd() * 5) | 0];
    const grd = g.createRadialGradient(x, y, 2, x, y, r);
    grd.addColorStop(0, `rgba(${tone},${.05 + rnd() * .08})`); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // the worn approach: a soft compacted band down the middle toward the door
  const path = g.createRadialGradient(512, 240, 30, 512, 300, 330);
  path.addColorStop(0, 'rgba(150,132,104,.12)'); path.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = path; g.fillRect(0, 0, 1024, 768);
  const img = g.getImageData(0, 0, 1024, 768), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (rnd() - .5) * 16;
    d[i] += v; d[i + 1] += v * .95; d[i + 2] += v * .85;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/* fine soil grain for the near apron, tiling */
function grainCanvas() {
  const [c, g] = canvas(256, 256);
  const rnd = mulberry(97);
  g.fillStyle = '#786750'; g.fillRect(0, 0, 256, 256);
  const img = g.getImageData(0, 0, 256, 256), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (rnd() - .5) * 15;
    d[i] += v; d[i + 1] += v * .94; d[i + 2] += v * .84;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 90; i++) {                    // occasional grit
    g.fillStyle = rnd() > .5 ? 'rgba(62,50,36,.28)' : 'rgba(146,130,104,.25)';
    const r = .6 + rnd() * 1.6;
    g.beginPath(); g.arc(rnd() * 256, rnd() * 256, r, 0, 7); g.fill();
  }
  return c;
}

/* soft radial gradient for contact shadows and light spill */
function discCanvas(rgba0, rgba1) {
  const [c, g] = canvas(128, 128);
  const grd = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  grd.addColorStop(0, rgba0); grd.addColorStop(1, rgba1);
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return c;
}

/* the entrance door: vertical teak planks, aged and oiled */
function doorCanvas() {
  const [c, g] = canvas(128, 256);
  const rnd = mulberry(41);
  g.fillStyle = '#432f1d'; g.fillRect(0, 0, 128, 256);
  const img = g.getImageData(0, 0, 128, 256), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (rnd() - .5) * 20;
    d[i] += v; d[i + 1] += v * .8; d[i + 2] += v * .6;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(58,42,26,.7)'; g.lineWidth = 1;        // grain
  for (let x = 3; x < 128; x += 4 + (rnd() * 4 | 0)) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (rnd() - .5) * 6, 256); g.stroke();
  }
  g.strokeStyle = 'rgba(16,10,5,.8)'; g.lineWidth = 2;         // plank joints
  for (const x of [26, 52, 77, 102]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  g.fillStyle = 'rgba(20,13,7,.9)';                            // nail heads at the batten lines
  for (const y of [58, 196]) for (const x of [13, 39, 64, 90, 115]) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
  return c;
}

/* a banana leaf: midrib, streaks, a few torn notches on the edge */
function bananaLeafCanvas() {
  const [c, g] = canvas(128, 256);
  const rnd = mulberry(59);
  g.fillStyle = '#5d7036';
  g.beginPath(); g.ellipse(64, 128, 56, 124, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(116,132,72,.9)'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(64, 6); g.lineTo(64, 250); g.stroke();
  g.lineWidth = 2;
  for (let y = 14; y < 250; y += 9) {
    g.strokeStyle = rnd() > .5 ? 'rgba(80,96,48,.5)' : 'rgba(104,120,62,.45)';
    g.beginPath(); g.moveTo(64, y); g.lineTo(64 + (rnd() > .5 ? 54 : -54), y + 7); g.stroke();
  }
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) {                     // edge wear
    const sy = 30 + rnd() * 200, sx = 64 + (rnd() > .5 ? 1 : -1) * (46 + rnd() * 12);
    g.beginPath(); g.ellipse(sx, sy, 4 + rnd() * 7, 2 + rnd() * 3, rnd(), 0, 7); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  return c;
}

export function createPurvashramaStage(ctx) {
  const g = new THREE.Group();
  g.position.y = PURVA_Y;
  g.visible = false;
  const rnd = mulberry(311);

  /* ================= the exterior — Bhuvanagiri morning ================= */
  const outside = new THREE.Group();
  g.add(outside);

  /* the house itself — scaled and centred non-destructively in a holder,
     veranda facade toward the courtyard (+z) */
  const HOUSE_H = 4.3;
  const SINK = -.06;                      // the house sits INTO the earth, not on it
  const houseHolder = new THREE.Group();
  houseHolder.rotation.y = Math.PI * 1.5;
  houseHolder.position.y = SINK;
  outside.add(houseHolder);
  /* resolves once the house is in the graph — main.js warms its program and
     textures then, so the first real frame of scene 01 never hitches */
  let readyRes;
  const ready = new Promise(r => { readyRes = r; });
  new GLTFLoader().loadAsync('./models/purvashrama-house.glb').then(async gltf => {
    const root = gltf.scene;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const sc = HOUSE_H / size.y;
    root.position.set(-(box.min.x + box.max.x) / 2 * sc, -box.min.y * sc, -(box.min.z + box.max.z) / 2 * sc);
    root.scale.setScalar(sc);
    /* the asset's baked texture is harsh: saturated terracotta, hard noise,
       and near-black UV-gutter bleed at island edges. Re-grade it once at
       load — soften saturation and contrast, then floor the blacks at a warm
       umber so every dark artifact reads as aged shadow, not a hole.
       NOTE: the grade decodes the atlas from the GLB's own bytes — the
       loader's ImageBitmap (created with colorSpaceConversion 'none') draws
       into a 2D canvas as flat grey in Chromium, so it cannot be the source. */
    let gradedTex = null;
    try {
      const parser = gltf.parser, def = parser.json.images && parser.json.images[0];
      if (def && def.bufferView !== undefined) {
        const ab = await parser.getDependency('bufferView', def.bufferView);
        const bmp = await createImageBitmap(new Blob([ab], { type: def.mimeType }));
        const [cv, cx] = canvas(bmp.width, bmp.height);
        cx.drawImage(bmp, 0, 0);
        bmp.close();
        const id = cx.getImageData(0, 0, cv.width, cv.height), d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          let r = d[i], gg = d[i + 1], bb = d[i + 2];
          const l = r * .299 + gg * .587 + bb * .114;
          r = l + (r - l) * .76; gg = l + (gg - l) * .76; bb = l + (bb - l) * .76;   // calm the terracotta
          r = (r - 128) * .88 + 134; gg = (gg - 128) * .88 + 134; bb = (bb - 128) * .88 + 133;  // soften contrast
          if (r < 49) r += (49 - r) * .8;                                            // floor the blacks
          if (gg < 36) gg += (36 - gg) * .8;                                         //   at a warm umber, so
          if (bb < 25) bb += (25 - bb) * .8;                                         //   gutter bleed reads as shadow
          d[i] = r; d[i + 1] = gg; d[i + 2] = bb;
        }
        cx.putImageData(id, 0, 0);
        gradedTex = new THREE.CanvasTexture(cv);
        gradedTex.colorSpace = THREE.SRGBColorSpace;
        gradedTex.flipY = false;
        gradedTex.anisotropy = 8;
      }
    } catch (e) { console.warn('pūrvāśrama texture grade skipped', e); }
    const oldMaps = new Set();
    root.traverse(o => {
      if (!o.isMesh) return;
      const m = o.material;
      m.roughness = 1; m.metalness = 0;
      o.castShadow = true;
      o.receiveShadow = true;
      if (gradedTex && m.map) {
        oldMaps.add(m.map);
        m.map = gradedTex;
        m.needsUpdate = true;
      }
    });
    for (const t of oldMaps) t.dispose();
    houseHolder.add(root);
    /* the generator left a low bench-like slab on the veranda beside the
       door — it reads as an instrument left outdoors, which the narrative
       forbids. Its faces are removed outright (no hiding): every triangle
       whose centre falls in its footprint is dropped from the index. */
    {
      outside.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(outside.matrixWorld).invert();
      const rel = new THREE.Matrix4();
      const cullBoxes = [
        new THREE.Box3(new THREE.Vector3(1.32, .54, .55), new THREE.Vector3(2.55, 1.05, 1.95)),   // the bench slab
        new THREE.Box3(new THREE.Vector3(1.38, .95, 1.28), new THREE.Vector3(1.66, 1.24, 1.72)),  // floating fragment above it
        new THREE.Box3(new THREE.Vector3(2.53, 1.02, 1.28), new THREE.Vector3(2.88, 1.38, 1.72)), // floating fragment by the window
      ];
      const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
      root.traverse(o => {
        if (!o.isMesh || !o.geometry.index) return;
        rel.multiplyMatrices(inv, o.matrixWorld);
        const idx = o.geometry.index, posA = o.geometry.attributes.position;
        const keep = [];
        for (let i = 0; i < idx.count; i += 3) {
          va.fromBufferAttribute(posA, idx.getX(i)).applyMatrix4(rel);
          vb.fromBufferAttribute(posA, idx.getX(i + 1)).applyMatrix4(rel);
          vc.fromBufferAttribute(posA, idx.getX(i + 2)).applyMatrix4(rel);
          va.add(vb).add(vc).multiplyScalar(1 / 3);
          if (!cullBoxes.some(bx => bx.containsPoint(va))) keep.push(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
        }
        if (keep.length !== idx.count) o.geometry.setIndex(keep);
      });
    }
    readyRes(root);
  }).catch(err => { console.warn('pūrvāśrama house failed to load', err); readyRes(null); });

  /* ---- the earthen courtyard: a displaced, bounded ground, not a plane ----
     Flat and compacted where people walk, rolling gently beyond the yard,
     rising at the far edges so the land closes its own horizon. */
  const heightAt = (x, z) => {
    const yard = smooth(remap(Math.hypot(x * .9, (z - 6) * 1.1), 10, 30));
    const roll = ((vNoise(x * .09 + 3, z * .09) - .5) * .5 + (vNoise(x * .3, z * .3 + 9) - .5) * .14) * yard;
    const rim = smooth(remap(-z, 14, 34)) * (.55 + vNoise(x * .05, 7.3) * .5)
              + smooth(remap(Math.abs(x), 28, 46)) * (.4 + vNoise(z * .06, 2.1) * .4);
    const micro = (vNoise(x * .55, z * .55) - .5) * .05 * smooth(remap(Math.hypot(x, z - 4), 3, 9));
    return roll + rim + micro;
  };
  /* occlusion where the house and steps meet the ground — baked into the
     ground meshes' vertex colours, so there is no separate patch to see */
  const aoAt = (x, z) => {
    const dx = Math.max(Math.abs(x) - 4.9, 0);
    const dz = Math.max(z - 2.5, -4.2 - z, 0);
    let ao = .34 * (1 - smooth(remap(Math.hypot(dx, dz), 0, 2.4)));
    ao += .16 * (1 - smooth(remap(Math.hypot(x / 1.7, (z - 3.1) / 1.3), .5, 1.5)));
    return Math.min(ao, .42);
  };
  const displace = (geo, zOff, lift = 0) => {
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 4);
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i), wz = zOff - pos.getY(i);
      pos.setZ(i, heightAt(wx, wz) + lift);
      const k = 1 - aoAt(wx, wz);
      col[i * 4] = col[i * 4 + 1] = col[i * 4 + 2] = k; col[i * 4 + 3] = 1;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    geo.computeVertexNormals();
  };
  const earthGeo = new THREE.PlaneGeometry(90, 64, 72, 52);
  displace(earthGeo, 8);
  const earth = new THREE.Mesh(earthGeo,
    new THREE.MeshStandardMaterial({ map: tex(earthCanvas()), roughness: 1, vertexColors: true }));
  earth.rotation.x = -Math.PI / 2;
  earth.position.set(0, -.012, 8);
  earth.receiveShadow = true;
  outside.add(earth);

  /* the near apron: fine soil grain over the walking ground, fading into the
     large map so close framing never shows a stretched texel */
  const apronGeo = new THREE.PlaneGeometry(26, 20, 26, 20);
  displace(apronGeo, 5, .016);
  {
    const pos = apronGeo.attributes.position, col = apronGeo.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      col.setW(i, 1 - smooth(remap(Math.hypot(pos.getX(i) / 13, (pos.getY(i)) / 10), .55, .98)));
    }
  }
  const apron = new THREE.Mesh(apronGeo,
    new THREE.MeshStandardMaterial({
      map: tex(grainCanvas(), { repeat: [4, 4] }), roughness: 1,
      transparent: true, vertexColors: true, depthWrite: false,
    }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, 0, 5);
  apron.receiveShadow = true;
  outside.add(apron);

  /* lamp light past the steps — visible only while the door stands open */
  const spillTex = tex(discCanvas('rgba(255,172,84,.5)', 'rgba(255,140,60,0)'));
  const spillFar = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.9),
    new THREE.MeshBasicMaterial({ map: spillTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  spillFar.rotation.x = -Math.PI / 2;
  spillFar.position.set(0, .042, 3.3);
  outside.add(spillFar);

  /* morning sky — one gradient, a warm pocket at the low sun */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.);} ',
    fragmentShader: `
      varying vec3 vP;
      void main(){
        float h = normalize(vP).y;
        vec3 zen = vec3(0.30,0.34,0.42);
        vec3 hor = vec3(0.60,0.50,0.36);
        vec3 col = mix(zen, hor, pow(clamp(1.0-h,0.,1.), 2.1));
        float pocket = exp(-pow((atan(vP.x,vP.z)-0.62)*1.7,2.0)) * pow(clamp(1.0-h,0.,1.),2.4);
        col += vec3(0.34,0.21,0.09)*pocket;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 24, 16), skyMat);
  outside.add(sky);
  const sunGlow = glowSprite(0xe8c087, 22, .45);
  sunGlow.position.set(48, 14, 74);
  outside.add(sunGlow);

  /* a dusty band standing at the ground-sky meeting line, so the far edge of
     the land dissolves into the morning instead of drawing a rule across it */
  const horizonBand = new THREE.Mesh(
    new THREE.CylinderGeometry(106, 106, 18, 48, 1, true),
    new THREE.MeshBasicMaterial({
      map: tex((() => {
        const [c, x] = canvas(64, 128);
        const grd = x.createLinearGradient(0, 128, 0, 0);
        grd.addColorStop(0, 'rgba(158,134,99,.92)'); grd.addColorStop(.38, 'rgba(170,144,106,.5)'); grd.addColorStop(1, 'rgba(178,152,112,0)');
        x.fillStyle = grd; x.fillRect(0, 0, 64, 128);
        return c;
      })()), transparent: true, side: THREE.BackSide, depthWrite: false, fog: false,
    }));
  horizonBand.position.y = 7.5;
  outside.add(horizonBand);

  /* the morning sun. Its target must live INSIDE the stage — the default
     target is the world origin, 3200 units below, which aims the light
     straight down and flattens every wall. From here it rakes the facade
     from the east, hangs the eave's shade on the plaster, and lays the
     house's own shadow across the courtyard. */
  const sun = new THREE.DirectionalLight(0xe9c08c, 3.0);
  sun.position.set(26, 20, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(ctx.isMobile ? 1024 : 2048);
  sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -14;
  sun.shadow.camera.near = 4; sun.shadow.camera.far = 110;
  sun.shadow.bias = -.0003;
  sun.shadow.normalBias = .04;
  outside.add(sun, sun.target);
  const hemiOut = new THREE.HemisphereLight(0xb3a586, 0x564736, 1.3);
  outside.add(hemiOut);

  /* ---- the doorway: the model's wall is genuinely open here (x ±.375,
     y .70–1.95, wall face z≈.59, hollow shell behind). Build a REAL
     threshold in that opening: jambs, lintel, raised sill, a short entry
     floor, plastered reveals and a dark end wall — true parallax depth, a
     dark interior with substance instead of a floating black plane. The
     group rides the house's sink so it stays seated in the model. */
  const doorway = new THREE.Group();
  doorway.position.y = SINK;
  outside.add(doorway);
  const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  const doorWood = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [56, 40, 25], 12, 71), { repeat: [1, 2] }), roughness: .85 });
  const doorPlaster = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [96, 80, 60], 11, 77)), roughness: 1 });
  for (const sx of [-1, 1]) {
    const jamb = shadowed(new THREE.Mesh(new THREE.BoxGeometry(.1, 1.34, .34), doorWood));
    jamb.position.set(sx * .41, 1.33, .5);
    doorway.add(jamb);
  }
  const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(1.06, .13, .36), doorWood);
  doorLintel.position.set(0, 2.0, .5);
  doorway.add(doorLintel);
  const doorSill = new THREE.Mesh(new THREE.BoxGeometry(.9, .15, .32), doorWood);
  doorSill.position.set(0, .625, .52);
  doorway.add(doorSill);
  /* the door: one leaf of vertical planks with two battens, hinged on the
     left jamb, closed while the exterior stands — it swings inward as the
     visitor reaches the threshold */
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-.355, .70, .55);
  doorway.add(doorPivot);
  const doorMat = new THREE.MeshStandardMaterial({ map: tex(doorCanvas()), roughness: .8 });
  const doorLeaf = shadowed(new THREE.Mesh(new THREE.BoxGeometry(.71, 1.23, .045), doorMat));
  doorLeaf.position.set(.355, .615, 0);
  doorPivot.add(doorLeaf);
  const battenGeo = new THREE.BoxGeometry(.64, .09, .03);
  for (const by of [.28, .95]) {
    const batten = new THREE.Mesh(battenGeo, doorWood);
    batten.position.set(.355, by, .038);
    doorPivot.add(batten);
  }
  const hingeMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: .6, metalness: .3 });
  const hingeGeo = new THREE.BoxGeometry(.028, .11, .06);
  for (const hy of [.22, 1.0]) {
    const hinge = new THREE.Mesh(hingeGeo, hingeMat);
    hinge.position.set(.012, hy, .01);
    doorPivot.add(hinge);
  }
  // the entry passage behind the wall
  const entryFloor = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9),
    new THREE.MeshStandardMaterial({ map: tex(grainCanvas()), color: 0x6b5a45, roughness: 1 }));
  entryFloor.rotation.x = -Math.PI / 2;
  entryFloor.position.set(0, .55, -.35);
  doorway.add(entryFloor);
  for (const sx of [-1, 1]) {
    const reveal = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.7), doorPlaster);
    reveal.position.set(sx * .72, 1.4, -.35);
    reveal.rotation.y = sx * -Math.PI / 2;
    doorway.add(reveal);
  }
  const entryCeil = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9),
    new THREE.MeshStandardMaterial({ color: 0x221a10, roughness: 1 }));
  entryCeil.rotation.x = Math.PI / 2;
  entryCeil.position.set(0, 2.1, -.35);
  doorway.add(entryCeil);
  const entryEnd = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.8),
    new THREE.MeshBasicMaterial({
      map: tex((() => {
        const [c, x] = canvas(128, 160);
        x.fillStyle = '#080503'; x.fillRect(0, 0, 128, 160);
        const grd = x.createRadialGradient(94, 128, 4, 94, 128, 110);   // lamplight from the inner room
        grd.addColorStop(0, 'rgba(140,82,34,.5)'); grd.addColorStop(.5, 'rgba(70,40,16,.22)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = grd; x.fillRect(0, 0, 128, 160);
        return c;
      })()),
    }));
  entryEnd.position.set(0, 1.36, -1.16);
  doorway.add(entryEnd);
  const doorFlame = flame(.55);
  doorFlame.position.set(.44, .92, -.4);
  doorway.add(doorFlame);
  const doorLight = new THREE.PointLight(0xff9a45, 2.3, 4.5, 2);
  doorLight.position.set(.3, 1.15, -.3);
  doorway.add(doorLight);
  // lamp light falling out of the door onto the veranda floor
  const spillNear = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5),
    new THREE.MeshBasicMaterial({ map: spillTex, transparent: true, opacity: .3, depthWrite: false, blending: THREE.AdditiveBlending }));
  spillNear.rotation.x = -Math.PI / 2;
  spillNear.position.set(0, .585, 1.35);
  doorway.add(spillNear);

  /* mango-leaf torana over the real door */
  {
    const leafGeo = new THREE.ConeGeometry(.045, .15, 5);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x38511f, roughness: 1 });
    const torana = new THREE.InstancedMesh(leafGeo, leafMat, 11);
    const m = new THREE.Matrix4(), e = new THREE.Euler();
    for (let i = 0; i < 11; i++) {
      const u = i / 10;
      e.set(Math.PI + (rnd() - .5) * .5, 0, (rnd() - .5) * .4);
      m.makeRotationFromEuler(e);
      m.setPosition(-.5 + u * 1.0, 2.1 - Math.sin(u * Math.PI) * .07, .7);
      torana.setMatrixAt(i, m);
    }
    torana.position.y = SINK;
    outside.add(torana);
  }

  /* ---- vegetation: built, not painted. Shared geometries and materials,
     lit by the same sun and hemisphere as the house; a few framing trees at
     the courtyard edges, a banana clump by the house, two grounded bushes.
     Selected clusters and leaves carry their own slow offset wind. ---- */
  const wind = [];                                     // {m, r, p, sp, a, x}
  const barkMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [72, 56, 38], 14, 29), { repeat: [1, 2] }), roughness: 1 });
  const leafMats = [0x5c6b3c, 0x69763f, 0x4d5b33].map(cc =>
    new THREE.MeshStandardMaterial({ color: cc, roughness: 1 }));
  const clusterGeo = new THREE.IcosahedronGeometry(1, 2);
  const trunkGeo = new THREE.CylinderGeometry(.09, .17, 1, 7);
  trunkGeo.translate(0, .5, 0);
  const rootGeo = new THREE.CylinderGeometry(.17, .38, .42, 7);
  rootGeo.translate(0, .21, 0);
  const mkTree = (seed, sc, x, z, ry) => {
    const t = mulberry(seed);
    const gr = new THREE.Group();
    const lean = (t() - .5) * .18;
    const H = 2.7 + t() * .8;
    const trunk = new THREE.Mesh(trunkGeo, barkMat);
    trunk.scale.set(1.5, H, 1.5);
    trunk.rotation.z = lean;
    gr.add(trunk);
    const root = new THREE.Mesh(rootGeo, barkMat);      // root flare into the ground
    root.scale.set(1.9, 1, 1.9);
    gr.add(root);
    const tx = -Math.sin(lean) * H;
    for (let i = 0, nB = 3 + (t() * 2 | 0); i < nB; i++) {   // primary branches
      const br = new THREE.Mesh(trunkGeo, barkMat);
      br.scale.set(.5, 1.1 + t() * .9, .5);
      br.position.set(tx * (.62 + t() * .25), H * (.62 + t() * .25), 0);
      br.rotation.set((t() - .5) * 1.2, t() * 6.28, .5 + t() * .7);
      gr.add(br);
    }
    for (let i = 0, nC = 8 + (t() * 4 | 0); i < nC; i++) {   // foliage in broken clusters, sky between them
      const cl = new THREE.Mesh(clusterGeo, leafMats[(t() * 3) | 0]);
      const a = t() * 6.28, r = .35 + t() * 1.15, lift = t() * .9;
      cl.position.set(tx + Math.cos(a) * r, H + .25 + lift - r * .22, Math.sin(a) * r * .8);
      cl.scale.set(.5 + t() * .55, .34 + t() * .28, .45 + t() * .5);
      cl.rotation.set(t() * 6.28, t() * 6.28, t() * 6.28);
      gr.add(cl);
      if (i % 2 === 0) wind.push({ m: cl, r: cl.rotation.z, p: t() * 6.28, sp: .45 + t() * .5, a: .01 + t() * .012, x: false });
    }
    gr.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    gr.scale.setScalar(sc);
    gr.position.set(x, heightAt(x, z) - .06, z);
    gr.rotation.y = ry;
    outside.add(gr);
  };
  mkTree(21, 1.1, -13.5, -1.5, .6);
  mkTree(33, 1.15, 16.5, -4.0, 2.1);
  mkTree(47, .95, -16.5, 8.5, 4.0);
  mkTree(53, .8, 18.5, 6.0, 3.3);

  const bLeafGeo = new THREE.PlaneGeometry(.6, 1.8, 1, 7);
  {
    const posA = bLeafGeo.attributes.position;
    for (let i = 0; i < posA.count; i++) {
      const u = (posA.getY(i) + .9) / 1.8;
      posA.setY(i, u * 1.8);                       // pivot at the stem
      posA.setZ(i, -u * u * .8);                   // the blade bends over and down
      posA.setX(i, posA.getX(i) * (1 - u * .25));
    }
    bLeafGeo.computeVertexNormals();
  }
  const bLeafTex = tex(bananaLeafCanvas());
  const bLeafMats = [0x8b9a55, 0x7d8c4c].map(cc => new THREE.MeshStandardMaterial({
    map: bLeafTex, color: cc, roughness: 1, side: THREE.DoubleSide, alphaTest: .4,
  }));
  const bStemMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(128, [116, 118, 76], 10, 37), { repeat: [1, 3] }), roughness: 1 });
  const bStemGeo = new THREE.CylinderGeometry(.06, .12, 1.4, 8);
  bStemGeo.translate(0, .7, 0);
  const mkBanana = (seed, sc, x, z, ry) => {
    const t = mulberry(seed);
    const gr = new THREE.Group();
    gr.add(new THREE.Mesh(bStemGeo, bStemMat));
    for (let i = 0, n = 6; i < n; i++) {
      const leaf = new THREE.Mesh(bLeafGeo, bLeafMats[i % 2]);
      leaf.position.y = 1.15 + t() * .25;
      leaf.rotation.set(-(.35 + t() * .75), i * 2.35 + t() * .8, (t() - .5) * .3);
      leaf.scale.setScalar(.8 + t() * .4);
      gr.add(leaf);
      wind.push({ m: leaf, r: leaf.rotation.x, p: t() * 6.28, sp: .6 + t() * .6, a: .02 + t() * .015, x: true });
    }
    gr.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    gr.scale.setScalar(sc);
    gr.position.set(x, heightAt(x, z) - .03, z);
    gr.rotation.y = ry;
    outside.add(gr);
  };
  mkBanana(61, 1.05, 7.6, 3.1, .8);
  mkBanana(77, .8, 8.5, 1.7, 2.9);

  const mkBush = (seed, sc, x, z) => {
    const t = mulberry(seed);
    const gr = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const cl = new THREE.Mesh(clusterGeo, leafMats[2]);
      cl.position.set((t() - .5) * .9, .14 + t() * .1, (t() - .5) * .7);
      cl.scale.set(.4 + t() * .3, .2 + t() * .14, .36 + t() * .3);
      cl.rotation.y = t() * 6.28;
      gr.add(cl);
    }
    gr.scale.setScalar(sc);
    gr.position.set(x, heightAt(x, z) - .04, z);
    outside.add(gr);
  };
  mkBush(85, 1.0, -7.2, 5.6);
  mkBush(91, .8, 11.2, 7.8);

  /* early-morning haze lying across the courtyard */
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 3),
    new THREE.MeshBasicMaterial({
      map: tex((() => {
        const [c, x] = canvas(256, 64);
        const grd = x.createLinearGradient(0, 0, 0, 64);
        grd.addColorStop(0, 'rgba(214,196,164,0)'); grd.addColorStop(.5, 'rgba(214,196,164,.4)'); grd.addColorStop(1, 'rgba(214,196,164,0)');
        x.fillStyle = grd; x.fillRect(0, 0, 256, 64);
        return c;
      })()), transparent: true, opacity: .30, depthWrite: false, fog: false,
    }));
  haze.position.set(-4, 1.1, -3);
  outside.add(haze);

  /* ================= the interior — one room of the house =================
     Entered through the doorway cut. Local block centred on z −30.5. */
  const inside = new THREE.Group();
  g.add(inside);

  const plaster = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [118, 102, 76], 11, 43), { repeat: [3, 1] }), roughness: 1 });
  const wood = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [44, 30, 18], 14, 61), { repeat: [1, 3] }), roughness: .85 });
  const floorIn = new THREE.Mesh(new THREE.PlaneGeometry(9, 9.5),
    new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(512, [70, 56, 38], 12, 47), { repeat: [4, 4] }), roughness: 1 }));
  floorIn.rotation.x = -Math.PI / 2;
  floorIn.position.set(0, 0, -30.5);
  inside.add(floorIn);
  const ceilIn = new THREE.Mesh(new THREE.PlaneGeometry(9, 9.5), new THREE.MeshStandardMaterial({ color: 0x120c07, roughness: 1 }));
  ceilIn.rotation.x = Math.PI / 2;
  ceilIn.position.set(0, 3.1, -30.5);
  inside.add(ceilIn);
  // walls: back (behind the arriving camera), left, right, far (the Matha wall)
  const mkWall = (w, x, z, ry) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.1), plaster);
    wall.position.set(x, 1.55, z);
    wall.rotation.y = ry;
    inside.add(wall);
    return wall;
  };
  mkWall(9, 0, -25.75, Math.PI);
  mkWall(9.5, -4.5, -30.5, Math.PI / 2);
  mkWall(9.5, 4.5, -30.5, -Math.PI / 2);
  mkWall(9, 0, -35.25, 0);
  // timber pillars + beam, the register the site already speaks
  for (const px of [-2.2, 2.2]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(.3, 3.1, .3), wood);
    p.position.set(px, 1.55, -30.4);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(.6, .14, .6), wood);
    cap.position.set(px, 3.02, -30.4);
    inside.add(p, cap);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(5.2, .2, .28), wood);
  beam.position.set(0, 2.98, -30.4);
  inside.add(beam);

  /* ---- the akṣarābhyāsa arrangement ---- */
  const ceremony = new THREE.Group();
  inside.add(ceremony);
  const dais = new THREE.Mesh(new THREE.BoxGeometry(1.5, .14, 1.05), wood);
  dais.position.set(0, .07, -30.5);
  ceremony.add(dais);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(1.06, .07, .78),
    new THREE.MeshStandardMaterial({ color: 0x513920, roughness: .9 }));
  tray.position.set(0, .175, -30.5);
  ceremony.add(tray);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(.96, .68),
    new THREE.MeshStandardMaterial({ map: tex(sandOmCanvas()), roughness: 1 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, .215, -30.5);
  ceremony.add(sand);
  // turmeric, kumkum, mantrākṣata, flowers — small and quiet. They live in
  // their own group: the education pass puts the decorations away while the
  // dais and the written sand remain part of the room.
  const decor = new THREE.Group();
  ceremony.add(decor);
  const bowl = (color, x, z, r = .07) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(r, r * .74, .06, 12),
      new THREE.MeshStandardMaterial({ color: 0x6a4a26, roughness: .8 }));
    cup.position.set(x, .175, z);
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(r * .82, r * .82, .022, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    fill.position.set(x, .208, z);
    decor.add(cup, fill);
  };
  bowl(0xc79b1c, -.58, -30.14);            // turmeric
  bowl(0xa32410, -.40, -30.02);            // kumkum
  const akshata = new THREE.Mesh(new THREE.ConeGeometry(.09, .07, 10),
    new THREE.MeshStandardMaterial({ color: 0xd9c9a4, roughness: 1 }));
  akshata.position.set(.42, .245, -30.06);
  decor.add(akshata);
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xc06a14, roughness: .9 });
  const flowerMatW = new THREE.MeshStandardMaterial({ color: 0xcfc4ae, roughness: .9 });
  for (let i = 0; i < 10; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(.018, 7, 5), i % 3 ? flowerMat : flowerMatW);
    f.scale.y = .7;
    f.position.set(.57 + rnd() * .15, .215, -30.82 + rnd() * .64);   // on the dais wood, beside the sand
    decor.add(f);
  }
  // two woven mats: the father's and the child's seats
  const matGeo = new THREE.PlaneGeometry(.78, 1.05);
  const matFather = new THREE.Mesh(matGeo, new THREE.MeshStandardMaterial({ map: tex(matCanvas(5, true)), roughness: 1, transparent: true }));
  matFather.rotation.x = -Math.PI / 2;
  matFather.position.set(-.02, .012, -31.45);
  inside.add(matFather);
  const matChild = new THREE.Mesh(matGeo, new THREE.MeshStandardMaterial({ map: tex(matCanvas(9, false)), roughness: 1, transparent: true }));
  matChild.rotation.x = -Math.PI / 2;
  matChild.scale.setScalar(.78);
  matChild.position.set(.04, .012, -29.45);
  inside.add(matChild);
  // the ceremonial lamp
  const omFlame = flame(.85);
  omFlame.position.set(-.62, .34, -30.68);
  inside.add(omFlame);
  const omLight = new THREE.PointLight(0xff9a45, 7, 7, 2);
  omLight.position.set(-.6, .8, -30.6);
  inside.add(omLight);

  /* ---- study: veena, desk, manuscripts (parts 3–5) ---- */
  const veena = new THREE.Group();
  const vwood = new THREE.MeshStandardMaterial({ color: 0x3a2413, roughness: .7 });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.045, .055, 1.7, 8), vwood);
  neck.rotation.z = Math.PI / 2; veena.add(neck);
  const gourd = new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 10), vwood);
  gourd.position.x = -.85; gourd.scale.y = .8; veena.add(gourd);
  const gourd2 = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 8), vwood);
  gourd2.position.x = .8; veena.add(gourd2);
  veena.position.set(-3.15, .6, -31.25);
  veena.rotation.set(0, .55, 1.1);
  inside.add(veena);

  const desk = new THREE.Group();
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.3, .07, .7), wood);
  deskTop.position.y = .4; desk.add(deskTop);
  for (const [dx, dz] of [[-.52, -.26], [.52, -.26], [-.52, .26], [.52, .26]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.08, .4, .08), wood);
    leg.position.set(dx, .2, dz); desk.add(leg);
  }
  desk.position.set(-2.5, 0, -31.9);
  desk.rotation.y = .5;
  inside.add(desk);

  /* palm-leaf bundles, one instanced set: a handful at first, stacks for
     study, rows for students, ordered shelves for Kumbhakonam */
  const leafMat = new THREE.MeshStandardMaterial({ map: tex(palmLeafCanvas(7)), roughness: .8 });
  const bundleGeo = new THREE.BoxGeometry(.66, .08, .15);
  const MS_N = ctx.isMobile ? 56 : 84;
  const bundles = new THREE.InstancedMesh(bundleGeo, leafMat, MS_N);
  bundles.frustumCulled = false;
  inside.add(bundles);
  const placements = [];
  // 0-2: on and beside the desk (faint from the start)
  placements.push([-2.5, .47, -31.9, .5], [-2.36, .55, -31.98, .62], [-2.9, .05, -31.6, .3]);
  // 3-23: study stacks along the left wall
  for (let i = 3; i < 24; i++) {
    placements.push([-4.1 + rnd() * .5, .05 + (i % 5) * .095, -33.4 + rnd() * 3.4, (rnd() - .5) * .5 + Math.PI / 2]);
  }
  // 24-43: students' manuscripts — small tidy stacks beyond the dais
  for (let i = 24; i < 44; i++) {
    const k = i - 24;
    const col = k % 5, row = Math.floor(k / 5) % 2, lvl = Math.floor(k / 10);
    placements.push([-.85 + col * .52 + (rnd() - .5) * .08, .045 + lvl * .105, -31.9 - row * .5, (rnd() - .5) * .5, .8]);
  }
  // 44+: the ordered collection along the right wall — Kumbhakonam
  for (let i = 44; i < MS_N; i++) {
    const k = i - 44;
    placements.push([3.85, .40 + Math.floor(k / 10) * .5, -33.9 + (k % 10) * .43, (rnd() - .5) * .14, 1.15]);
  }
  const _m = new THREE.Matrix4(), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  let msCount = -1;
  function setBundles(n) {
    n = Math.min(n, MS_N);
    if (n === msCount) return;
    msCount = n;
    for (let i = 0; i < n; i++) {
      const p = placements[i];
      _e.set(0, p[3], 0);
      _q.setFromEuler(_e);
      const k = p[4] || 1;
      _m.compose(_p.set(p[0], p[1], p[2]), _q, _s.set(k, k * 1.4, k));
      bundles.setMatrixAt(i, _m);
    }
    bundles.count = n;
    bundles.instanceMatrix.needsUpdate = true;
  }
  setBundles(3);
  // shelf planks for the ordered wall
  const shelves = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(.55, .06, 4.6), wood);
    sh.position.set(3.78, .3 + i * .5, -31.9);
    shelves.add(sh);
  }
  shelves.visible = false;
  inside.add(shelves);
  const shelfLight = new THREE.PointLight(0xf0b060, 0, 7, 2);
  shelfLight.position.set(3.1, 1.5, -31.8);
  inside.add(shelfLight);

  /* ---- household (part 4) ---- */
  const household = new THREE.Group();
  household.visible = false;
  inside.add(household);
  const lamp2 = flame(.8);
  lamp2.position.set(2.0, .78, -31.7);
  household.add(lamp2);
  const light2 = new THREE.PointLight(0xff9040, 0, 9, 2);
  light2.position.set(2.0, 1.1, -31.6);
  household.add(light2);
  const lampStand = new THREE.Mesh(new THREE.CylinderGeometry(.035, .09, .72, 8),
    new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: .7 }));
  lampStand.position.set(2.0, .36, -31.7);
  household.add(lampStand);
  // a single water vessel
  const potPts = [];
  for (let s = 0; s <= 8; s++) {
    const u = s / 8;
    potPts.push(new THREE.Vector2(.02 + Math.sin(u * 2.6) * .21 + (u > .8 ? (u - .8) * .22 : 0), u * .42));
  }
  const pot = new THREE.Mesh(new THREE.LatheGeometry(potPts, 14),
    new THREE.MeshStandardMaterial({ color: 0x6b3a20, roughness: .85 }));
  pot.position.set(2.85, 0, -30.2);
  household.add(pot);
  // the child's sleeping place: a small mat and folded cloth, nothing more
  const sleepMat = new THREE.Mesh(new THREE.PlaneGeometry(.62, 1.15),
    new THREE.MeshStandardMaterial({ map: tex(matCanvas(13, false)), roughness: 1 }));
  sleepMat.rotation.x = -Math.PI / 2;
  sleepMat.rotation.z = .3;
  sleepMat.position.set(2.5, .012, -29.1);
  household.add(sleepMat);
  const foldCloth = new THREE.Mesh(new THREE.BoxGeometry(.4, .09, .26),
    new THREE.MeshStandardMaterial({ color: 0x8a7350, roughness: 1 }));
  foldCloth.position.set(2.6, .045, -29.7);
  foldCloth.rotation.y = .3;
  household.add(foldCloth);

  /* ---- Kumbhakonam: the Matha doorway in the far wall (part 5) ---- */
  const matha = new THREE.Group();
  matha.visible = false;
  inside.add(matha);
  for (const sx of [-1, 1]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(.24, 2.5, .24), wood);
    jamb.position.set(sx * .78, 1.25, -35.1);
    matha.add(jamb);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.0, .26, .3), wood);
  lintel.position.set(0, 2.6, -35.1);
  matha.add(lintel);
  const mathaGlowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.34, 2.44),
    new THREE.MeshBasicMaterial({
      map: glowTexture('rgba(255,190,110,.9)', 'rgba(60,30,8,0)'),
      transparent: true, opacity: 0, depthWrite: false,
    }));
  mathaGlowPlane.position.set(0, 1.3, -35.2);
  matha.add(mathaGlowPlane);
  const mathaLamps = [];
  for (const sx of [-1.35, 1.35]) {
    const fl = flame(.8);
    fl.position.set(sx, 1.06, -34.7);
    matha.add(fl);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.035, .09, .95, 8), lampStand.material);
    st.position.set(sx, .48, -34.7);
    matha.add(st);
    mathaLamps.push(fl);
  }
  const mathaLight = new THREE.PointLight(0xffb060, 0, 9, 2);
  mathaLight.position.set(0, 1.7, -34.4);
  matha.add(mathaLight);

  /* interior base light */
  const hemiIn = new THREE.HemisphereLight(0x6b563c, 0x17100a, .8);
  inside.add(hemiIn);
  // the study window: a soft daylight shaft over the desk (parts 3–5)
  const shaft = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 4.6),
    new THREE.MeshBasicMaterial({
      map: tex((() => {
        const [c, x] = canvas(128, 256);
        const grd = x.createLinearGradient(0, 0, 128, 0);
        grd.addColorStop(0, 'rgba(160,132,90,0)'); grd.addColorStop(.5, 'rgba(160,132,90,.5)'); grd.addColorStop(1, 'rgba(160,132,90,0)');
        x.fillStyle = grd; x.fillRect(0, 0, 128, 256);
        const g2 = x.createLinearGradient(0, 0, 0, 256);
        g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,.9)');
        x.globalCompositeOperation = 'destination-out';
        x.fillStyle = g2; x.fillRect(0, 0, 128, 256);
        return c;
      })()), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }));
  shaft.position.set(-2.8, 1.9, -31.4);
  shaft.rotation.set(0, .7, -.55);
  inside.add(shaft);
  const studyLight = new THREE.DirectionalLight(0xb99a68, 0);
  studyLight.position.set(-5, 6, -28);
  studyLight.target.position.set(-2.5, 0, -32);
  inside.add(studyLight, studyLight.target);
  // Kumbhakonam's cooler structural counterweight
  const coolIn = new THREE.DirectionalLight(0x44536a, 0);
  coolIn.position.set(4, 7, -26);
  inside.add(coolIn);

  /* dust motes in the lamp light */
  const dustN = ctx.isMobile ? 40 : 90;
  const dpos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dpos[i * 3] = (rnd() - .5) * 7;
    dpos[i * 3 + 1] = .2 + rnd() * 2.4;
    dpos[i * 3 + 2] = -26.5 - rnd() * 8;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xc0a878, size: .028, transparent: true, opacity: .35,
    map: glowTexture('rgba(220,190,140,1)', 'rgba(220,190,140,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  inside.add(dust);

  /* ================= the camera =================
     Two authored tracks with one cut between them, hidden while the dark
     doorway fills the frame. The path only ever moves forward. */
  const camOut = camTrack([
    /* the far side of the match cut: the Brindavana's dark stone has become
       the darkness of this doorway. The camera pulls back — lamp first,
       then the threshold, the roof, and the Bhuvanagiri morning. */
    { u: 0, pos: V3(0, 1.25, .96), look: V3(0, 1.22, .4), fov: 44 },        // inside the real opening, the dark entry filling the frame
    { u: .38, pos: V3(2.1, 2.3, 15.6), look: V3(-.6, 2.05, .8), fov: 40 },  // one unbroken retreat, settling into a gentle three-quarter view
    { u: .66, pos: V3(2.0, 2.26, 15.1), look: V3(-.55, 2.05, .8), fov: 40 },  // the cover hold: a drift of centimetres
    { u: 1, pos: V3(0, 1.25, .96), look: V3(0, 1.22, .4), fov: 43 },        // one slow descent to the threshold — now we enter
  ]);
  const camIn = camTrack([
    { u: 0, pos: V3(0, 1.72, -26.1), look: V3(0, 1.05, -30.4), fov: 44 },
    { u: .076, pos: V3(0, 1.52, -27.5), look: V3(0, .55, -30.3), fov: 42 },  // moving toward the written surface
    { u: .10, pos: V3(0, 1.34, -28.6), look: V3(0, .32, -30.4), fov: 40 },   // above the ॐ —
    { u: .32, pos: V3(0, 1.34, -28.6), look: V3(0, .32, -30.4), fov: 40 },   //   held through the question + answer
    { u: .43, pos: V3(1.1, 1.5, -27.9), look: V3(-1.6, .8, -31.7), fov: 44 },  // the pull back reveals the study
    { u: .50, pos: V3(1.15, 1.5, -27.95), look: V3(-1.65, .8, -31.7), fov: 44 },
    { u: .55, pos: V3(-.95, 1.55, -27.6), look: V3(1.6, .8, -31.6), fov: 44 }, // across to the household
    { u: .68, pos: V3(-1.05, 1.55, -27.7), look: V3(1.65, .8, -31.6), fov: 44 },
    { u: 1, pos: V3(0, 1.58, -29.8), look: V3(0, 1.3, -34.8), fov: 42 },   // toward the Matha doorway — stop before it
  ]);
  const chSpan = [(T1 - T0), (T2 - T1), (T3 - T2)].map(s => s / (T3 - T0));

  return {
    group: g,
    ready,
    setVisible(v) { g.visible = v; },
    cam(chapter, u) {
      const v = chapter === 1 ? u * chSpan[0]
        : chapter === 2 ? chSpan[0] + u * chSpan[1]
        : chSpan[0] + chSpan[1] + u * chSpan[2];
      return v < V_DOOR ? camOut(v / V_DOOR) : camIn((v - V_DOOR) / (1 - V_DOOR));
    },
    update(time, t) {
      const v = tToV(t);
      const out = v < V_DOOR + .02;
      const inn = v > V_DOOR - .05;
      outside.visible = out;
      inside.visible = inn;

      if (out) {
        /* the door stands closed while the exterior is read; it swings
           inward as the visitor reaches the threshold, and the lamp's glow
           follows the opening — nothing inside shows past a closed door */
        const doorOpen = smooth(remap(v, .186, .222));
        doorPivot.rotation.y = doorOpen * 1.92;
        doorFlame.userData.flicker(time);
        doorFlame.scale.setScalar(Math.max(.001, doorOpen));
        doorLight.intensity = 2.3 * doorOpen * (.9 + Math.sin(time * 8.2) * .1);
        spillNear.material.opacity = .3 * doorOpen;
        spillFar.material.opacity = .22 * doorOpen;
        haze.material.opacity = .3 * (1 - smooth(remap(v, .14, .22)));
        if (!ctx.reduced) {
          for (let i = 0; i < wind.length; i++) {
            const w = wind[i];
            const k = Math.sin(time * w.sp + w.p) * w.a;
            if (w.x) w.m.rotation.x = w.r + k; else w.m.rotation.z = w.r + k;
          }
        }
      }

      if (inn) {
        /* the akṣarābhyāsa: light narrows onto the surface for the question,
           then breathes open again for the answer */
        const qDim = win(t, .136, .140, .149, .154);
        hemiIn.intensity = .8 * (1 - qDim * .62);
        omFlame.userData.flicker(time);
        omLight.intensity = (7 + qDim * 3.5) * (.92 + Math.sin(time * 8.6) * .07);

        /* education: the ceremony is put away, the father's seat stays empty,
           the light becomes a study light */
        const study = smooth(remap(t, .186, .205));
        decor.visible = study < .4;                      // the decorations are put away
        matFather.material.opacity = 1 - study;          // the father's seat, left empty
        matFather.visible = study < .98;
        shaft.material.opacity = .5 * study * (1 - smooth(remap(t, .27, .29)) * .5);
        studyLight.intensity = 1.1 * study;

        /* manuscripts multiply through the parts */
        const nStudy = smooth(remap(t, .186, .21));
        const nStudents = smooth(remap(t, .214, .232));
        const nOrder = smooth(remap(t, .236, .262));
        setBundles(Math.floor(3 + nStudy * 21 + nStudents * 20 + nOrder * (MS_N - 44)));
        shelves.visible = nOrder > .02;

        /* household */
        const home = smooth(remap(t, .204, .218));
        household.visible = home > .02;
        lamp2.userData.flicker(time + 2.2);
        lamp2.scale.setScalar(Math.max(.001, home * .8));
        light2.intensity = 9 * home * (.9 + Math.sin(time * 7.4 + 1) * .08);

        /* Kumbhakonam: ordered, brighter, and the Matha doorway opens */
        const kmb = smooth(remap(t, .232, .252));
        matha.visible = kmb > .02;
        shelfLight.intensity = 6 * kmb;
        coolIn.intensity = .8 * kmb;
        hemiIn.intensity += .35 * kmb;
        for (let i = 0; i < mathaLamps.length; i++) {
          mathaLamps[i].userData.flicker(time + i * 2.7);
          mathaLamps[i].scale.setScalar(Math.max(.001, kmb * .8));
        }
        const arrive = smooth(remap(t, .262, .292));
        mathaLight.intensity = 9 * kmb * (.9 + arrive * .6);
        mathaGlowPlane.material.opacity = .55 * kmb * (.6 + arrive * .4);

        if (!ctx.reduced) {
          const p = dust.geometry.attributes.position;
          for (let i = 0; i < dustN; i++) {
            p.setY(i, .2 + ((p.getY(i) - .2 + .0005) % 2.4));
          }
          p.needsUpdate = true;
        }
      }
    },
  };
}
