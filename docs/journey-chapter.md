> **Refinement pass, 11 Sept 2026.** The chapter now spans `t 0.560 – 0.655`
> (`t = 0.560 + u·0.095`). The five temple models (`landmarks.js`) and the
> numbered, regioned labels are gone: a place is one word standing on the land
> (`labels.js`, name only) and a beat of copy in the column; Srirangam is passed
> without a name (`unnamed` in `config.js`) and the stations (`uTarget`) were
> re-spaced. Everything below about the land, the rivers, the route, the
> scatter, the air and the camera still holds; the landmark and label sections
> describe the earlier build, as do the frames in `journey-review/`.

# Chapter 07 · The Journey

`t 0.570 – 0.655` · code in `antaranga/js/world/journey.js` and
`antaranga/js/world/journey/` · reference frames in [`../journey-review/`](../journey-review/)

The pilgrimage chapter is a **stylised 3D landscape of South India**, not a map.
The viewer travels Srirangam → Kumbakonam → Madurai → Udupi → Manchale, and by
the last leg the map has stopped being a map and become the place itself.

---

## The shape of it

```
journey.js                    JourneyScene — assembly, the camera solve, per-frame state
journey/
  field.js      ← the single source of geographic truth
  config.js       DESTINATIONS, the camera path, the flight profile, air per leg
  terrain.js      one displaced, vertex-coloured sheet + cloud shadows
  rivers.js       the sea and four rivers, as surfaces inside carved channels
  route.js        the engraved trace, revealed only as far as travelled
  landmarks.js    the five buildings, three LOD levels each
  scatter.js      instanced planting and boulders
  atmosphere.js   sky, one sun, valley mist, haze, birds
  labels.js       the editorial type in the landscape
```

**`field.js` is the contract.** Coastlines, the Western Ghats, the four rivers,
the worn route, the site positions, `height()` and `moisture()` all live there,
and every other module samples it. This is why nothing floats above the ground or
contradicts the geography — and it is why a change to `field.js` moves the
terrain, the water, the trees, the buildings, the route *and* the camera together.

Local frame: `+x` east, `+z` south. Roughly `x ≈ 5.0·(lon − 77.49)` and
`z ≈ −8.5·(lat − 13.91)`, so one unit is about 15–20 km. Not survey-grade; the
relative positions are true and the travel direction makes sense.

---

## The camera — six things that will bite you

These were each a visible bug. If the chapter ever goes wrong in one of these
ways, look here first.

**1. `reach = alt / tan(pitch)` is only right over flat ground.**
Wherever the land falls away — every descent from the Ghats, every run out to the
coast — the true depression angle came out far steeper than authored and the
whole chapter turned top-down. The fix is three fixed-point iterations solving for
the distance at which the ground *actually* lies at the authored angle. It must be
**bounded to `[0.75, 2.1] × flat`**: unbounded, a run toward the sea pushes the
aim to the horizon and flattens the shot to nothing but water.

**2. Camera height is measured against the destination's ground, not its own.**
`camY = max(ownG + alt*0.45, lerp(ownG, aimG, aimW*0.85) + alt)`. Madurai sits on
the flank of the Ghats; an altitude taken from the valley floor left the camera
below the temple's own plinth. The floor term stops the camera sinking into a hill
it happens to be passing over.

**3. Screen-right on the ground is `(-dirZ, dirX)`.** The opposite sign puts every
composition on the wrong side of the frame, which looks *almost* right and wastes
an afternoon.

**4. Arrival stations are authored, never derived.** Each destination carries an
explicit `sCam` in `config.js`. "Nearest point on the camera path" fails twice
over: the glide passes within a few units of every site, so nearest-point frames
each arrival from directly overhead; and Madurai is close enough to Srirangam that
nearest-point also scrambles the *order* of the five.

**5. Framing and label side are paired.** A positive `frame` value swings the gaze
right, so the architecture sits **left** of centre — and its label must therefore
stand to its **right**, in the open half. Negative reverses both. Break the pairing
and the type either lands on the building or runs off the frame.

**6. Only one name at a time.** Label windows are narrow (`u0 ± 0.075`) *and*
distance-gated (`win(dist, 3.5, 6.5, 28, 44)`). Without the narrow window two
names share the frame; without the distance gate the label of the place you have
just flown past looms up and fills the screen.

---

## Pacing

The chapter as originally authored reached its first three stops inside the
opening ~17% of the scroll — far too fast to read once there was landscape to
look at. Arrivals are now placed explicitly:

