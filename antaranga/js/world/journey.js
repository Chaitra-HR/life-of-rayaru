// RAYARA ANTARANGA · scene 07 — The Journey.
// The conceptual space of Tattvavāda settles into land, and the land is
// South India: coast, delta, dry basin, the Western Ghats, the Tungabhadra.
// The camera travels through it rather than over pins — Srirangam,
// Kumbakonam, Madurai, Udupi, Manchale — and by the last leg the map has
// stopped being a map and become the place itself.
//
// The chapter's interaction is unchanged: one scroll, one authored glide,
// the same deceleration into Manchale. Everything below is the world that
// glide now travels through.
//
//   JourneyScene
//    ├── field          the geography every other part reads
//    ├── JourneyTerrain
//    ├── Rivers
//    ├── JourneyRoute
//    ├── DestinationLandmarks
//    ├── Vegetation
//    ├── AtmosphericLayer
//    └── JourneyLabels
import * as THREE from 'three';
import { clamp, clamp01, lerp, remap, smooth, win, V3 } from '../util.js';
import { height } from './journey/field.js';
import { DESTINATIONS, camCurve, routeCurve, altitudeAt, pitchAt, airAt } from './journey/config.js';
import { createTerrain } from './journey/terrain.js';
import { createWaters } from './journey/rivers.js';
import { createRoute } from './journey/route.js';
import { createScatter } from './journey/scatter.js';
import { createAtmosphere } from './journey/atmosphere.js';
import { createLabels } from './journey/labels.js';

export const JOURNEY_Y = 1600;

/* Scroll → position along the authored path.
   The path itself is the chapter's original travel. What this adds is the
   rhythm the brief asks for: the glide eases INTO each destination and
   accelerates OUT of it again, and every one of the five gets enough of the
   scroll to be approached, read and left behind. (The chapter as it stood
   reached its first three stops inside the opening sixth of the scroll,
   which no amount of terrain would have made readable.) The blend with a
   straight line keeps it a glide — it never comes to a halt and restarts. */
function pathMap(marks) {
  const M = [[0, 0], ...marks, [1, 1]];
  return (u) => {
    u = clamp01(u);
    let i = 0;
    while (i < M.length - 2 && M[i + 1][0] < u) i++;
    const a = M[i], b = M[i + 1];
    const t = b[0] > a[0] ? clamp01((u - a[0]) / (b[0] - a[0])) : 0;
    return lerp(a[1], b[1], lerp(t, smooth(t), .58));
  };
}

