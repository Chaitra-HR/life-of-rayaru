// ANTARANGA · scene 06 — Manchale. A wide, dry, sacred landscape.
// Also carries Anugraha's third beat: the petal lands beside a dead branch
// at the edge of this same earth, so grace flows straight into the land.
import * as THREE from 'three';
import { canvas, stoneCanvas, tex, fbm, flame, glowSprite, glowTexture, mulberry, lerp, clamp01, remap, smooth, win, V3 } from '../util.js';

export const MANCHALE_Y = 2000;

/* terrain height — shared by placement and geometry */
function height(x, z) {
  let h = fbm(x * .016, z * .016, 4) * 4.2 + fbm(x * .05, z * .05, 3) * 1.1;
  // fall away to the river (far, at z ≈ -70)
  const river = smooth(clamp01((z + 40) / -34));
  h = lerp(h, -1.6, river * .9);
  // gentle rise in the foreground
  h += clamp01((z - 6) / 40) * 1.4;
  return h;
}

export function createManchaleStage(ctx) {
  const g = new THREE.Group();
  g.position.y = MANCHALE_Y;
  g.visible = false;
  const rnd = mulberry(606);

  /* sky — warm dry dusk */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(230, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.);} `,
      fragmentShader: `
        varying vec3 vP;
        void main(){
          float h = normalize(vP).y;
          vec3 zen = vec3(0.10,0.11,0.13);
          vec3 hor = vec3(0.56,0.38,0.20);
          float f = pow(clamp(1.0-h,0.,1.), 2.2);
          vec3 col = mix(zen, hor, f);
          float pocket = exp(-pow((atan(vP.x,-vP.z)-0.35)*1.8,2.0)) * pow(clamp(1.0-h,0.,1.),2.4);
          col += vec3(0.5,0.26,0.09)*pocket;
          gl_FragColor = vec4(col,1.0);
        }`,
    })
  );
  g.add(sky);

  /* terrain */
  const seg = ctx.isMobile ? 96 : 150;
  const terrGeo = new THREE.PlaneGeometry(300, 300, seg, seg);
  terrGeo.rotateX(-Math.PI / 2);
  {
    const pos = terrGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cDry = new THREE.Color(0x96784e);
    const cRock = new THREE.Color(0x6a5f4c);
    const cGreen = new THREE.Color(0x5e6838);
    const cSand = new THREE.Color(0xa8895c);
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = height(x, z);
      pos.setY(i, h);
      const n = fbm(x * .03 + 9, z * .03, 3);
      col.copy(cDry).lerp(cRock, clamp01(h * .22 + n * .5));
      // restrained green near the water line
      const nearRiver = win(z, -70, -58, -46, -30);
      col.lerp(cGreen, nearRiver * clamp01(.4 + n) * .55);
      col.lerp(cSand, clamp01(-h * .3) * .4);
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    terrGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrGeo.computeVertexNormals();
  }
  const terrain = new THREE.Mesh(terrGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  g.add(terrain);

  /* the river, far below. At this distance the Tungabhadra is the sky's
     reflection — a painted gleam, not a shader pass (the live water shader
     without its reflection texture reads as a black band against the dusk). */
  const [rvCv, rvG] = canvas(64, 256);
  {
    const grd = rvG.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#b8742f');    // far edge: the horizon's glow
    grd.addColorStop(.4, '#7a4c22');
    grd.addColorStop(1, '#241a10');    // near bank: the land's shadow
    rvG.fillStyle = grd; rvG.fillRect(0, 0, 64, 256);
    const rr = mulberry(64);
    rvG.globalAlpha = .10;
    for (let i = 0; i < 130; i++) {   // calm broken streaks
      rvG.fillStyle = rr() > .5 ? '#d89a50' : '#3a2414';
      rvG.fillRect(rr() * 64, rr() * 256, 3 + rr() * 14, 1);
    }
  }
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 80),
    new THREE.MeshBasicMaterial({ map: tex(rvCv) })
  );
  river.rotation.x = -Math.PI / 2;     // canvas top (bright) lands on the far edge
  river.position.set(0, -1.35, -86);
  g.add(river);

  /* boulders — Tungabhadra's rounded granite */
  const rockMat = new THREE.MeshStandardMaterial({ map: tex(stoneCanvas(256, [64, 56, 44], 16, 21)), roughness: 1 });
  const rockGeoA = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < (ctx.isMobile ? 16 : 30); i++) {
    const r = new THREE.Mesh(rockGeoA, rockMat);
    const x = (rnd() - .5) * 200, z = 20 - rnd() * 120;
    if (Math.abs(x) < 6 && Math.abs(z + 18) < 10) continue;
    r.position.set(x, height(x, z) + .2, z);
    r.scale.set(1 + rnd() * 4, .7 + rnd() * 2.2, 1 + rnd() * 3);
    r.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    g.add(r);
  }

  /* the significant rock */
  const theRock = new THREE.Group();
  const rockBase = new THREE.Mesh(rockGeoA, rockMat);
  rockBase.scale.set(4.6, 2.6, 3.8);
  rockBase.rotation.set(.3, .8, .1);
  theRock.add(rockBase);
  const rockTop = new THREE.Mesh(rockGeoA, rockMat);
  rockTop.scale.set(2.8, 1.5, 2.4);
  rockTop.position.set(.6, 2.2, -.4);
  rockTop.rotation.set(.7, 1.9, .4);
  theRock.add(rockTop);
  const ROCK_POS = new THREE.Vector3(9, height(9, -20) + 1.6, -20);
  theRock.position.copy(ROCK_POS);
  g.add(theRock);

  /* dry grass tufts */
  const tuftN = ctx.isMobile ? 60 : 140;
  const tuftGeo = new THREE.ConeGeometry(.05, .5, 4);
  const tuftMat = new THREE.MeshStandardMaterial({ color: 0x5c5530, roughness: 1 });
  const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, tuftN);
  {
    const m = new THREE.Matrix4();
    for (let i = 0; i < tuftN; i++) {
      const x = (rnd() - .5) * 140, z = 30 - rnd() * 100;
      m.makeRotationZ((rnd() - .5) * .5);
      m.setPosition(x, height(x, z) + .2, z);
      tufts.setMatrixAt(i, m);
    }
  }
  g.add(tufts);

  /* light: late warm sun (frontal-left, long light) + dusty hemisphere */
  const sun = new THREE.DirectionalLight(0xdd9c58, 2.1);
  sun.position.set(45, 38, 35);
  g.add(sun);
  const backGlow = new THREE.DirectionalLight(0xb56a2e, .55);
  backGlow.position.set(-10, 12, -70);
  g.add(backGlow);
  const hemi = new THREE.HemisphereLight(0x8a6c48, 0x342818, 1.05);
  g.add(hemi);

  /* ---------- Anugraha beat C · the branch ---------- */
  const BR = new THREE.Vector3(-4, height(-4, 26), 26);
  const branchGroup = new THREE.Group();
  branchGroup.position.copy(BR);
  branchGroup.visible = false;   // the anugraha branch beat is not part of
                                 // the Rayara Antaranga narrative order
  g.add(branchGroup);
  const deadMat = new THREE.MeshStandardMaterial({ color: 0x3a2c1c, roughness: 1 });
  // a bent dead branch rising from the earth
  const segs = [
    [V3(0, 0, 0), V3(.12, .5, .05), .045],
    [V3(.12, .5, .05), V3(.4, .95, -.08), .035],
    [V3(.4, .95, -.08), V3(.75, 1.2, .06), .025],
    [V3(.12, .5, .05), V3(-.18, .9, .12), .028],
  ];
  const tips = [];
  for (const [a, b, r] of segs) {
    const dir = b.clone().sub(a);
    const len = dir.length();
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r * .7, r, len, 7), deadMat);
    cyl.position.copy(a).addScaledVector(dir, .5);
    cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    branchGroup.add(cyl);
    tips.push(b);
  }
  // the petal that lands
  const petal = new THREE.Mesh(
    new THREE.CircleGeometry(.07, 8),
    new THREE.MeshBasicMaterial({ color: 0xb35c1e, side: THREE.DoubleSide, transparent: true })
  );
  branchGroup.add(petal);
  // one bud, then one leaf, then another — observed, not animated fantasy
  const budMat = new THREE.MeshStandardMaterial({ color: 0x66702e, roughness: .85 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x50602c, roughness: .9, side: THREE.DoubleSide });
  const bud = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), budMat);
  bud.position.copy(tips[2]);
  bud.scale.setScalar(0);
  branchGroup.add(bud);
  const leafGeo = new THREE.CircleGeometry(.09, 8);
  leafGeo.scale(1, 1.8, 1);
  const leaf1 = new THREE.Mesh(leafGeo, leafMat);
  leaf1.position.copy(tips[2]).add(V3(.05, .02, 0));
  leaf1.rotation.set(-.6, .4, .8);
  leaf1.scale.setScalar(0);
  branchGroup.add(leaf1);
  const leaf2 = new THREE.Mesh(leafGeo, leafMat);
  leaf2.position.copy(tips[3]).add(V3(-.03, .03, .02));
  leaf2.rotation.set(-.4, -.7, -.6);
  leaf2.scale.setScalar(0);
  branchGroup.add(leaf2);

  /* ---------- yajna memory at the rock ---------- */
  const memory = new THREE.Group();
  memory.position.copy(ROCK_POS).add(V3(-1.2, -1.2, 2.6));
  memory.visible = false;
  g.add(memory);
  // ring of fire stones
  const fsGeo = new THREE.DodecahedronGeometry(.14, 0);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const fs = new THREE.Mesh(fsGeo, rockMat);
    fs.position.set(Math.cos(a) * .5, .06, Math.sin(a) * .5);
    memory.add(fs);
  }
  const yFlame = flame(1.6);
  yFlame.position.y = .3;
  memory.add(yFlame);
  const yLight = new THREE.PointLight(0xff8a35, 0, 16, 2);
  yLight.position.y = 1;
  memory.add(yLight);
  // smoke
  const smoke = [];
  for (let i = 0; i < 6; i++) {
    const s = glowSprite(0x6a645a, 1, .05);
    memory.add(s); smoke.push(s);
  }
  // ephemeral seated figures — symbolic, barely there
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xc09060, transparent: true, opacity: 0, depthWrite: false });
  const ghosts = [];
  for (let i = 0; i < 2; i++) {
    const f = new THREE.Group();
    const pts = [];
    for (let s = 0; s <= 6; s++) pts.push(new THREE.Vector2(.34 * (1 - (s / 6) * .5), s / 6 * .72));
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 10), ghostMat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), ghostMat);
    head.position.y = .84;
    f.add(body, head);
    const a = i === 0 ? 2.4 : .7;
    f.position.set(Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25);
    memory.add(f); ghosts.push(f);
  }

  /* embers */
  const emberN = 24;
  const epos = new Float32Array(emberN * 3);
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute('position', new THREE.BufferAttribute(epos, 3));
  const embers = new THREE.Points(eGeo, new THREE.PointsMaterial({
    color: 0xff7a30, size: .05, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  memory.add(embers);

  /* dust haze on the wind */
  const hazeN = ctx.isMobile ? 40 : 90;
  const hpos = new Float32Array(hazeN * 3);
  for (let i = 0; i < hazeN; i++) {
    const x = (rnd() - .5) * 120, z = 30 - rnd() * 90;
    hpos[i * 3] = x; hpos[i * 3 + 1] = height(x, z) + .5 + rnd() * 4; hpos[i * 3 + 2] = z;
  }
  const hGeo = new THREE.BufferGeometry();
  hGeo.setAttribute('position', new THREE.BufferAttribute(hpos, 3));
  const haze = new THREE.Points(hGeo, new THREE.PointsMaterial({
    color: 0x9a7d52, size: .1, transparent: true, opacity: .22, map: glowTexture('rgba(200,170,120,1)', 'rgba(200,170,120,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  g.add(haze);

  /* cameras */
  // arrival out of the map: the abstract space has just resolved into real
  // terrain — begin high and wide, then descend into the landscape
  const arrive = { pos: V3(-4, BR.y + 12, 58), look: V3(0, 1.2, -40), fov: 54 };
  // scene 08 travel: descend into the land, sweep it, approach the site
  const cam06 = (u) => {
    if (u < .34) {
      const v = smooth(remap(u, 0, .34));
      return {
        pos: V3(lerp(arrive.pos.x, 2, v), lerp(arrive.pos.y, BR.y + 7.5, v), lerp(arrive.pos.z, 44, v)),
        look: V3(lerp(arrive.look.x, 0, v), lerp(arrive.look.y, 2, v), lerp(arrive.look.z, -50, v)),
        fov: lerp(arrive.fov, 52, v),
      };
    }
    if (u < .72) {
      const v = smooth(remap(u, .34, .72));
      return {
        pos: V3(lerp(2, ROCK_POS.x - 7, v), lerp(BR.y + 7.5, ROCK_POS.y + 1.6, v), lerp(44, ROCK_POS.z + 12, v)),
        look: V3(lerp(0, ROCK_POS.x - 1, v), lerp(2, ROCK_POS.y + .6, v), lerp(-50, ROCK_POS.z + 2, v)),
        fov: lerp(52, 44, v),
      };
    }
    const v = smooth(remap(u, .72, 1));
    return {
      pos: V3(lerp(ROCK_POS.x - 7, ROCK_POS.x - 2.2, v), lerp(ROCK_POS.y + 1.6, ROCK_POS.y + .4, v), lerp(ROCK_POS.z + 12, ROCK_POS.z + 3.2, v)),
      look: V3(ROCK_POS.x + lerp(-1, .4, v), ROCK_POS.y + lerp(.6, 0, v), ROCK_POS.z + lerp(2, .5, v)),
      fov: lerp(44, 38, v),
    };
  };

  return {
    group: g,
    setVisible(v) { g.visible = v; },
    cam06,
    update(time, globalT, uBranch, u06) {
      /* branch growth — slow, observed */
      const pu = smooth(clamp01(uBranch * 2.6));       // petal falls early
      petal.position.set(
        lerp(1.6, .28, pu),
        lerp(2.6, .02, easeFall(pu)),
        lerp(1.2, .12, pu)
      );
      petal.rotation.set(pu * 5 - Math.PI / 2 * pu, pu * 3, 0);
      bud.scale.setScalar(smooth(remap(uBranch, .38, .58)) * 1);
      leaf1.scale.setScalar(smooth(remap(uBranch, .55, .78)));
      leaf2.scale.setScalar(smooth(remap(uBranch, .72, .95)));

      /* yajna memory window inside scene 06 */
      const mem = win(u06, .52, .62, .78, .88);
      memory.visible = mem > .01;
      if (memory.visible) {
        yFlame.userData.flicker(time);
        yLight.intensity = mem * 14;
        for (let i = 0; i < smoke.length; i++) {
          const s = smoke[i];
          const ph = (time * .12 + i * .17) % 1;
          s.position.set(Math.sin(time * .5 + i) * .3 * ph, .5 + ph * 4.2, 0);
          s.material.opacity = .06 * mem * (1 - ph);
          s.scale.setScalar(.6 + ph * 2.6);
        }
        ghostMat.opacity = mem * .14;
        const ep = embers.geometry.attributes.position;
        for (let i = 0; i < emberN; i++) {
          const ph = (time * .3 + i * .29) % 1;
          ep.setXYZ(i, Math.sin(i * 9 + time) * .3 * ph, .3 + ph * 2.6, Math.cos(i * 7) * .3 * ph);
        }
        ep.needsUpdate = true;
        embers.material.opacity = mem * .8;
      }
      // the sky and sun answer the memory — a shift in the air
      sun.intensity = 2.1 - mem * 1.3;
      hemi.intensity = 1.05 - mem * .45;

      // wind through the haze
      if (!ctx.reduced) {
        haze.position.x = Math.sin(time * .05) * 2;
      }
    },
  };
}

function easeFall(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }
