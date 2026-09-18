// ANTARANGA · the objects: the site's things shown alone, the way a product
// is shown. Each stands on a flat ground of one of the six colours, lit like
// a studio (one key, one fill, a little sky), and turns under the visitor's
// scroll. The stage holds every object far apart on one floor; the camera
// orbits whichever is selected.
import * as THREE from 'three';
import { deepaLamp, flame, canvas, tex, mulberry, clamp01, lerp } from '../util.js';
import { buildBrindavana } from './brindavana.js';
import { tallDeepa } from './deepa.js';
import { buildRehal } from './parimala.js';
import { sandTray } from './props.js';
import { shaligramaCanvas } from './antaranga.js';
import { createTerrain } from './journey/terrain.js';
import { createWaters } from './journey/rivers.js';
import { createRoute } from './journey/route.js';
import { WORKS } from '../works.js';

export const OBJECTS_Y = 3600;

/* the open volume on the rehal: the Nyaya Sudha Parimala, with the binding
   the reading stand expects (works.js carries only the editorial record) */
const VOLUME = { ...WORKS[0], cloth: 0x6b2f1c, spine: 0x3a2113, plain: WORKS[0].title, image: 'assets/works/' + WORKS[0].id };

/* the shaligrama (antaranga.js), alone */
function shaligrama() {
  const geo = new THREE.SphereGeometry(.5, 112, 72);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
    const d = 1 + Math.sin(v.x * 8.2) * .028 + Math.sin(v.y * 7.1 + 2) * .036 + Math.sin(v.z * 9.3 + 4) * .028 + Math.sin((v.x + v.y) * 15) * .008;
    v.multiplyScalar(d); p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex(shaligramaCanvas()), roughness: .34, metalness: .08 }));
  m.position.y = .5;
  return m;
}

/* South India as a miniature: the journey's terrain, rivers and the worn
   route, scaled to a tabletop and standing on a thin slab */
function miniature(ctx) {
  const g = new THREE.Group();
  const land = new THREE.Group();
  const terrain = createTerrain(ctx); land.add(terrain.mesh);
  const waters = createWaters(ctx); land.add(waters.group);
  /* the journey's sea is a 760-unit horizon plane; here it is cut to the
     land's own footprint so the peninsula keeps its coast on the slab */
  if (waters.sea) { waters.sea.scale.set(78 / 760, 152 / 760, 1); waters.sea.position.set(4, waters.sea.position.y, -11); }
  const route = createRoute(ctx); land.add(route.mesh);
  route.setReveal(1); route.setFade(0);
  const S = .03;
  land.scale.setScalar(S);
  land.position.set(-4 * S, .115, 11 * S);      // LAND centre (4, 0, -11) to the origin; the sea just above the slab's top
  g.add(land);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(78 * S + .1, .09, 152 * S + .1),
    new THREE.MeshStandardMaterial({ color: 0x2b2a22, roughness: .75 }));
  slab.position.y = .045; g.add(slab);
  g.userData.update = (time) => { terrain.update(time); waters.update(time); };
  return g;
}

export function createObjectsStage(ctx) {
  const g = new THREE.Group();
  g.position.y = OBJECTS_Y;
  g.visible = false;

  /* the studio: a warm key from the upper left, a cool fill, a little sky */
  const key = new THREE.DirectionalLight(0xfff0d8, 3.4); key.position.set(-3, 5, 4); g.add(key);
  const fill = new THREE.DirectionalLight(0xc9d2e0, .7); fill.position.set(4, 2, -2); g.add(fill);
  /* a rim from behind, so a dark stone keeps its edge against a dark ground */
  const rim = new THREE.DirectionalLight(0xffe2b8, 2.2); rim.position.set(2, 4, -5); g.add(rim);
  g.add(new THREE.HemisphereLight(0xe8e0d0, 0x3a3428, .9));

  /* the objects, each on its own spot, far apart; [name, object, its
     visual centre height, orbit radius, camera height, fov] */
  const brnd = buildBrindavana({ withMala: true });
  /* the Brindavana is lit the way it is in the sanctum: by lamps at its
     feet, warm and low, which is what draws out the courses and the niche */
  for (const x of [-2.6, 2.6]) {
    const lamp = new THREE.PointLight(0xffb060, 30, 9, 2);
    lamp.position.set(x, 1.3, 2.6);
    brnd.group.add(lamp);
  }
  const items = [
    ['brindavana', brnd.group, 2.75, 16.5, 4.6, 30],
    ['deepa', tallDeepa(), .8, 3.4, 1.1, 30],
    ['rehal', buildRehal(VOLUME, 0).R, .2, 1.05, .42, 30],
    ['sand', sandTray(), .2, 2.2, 1.3, 30],
    ['shaligrama', shaligrama(), .5, 2.0, .8, 30],
    ['map', miniature(ctx), .4, 5.6, 5.2, 30],
  ];
  const slots = {};
  items.forEach(([name, obj, cy, r, h, fov], i) => {
    const x = i * 60;
    obj.position.x += x;
    g.add(obj);
    slots[name] = { obj, x, cy, r, h, fov };
  });
  /* a floor disc under each, so the ground reads as a surface where a
     shadow would fall (a soft contact darkening, no shadow maps) */
  const [dc, dg] = canvas(256, 256);
  const grd = dg.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,.55)'); grd.addColorStop(.5, 'rgba(0,0,0,.18)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  dg.fillStyle = grd; dg.fillRect(0, 0, 256, 256);
  const shadeTex = tex(dc);
  for (const name in slots) {
    const s = slots[name];
    const d = new THREE.Mesh(new THREE.PlaneGeometry(s.r * 1.1, s.r * 1.1), new THREE.MeshBasicMaterial({ map: shadeTex, transparent: true, depthWrite: false }));
    d.rotation.x = -Math.PI / 2; d.position.set(s.x, .002, 0); g.add(d);
  }

  let cur = 'brindavana';
  return {
    group: g,
    slots,
    setVisible(v) { g.visible = v; },
    select(name) { if (slots[name]) cur = name; },
    /* u 0..1: a slow turn around the object, a little from above */
    cam(u) {
      const s = slots[cur];
      const a = -.35 + u * 1.2;
      return { pos: new THREE.Vector3(s.x + Math.sin(a) * s.r, s.h, Math.cos(a) * s.r), look: new THREE.Vector3(s.x, s.cy, 0), fov: s.fov };
    },
    update(time) {
      for (const name in slots) {
        const o = slots[name].obj;
        if (o.userData.fls) for (const f of o.userData.fls) if (f.userData.flicker) f.userData.flicker(time);
        if (o.userData.update) o.userData.update(time);
      }
    },
  };
}