| destination | arrives at `u` |
| --- | --- |
| Srirangam | 0.075 |
| Kumbakonam | 0.16 |
| Madurai | 0.32 |
| Udupi | 0.60 |
| Manchale | 0.93 |

`pathMap()` in `journey.js` maps scroll to path position through those marks,
blending 58% smoothstep with a straight line — enough that the glide eases into
each arrival and accelerates out again, not so much that it comes to a halt and
restarts. The path itself, the scroll source, the chapter's `t` range and the
deceleration into Manchale are all unchanged from the original chapter.

To re-pace, edit `uTarget` on the five records in `config.js`. To re-frame an
arrival without moving it in time, edit `sCam` (where on the path it happens) or
`frame` (how it sits in the shot).

---

## The five landmarks

Deliberately not one model five times — the architecture tells you where you are
before the label does.

| | reading |
| --- | --- |
| **Srirangam** | tall, vertical, seven diminishing tiers, concentric prakara walls — sets the Dravidian language |
| **Kumbakonam** | broader and stouter, five heavy tiers, a mandapa and the stepped temple tank |
| **Madurai** | the elaborate one: nine tiers, denser carving, two flanking towers, traces of faded pigment |
| **Udupi** | the break — no gopuram. Low massing, steep tiled roofs, an inner court, a pavilion standing in the tank |
| **Manchale** | quiet. A matha, a small stone shrine, sheds, a ghat down to the water. An arrival, not a monument |

Each is built at three levels of detail (near / mid / far silhouette) and switched
by `THREE.LOD`. Each destination gets its **own cloned material set** so the place
you have arrived at can hold more contrast while the others are drawn back toward
the haze — past destinations stay in the geography and go quiet, places still
ahead are silhouettes with no name yet.

Nothing of the Brindavana is revealed at Manchale. That belongs to chapter 09.

---

## The dials

| want to change | edit |
| --- | --- |
| ground colour, how wet/dry a region reads | `PAL` and the moisture bands in `field.js` |
| where the coast, the crest or a river runs | the tables and polylines at the top of `field.js` |
| when a destination is reached | `uTarget` in `config.js` |
| where on the path an arrival is framed from | `sCam` in `config.js` |
| how high / how oblique the camera flies | the `ALT` and `PITCH` tables in `config.js` |
| the light and haze of a leg | the `AIR` profiles in `config.js` |
| which side of frame the building sits | `frame` + `labelSide` in `journey.js` (keep them paired) |
| label position and size | `PLACE` in `labels.js` |
| planting density and species mix | the `N` counts and `pick` predicates in `scatter.js` |

---

## Traps met on the way

- **`mergeGeometries` returns `null` for a mixed indexed/non-indexed set.**
  `IcosahedronGeometry` is non-indexed, `CylinderGeometry` is indexed — call
  `.toNonIndexed()` on the latter before merging, or you silently get an
  `InstancedMesh` with a null geometry and a `boundingSphere` crash at render.
- **three r160 declares `instanceColor` in the vertex shader but not the
  fragment.** Per-instance tint needs its own varying (see `instancedMaterial()`
  in `scatter.js`), otherwise `setColorAt` is silently ignored.
- **Base terrain elevation must sit well above sea level** (currently `1.9`). At
  `0.45` the river carves pushed several sites below zero and they flooded.
- **The Ghats read as bare stone** until the rock and high-rock colour lerps were
  scaled by `(1 - m * 0.72)` — the windward side is forest to the ridge line.
- **Roofs read as flat plates from above** at a shallow pitch. `tiledRoof()`
  multiplies the given height by 1.6 for this reason.
- **The camera pane can collapse to 0×0** when hidden, and `snap()` then returns a
  3-byte data URL. Set an explicit viewport size and dispatch a `resize` event
  before capturing.

---

## Cost

Software-rendered pane, so real hardware is several times faster — treat these as
relative, not absolute.

| | |
| --- | --- |
| build | terrain ≈ 430 ms · landmarks ≈ 334 ms · scatter ≈ 190 ms |
| runtime | ≈ 200k triangles, ≤ 95 draw calls, 6–8 ms/frame (neighbouring chapters: 3–4 ms) |

Mobile takes a different composition rather than a shrunken one: labels **stack
above** the building (side-set type runs off a portrait frame whichever side it is
given), altitude ×0.90, pitch +5°, coarser terrain and fewer instances.

Under `prefers-reduced-motion` the wind, water, mist drift, cloud shadows and
birds all stop; the landscape and the travel remain.
