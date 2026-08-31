# Handover — continuing Rayara Antaranga

Everything needed to pick this project up on another machine. Read this first,
then [`docs/journey-chapter.md`](docs/journey-chapter.md) if you are working on
chapter 07.

---

## 1. Getting running

Requires only Node (for a static file server) and a browser with WebGL. **There
is no build step, no bundler, no `npm install`.** Three.js is vendored.

```bash
git clone https://github.com/Chaitra-HR/life-of-rayaru.git
cd life-of-rayaru
npx serve antaranga
```

Open the printed URL. First load draws the preloader while the world builds; the
remaining chapters are built quietly behind the live site over the next ~10
seconds, so give it a moment before scrubbing to a late chapter.

`.claude/launch.json` holds the same command for editor-integrated preview. The
port there is arbitrary — change it freely if it collides.

Useful URL flags:

| flag | effect |
| --- | --- |
| `?nowebgl` | forces the no-WebGL document fallback (the full narrative as text) |
| `?domonly` | hides the canvas so the DOM/editorial layer can be inspected alone |

---

## 2. The one rule

**Everything is a pure function of the global scroll position `t ∈ [0,1]`.**

There is no state machine, no section swapping, no per-chapter DOM. One scene,
one camera, one render loop. If you find yourself wanting to remember something
between frames, you are probably fighting the architecture.

```
scroll position → t → chapter index + local u → camera shot → damped camera → render
```

`js/scroll.js` owns the narrative order. `js/main.js` owns the loop. Each chapter
is one module in `js/world/` that knows nothing about the others.

---

## 3. Where things live

```
antaranga/
  index.html            markup, font preloads, the import map
  css/style.css         design tokens, the type ladder, the editorial layer
  js/
    main.js             renderer, chapter routing, atmosphere, the frame loop
    scroll.js           CHAPTERS, CAPTIONS, VEILS — the narrative source of truth
    util.js             math, canvas-texture helpers, in-scene type (textMesh)
    preloader.js        the architectural drafting animation
    post.js             the grade used by the opening
    works.js            chapter 05, the horizontal canvas of the five granthas
    purva.js            chapters 01–03, the Pūrvāśrama editorial layer (#purva)
    world/              one module per chapter
      purvashrama.js    chapters 01–03 — the Bhuvanagiri house world
                        (models/purvashrama-house.glb: the supplied traditional
                        house, simplified 1.8M→150k tris and re-encoded webp;
                        the original asset is untouched outside the repo)
      interior.js       chapter 04 only — the sannyāsa corridor and chamber
      journey/          chapter 07's terrain system — see docs/journey-chapter.md
  vendor/               three.js r160 + BufferGeometryUtils
  fonts/ assets/ models/
tools/shot-server.js    review helper (section 6)
journey-review/         reference frames for chapter 07
```

### The stage contract

Every chapter module exports a factory returning the same shape:

```js
export function createXStage(ctx) {          // ctx = { isMobile, reduced }
  return {
    group,                                   // added to the single scene
    setVisible(v),
    cam(u),                                  // → { pos, look, fov } in stage-local space
    update(time, globalT, u, camera),        // signature varies slightly per stage
  };
}
```

Stages are stacked vertically in one scene so they never interfere. `main.js`
adds the offset back when positioning the camera:

| stage | Y offset |
| --- | --- |
| river (opening + return) | 0 |
| interior (scene 04) | 400 |
| parimala | 800 |
| bheda | 1200 |
| journey | 1600 |
| manchale | 2000 |
| pravesha | 2400 |
| antaranga | 2800 |
| purvashrama (scenes 01–03) | 3200 |

### The chapter map

Ranges live in `CHAPTERS` in `js/scroll.js`. Visibility windows (deliberately
wider, so transitions overlap) live in `visibilityPlan()` in `js/main.js`.

| # | chapter | t range |
| --- | --- | --- |
| 00 | Mantralaya | 0.000 – 0.070 |
| 01 | Venkatanatha | 0.070 – 0.150 |
| 02 | Gṛhastha | 0.150 – 0.225 |
| 03 | Kumbhakonam | 0.225 – 0.295 |
| 04 | Raghavendra | 0.295 – 0.370 |
| 05 | The Works | 0.370 – 0.480 |
| 06 | Tattvavāda | 0.480 – 0.570 |
| 07 | The Journey | 0.570 – 0.655 |
| 08 | Manchale | 0.655 – 0.725 |
| 09 | Brindavana | 0.725 – 0.910 |
| 00 | Return | 0.910 – 1.000 |

To convert a chapter-local `u` to a global `t`: `t = a + u * (b - a)`.
Chapter 07: `t = 0.570 + u * 0.085`.

---

## 4. Guardrails — do not drift from these

These were fixed by the project's brief and by rounds of feedback. Changing one
is a decision, not a tidy-up.