export function createJourneyStage(ctx) {
  const g = new THREE.Group();
  g.position.y = JOURNEY_Y;
  g.visible = false;

  /* The camera travels the ROUTE — the worn path itself — not a separate
     line drawn beside it. A path of its own put Kumbakonam's arrival out
     over the sea; the road ends at each place, so riding it cannot. */
  const route = routeCurve();
  const path = route;

  /* Each destination's station on the camera path is authored (config.js):
     the glide passes within a few units of every site, so "nearest point"
     would put the arrival directly overhead, and Madurai stands close enough
     to Srirangam that nearest-point would also scramble the order. What is
     measured here is only where each place falls along the ROUTE, which is
     what the trail reveal needs. */
  {
    const P = new THREE.Vector3();
    for (const d of DESTINATIONS) {
      let bestR = 0, bestRD = 1e9;
      for (let i = 0; i <= 600; i++) {
        route.getPoint(i / 600, P);
        const rd = Math.hypot(P.x - d.x, P.z - d.z);
        if (rd < bestRD) { bestRD = rd; bestR = i / 600; }
      }
      d.routeProgress = bestR;
      /* the camera's station is a few units SHORT of the place, on the road
         in: at the site itself you stand inside the plinth and see nothing */
      /* Udupi's road arrives down the seaward face: five units short is still
         on the slope, looking DOWN onto the temple. It stops nearer, at the shore. */
      d.sCam = Math.max(.004, bestR - (d.id === 'udupi' ? .042 : .055));
    }
  }
  for (const d of DESTINATIONS) d.u0 = d.uTarget;
  const alongPath = pathMap(DESTINATIONS.map(d => [d.u0, d.sCam]));

  /* How the composition is framed at each arrival: a positive value swings
     the gaze to the right, so the architecture sits LEFT of centre and its
     label must therefore stand to its right, in the open half of the frame.
     Negative reverses both. The pairing is what keeps type off the
     architecture and inside the picture. */
  /* the narrative column is on the LEFT of every frame (scroll.js), so the
     gaze swings left and the architecture stands right of centre, with its
     name stacked above it — never beside it, where the copy is. */
  DESTINATIONS[0].frame = -.42; DESTINATIONS[0].labelSide = 'left';
  DESTINATIONS[1].frame = -.30; DESTINATIONS[1].labelSide = 'left';
  DESTINATIONS[2].frame = -.44; DESTINATIONS[2].labelSide = 'left';
  DESTINATIONS[3].frame = -.40; DESTINATIONS[3].labelSide = 'left';
  DESTINATIONS[4].frame = -.28; DESTINATIONS[4].labelSide = 'left';

  const frameAt = (u) => {
    let i = 0;
    while (i < DESTINATIONS.length - 1 && DESTINATIONS[i + 1].u0 < u) i++;
    const a = DESTINATIONS[i], b = DESTINATIONS[Math.min(i + 1, DESTINATIONS.length - 1)];
    if (a === b || b.u0 <= a.u0) return a.frame;
    return lerp(a.frame, b.frame, smooth(clamp01((u - a.u0) / (b.u0 - a.u0))));
  };

  /* ---------------- the world ---------------- */
  const terrain = createTerrain(ctx);
  g.add(terrain.mesh);
  const waters = createWaters(ctx);
  g.add(waters.group);
  const trail = createRoute(ctx);
  g.add(trail.mesh);
  const scatter = createScatter(ctx);
  g.add(scatter.group);
  /* no buildings: the five temple models were the tourism-map idiom the
     brief forbids, and from the road they filled the frame as walls. A
     place is a word on the land (labels.js) and a beat of copy. */
  const labels = createLabels(DESTINATIONS, ctx);
  g.add(labels.group);
  const air = createAtmosphere(ctx);
  g.add(air.group);

  /* ---------------- the camera ----------------
     The path is authored in x and z only; altitude and pitch are measured
     against the ground beneath, so the glide can never clip a ridge or
     float free of the land. */
  const _p = new THREE.Vector3(), _t = new THREE.Vector3();
  const MOB = ctx.isMobile;

  function shot(u) {
    const s = alongPath(u);
    path.getPoint(Math.min(s, .999), _p);
    path.getTangent(Math.min(s, .999), _t);
    const fx = _t.x, fz = _t.z;
    const fl = Math.hypot(fx, fz) || 1;
    const dirX = fx / fl, dirZ = fz / fl;
    const rgtX = -dirZ, rgtZ = dirX;                 // screen-right on the ground

    const alt = altitudeAt(u) * (MOB ? .90 : 1);
    const pitch = (pitchAt(u) + (MOB ? 5 : 0)) * Math.PI / 180;
    const px = _p.x, pz = _p.z;

    /* which destination is being approached, and how strongly. One
       dominant place at a time: the gaze eases onto it and lets it go
       again — the discovery, the arrival, then the departure. */
    let aimW = 0, aimX = 0, aimZ = 0, aimG = 0;
    for (const d of DESTINATIONS) {
      const w = win(u, d.u0 - .105, d.u0 - .015, d.u0 + .030, d.u0 + .115);
      if (w > aimW) { aimW = w; aimX = d.x; aimZ = d.z; aimG = height(d.x, d.z); }
    }

    /* Height is measured against the ground the DESTINATION stands on, not
       only the ground under the camera: Madurai sits on the flank of the
       Ghats, and an altitude taken from the valley floor left the camera
       below the temple's own plinth. The camera still never sinks into the
       hill it is passing over. */
    /* The camera stands a step OFF the road — on whichever side is downhill.
       Along the coast the road runs at the foot of the Ghats: a step to the
       right put the camera inside the mountain, a step to the left puts it
       on the shore looking along the road with the range rising beside it.
       At a place, the step is wider (across the tank from the gopuram). */
    const off = .9 + aimW * 1.8;
    const gR = height(px + rgtX * off, pz + rgtZ * off);
    const gL = height(px - rgtX * off, pz - rgtZ * off);
    const sideSign = gR <= gL ? 1 : -1;
    const ox = px + rgtX * off * sideSign, oz = pz + rgtZ * off * sideSign;
    /* the ground it stands over, a stride ahead and behind on the road, and
       the ground under the offset itself: it rides the highest, so neither a
       dip in the road nor the slope beside it can swallow it */
    const ownG = Math.max(height(px, pz), Math.min(gR, gL),
      height(px + dirX * 1.6, pz + dirZ * 1.6) - .35,
      height(px - dirX * 1.6, pz - dirZ * 1.6) - .35);
    const camY = Math.max(ownG + alt * .45, lerp(ownG, aimG, aimW * .85) + alt);

    /* How far ahead the gaze falls, solved rather than assumed. Taking
       alt/tan(pitch) is only right over flat ground: wherever the land drops
       away — every descent from the Ghats, every run out to the coast — the
       true depression angle came out far steeper than authored and the
       chapter turned top-down. Three iterations settle the distance at which
       the ground really lies at the authored angle, bounded against the
       flat-ground answer so a run out to sea cannot flatten the shot. */
    const tanP = Math.tan(pitch);
    const flat = (camY - ownG) / tanP;
    let reach = flat;
    for (let k = 0; k < 3; k++) {
      reach = clamp((camY - height(px + dirX * reach, pz + dirZ * reach)) / tanP,
        flat * .75, flat * 2.1);
    }
    /* at eye level a near-level gaze reaches the horizon, and the horizon is
       the sea: a walker looks down the road, not out to it */
    reach = Math.min(reach, 15);
    const lat = frameAt(u) * (MOB ? .34 : 1) * reach * .18;   // a glance aside, not a swing

    let ax = px + dirX * reach, az = pz + dirZ * reach;
    if (aimW > .004) { ax = lerp(ax, aimX, aimW); az = lerp(az, aimZ, aimW); }
    const lx = ax + rgtX * lat, lz = az + rgtZ * lat;

    /* a step to the right of the worn line, so the road is beside the feet
       and visible ahead, not hidden directly beneath the camera — and at a
       place, a wider step: the road runs through the compound, and from ON
       it the gopuram is a wall of plinth. Stand across the tank from it. */
    const pos = V3(ox, camY, oz);
    /* the gaze: down the road ahead; on approach, onto the building's body.
       Where the land falls away ahead — every descent off the Ghats — the
       ground 15 units on is the sea, and a gaze that followed it plunged
       30° below the authored pitch. It is held to a few degrees under it. */
    let ly = lerp(height(lx, lz) + alt * .25, aimG + 1.6, aimW);
    const floorY = camY - reach * Math.tan(pitch + 7 * Math.PI / 180);
    if (ly < floorY) ly = floorY;
    const look = V3(lx, ly, lz);

    /* the very end of the chapter still settles its gaze on Manchale, as it
       always has — but from low down, inside the landscape */
    const settle = smooth(remap(u, .86, 1));
    const M = DESTINATIONS[4];
    look.x = lerp(look.x, M.x + .4, settle);
    look.z = lerp(look.z, M.z + .5, settle);
    look.y = lerp(look.y, height(M.x, M.z) + .75, settle);
    return { pos, look, fov: lerp(48, 42, settle) };
  }

  /* ---------------- state carried between frames ---------------- */
  const weights = new Array(DESTINATIONS.length).fill(0);
  const camLocal = new THREE.Vector3();
  let last = -1, warmed = false;

  return {
    group: g,
    setVisible(v) {
      g.visible = v;
      if (v && !warmed) { warmed = true; air.warm(); }
    },
    cam: (u) => shot(u),
    update(time, globalT, u, camera) {
      const dt = last < 0 ? .016 : clamp(time - last, .001, .05);
      last = time;

      const sh = shot(u);
      camLocal.copy(sh.pos);

      /* the air of the leg, and the quiet opening out of the previous
         chapter's darkness — the world arrives, it is never cut to */
      const dim = lerp(.26, 1, smooth(clamp01(u / .07)));
      const airNow = airAt(u);
      air.setAir(airNow, dim);
      waters.setAir(airNow);

      /* the route is drawn only as far as the traveller has come */
      let reveal = 1;
      if (u <= DESTINATIONS[0].u0) {
        reveal = DESTINATIONS[0].routeProgress * clamp01(u / Math.max(.001, DESTINATIONS[0].u0));
      } else {
        let i = DESTINATIONS.length - 1;
        while (i > 0 && DESTINATIONS[i].u0 > u) i--;
        const a = DESTINATIONS[i], b = DESTINATIONS[Math.min(i + 1, DESTINATIONS.length - 1)];
        reveal = a === b || b.u0 <= a.u0 ? 1
          : lerp(a.routeProgress, b.routeProgress, clamp01((u - a.u0) / (b.u0 - a.u0)));
      }
      trail.setReveal(Math.min(1, reveal + .05));   // a little road ahead of the feet, always

      /* the map withdraws on the last leg: the route trace goes, the labels
         go, and what is left is Manchale on the Tungabhadra */
      const mapFade = 1 - smooth(remap(u, .78, .90));
      trail.setFade(mapFade);

      /* which destination is the present one. Past places stay in the
         geography and go quiet; places still ahead are silhouettes with no
         name yet. */
      for (let i = 0; i < DESTINATIONS.length; i++) {
        const d = DESTINATIONS[i];
        const dist = Math.hypot(camLocal.x - d.x, camLocal.z - d.z);
        /* A name belongs to the place we are arriving at, and to nothing
           else. The window is narrow enough that two never stand in the
           frame together, and a label the glide has already flown past is
           dropped before proximity can blow it up to fill the screen. */
        /* the camera arrives at four or five units now, on the road — a
           window that only opened at 6.5 left every temple OUT of focus at
           the moment of arriving at it (dim tint, no light, no name) */
        const near = win(dist, 1.0, 2.6, 22, 34);
        const w = d.final
          ? win(u, .66, .73, .82, .89)
          : win(u, d.u0 - .048, d.u0 - .016, d.u0 + .016, d.u0 + .048);
        weights[i] = w * near;
      }
      labels.update(camLocal, weights, mapFade, camera);

      terrain.update(time);
      waters.update(time);
      scatter.update(time);
      air.update(time, dt, camera, camLocal);
    },
  };
}