**Content integrity**
- No reference photograph is ever shipped as a texture or asset. Everything in
  the scenes is generated procedurally. The images in `referenceimages/` and
  `scene 00/` are *working material only* — they inform modelling, they are not
  loaded by the site.
- Rayaru is never given a face. He appears only as silhouette or light.
- Where an account belongs to Sri Matha tradition, the copy says so.

**Palette**
- Muted throughout. No bright red or gold. Oxide seams are `0x38201a`; the
  gopichandana gold used by the loader and wordmark is `#C8A66A`.
- No orange anywhere in the loader — it was added once and removed.

**Type** (settled; do not reintroduce variants)
- One family for all Latin text: **Onest**, vendored offline. Kannada is Noto
  Sans Kannada, Devanagari is Noto Serif Devanagari (its only cut is 400 — pin
  it, or you get synthetic bolding).
- **Two weights only**: 300 for the monumental register (displays, hero, giant
  words), 500 for everything else. Labels are distinguished by caps, tracking
  and size — never by weight. There is no 700.
- Sizes come from the `--step-*` ladder (`14px × 1.2ⁿ`). **Do not write a raw
  px font-size, letter-spacing or line-height into `style.css`.**

**Motion**
- Restrained. `prefers-reduced-motion` is honoured everywhere: motion stops, the
  narrative does not.
- The site is silent — the former synthesised ambience and its toggle were removed.

**Accessibility**
- The whole narrative must survive without WebGL. Test with `?nowebgl` after any
  change to `main.js` or `scroll.js`.

---

## 5. Working on a chapter

1. Find its `t` range above; work in chapter-local `u`.
2. Edit the one module in `js/world/`. Resist touching `main.js` — its per-chapter
   knowledge is deliberately thin (a camera case, a visibility window, one
   atmosphere entry).
3. Scrub the chapter **and both seams** forwards and backwards before calling it
   done. Most bugs are transition bugs.
4. Check `window.__errs` — the page collects errors and promise rejections into
   that array from the first line of `index.html`.

---

## 6. The review workflow

The scenes are art-directed frame by frame, not by scrolling around. `main.js`
exposes:

```js
window.ANTARANGA.step(t)   // jump to a scroll position and render one frame
window.ANTARANGA.tick()    // render one more frame at the current position
window.ANTARANGA.snap(t)   // render at t and return a JPEG data URL
window.ANTARANGA.stages    // the live stage objects
window.ANTARANGA.camera    // the camera, for projecting world points to screen
```

To capture frames to disk, run the included helper and POST snapshots to it:

```bash
node tools/shot-server.js ./journey-review
```

Then, from the browser console:

```js
const shot = async (t, name) => {
  const img = window.ANTARANGA.snap(t);
  await fetch('http://localhost:4599', { method: 'POST', body: JSON.stringify({ img, name }) });
};
await shot(0.570 + 0.32 * 0.085, '04-madurai.jpg');   // chapter 07, u = 0.32
```

Two habits that save a lot of time:

- **Measure, don't guess.** To find out what you are actually looking at, project
  the world positions to screen coordinates rather than squinting:
  ```js
  const v = new THREE.Vector3(d.x, 1600 + d.y, d.z).project(window.ANTARANGA.camera);
  // → ((v.x*.5+.5) * innerWidth, (-v.y*.5+.5) * innerHeight)
  ```
- **Bisect by hiding groups.** `stage.group.children[i].visible = false`, then
  snap again. This is how the "mysterious dark canyon" in chapter 07 turned out
  to be a river channel and not a wall.

### Performance

Numbers measured inside a software-rendered pane are pessimistic by several
times; use them for *relative* comparison between chapters, not as absolutes.

```js
const A = window.ANTARANGA;
A.step(0.61); A.tick();
const t0 = performance.now();
for (let i = 0; i < 25; i++) A.tick();
console.log((performance.now() - t0) / 25, 'ms', A.renderer.info.render);
```

Diagnosing a *stall* needs a different tool: sampled screenshots and state checks
will not reveal a freeze. Record gaps from inside the page with a 16 ms interval
and log anything over 60 ms.

---

## 7. State of play

**Done and settled.** All eleven chapters render and scrub clean end to end. The
loader, the type system, the opening scene, the works canvas and the Brindavana
sequence have each been through several rounds of feedback and should be treated
as finished unless there is a reason.

**Most recently rebuilt.** Chapter 07, The Journey — from a flat drawn map into a
stylised 3D landscape of South India. Details, dials and regression traps are in
[`docs/journey-chapter.md`](docs/journey-chapter.md). Reference frames from the
current build are in [`journey-review/`](journey-review/).

**Polish pass (Aug 2026).** Four chapters completed against the production
brief, without touching the settled systems:

- *Chapter 01, Bhuvanagiri* — the settlement now has a real morning: a
  gradient sky dome with a low sun pocket (same idiom as Manchale's dusk
  dome, faded by the `indoors` blend), a sun-glow sprite, warmer sun + hemi,
  and a lighter chapter fog (`ATMOS[1].d` .011 → .0085). It read as a grey
  dusk before.
- *Chapter 03, Kumbhakonam* — the hall of learning is legible now: five
  lamps instead of three (intensity 8.5 → 14), a hall-scoped warm hemi, a
  second daylight shaft deep in the corridor. All raised and retired with
  the existing `hallOn` window.
- *Chapter 06, Tattvavāda* — the scene rebuilt as ONE ordered field:
  hand-drawn contour rings (line loops, additive, staggered arrival) that
  settle into a shared plane as the composition organises; five jīvas with
  distinct scale/rhythm/inclination instead of two; eight matter shards on
  orbits INCLINED so their front crossing never eclipses the centre on the
  camera's sightline (`ud.vt`); a prabhā ring; a form-giving key light; the
  camera travels deeper and pulls back at the end to see the whole field.
  Labels render over everything (`depthTest: false`) and are pulled inside
  the frustum on phones.
- *Chapter 07 captions* — each of the five stops now has an editorial beat
  synced to its arrival (`u0` mapped through `t = .570 + u·.085`), placed on
  the open side of the frame; the short verbs ride the legs between stops.
  The windows are listed in `scroll.js` with the mapping in a comment.

**Dead-code pass (Aug 2026).** Removed, all verified unreferenced before
deletion and re-verified by a full end-to-end scrub afterwards:

- `js/world/anugraha.js` (288 lines) — never imported by anything. Its third
  beat lives in `manchale.js`; the rest was orphaned.
- The second half of `js/world/opening.js` (~320 lines) — `createOpening` and
  its `APPROACH_ROT` / `GATE_Z` / `BRND_LOCAL` / `approachToWorld` / `STYLED`
  constants, all superseded by `world/hero.js`. What remains is the shared
  toolkit hero.js and river.js build the opening FROM (stone set, material,
  boxUV, shadowed, loadArch, grass cutout/sheet).
- **Cormorant Garamond** — 15 `@font-face` blocks and `f1`–`f10.woff2`
  (~235 KB). No `font-family` in the CSS or JS ever named it; the site is
  Onest-only for Latin, as the type guardrail says.
- Three `Noto Sans Kannada` weight-500 faces — measured: Kannada only ever
  computes to 300, Devanagari only to 400.
- `fonts/fonts.css` — an unreferenced older copy of `fonts.local.css`.
- Eight dead caption classes (`.t-rule .t-work .t-small .t-script
  .t-script-dev .t-trans .t-kn .pos-high`) and the orphan `--stone` token.
- `util.js`: `easeIn` / `easeOut` / `easeInOut` / `track` (zero references);
  `smoother` demoted from export to local (used only inside util.js).
- 23 unused named imports across 12 modules.
- Root `antaranga-hero-refined.jpg` — byte-identical duplicate of the shipped
  `antaranga/assets/og.jpg`.

**One real fetch removed.** `→` (U+2192) in the Works touch cue was the only
glyph on the site outside Onest's unicode-range, so it fell through the stack
to Satoshi and pulled `satoshi-500.woff2` (~25 KB) on every touch device. It
is now pinned to `system-ui` (`#works.wx-touch .wx-cue i`). Satoshi stays
declared as the Latin offline fallback but is no longer downloaded — verified
via `document.fonts` (`Satoshi 500` now reports `unloaded`).

**Deliberately kept.** The `--step-*` and `--tracking-*` ladders are complete
by design even where a rung is currently unused — the guardrail is "nothing is
set off the ladder", so the unused rungs are the scale, not dead code. The
four Satoshi files stay as the documented offline fallback (never fetched).

**Known open items**

- *Chapter 07 colour.* The inland plateau legs read fairly uniform. The dials are
  `PAL` and the moisture bands in `js/world/journey/field.js`.
- *Chapter 07 sea coverage.* The Bay of Bengal takes more of the Srirangam and
  Kumbakonam frames than is ideal. Geographically honest, compositionally heavy.
  The dial is the per-destination `frame` value in `js/world/journey.js`.
- *Boot stalls.* `presence`'s throwaway brindavana build + surface sampling
  (~940 ms) now runs OFF the stage-build task — the build in one deferred
  task, the sampling in 300-point chunks behind it, the throwaway geometry
  disposed; the stage guards itself (`pts.visible`) until the points exist.
  `river` (≈ 640 ms in the software pane) still builds in one piece behind
  the live site.

**Approaches already tried and rejected — do not retry**

- Displaced-icosahedron canopy blobs for trees in the opening: they read as
  shattered floating rocks at every distance. Removed twice. If trees are needed
  there, use textured sprite silhouettes.
- Saturated green grass: reads as astroturf. Kage's grass is muted teal-green,
  and it is flat painted planes, not instanced blades.
- A cream-on-warm-brown loader palette: reverted; the dark ground with
  gopichandana gold is the approved direction.
- Bright brass under point lights: reads as glowing orange boxes. Dimmed to
  `0x574016` / `0x453312`.
