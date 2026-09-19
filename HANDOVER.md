# Handover — continuing Rayara Antaranga

Everything needed to pick this project up on another machine. Read this first,
then [`docs/journey-chapter.md`](docs/journey-chapter.md) if you are working on
chapter 07.

---

## 1. Getting running

Requires only Node (for a static file server) and a browser with WebGL. There
is no bundler; three.js is vendored. Since 19 Sept 2026 the repository carries a
`package.json`: `npm run dev` serves `antaranga/`, `npm run build` copies it
to `dist/` (leaving `serve.json` and `tools/` behind) and fails if any
reference in the page is missing; hosts build with `npm run build` and publish
`dist` (README "Deploying it"; `netlify.toml`, `vercel.json`).

```bash
git clone https://github.com/Chaitra-HR/life-of-rayaru.git
cd life-of-rayaru
npm install
npm run dev
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

Since 20 Sept 2026 (THE SCORE, §7) `t` is `y / max`, linear, where `y` is
the page's scroll position through ONE exponential damp (scroll.js
LAMBDA), and `max` is the sum of the score's beats (js/score.js). Every
window on the site (copy, camera keys, light, water, volumes, the stone's
layers, the footer) is derived from that one table by the timeline's
layout, never measured from the DOM and never authored twice. The camera
is ONE monotone-cubic track through every shot on the site (js/track.js).
The rule stands: everything is a pure function of `t`.

---

## 3. Where things live

```
antaranga/
  index.html            markup, font preloads, the import map
  css/style.css         design tokens, the type ladder, the editorial layer
  js/
    main.js             renderer, chapter routing, atmosphere, the frame loop.
                        Resolution policy (after kage): sizes come from the
                        LAYOUT viewport (documentElement.client*, stable on
                        iOS while the toolbar slides), the canvas is pinned in
                        px, and a PERF governor multiplies the DPR cap by a
                        live scale (floor .6) from measured frame times.
                        Shadow mapping is desktop-only. post.js sizes its
                        targets from getDrawingBufferSize — getSize() is CSS
                        px and rendered the graded opening at DPR 1.
    scroll.js           CHAPTERS, CAPTIONS, VEILS, and ScrollTimeline: scroll px
                        → global t, PIECEWISE. The page is a spacer under the
                        opening (3D), the movements (a flowing document, 01–08)
                        and a spacer under the Brindavana and the return (3D);
                        DOC_A/DOC_B (.070/.725) are the document's share of t.
    movements.js        chapters 01–08 — THE MOVEMENTS. The document's
                        behaviour: the ground colour (the section nearest the
                        centre of the frame → body[data-g] → #ground), the
                        draw-in of the diagrams, the old name letting go
                        letter by letter (04), the rings canvas (06), the
                        Pañcabheda by touch (06). The copy and the SVG
                        diagrams live in index.html; the styles under
                        "THE MOVEMENTS" in style.css.
    util.js             math, canvas-texture helpers, in-scene type (textMesh)
    preloader.js        the architectural drafting animation (rust ink on warm
                        paper). Reads the SVG in index.html, lays the strokes
                        out, and hands a canvas to preloader-worker.js
                        (OffscreenCanvas) so the drawing keeps its frames while
                        the page builds the world; falls back to the page.
    preloader-draw.js   the drafting engine (canvas 2D, shared by both paths)
    preloader-worker.js the preloader's thread
    post.js             the grade used by the opening
    works.js            the five granthas as data (reference; the shelf in
                        index.html carries the same text as markup).
    movements.js        also owns the WORLD BANDS (index.html .band-world,
                        style.css "a WORLD BAND"): a tall chapter with a
                        sticky 100svh stage, a curtain in the ground colour
                        closed at both ends (and until the world is built,
                        setLive), and captions (.wcap, data-a/data-b) staged
                        by progress p. main.js reads movements.update().band
                        each frame and routes visibility (visibilityPlan),
                        camera (stage.camV), clock (stage.updateV) and air
                        (BAND_ATMOS) through it; `covered` skips the render
                        under a closed curtain or an opaque .band-read.
    world/lamps.js      SEVEN LAMPS (17 Sept 2026): THE MIDDLE OF THE SITE.
                        One night's vigil: the day goes down over the river
                        (river.js dusk) and the life is remembered in the
                        dark by lamplight, one beat per chapter, until the
                        lamps become the sanctum's own. Seven beats stand far
                        apart on ONE floor (overlapping discs z-fought) at
                        LAMPS_Y; each chapter is a .band-lamps world band
                        (index.html, data-beat) driving camV(p, beat) /
                        updateV(time, p, beat). Beats: 01 a clay lamp lit;
                        02 the Om sand tray (world/props.js) under a lamp;
                        03 the light passed between two tall deepas
                        (world/deepa.js) and the name; 04 five rehals
                        (parimala.js buildRehal, exported) lit in turn; 05
                        five flames set apart + the tap; 06 far lights over
                        the land (fog .02 here, .075 elsewhere: BAND_ATMOS
                        in main.js); 07 a row of lamps to two tall deepas,
                        then the sanctum. Portrait frames step the camera
                        back (camV). Air is true black; the retired
                        Bhuvanagiri mist ramp in main.js is skipped under a
                        band. Flame far-halos are shrunk (they veiled the
                        sky close up).
    world/objects.js    look-dev stage (not live): the site's objects alone on
                        flat grounds; loadStills key 'objects'.
    audio.js            the soundscape: a synthesised ambient pad (G# drone,
                        two breathing chords, soft pentatonic tones, reverb),
                        or a recorded loop when TRACK is set. ON by default:
                        it starts on the first click/tap/key (browsers block
                        sound before that); SOUND (header; a compact bars
                        button beside the phone menu) or the M key turns it
                        off, remembered in localStorage 'antaranga-sound' and
                        followed by every open tab. Bars move only while the
                        tab is actually sounding.
    world/trees.js      THE TREES AS VOLUMES (18 Sept 2026): makeTree
                        (broad / fine crowns of leaf-cluster quads with the
                        crown's normals), makePalm, makeShrub, setTreeTime,
                        billboard / faceCamera for the cards that remain.
    world/threshold.js  THE BHUVANAGIRI HOUSE'S ENTRANCE on the right bank
                        (wall, gatehouse, door ajar, benches, the walk of
                        slabs, the yard behind), with the sand tray
                        (world/sand.js) and the veena (world/veena.js) on
                        its benches; placed by hero.js, walked to by main.js
                        STATIONS mv-01 / 02 / 02m.
    world/purvashrama.js  LIVE AGAIN (17 Sept 2026) as the stage of chapter
                        02's WORLD BAND: camV(p)/updateV(time,p) drive it by
                        band progress. Raised by main.js LATER, first.
    purva.js, tika.js   RETIRED (the movements replaced them, 11 Sept 2026);
                        unreferenced, left on disk until the tree is committed.
    world/              one module per chapter. Only river.js, pravesha.js and
                        antaranga.js (and what they import) are built now;
                        bhuvanagiri, purvashrama, interior and journey/ are
                        RETIRED with purva.js and tika.js.
      bhuvanagiri.js    the settlement around the house (Sept 2026): the
                        agrahara lane of neighbours (merged to one mesh per
                        material), the compound wall and gate, the village
                        tank with its granite ghat, still water, palms and
                        their reflections, tamarinds, reeds, the far tree
                        line, cooking smoke, birds and clouds. Exports TANK /
                        GHAT and the height-field cuts purvashrama.js applies.
      purvashrama.js    chapters 01–03 — the Bhuvanagiri house world
                        (both GLBs ship EXT_meshopt_compression — the house
                        went 22MB → 4.2MB, the arch 2.3MB → 0.25MB. Loaders
                        must call setMeshoptDecoder(MeshoptDecoder) from
                        vendor/meshopt_decoder.module.js, as both call sites
                        do. Re-exporting a model? run gltf-transform weld +
                        simplify + quantize + meshopt on it first.)
                        (models/purvashrama-house.glb: the supplied traditional
                        house, simplified 1.8M→150k tris and re-encoded webp;
                        the original asset is untouched outside the repo)
      interior.js       chapter 04 only — the Matha at Kumbakonam (a lime-
                        plastered corridor opening on a court, writing desks,
                        deepas, filtered day) and the chamber beyond. The
                        camera passes BESIDE the seated relief, never through it.
      journey/          chapter 07's terrain system — see docs/journey-chapter.md
  vendor/               three.js r160, BufferGeometryUtils, GLTFLoader,
                        meshopt_decoder. Nothing else: the site loads no
                        third-party page and no second copy of three.
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
| river (opening, the night, the return) | 0 |
| (pravesha and antaranga stages: retired 19 Sept 2026; Brindavana Pravesha lives in the river world) | |

(The retired stages kept their offsets: interior 400, parimala 800, bheda
1200, journey 1600, manchale 2000, purvashrama 3200.)

### The chapter map

Ranges live in `CHAPTERS` in `js/scroll.js`. Visibility windows (deliberately
wider, so transitions overlap) live in `visibilityPlan()` in `js/main.js`.

| # | chapter | t range | what renders |
| --- | --- | --- | --- |
| 00 | Mantralaya | 0.000 – 0.070 | river stage, dawn |
| 01–08 | the movements | 0.070 – 0.725 | NO WORLD. The flowing document (#movements) on #ground; the frame is not rendered under it. t inside it is the document's scrolled fraction, so the CHAPTERS rows 01–08 are routing only. |
| 09 | Brindavana | 0.725 – 0.934 | the river stage, in the one world: the day breaks at Manchale, the bank is cut open, the chamber, the layers, the stone stands (river.js → pravesha.js) |
| 00 | Return | 0.934 – 1.000 | the same camera path drawing back to frame00: the opening's hold, reached by moving |

To convert a chapter-local `u` to a global `t`: `t = a + u * (b - a)`.
Scroll px ↔ t: `timeline.tAt(y)` / `timeline.yAt(t)` (piecewise; see
scroll.js). The two seams either side of the document are not veils: the
ground dissolves in as the document's top edge rises into the frame (over
the opening's morning light) and out as its bottom edge leaves (onto the
sanctum's first frame). Both are computed from the raw scroll in main.js.

---

## 4. Guardrails — do not drift from these

These were fixed by the project's brief and by rounds of feedback. Changing one
is a decision, not a tidy-up.

**Content integrity**
- No reference photograph is ever shipped as a texture or asset. Everything in
  the scenes is generated procedurally. The images in `referenceimages/` and
  `scene 00/` are *working material only* — they inform modelling, they are not
  loaded by the site.
  **Amended 18 Sept 2026:** the owner supplied three pictures of their own
  (a jasmine branch, a veena, a compound wall with its gateway). The veena
  and the gateway are BUILT from them (veena.js, threshold.js); the planes
  that were to carry the photographs (stations.js, `assets/props/`) are
  retired, since a picture on a plane read as a cutout, not a place. The
  printed covers in `assets/works/` are the one photographic exception.
  Nothing from `referenceimages/` is ever loaded.
- Rayaru is never given a face. He appears only as silhouette or light.
- Where an account belongs to Sri Matha tradition, the copy says so.

**Palette**
- THE SIX, and nothing else: Old lace `#F7F1E1`, Bone `#E3D8C1`, Dark
  goldenrod `#B4833D`, Kobicha `#66371B`, Coyote `#81754B`, Earth Green
  `#3F3F2C`. Each has a job (light grounds for reading; gold for lamp light
  and the sun; Kobicha for the interiors; Coyote for earth and the road;
  Earth Green for the bank, the sanctum and the night) and the sequence
  through the site moves gradually. No bright red, no orange, no glowing
  gold. Oxide seams are `0x38201a`; the drawing hue of the loader and
  wordmark is the gold lifted to `#c9a468` so it reads as a hairline
  (the wordmark's shrine is the one FILLED shape on the site, and only
  because line work did not survive 26px).
- No orange anywhere in the loader — it was added once and removed.
- **ONE DARK.** Every near-black on the site is `--night` `#0d0d09` (Earth
  Green at the edge of lamplight): the lamp world's fog and clear colour
  (`NIGHT_HEX`, main.js), the band curtains, `#ground`, the veil into the
  sanctum, the footer's end, the favicon. Do not add another near-black
  (the blue-blacks `#060809` / `rgba(3,6,8)` / `rgba(12,14,32)`-style
  darks made every seam read as a different place). Alphas of Old lace,
  Bone and the gold (`rgba(247,241,225,…)`, `rgba(227,216,193,…)`,
  `rgba(201,164,104,…)`) are the only translucent inks. (17 Sept 2026.)
- The preloader's paper `#F4ECDF` / rust `#A5472B` is the owner's own
  swatch (17 Sept 2026) and the one colour outside the six; if it is ever
  to join them, `--paper-ink: var(--kobicha)` is the whole change.

**Type** (settled 17 Sept 2026; do not reintroduce variants)
- TWO Latin families and no third: **Marcellus 400** for anything that
  names, **Karla 300/400** for anything that explains, both vendored
  offline. No bold anywhere. See the block at the top of style.css and
  the 17 Sept entry in section 7. (Onest carried the site until then;
  Instrument Serif was tried for one day, 11 Sept, and removed.) Kannada is Noto Sans Kannada, Devanagari is
  Noto Serif Devanagari (its only cut is 400 — pin it, or you get synthetic
  bolding).
  (Changed 11 Sept 2026 on the owner's approval of the layout proposal.)
  Kannada is Noto Sans Kannada, Devanagari is Noto Serif Devanagari (its
  only cut is 400 — pin it, or you get synthetic bolding).
- **Two weights only**: Karla 300 for all reading copy, 400 for Marcellus
  and for every label. Labels are distinguished by caps, tracking and
  size — never by weight. There is no 500 and no 700.
- Sizes come from the `--step-*` ladder (`14px × 1.2ⁿ`). **Do not write a raw
  px font-size, letter-spacing or line-height into `style.css`.** The one
  exceptions are the display captions (`.t-display`, `.t-q`, `.t-num`),
  whose clamps were set from kage's measured page on 14 Sept 2026.

**Finish** (19 Sept 2026)
- The picture renders straight through the renderer's ACESFilmic tone
  mapping (exposure 1.05), as it always has. A Seijaku-style grade
  (js/post.js: toe lift, ACES, warm bias, vignette, bloom, occlusion) ran
  for one evening and the owner undid it as grainy: `STYLED.linear` is
  false, the grade is built only on demand (`ANTARANGA.grade`) and draws
  nothing. Do not switch it back on without the owner asking.

**Motion**
- Restrained. `prefers-reduced-motion` is honoured everywhere: motion stops, the
  narrative does not.
- Sound is ON by default but only starts on the visitor's first click, tap or key press (browser rule); the SOUND control turns it off and the choice is remembered (js/audio.js). A hidden tab never plays.

**Copy**
- No em dashes anywhere: commas, colons, full stops, or restructure.
- ONE reading position over the 3D scenes: the narrative column (`.cap`).
  Only `pos-center` (a name or a number held in the frame) may break it. Do
  not reintroduce `pos-low` / `pos-right` / `pos-left`, nor the right-edge
  chapter marker. **The chapters obey the same rule**: a chapter caption is
  `#movements .wcap` (which shares the `.cap` geometry rule in style.css)
  holding the site's own `.t-loc / .t-display / .t-sub / .t-body`; there
  is no second caption kit, no `wc-right` / `wc-top` placements, and no
  scrim panel. **No section paints a scrim of its own**: the only shade
  under the chapters is `#pool` (style.css "THE POOL", movements.js
  `carryPool`), one fixed layer transparent at its own rim. A scrim inside
  a section box shows the box's edge as a band while it scrolls. Where a chapter's 3D subject would sit under the column, the
  lamp world's camera trucks (`truck` / `lift` per beat, lamps.js `camV`),
  the copy does not move. The movements are a document and read as one: a centred
  title pair, two labelled arguments in two columns (one column on a phone),
  one memorable line. Every device there is a diagram of the scene's idea
  (its test question), never a picture of an object.
  **Amended 18 Sept 2026:** the chapters are ONE column of eyebrow · title ·
  paragraph; what there is to look at stands in the world (stations.js),
  never in a card, list, diagram or tap. Pañcabheda is the moon, the river
  and the stone; the works are the volumes on the landing; the road is the
  far bank's lamps and names.
  **Amended 19 Sept 2026 (the owner's eleventh and twelfth briefs):** TWO
  beats are read centred, and only two: the Tattvavāda opening (mv-05)
  and Hari Sarvottama (mv-05f), `.sec.mid` in index.html (style.css "THE
  TWO CENTRED BEATS"): set centred, a comfortable measure (lead ≤ 52ch on
  a wide frame, 38ch on a phone), the block's centre a little below the
  frame's on a wide frame (`top: 58%`), on the frame's foot on a phone;
  their stations put the subject above the words. Every other beat keeps
  the column (left, or right for the two `.right` differences). A first
  pass had centred every beat; the owner reversed it the same night: the
  brief was the two screenshots, not the site.
- No chapter numbers, no counters, no "N of M" anywhere the visitor reads:
  place and date eyebrows only.
- Every beat lives ≥ ~1 viewport of scroll (pages: 52 desktop / 48 phone, so
  ≥ ~.019 t).

**Rayaru's form**
- Never a modelled figure. Where he is present it is `seatedPresence()`
  (util.js): a seated relief silhouette in dhyāna, lit by the scene. Used in
  the chamber (interior.js) and the sanctum (pravesha.js). The three draped
  lathe figures that stood by the plinth in the return were removed.

**Ritual light**
- Two lamps, by place. Outdoors and in the sanctum: `deepaLamp()` (util.js),
  the brass standing lamp. Inside the house and the Matha's hall (scenes
  01–04): `clayLamp()` (an agal vilakku, the household's terracotta saucer
  lamp) on desks and the dais, and `bracketLamp()` (the same clay lamp on a
  stone wall bracket, with its soot mark) on walls. The brass standing
  lamps were removed from those rooms in Sept 2026 on the owner's note that
  they read as showpieces. No bare flames on cylinders, no candles.

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

### 22 Sept 2026, later · FIRST LOAD, THE NAV, THE SOUND, THE FOOTER (the owner's twenty-fifth brief)

The owner: heavy lag on first load; the phone's music icon too large and
play/pause unreliable; the works headline to change; the desktop nav not
clickable and a strange wrapper behind it; the footer to match the top
navigation. Found and done:

- **The first-load stall** was the reveals: `makeReveal` on all 31 copy
  blocks at `start()` (SplitText + a timeline each, ~21 ms a block, ~650
  ms in one frame the moment the loader released). Now LAZY: movements.js
  `lives` and Captions.update build ONE reveal a frame, the nearest first,
  when its beat is within a beat and a half; `linesAtStart` 0. The
  surface's shaders and targets are compiled during boot (`surface.warm`)
  so the first cursor movement has no hitch. Load marks on this machine:
  river built 2.5 s, stone maps 7.4 s (the workers), start 7.7 s: the
  loader's length is the stone maps, not a stall.
- **The nav**: hit-tested (`elementFromPoint` at the LIFE button's centre)
  at the hero, a chapter and a Brindavana beat: the button is on top
  every time, and a click lands the scroll. Nothing sits over `#ui` (z 6).
  The "wrapper behind the navbar" was `#hero::before`, the copy's shade,
  whose top (−60 %) reached up behind the wordmark and the nav; it now
  starts at −30 % (−14 % on phones), under the header. The wordmark (top
  and footer) is a link to the opening.
- **Sound**: the phone's icon 15 px in its 44 px button; if `play()` is
  refused, the gestures are re-armed so the very next tap anywhere starts
  it (before, a refused first tap left the control reading ON and the
  next tap turned it OFF: three taps). The pane cannot play (it reports
  the tab hidden); the toggle's state flips correctly on every click.
- **The headline**: "His words became a way into deeper thought."
- **The footer**: the same wordmark markup as the top (the mark, the name,
  the small line) and the same four links in the same order and face
  (LIFE · WORKS · TATTVAVĀDA · BRINDAVANA), the old footer glyph and its
  four other labels retired.


### 22 Sept 2026 · LOCAL ONLY, AND THE PHONE'S PINK (the owner's twenty-fourth brief)

The owner: the skin still read as the whole scene inside a warped
wrapper; keep the interaction LOCAL to the cursor's and finger's path and
nothing else; and on the phone the opening's sky was blue, the pinkish
finish missing. Done:

- **surface.js**: the scroll's breath and the seam pushes are GONE (they
  lit the whole field: that was the wrapper). The field is touched only
  by a wake along the cursor's or finger's segment; damp .95 and k .26 so
  the wave dies within a few tenths of the frame and the field is flat in
  about a second; the edges never move. main.js: `SEAMS`, `seamAt`,
  `setStir`, `push` removed. At rest the frame is the straight render.
- **The phone's sky** (river.js skyFrag `uSpread`): the hero gradient is
  mapped by elevation and the wide hold sees only the lowest ~.3 of the
  dome; a portrait phone looks higher, so most of its frame was the
  zenith's blue. `uSpread` (1 wide, 1.3 tablet, 1.9 portrait, from the
  camera's aspect) divides the elevation in the morning branch only: the
  SAME colours in the same order fill the portrait frame in the wide
  frame's proportion. Nothing else on the phone differs.
- The hero's `::before` shade is the original (a blue-black radial;
  §4's ONE DARK rule would make it `--night`, but the owner asked for the
  original look and it was left).


### 21 Sept 2026, night · THE SKIN ABOVE THE ARTWORK (the owner's twenty-third brief)

The owner: the surface pass had altered colours, distorted the artwork
and changed the tone; restore the exact previous look and LOCK the scene
design (no recolour, warp, blur, relight, resize); then make the fluid
response clearly perceptible, as a responsive transparent surface ABOVE
the artwork; and the sound control as a speaker symbol. Done:

- **The artwork renders straight to the canvas again**, exactly as
  before any surface work (no target, no pass over it: identical by
  construction). surface.js keeps its wave field but draws it as a
  TRANSPARENT LAYER over the frame (`autoClear` off for one quad): light
  (Bone `#e3d8c1`) where the field's slope faces the light, shade
  (`--night`) where it faces away, a soft body where it stands high;
  alpha from the same, nothing where the field is flat. uLight 42 / 36
  phone, uBody 4.5, uAlpha .62 / .58, the shade side at .18 of that; a wake's depth speed × .7.
- **fluid-text.js, the `#fluid-text` SVG filter and `body.fluid` are
  gone**: the type is never displaced. The hero's `--scrim` driver is
  gone: `#hero::before` leaves with the copy as it did before.
- **The speaker** (audio.js `setLabel`, css `.snd-ico`): one inline SVG
  on both sound buttons, its two waves while on, a stroke through it
  while off; the "SOUND · ON/OFF" text and the bars are retired.


### 21 Sept 2026, later · THE SURFACE: one skin under the whole site (the owner's twenty-second brief)

The owner: the ripple must not be a transition effect but the site's
fundamental behaviour, from Scene 1 to the footer's end, reacting to the
cursor (a wake, not a circle), to touch and swipe, to scroll, with the
words on the same skin; and an abrupt sky/background change INSIDE
Scene 1 to fix (not a Scene 2 seam). Done:

- **The Scene 1 cut, found and fixed.** Measured through the opening's
  release (`docA`): the hour, the sky's dials and the fog are all
  continuous. The cut was `#hero::before`, the wide indigo pocket behind
  the hero copy, which left WITH the copy over .2 vh and read as the sky
  changing. It now takes `--scrim` (main.js), 1 → 0 from a tenth of the
  hero beat to the end of the leave beat: the sky under it changes with
  the scroll, never at a point, and reverses the same way.
- **surface.js (new; ripple.js retired).** A height field (wave equation,
  RG half-float ping-pong at a sixth of the frame, two steps a frame,
  k .30, damp .972, the edges held) disturbed by: `wake(x0,y0,x1,y1,
  speed)` — a soft depression along the segment the cursor or finger just
  crossed (main.js `move` on mousemove / touchmove); `setStir(vh/s)` — the
  scroll's broad slow breath; `push(k, cx, cy)` — a seam's wide, soft push,
  fed by the GROWTH of the seam's strength (main.js `SEAMS`, the footer
  seam removed: the world grows calm there). The pass bends the scene by
  the field's gradient (uAmp .46 / .34 phone) with a breath of light on
  the slope (uLight 1.35 / 1.0; at 1.15/3.0 a fast cursor warped the gateway), tone-maps and encodes (three r160 leaves
  a target linear). `energy` (this frame's input, settling at λ 1.8) is
  read by the words. After ~2.5 s with nothing put in, the field is flat
  and the scene renders straight (no cost at rest). Needs WebGL2; off
  under reduced motion.
- **fluid-text.js (new) + index.html `#fluid-text`.** One SVG filter
  (fractal noise .0045/.0075, two octaves → feDisplacementMap) that every
  copy layer takes (`body.fluid`: `.sec-in`, `.cap`, `#hero`, `#word`)
  while the surface carries energy; its scale is the energy (fast attack,
  slow settle), ≤ 7 px (5 on phones); at rest the class is off and the
  type is exactly itself. No seed drift (it jumps the pattern).
- **text.js**: the reading's lines come into clarity (blur 5 → 0 px with
  their rise), the statement's lines 3 → 0 through their mask.

Verified in the pane: no errors; the field runs (a wake at ×4 amplitude
bends the horizon along its path, the settle leaves it flat); `--scrim`
1 → .95 → .83 → .70 → .47 → .11 → 0 across the opening; `body.fluid` and
the filter's scale follow the energy; build passes. Not verified: a real
cursor's feel (the pane sends no pointer); the owner should move the
cursor across the hero and the river and judge uAmp/uLight/MAX.


### 21 Sept 2026 · ONE JOURNEY, ON GSAP (the owner's twenty-first brief, after emotion-agency.com/about)

The owner: the scroll felt resistant, mobile needed several swipes a
scene, the footer never fully showed on phones, the type was static and
generic, Scene 1 → the house felt abrupt; wanted one continuous journey,
GSAP for scroll and motion, a ripple language at the seams, editorial
text, the same system on desktop and phone. Reference read in its
source: Lenis (lerp ~.1) + GSAP + a three canvas with a displacement
through its images. Done:

- **GSAP 3.15 vendored** (`antaranga/vendor/gsap/`: gsap-core, CSSPlugin,
  index, Observer, ScrollTrigger, SplitText; the standard no-charge
  licence; `npm i -D gsap` for the source). Preloaded in index.html.
- **scroll.js on ScrollTrigger.** ONE trigger over the page (start 0, end
  `max` px) scrubs a proxy `t` with `SCRUB` .55 (GSAP's expo catch-up:
  answered at once, never a step, never a delay); `t` is the story, `y =
  t · max`. The home-made damp is gone. `hold(t)` for the review hooks;
  `ScrollTrigger.refresh()` on every layout. Reduced motion: `scrub:
  true`. main.js's loop rides `gsap.ticker`.
- **text.js (new).** `makeReveal(block)`: SplitText lines (masked for a
  statement), one paused GSAP timeline per block scrubbed by the beat's
  copy progress (`set(p)` from movements.js `lives` and Captions): the
  label slides in first, the statement's lines rise through their mask
  one after another, the reading comes up line by line a breath later;
  leaving, the statement lifts back through its mask and the reading
  dissolves upward (IN .30, OUT .84). Built once after every split
  (`ready`), rebuilt by `autoSplit` on a change of measure, whole
  elements cleared of any earlier tween. The word-mask splitting and the
  `[data-rv]` / `.word` CSS transitions are retired. The hero keeps its
  load entrance.
- **ripple.js (new).** One fullscreen pass (half-float MSAA target, made
  on first use; the pass tone-maps and encodes since three r160 leaves a
  target linear and untoned): a soft ring travelling out from a point with
  a slow breath under it and a breath of light on the crest, ≤ 1.6 % of
  the frame, ×.75 on phones. main.js `SEAMS`: the opening letting go;
  arriving at the house; the dream; out of the yard to the water; out
  through the gateway; into the stone; the descent; the draw-back; the
  last step into the footer. `amt = k · (4u(1−u))^.8`, `phase = u`: with
  the hand, forward and back. Off between seams (a straight render).
- **The footer in the flow** (`position: relative; min-height: 100svh`;
  `#footer-space` gone from the page): the page's bottom is the footer's
  bottom on every screen; `footerP` from its own rect; `in-footer` at
  half. The last step into it carries the last, faintest ripple.
- **Phones**: every beat's `m` × .86 (a swipe is seen to move the story);
  the copy's glide 34 px over its window (was 22). The leave-taking's
  gaze begins to turn toward the house.

Verified in the pane: no errors; 189 split lines; the lines of a beat's
lead arrive one after another at u .22 and are whole at .5; leaving at
.96 and returning to .5 restores them (the timeline is scrubbed); the
ripple engages (amt .79 mid-lead, target allocated) and is off at a
reading beat; the footer reaches its bottom at t = 1 with the composition
under it; `npm run build` passes.


### 20 Sept 2026, late · THE WALK: the camera's vocabulary (the owner's twentieth brief, after Kage)

The owner: the background world felt static, moved by zooming, changed
composition abruptly, read as separate backgrounds; improve only the
movement, from the first frame to the last, with mengto.github.io/kage as
the cinematography reference (studied in its source: six waypoints whose
x, y, z AND target all change together, Catmull-Rom on position and
target, one damp λ 5.2, foreground cut-outs dissolving as the camera
reaches them, a pointer parallax whose target counter-moves). Nothing
else changed: copy, timing, heights, layouts, UI, colours, assets. Done
(main.js, pravesha.js, hero.js, river.js only):

- **`mv` per station** (main.js STATIONS): how the stand moves while the
  beat is read, in the shot's own frame — `lat` (metres right), `up`,
  `fwd` (negative: a pull-back), small `nx/ny/fov` — with the SUBJECT KEPT
  where the layout put it (the target holds; the stand moves). The
  differences slip one way then the other; the volumes are read moving
  alongside the row; the name climbs; Hari Sarvottama and the road draw
  back and rise; Manchale arrives at `comp 1.9` and settles to `comp 1.4`
  (the composition uncovered by arriving, then drawn back from).
- **`via` waypoints** (a list; each a point, an anchor, or `{ P, L }` with
  the gaze authored), placed along the travel BY PATH LENGTH so the pace is
  even: the lead's S along the near strip (toward the water, then in past
  the corner grass, the gaze coming round to the gate); in through the
  house's gate posts; out by the gate, along the bank south of the
  bananas, down to the water and across to the flight's foot (the steps
  passing on the right, the eye descending from the pad to the water);
  to the flight's foot and up it for the name; out through the gateway's
  OPENING onto the bay for Tattvavāda (the pillars crossing, the moon found
  through it); the draw-back out through the gateway, low over the bay,
  up onto the near bank a little left of and above the opening's frame,
  the return read settling into that frame exactly (`return · nearly
  home`, `end · the hold`).
- **The opening**: the first frame a step back, left and higher, its gaze
  above the stone; the hero copy is read settling forward and right, the
  gaze coming down onto the stone.
- **Pravesha KEYS**: settles that move — into the chamber and a little
  round to the left; right and up across the kūrmāsana's face; left and
  up at the plate; a small arc right while the stones go in; back, left
  and up at the stone (the pillar at the frame's edge); left along the
  tene; back through the opening, rising, at the images. The descent has
  a key in the gateway's opening.
- **Parallax**: the target counter-moves the stand (×.32 lateral, ×.18
  vertical): the drift has depth.
- **The mist ahead of the lens** (hero.js `setFore`, river.js `travel`,
  main.js): the opening's three foreground mist sheets, faint (≤ .13),
  only mid-way through a travel beat over the water (lead, the descent,
  the flight, the tail, the draw-back); the air +.0022 density there.

Verified in the pane at both sizes: no errors; ground clearance ≥ .45 m
everywhere outside the open chamber; the walk keeps ≥ 1.1 m from every
planted trunk; max travel 1.5 m per .04 vh, no spike over .5; every
passage screenshot (gate posts, gateway opening, the flight, the bay)
clean. Not verified: a real finger on a phone.


### 20 Sept 2026, night · THE SCORE: scroll as the master timeline (the owner's nineteenth brief)

The owner: the pacing was wrong across the whole site, not only the
Brindavana. Scenes ran ahead of their copy, copy stayed after its visual
beat, camera journeys finished before their explanation, sections felt
pinned, reading moments felt dead. Benchmark: seijaku.mengto.here.now
(studied in its source: `tTarget = scrollY / max`, one damp at λ 6,
hermite camera keys spaced tight at each text stop and wide between, text
windows as pure functions of t with short fades). The DIRECTOR (stops and
gestures) was reverted by the owner before this brief; this pass replaces
the paced/leashed scroll before it too. Done:

- **js/score.js (new).** `SCORE`: every chapter as BEATS, each sized in
  viewports (`vh`, and `m` for the phone) with its copy window as a
  fraction of the beat. Reading beats are 1.5–2.7 vh for their copy;
  travel beats (`mv-lead`, `way-02b`, `way-05`, `mv-tail`, `b-down`,
  `b-out`, `r-hold`) are .8–1.7 vh with no copy. Desktop 76 vh, phone 69.
  `layout(h, phone)` lays it out: y0/y1/t0/t1 per beat, `cA/cB/cC` (the
  copy window in t), `tAt(id, u)`, `beatAt(t)`. `COPY_IN/OUT` .20 vh.
- **js/track.js (new).** `makeTrack(keys)`: monotone cubic
  (Fritsch–Carlson) over non-uniform keys, C1, never overshooting; two
  equal keys are a hold.
- **js/scroll.js.** `ScrollTimeline({ reduced, phone, sp00, sp09,
  onLayout })`: `resize()` lays out the score, sizes the two spacers,
  computes `marks` (docA, docB, heroCopy, leave, dawn2, chamber, out,
  returnA) and calls `onLayout(lay, marks)`. `update()` is one damp
  (`LAMBDA` 7.5; a 3 vh fling closes to 5 % in .5 s). `tAt(y) = y/max`.
  `scrollToBeat(id)` lands a third into the copy window. Pace, leash,
  turn, stops, gestures: gone. `CAPTIONS` name a `beat`, not a/b.
- **js/movements.js.** `size(lay)` sets every section's, lead's, way's
  and tail's height from the score (css `.sec { height: 0 }`, no
  margins); `update(t, h)` lives every block from its beat's `cA/cB`.
  Nothing is measured from the page any more (centerP/rangeP gone).
- **js/main.js.** ONE camera: `buildCamera(lay)` makes keys in the
  approach frame — the opening (a step back at the first frame, settled by
  the hero copy's end, the leave-taking's step at the opening's end),
  every station's ARRIVE (cA + .05) and SETTLE (cB − .05: the same
  subject, the stand crept .16 of the way toward the next, ≤ 1.5 m, plus
  a push toward the subject of .18 of its distance ≤ 1 m, ny + .03, fov
  − .6), `via` waypoints in the travel, the Pravesha's `keyShots`, the
  hold at `b-out` and at 1 — and `camAt(t)` reads the track plus the
  idle sway (`swayAt`: on through the chapters, off in the stone, back
  with `b-out`) and the footer tilt. Camera damp λ 16 (was 7.5: the y is
  damped once already). `onLayout` derives the river's `winds`
  (works, books as [visible a, b, open c→d, closed e→f], pb, dream),
  `dayArc`, and `praveshaCues` (lift, cut, lit, mala, kurma, plate,
  vessel, shals, lid, lower, earth, tene, deities, deityLight, upper) in
  t from the beats. `?beats` builds the overlay (`#beats-hud`): chapter,
  t, beat, u, and every window logged in that beat as a bar with the
  cursor. Off without the flag.
- **js/world/pravesha.js.** `KEYS` are `[beat, u, P, L, fov, side]`;
  `keyShots(phone)` resolves them; `update(time, t, night, cues, on)`
  reads every window from `cues` (the courses staggered inside `lift`,
  `lower`, `upper`); `layer(obj, y, lift, cueName)`.
- **river.js / audio.js** read `marks` (docA, docB, dawn2, chamber) for
  the seams they used to hard-code.
- index.html: `mv-lead`/`mv-tail` carry ids; `way-02b`, `way-05` divs.

Verified in the pane (desktop and 375×812): no errors; every beat frames;
the camera's velocity profile per .05 vh: travel .3–2 m, reading .01–.05
m, launch as the copy fades; links land with copy up; reverse through the
stone reconstructs; `npm run build` passes. Not verified: a real finger
on a phone (the pane emulates); the owner should read the whole site once
at reading speed and retime beats in score.js (the vh numbers are the
whole dial: one line per beat).


### 20 Sept 2026, later · THE DIRECTOR: SCENE-GATED PROGRESSION (the owner's eighteenth brief)

The owner: even paced, continued wheel or trackpad momentum kept the
story moving and the text could not be read; wanted scene-level
progression (gesture → transition → settle → read → next gesture), no
momentum carrying into the next scene, no skipping, no trapping. Done
(scroll.js rewritten as THE DIRECTOR; main.js, movements.js, style.css):

- **The page does not scroll.** `html, body { overflow: hidden }` and the
  body is `position: fixed` (`touch-action: pinch-zoom`, so the pinch
  stays). The sections and spacers still lay out the story's length, so
  every `tAt`/`yAt` mapping, every station and every beat window is what
  it was; `window.scrollY` stays 0 and nothing reads it. The no-WebGL
  document scrolls as a document (`body.nowebgl`).
- **Stops.** main.js `timeline.setStops(fn)`: the opening (y 0), every
  chapter beat at its centre (`movements.centerY`, the same point the
  camera's station lands on), every Brindavana caption at the centre of
  its window (scroll.js CAPTIONS), the footer (`timeline.max`). 33 in
  all. Re-read on every resize; the current stop is kept by id.
- **Gestures.** A wheel gesture is a burst: it begins after QUIET_MS
  (280 ms) without wheel events, or at a fresh push (a delta above SPIKE
  = 2.2 × the running average of the last eight, over 30 px), and fires
  once its travel passes WHEEL_PX (40). A trackpad's momentum never
  pauses that long and only decays, so it is one burst, already fired:
  absorbed. A touch gesture is a swipe of SWIPE_PX (50) during the
  drag, once per touch. Keys: arrows, PageUp/Down, Space (Shift back),
  Home, End.
- **Progression.** `gesture(dir)` moves one stop, only when the story is
  `armed`: no transition in flight and SETTLE_MS (900) past the arrival
  (the title's words have landed, the copy stands). Otherwise absorbed.
  The transition (`goTo`) is one eased glide (cubic in-out) whose length
  follows the distance: .5 s per viewport, .8 s at least, 4.5 s at most
  (the walk from the composition to the house, the walk into the
  stone). A section link (`scrollToY`) goes straight to the nearest
  stop, ungated, .6–1.6 s. The review hooks (`step`, `snap`) set `y`,
  clear the tween and take the nearest stop.
- The pace cap, the leash and the turn of the seventeenth brief are
  gone with the raw scroll they governed.

Verified in the pane (fresh tabs, no console errors) at 375 × 812 and
1440 × 900: one wheel gesture → one stop (the lead walk in 2.3–2.5 s);
eight more wheel ticks and forty decaying momentum events during and
after the transition → absorbed, the story settled on the beat with its
copy whole; a deliberate gesture after the hold → the next beat;
ArrowUp back; a synthetic swipe forward; the Brindavana link straight
to its first caption in 1.6 s; `?nowebgl` scrolling natively. Not
verifiable here: a real trackpad's momentum curve and a real finger.
Dials: SETTLE_MS, QUIET_MS, SPIKE, WHEEL_PX, SWIPE_PX at the top of
scroll.js; the transition lengths in `goTo`.

### 20 Sept 2026 · THE STORY LEADS, THE PAGE FOLLOWS (the owner's seventeenth brief: the scroll; superseded the same day by the director, above)

The owner: the site still reacted too directly to scroll speed; a fast
scroll rushed the sequence. What the pace cap of the sixteenth brief had
left: everything IN THE PAGE'S FLOW still tracked the raw scroll (the
footer rose into the frame the moment a fling reached the bottom, over
whatever scene was still playing; the camera's footer tilt and the
`in-footer` state read window.scrollY), and a page flung far ahead could
not be turned round (scrolling back a little left the story still
advancing until the page had come back past it). Done (scroll.js,
main.js, index.html, style.css):

- **One paced position, in pixels** (`ScrollTimeline.y`). The native
  scroll (wheel, trackpad, touch, keys, the browser's momentum) is only
  the INPUT, read into `rawY`; the story keeps `y`, damped toward the
  page (λ 4.6) and then clamped to PACE = 1.6 viewports a second; `t =
  tAt(y)`. Everything visible reads `y` or `t`: the camera, the copy
  (`movements.update(timeline.y)`), the ground, the rail, the footer's
  tilt, `in-footer`. Nothing reads window.scrollY any more.
- **The footer follows the story**: it is `position: fixed` and rises
  over the story's last viewport by `--fp` (main.js, every frame, from
  `y`); a spacer `#footer-space` (100svh) keeps the page's scroll run.
  In the no-WebGL document it is static as before (`body.nowebgl`).
- **The leash** (LEASH = 2.5 viewports): the page may run at most that
  far ahead of (or behind) the story; beyond it, it is set back to the
  leash's end, so one fling queues at most 2.5 viewports of story, which
  the pace plays in ~1.6 s, and the next fling adds the next. A phone's
  fling of two or three viewports is honoured in full. Never pulled while
  a finger is on the glass (`touching`).
- **The turn**: input against the queued direction (the page still
  ahead, the visitor scrolling back, or the reverse) sets the page .3
  viewports from the story on the new side, and the story turns at
  once. Links (`scrollToY`) remain cuts: `free` exempts them from the
  pace, the leash and the turn while they fly.
- The review hooks (`ANTARANGA.step`, `snap`) set `y` as well as `t`.

Verified in the pane at 375 × 812 and 1440 × 900: a fling to the end from
t .10 plays 2.5 viewports of story at 1.6 vh/s and stops; a scroll of 60
px back against a queue turns the story within 150 ms; the footer rises
with the story (`--fp` 0 → 1 over the last viewport) and never before; a
nav link still lands in ~2 s; `?nowebgl` shows the footer static at the
foot; no console errors. Not verifiable here: a real finger's drag (the
pane sends mouse events).

### 19 Sept 2026, night · THE LOADER, THE PACE, THE DRAW CALLS (the owner's sixteenth brief)

The owner's brief: the loader finished its animation and then sat for ten
seconds; the site lagged; a hard scroll rushed through whole scenes. Not
allowed: longer animations, artificial delays. Measured first (the pane,
a Mac, so device speed is not the phone's): on a first visit the world was
READY at 1.6 s and the sheet lifted at 9.5 s; the CPU cost of a frame was
~1 ms while the picture was 807 visible meshes and 449 draw calls in the
opening at a wide frame (256 at a phone's), which is what a phone's driver
pays for. Done:

- **The loader follows the load** (preloader-draw.js). The hand's cap is
  the real progress (main.js `setProgress`: modules, fonts, the world
  built, the stone maps, the first render); a floor clock (5 s to the 90 %
  hold, was 3.1 s) keeps it moving through the stretch where the main
  thread is blocked building and can report nothing. The moment the world
  is ready the remaining strokes land at up to 160 %/s with no breaths,
  the working marks withdraw (.16 s + .32 s) and the sheet lifts after a
  .2 s beat (was a 3 s pose) over .85 s (was 1.15 s; css). `readyGuard`
  4 s. First visit in the pane: ready 1.9 s, gone 4.9 s (was 9.5 s);
  repeat visit: ready 1.5 s, gone 3.9 s (was 6.1 s). The critical path is
  the world build itself (`performance.mark('antaranga:…')` and
  `river:…` marks record it: `performance.getEntriesByType('mark')`);
  the models, the covers and the score were already lazy.
- **The pace** (scroll.js `PACE` = 1.6 viewports of scroll a second).
  The raw scroll never drives the story: `ScrollTimeline.update` damps as
  before and then clamps the advance of t to PACE × (t per viewport at
  this point of the story) × dt, so a thrown wheel or a flicked thumb
  still plays every beat, camera move and transition at a walking pace
  while the native scroll runs on ahead and the world follows. A section
  link is a cut: `scrollToY` sets `free` for its flight plus .9 s and the
  cap stands aside. The first frame stands where the page was opened.
  Verified: a jump from t .30 to the end advanced at 1.59 vh/s on the wide
  frame, 1.61 on the phone frame.
- **Draw calls** (util.js `mergeStatic`): a built thing's meshes that
  share a material (and shadow flags, render order, depth material,
  attribute set) are baked into ONE mesh under their group, in the
  group's frame, so the group still moves or hides as a whole; anything
  with userData on itself or an ancestor below the group, any shader
  material, instanced or skinned mesh or sprite is left alone. Applied
  to: each tree (trunk, flare and limbs one bark mesh), each palm (trunk
  and foot; the fronds one leaf mesh, their sway is per vertex; the
  nuts), each course of the Brindavana (per `parts` group, so Pravesha's
  lifting survives), the landing and terrace `S` in hero.js (the two big
  courses under the pad kept apart: Pravesha buries them by their
  BoxGeometry), the house (`threshold.group`; its lamps carry userData).
  Phone frame, draw calls: opening 256 → 171, works 135 → 124, the
  chamber 170 → 156. Meshes in the scene 872 → 565. Nothing looks
  different (checked: the opening, the house, the landing, the chamber).
- **The mirror on alternate frames** (river.js `reflect`): the planar
  reflection re-rendered the whole world every frame on desktop; it is
  drawn every other frame unless the camera has moved more than half a
  metre (a cut), which is not seen through the ripples.
- **Phone memory**: the ruins' nine 1024² maps are held at 512² on a
  phone (ruins.js `shrink`); the covers load their 640 px printing there
  (stations.js) instead of 1080 px.

Verified in the pane at 375 × 812 and 1323 wide: no console errors (a
"missing )" error seen mid-pass was a stale buffer from an interim broken
line, gone in a fresh tab); the loader timeline; the pace; the four
scenes; the mobile flow. Not measurable here: a real phone's frame time
(the pane's GPU is a Mac's).

### 19 Sept 2026, late · THE SCORE WITH THE PAGE; THE TREE PUSHED (the owner's fourteenth brief)

The score still took a moment to arrive on a phone; the owner asked for
it to be there as soon as the site is, and for the whole tree to go to
git. Done:

- **Two encodings** (`assets/audio/`): `boopul-deep-he.m4a`, HE-AAC at
  48 kbps (2.9 MB, afconvert `-d aach -b 48000` from the LC file), and
  the original `boopul-deep.m4a`, AAC-LC at 80 kbps (4.9 MB). audio.js
  picks HE when `canPlayType('audio/mp4; codecs="mp4a.40.5"')` says so
  (every current browser), LC otherwise.
- **Preloaded from the head** (index.html): `<link rel="preload"
  as="audio" fetchpriority="low">` for the HE file, so the download
  starts with the document, under the world's own assets; the <audio>
  element made at module load reads it from the cache (resource timing:
  the element's request answered in 8 ms). Verified: the element is
  `readyState 4` with the whole 479 s buffered by the time the opening
  is up, before any gesture. The idle `fetch` warm-up is gone.
- `ANTARANGA.ambience.media` and `.kicks` are review aids. Note for the
  pane: the site keeps a hidden tab silent (`document.hidden`), and the
  review pane reports itself hidden while the terminal is fronted, so
  the score cannot be heard from there in that state.
- The working tree is committed and pushed to `origin/main` (it had
  been three commits behind the tree since 28 Aug).

### 19 Sept 2026, late · THE FINISH UNDONE, THE SCORE PRIMED, THE LAYERS SEATED (the owner's thirteenth brief)

The owner's thirteenth brief: undo the grainy finish; the score starts
slowly on a phone; the Brindavana's layer beat glitches on both screens
(a screenshot of the kūrmāsana slab on the pad, patchy); then a cleanup
pass, mobile first, changing no design. Done:

- **The grade is off** (main.js): `setLinearMode(STYLED.linear && …)` as
  before the twelfth brief, the renderer's own ACESFilmic again; post.js
  stays, built only on demand (`ANTARANGA.grade`), so nothing is
  allocated for it. §4 **Finish** rewritten to say so.
- **The score is primed** (audio.js `prime` / `makeMedia`): the <audio>
  element is made as the module loads, with `preload="auto"` and
  `load()`, and a low-priority `fetch` at idle warms the cache for the
  browsers that hold buffering back until a gesture; `build()` reuses the
  element. The first arrival is 1.4 s (later ones 2.6 s). The first tap
  on a phone used to create the element and then wait on the network.
- **The layers seated** (pravesha.js): the kūrmāsana's top sat exactly on
  the pad's plane (y 0) and the two faces fought for every pixel, worst
  with the cursor parallax on a wide frame; the plate, the box, the lid,
  the earth, the tene and the images were each exactly on the one
  below. Each rests a few millimetres above the plane under it now
  (kūrmāsana −.214, plate .008, box .07, lid .07 + BH + .004, earth
  .686, tene 1.192, the images 1.598), every layer mesh takes a clone of
  its material with a polygon offset (−1, −2), and a faint self-light
  (.09 of its own colour, the map as emissive map) so a layer's
  underside, seen from below as it comes down past the frame's top,
  reads as dim metal or stone and not as a black cut-out (the silver
  plate crossed the header black on a phone at p .40).
- Checked on the phone frame: the seam into the chapters (t .0705), the
  chamber (p .30), the kūrmāsana (.37), the plate (.40, .43), the
  śāligrāmas (.47, .50), the images (.70), the tail (t .715), the return
  (.945), the footer; on the wide frame the śāligrāma beat under three
  cursor positions (no fighting) and the chamber at .37. No console
  errors. The chamber's own lamp passes close to the lens as the camera
  rises out at p .34–.40 (2.7 units): left as designed.

### 19 Sept 2026, night · THE TWO BEATS, THE MOBILE FOOTER, THE FINISH (the owner's twelfth brief; the finish UNDONE the same night, see above)

The owner's twelfth brief: the centring was meant for the two beats in
the screenshots only (the Tattvavāda opening, Hari Sarvottama); undo it
everywhere else, keep the mobile footer; the music seemed uncontrollable
on a phone and to play all the time (it was the review pane's own tab,
which plays once a click has been made in it; closed); and the finish:
match Seijaku's restrained photographic look, applied only to the
existing post-processing, changing nothing else. Done:

- **Only mv-05 and mv-05f are centred** (`.sec.mid`, style.css "THE TWO
  CENTRED BEATS" and the `.sec.mid` rules in the wide-frame block). The
  column, the `.right` alternation, the eyebrow's Kannada at the right,
  the phone's indent for the right-hand differences, the stations' `nx`
  / `ny` for every other beat: all as they were before the eleventh
  brief. The pull-back walk stays; its side beats look right of the
  column again (05a, 05c, 05e, 06) or left of it (05b, 05d). The pool's
  reach follows the beat (movements.js: a third of the frame beyond the
  column, a fifth beyond a centred block). The footer's gradient and its
  phone centring stay.
- **The sound on a phone**: the compact control (`#sound-btn-m`) toggles
  as it should (verified with taps at 375 × 812: on → playing, off →
  paused). audio.js now calls `ctx.resume()` and `media.play()`
  synchronously inside the gesture and only then awaits them (Safari
  counts the gesture until the first await).
- **THE FINISH** (js/post.js rewritten; main.js): the renderer tone-maps
  NOTHING any more (`setLinearMode(true)` every frame: NoToneMapping,
  linear output; the water and sky shaders already took `uLinear`). The
  scene is drawn once into a multisampled (4×) half-float target and the
  one composite finishes it, after Seijaku's FinalShader: occlusion
  (desktop: depth-only, half res, twelve samples on a spiral inside a
  .55 radius, denoised by a depth-weighted cross blur, blended at .6 as
  Seijaku's GTAO) · bloom (three halvings; threshold 1.6 by day → 1.0 at
  night, strength .11 → .21: only the moon, the lamps and the sun's path
  bloom) · exposure 1.05 (what the renderer's ACESFilmic had) · a toe
  lift of .012 in linear (the blacks keep their material, never crushed)
  · ACES, the RRT/ODT fit, once · saturation 1 · a warm daylight bias
  (1+.04d, 1−.01d, 1−.09d: by day only; the night's colours unchanged) ·
  aerial depth (.10 toward the air's own fog colour with distance, over
  what the scene fog does: a lift, not a haze; desktop) · a soft vignette
  (.5 of Seijaku's curve; the CSS `#vignette` stays) · sRGB. The
  chromatic aberration and the shader grain are gone (the CSS `#grain`
  tile is unchanged). On a phone: no occlusion, no aerial term, the rest
  the same. `ANTARANGA.grade` exposes the pass for review
  (`composite.uniforms.uAO / uHaze / uVig / uLift / uExp`).

Verified in the pane at 1440 × 900 and 375 × 812: no console or GL
errors; the opening, the day, the night, the dawn through the grade; the
occlusion visible at the platform's courses when exaggerated ×5, quiet
at .6; only the two beats centred, the rest in the column; the phone's
footer centred on its shade. Not verifiable here: frame times with the
target render on a real phone (one extra full-frame composite and the
half-res bloom chain).

### 19 Sept 2026, later · CENTRED, AND ONE PULL-BACK (the owner's eleventh brief, three screenshots; the centring REVERSED to two beats the same night, see above)

The owner's eleventh brief: the chapters' copy to be centred, not at the
side, easier to read and calmer against the world; a comfortable line
length with room around it; the footer centred on a phone; a subtle
darkening behind the footer and the text-heavy beats without the scene
going heavy; and the movement moon → stone → moon (the screenshots were
mv-05 and mv-05f) to stop feeling accidental: no odd tilts, no abrupt
turns, one continuous travel through the same place, in both directions.
Done:

- **The copy is centred** (style.css "THE CHAPTERS", the base rule and
  the wide-frame block). On a wide frame the block stands at the frame's
  centre, its centre at 58 % of the height (`translate3d(-50%, calc(-50%
  + var(--dy)))`, the glide still composed as a custom property), width
  min(720px, 60vw), the title ≤ 20ch (`.sm` 24ch), the lead ≤ 52ch, a
  sub-beat's copy ≤ 46ch, a quiet beat's ≤ 44ch, the dates grid centred.
  On a phone the block keeps the frame's foot, set centred, ≤ 38ch. The
  eyebrow is centred and the Kannada name simply follows the label (no
  `margin-left: auto`). `.sec.right` no longer does anything (the markup
  keeps the class; remove it at leisure).
- **The pool is tighter** (movements.js `carryPool`): on a wide frame its
  reach is the block plus ~a fifth of the frame each way (was a third),
  so the subject above the centred words stays clear of the shade.
- **The footer** carries the one shade it needed: a linear gradient of
  the night colour from 0 at its top edge (nothing to show as a band
  while it scrolls in) to .64 at the page's foot. On a phone the mark,
  the links and the colophon are all centred.
- **Tattvavāda is ONE SLOW PULL-BACK** (main.js STATIONS mv-05 … mv-06).
  Before: the moon from the left bank (−7, 34), the stone from beside the
  gateway (9.4, 18) across the bay, the moon again (−9.5, 30), the steps
  from inside the inlet (−9, 20 and −6, 17), the bank again (−4, 37):
  every beat a new stand, the look swinging half a circle, and the
  screenshots were exactly those two frames. Now the walk leaves the
  landing through the gateway's opening (the straight line from the last
  volume's stand passes the opening; checked at t .4237: the terrace's
  left edge, the pillar right) and stands on the water of the bay at
  (−6, 1.55, 30.5); from there it only steps BACK along the sacred axis, a
  metre or two a beat (z 30.5 → 32 → 33.5 → 35 → 36.4 → 37.8 → 39.4 →
  41.4), until Manchale's composition (mv-07, `comp` 1.4 = frame00 + 1.4,
  at z 44.6) is reached by arriving at it, three metres on. The stand
  never crosses the water again; what moves is the gaze: the moon (ny
  .48, high over the long lead), its path on the water, the stone in its
  gateway (sl(0, 3.2, .5), nx .10), the path again, the platform's foot
  where the stone goes into the water (sl(−4.5, .3, 19) and sl(−3.5, .4,
  16.5), right of centre, the gateway whole above), the whole group, the
  far bank for the road. Pans of ~35°, each over a beat's scroll, eased
  as before (smoothstep with the 16 % creep). Then the tail walks forward
  through the gate as it did.
- **Every subject stands above the centred column**: the house's door
  (mv-01 ny .34), the sand and the veena (mv-02 / 02m ny .42 / .30), the
  Matha (.22), the dream (.20), the works and the open volumes (.18 /
  .22, nx eased to .18–.22). The phone framings (`m`) were already so.

Verified in the pane at 1440 × 900 and 375 × 812: no console errors; the
stations sampled (`ANTARANGA.step`, four ticks, 1.5 s, two screenshots);
the moon beat, the stone beat, the flight's foot, the composition; mv-01,
mv-02, mv-02m, mv-04a with the subject clear of the words; the footer on
the phone centred and on its shade. Not verifiable here: the pans at
scroll speed on a real phone.

### 19 Sept 2026, night · THE FIXES AFTER THE BEATS (five screenshots)

The owner's tenth brief, five screenshots: the name beat off-centre and
cut; a line through Rayaru in the chamber; the Pravesha copy faint and
out of step; the veena "not visible"; two soundtracks; the object tags.
Done:

- **The name beat**: movements.js wrote the glide as an inline
  `transform`, which overrode the stylesheet's centring translate on
  `.fin .sec-in`. The glide is now a custom property (`--dy`) that every
  placement composes (`translate3d(0, var(--dy))`, the name
  `translate3d(-50%, calc(-50% + var(--dy)))`).
- **The line through Rayaru**: the platform's two stone courses (hero.js,
  boxes 13.8 × 1.2 and 9.4 × 1.9) are solid through the chamber; the
  section plane cut their front away but their top faces crossed the
  room at the seated figure's chest, seen edge-on from the chamber
  camera. pravesha.js's sweep now buries a BoxGeometry of radius 5–12
  within 9 of the chamber while the cut is open, with the tufts; both
  come back as the bank closes.
- **Copy in step with the world**: the beats read the DAMPED scroll
  (`movements.update(timeline.yAt(t))`), the same t the camera follows,
  so a flick never lands the words a second before the walk. The
  envelope starts at the section's own top (IN .30 vh), out over the
  last .30 vh (+ .10). The volumes lie on the landing only from the
  works chapter's own arrival (`works: [r('mv-04')[0] + .006, …]`, pad
  .012), never under the name. Pravesha captions fade over .012 of t
  (were .020) so each block is whole against the layer it names.
  `mv-lead` 150 vh (130 on a phone), the hero copy leaves over
  t .020–.058: a slower walk out of the opening.
- **The veena**: verified in view at 1440 × 900 and 375 × 812 at the
  household beat (the copy's arrival now matches the camera's).
- **The score alone**: the filtered-noise river is removed; MUSIC .34.
  The sound preference is per session (sessionStorage), so every visit
  starts with the score on; the header control and M turn it off.
- **The tags on the objects** (SRI HARI · THE MOON, JĪVA · ITS IMAGE,
  JAḌA · THE STONE, THE STEP, THE LIGHT, COURSE ON COURSE) are gone.

### 19 Sept 2026, later · THE BEATS (Seijaku pacing: fixed copy, one continuous walk, the environment left natural, the recording as score)

The owner's ninth brief, with Seijaku (seijaku.mengto.here.now) as the
reference for pacing and restraint: the opening felt replaced by the
first chapter; the copy scrolled like a web page; the pañcabheda beats
all sat in one place; the body copy was lost against the world; the
book beats broke on a phone; grass travelled across the bank; the far
bank's lamps looked artificial; a full glitch and mobile pass; the
recording as the score; the preloader in the site's own colours. Done:

- **The copy never scrolls** (`js/movements.js`, rewritten; style.css
  "THE CHAPTERS"). A section in the flow is only the SCROLL LENGTH of
  its beat (main.js still measures the walk and the stations' windows
  from it, `centerP`/`rangeP`); its `.sec-in` is `position: fixed` at
  the reading position and `lives()` gives it a scroll-linked envelope:
  it rises and fades up as the frame's centre comes down onto its
  section (in over .26 vh, starting .10 vh before the top), holds, and
  dissolves over the last .26 vh (+ .10 vh past the foot); a 22 px glide
  through its life. `.sec.on` is set while a beat is up and cleared
  after, so the title's words rise again on the way back. The pool sits
  on the block's fixed rect (measured once, on resize). Links land the
  frame's centre .22 vh into the section. Every `[data-rv]` arrival is
  keyed to `.sec.on`, never to an IntersectionObserver. `mv-lead` is
  100 vh: the walk from the composition to the gate has nothing to read.
- **The five differences alternate**: `mv-05b` and `mv-05d` carry
  `.right` (index.html); on a wide frame the column stands at the right
  gutter, the copy still set left; on a phone the column is indented
  10 vw. Their stations put the subject on the LEFT (`nx` −.30, −.24).
- **Legibility**: reading copy is Karla 400 (`--weight-body`), leading
  1.66–1.7; the lead Old lace at .94, the body at .82; every heavy
  text-shadow is gone (a 2 px .3 hint remains); the pool is a shade
  denser (.88 at the heart). Titles keep a soft 22 px glow.
- **The seam 00 → 01** is continuous by measurement (camera, fov, fog
  density and colour sampled .069–.073): the opening's idle drift no
  longer dissolves at the dolly and returns smaller at the first station
  (one drift, .22/.14/.05, in `cam00` and `camStations`); the cursor
  parallax amplitude eases .2 → .12 over t .04–.10 instead of stepping
  at the chapter boundary; the "edges" (two grass sheets carried ahead
  of the camera, which popped in at t .0703 and travelled across the
  ground with every move: the drifting grass) are gone from
  stations.js. Every plant is rooted (hero.js); only tips move.
- **The road's lamps are gone** (river.js `farLamps`, four clusters of
  glow sprites over the far shore) and with them the towns' name
  sprites and MANCHALE over the gateway (stations.js). The places are in
  the copy; the far bank stays the far bank. The pañcabheda tags on
  their objects stay.
- **The volumes on a phone**: the shot stands off the fore-edge, higher
  and further (`sl(bx + 1.7, 2.1, bz + 2.0)` → `sl(bx − .1, .86, bz)`,
  ny .30), the cover lifts to 2.3 rad (2.75 on a wide frame) so the open
  book stays inside a portrait frame; the cover opens as the walk lands
  (rc − .06 L → rc + .10 L) and is down before the next (rc + .32 L →
  rc + .46 L), so one volume is open at a time. The name beat (`.fin`)
  on a phone stands on the frame's foot, tighter, never cut by the
  header.
- **Mobile performance**: no planar reflection on phones (river.js
  `reflect`: the water shader carries the moon and the lamps itself),
  DPR cap 1.25 (MSAA on), the film-grain blend layer off under 768 px
  (a full-frame composite every frame). Shadows were already off.
- **The score** (`js/audio.js`, rewritten): the owner's recording
  `assets/audio/boopul-deep.m4a` (80 kbps AAC, 4.9 MB, transcoded with
  afconvert from Downloads/boopul-deep.mp3) STREAMED through an <audio>
  element into the graph (never decoded whole), looped, under a lowpass
  at 5.2 kHz; under it the river, filtered noise breathing on two slow
  LFOs, always a step louder (RIVER .42, MUSIC .30 of MASTER .8: tune by
  ear). The master arrives on a 2.6 s time constant after the first
  gesture; `update(t)` moves the river down in the chamber (.76–.90) and
  both a little under the chapters, on 1.6 s constants: nothing starts
  or stops between chapters. The synthesis is deleted.
- **The preloader** is the night's charcoal (`--paper #14140f`), the
  drawing in the deepas' gold (`INK [201,164,104]`, css `--gopi`), the
  caption Bone; the sheet lifts onto the pre-dawn river without a step.

Verified in the pane at 800 × 1005, 1440 × 900 and 375 × 812: no console
errors; the beats fade in place; the right-hand differences; the open
volume centred on the phone; the name beat whole on the phone; the seam
sampled continuous. Not verifiable here: real phone frame times.

### 19 Sept 2026 · BRINDAVANA PRAVESHA IN THE ONE WORLD (no stages, no cuts; the chamber under the bank; the pull-back to the opening)

The owner's eighth brief: the constructed Brindavana was the wrong form
(it was the stack stage's chamber standing in for the body course; the
reference is the bank's own stone); Rayaru sat halfway up the stone
instead of BELOW the ground; the chapter cut straight to him; the copy had
a treatment of its own; the sky changed; the copper was a small red box;
the images were invented; the complete Brindavana handed over to "another
copy of the opening scene"; the ending should echo the opening by camera
movement; a double scroll before the footer. Done as one system:

- **No stages after the river.** `pravesha.js` is rewritten as
  `createPravesha(ctx, { brnd, brndPos, sl, approachToWorld, world })`,
  built INSIDE the river world by river.js on the bank's own Brindavana
  (`brnd.group`, model space), and exposed as `stages.river.pravesha`.
  antaranga.js is deleted; main.js `LATER = []`, `ORDER = ['river']`;
  scroll.js `VEILS = []`. The camera never leaves the place.
- **The chamber is under the pad**: earth panels cut round a stone room
  (3.4 × 1.9 model units, floor at −2.05, front at z 1.70) with the Vyāsa
  Pīṭha, Rayaru (`loadRayaru`, 1.36), the granthas, the cloth, the
  kalasha, incense, jasmine, two deepas. **The bank is cut open** with a
  clipping plane (`renderer.localClippingEnabled`; `addClip` puts it on
  every built-in material of the river world outside `brnd.group`, the
  water's shader carries the clipping chunks, painted cards fade by their
  distance into the cut half, and a sweep every second while the cut is
  open catches meshes added later). `setClip(k)`: the plane's constant
  goes 400 → 2.0 (S frame) as k² so the bank is open before the camera
  comes down (k over p .10–.21, closing .60–.70).
- **The day breaks over Manchale** (river.js `late` from .725, dawn2
  .733–.775): the tail station now ends on Manchale's composition through
  the gateway (`sl(3.5, 2.8, 22)` → `sl(0, 2.8, 1)`), KEYS[0] of the
  Pravesha path is that frame, so the walk hands over without a step. The
  courses of the stone lift away (UP, p .06–.19, the garland going) while
  the environment settles; then the descent, the reveal (lamps .20–.27).
- **The layers** come down in model space in their windows of p: the
  kūrmāsana (3.8 × .22 at −.22, the tortoise on it) .33–.375, the plate
  (2.4) .395–.43, the copper vessel (a lathe, r .94, lid and rolled rim,
  copper `0xb87333`) .455–.50 with the śāligrāmas gathering round it
  .49–.52, the lower courses .53–.61 (the cut closing), the earth (1.00)
  .60–.63, the tene (1.50) .625–.66, the images (1.95, brass after the
  reference: peetha, lotus, prabhāvalī with flames and the sun; Narasimha
  seated, Srinivasa standing with four arms) .675–.71, the upper courses
  .69–.76, the garland .74–.77. The column is 2.4 wide: inside the lotus
  rim and the body, clear of the niche recesses.
- **One camera path** (`pravesha.cam(p, hold, phone)`, nine keys in the
  sacred frame + the hold = main.js `frame00()` itself at p 1): Manchale
  → down before the cut → Rayaru → up with the layers → back for the black
  stone → the images → the whole, held (p .78) → the opening's hold (p 1).
  main.js `camPravesha(t, tilt)` drives ci 9 and 10 and the footer's
  gentle tilt; the opening's idle drift comes in as the hold is reached.
  No veil, no cut, no reset: the opening IS the wider world around this
  stone.
- **The copy** (scroll.js) is the owner's verbatim in the site's own
  setting: `.t-q` is the scene display (`--size-display`, sentence case),
  one `t-loc` on the first block; the numbered capitals are gone. Blocks at
  .7305 / .7855 / .813 / .832 / .849 / .871 / .893 / .909; the return
  .945 "Mantralaya · Every year", .9725 "Mantralaya · Today".
- **One scroll into the footer**: `TAIL` 1.6; `#footer` is exactly one
  viewport (min-height 100svh, flex, its lines at the foot, no
  background): the story's last scroll (t = 1) is the frame the footer
  stands in, so scrollHeight − vh === timeline.max and nothing is scrolled
  past to reach it.

- Also: hero.js no longer plants tufts within 8 of the Brindavana (they
  were buried in the platform and showed through the cut); the instanced
  shore reeds fade out with the cut; pravesha.js re-sweeps the world for
  late materials once a second while the cut is open.

- The owner's ninth brief (same day): the water sheet crossed the chamber
  at chest height (it lies under the pad, on the section plane's kept
  side), so the water and the bank terrain take a BOX of four planes with
  `clipIntersection` instead (`boxFor`; the platform's footprint ±8,
  z −3 → the cut's reach, only under the pad when closed); the cut face is
  packed river sand (`sandCanvas`), 9 deep and ±10 wide, so the sky dome
  never shows under the horizon; the kalasha is gone from the chamber; the
  copper box is SQUARE (1.6, open, a rolled rim) and the śāligrāmas fall
  into it one by one (p .495–.54) before the lid comes down (.535–.565);
  the column is 2.0 wide (the body course is a 2.36 core with face panels
  at ±1.2: a 2.4 column sat in them and fought through); "Every Śrāvaṇa,
  Ārādhana marks the day…" is the closing block's headline (`t-q`); the
  block ends at .986 so it has gone before the footer's lines rise on a
  phone, and `body.in-footer` is set from the scroll (the last half
  viewport), since the one-viewport footer's own progress is always 0.

- Tenth brief: the chamber has no side walls (the cut earth is its sides);
  the cut plane stands at S 1.90, just behind the earth face at 1.955, so
  no sliver of the platform's slabs crosses the opening, and the bank
  closes at p .37–.43 (lamps out .36–.40) while the camera is still rising
  past the pad, never with the chamber in view; the closing block's three
  short lines are one `t-body` stanza with line breaks. The buried-object
  sweep hides only SMALL meshes (bounding radius < 3): it had been hiding
  the platform's own blocks, which left the chamber in view after the cut
  had closed.

Verified desktop (step + tick, so the frames are settled) at .745, .778,
.80, .806, .86, .882, .92, .94, .955, .99 and the end. Known: the pane's
first screenshot after a step is the previous frame; take two.

### 18 Sept 2026, night · BRINDAVANA PRAVESHA, ONE STORY (the Brindavana section, the return, the footer)

The owner's sixth brief: the section read as Pravesha → a separate
architecture section → an exploded diagram; make it ONE story (he enters,
sits in dhyāna, the slabs rise, the layers are placed, the Brindavana takes
form, we understand the whole), with the owner's copy verbatim, each block
only while its layer is shown; then return to the opening's river with no
cut, the footer rising out of it as the last metres of the same scroll; fix
the double scroll; slow the ending. Done:

- **The sanctum** (pravesha.js): unchanged room; retimed. The mala stills
  at u .52–.60 (under the "Rayaru within the chamber" block, which names
  the sign); the four side slabs rise u .60–.88; the cap slab and the
  close stone face are GONE: the camera lifts (u .70–.92) and looks down
  into the open enclosure, the lamps still seen through the open top.
- **The form taking shape** (antaranga.js, rewritten): no paper ground, no
  Karla labels, no pedestals, no hero śāligrāma. The same dark as the
  sanctum (main.js atm `0x0d0d09` d .011; `ui-light` no longer set here).
  The locked Brindavana stands with its body course hidden and an
  open-fronted CHAMBER of the sanctum's slab stone in its place, Rayaru
  (`loadRayaru`, .92) seated within by a small lamp; the upper courses
  stand lifted (`LIFT`, 3.8–7.6 units, clear of the frame). The layers
  come down into the column, each in its window of u: the kūrmāsana (a
  slab with the tortoise form on it) .05–.15, the rajata phalaka .22–.31,
  the copper box .37–.45 and the śāligrāmas gathering round it .45–.53,
  the chamber's last slab .50–.60 ("the final slabs were laid"), the sacred
  earth .66–.73, the tene (`grainCanvas`) .74–.82, the two gilt images in
  their niches .86–.93; then the upper courses descend (.90–.98, staggered)
  and the garland comes with the complete form (.96–1). Camera: five keys
  from the open chamber up the column, back for the black stone, up to the
  images, back to the whole; the stone right of centre on wide frames,
  above the copy on phones.
- **Copy** (scroll.js CAPTIONS): the owner's nine blocks verbatim, each
  keyed to its layer: .7275 the day, .7495 within the chamber, .7925 the
  kūrmāsana, .8095 the silver plate, .8235 the śāligrāmas, .8435 the stone,
  .8615 the grain, .8725 the deities above; the return .912 "Mantralaya ·
  Every year", .950 "Mantralaya · Today". The old study/1,200/Aradhana/
  Namaḥ captions are gone. Every caption now carries its own edgeless
  shade (`.cap .cap-in::before`, closest-side radial, as the hero's), so
  the return's lines read across the second sunrise.
- **Timeline**: T9A .725 (sanctum) → T9B .790 (the form) → T9C .900 (the
  bank); CHAPTERS c09 .725–.900, c10 .900–1. VEILS: .7255 (into the
  stone), .790 (the open top → the kūrmāsana laid, the same dark), .900
  (the complete Brindavana → the same stone on its bank at night).
  `TAIL` (scroll.js) = 1.35: the tail's spacer is a third longer, so the
  layers and the return go at a walking pace.
- **The return** (main.js cam10): from a frame before the stone on its
  bank (`sl(0, 2.7, 12.5)` → `sl(0, 3.1, 4.6)`) the camera draws back to
  the opening's hold over u 0–.55; river.js `late` from .880, the second
  dawn .925–.970; the Aradhana link from .94.
- **One scroll** (the "double scroll"): there was never a nested scroller;
  the dead viewport was `#sp09 = L09 + h`, a screen of nothing between
  t = 1 and the footer, over a frozen frame. The spacer now ends where the
  story ends and the footer follows in the same flow; its padding-top
  (230vh, phone 170vh) is the run over which `footerP` = (scrollY −
  timeline.max) / (footer height − vh) keeps the camera settling and the
  night ground coming up through the river (the `#footer` gradient, 0 →
  .96 over the whole run). The footer content is the owner's: the mark,
  four links (The life · The granthas · Tattvavāda · The Brindavana), "A
  small seva by Chaitra Rao", श्री मूल रामो विजयते with its reading, the
  tribute line and © 2026.

Same night, the owner's seventh brief on this section (the ovoid images,
the assembled stone unseen, the section and the footer too dark, a second
mala, and Seijaku's copy treatment as the reference):

- **The images** are brass now (`brassImage` in antaranga.js, after the
  owner's reference idol): a stepped peetha, two pillars and an arch of
  brass with nine flames and a sun at its crown, Narasimha seated with the
  mane and Lakṣmī on the knee, Srinivasa standing with four arms, the
  discus and the conch; gold with a little emissive so it reads without an
  environment map; scaled .74 so the kirīṭa stays under the crown's cap.
- **The air** of the section is a warm dark, not the night (main.js atm
  `0x24201a` d .0085; the stage's ground `0x24201a`, hemi 1.3, key 3.0,
  fill 1.0, a warm light behind the stone), so the black stone stands off
  it. The assembly is retimed to finish BEFORE the seam: the courses come
  down u .76–.84, the garland .84–.87, the camera holds the whole from u
  .90 (t ≈ .889) and VEILS[2] now only begins at .894 (wIn .006).
- **The footer has no overlay**: `#footer` background none; the lines carry
  a text shadow; cam10's footer tilt is .45 of what it was, so the gateway,
  the stone and the sky stay in the last frame.
- **The second mala is gone** (pravesha.js): the relief carries its own.
- **The copy at Seijaku's scale** (style.css `.t-q`, `.cap .t-loc`, `.cap
  .t-body`): the titles are lapidary CAPITALS, clamp(2.4rem, 5.4vw,
  5.2rem), leading .98, 11ch; the label above is numbered ("03 /
  Brindavana Pravesha", scroll.js); the copy 1.12rem on a 36ch measure.
  The words are still the owner's verbatim; the capitals are CSS.

Verified desktop and phone at .736, .762, .782, .802, .818, .836, .853,
.866, .878, .888, .8905, .906, .93, .968, mid-footer and the end. Known: the
lifted upper courses show at the top edge of the frame on a phone while the
lower layers go in (they are the story's "upper portion", waiting).

### 18 Sept 2026, late · THE POOL (no scrim may have an edge: one shade for the whole site)

The owner's fifth brief: a dark horizontal band behind the copy in section
after section, the darker layer's start and end visible, the scene's tone
stepping at the boundary; the site reading as "3D background + dark UI
overlay + text layer". Diagnosed in the browser: every chapter painted its
own scrim in `#movements .sec::before`, a radial pool inside the section's
box. A box is a rectangle, and its bottom edge crossed the frame as the
section scrolled up (the 18 Sept mask only softened the top). Fixed as a
system, not per section:

- **One pool** (`#pool`, index.html, after `#gl`; style.css "THE POOL"):
  a fixed viewport layer holding ONE square `<i>` with a
  `radial-gradient(circle closest-side, …)` of the night colour that
  reaches 0 exactly on the square's inscribed circle, so the box the
  gradient lives in is transparent wherever it could ever cross the frame.
  No mask, no box edge, nothing to see.
- **Carried onto the copy** (movements.js `carryPool`, called from
  `update()` each frame): a block is the union of a section's copy
  (eyebrow, title, copy, dates; `measureBlocks`), not the row. Each frame
  the pool sits at the presence-weighted centre of the blocks in the frame,
  scaled to them (`rx` = half the block + 30% of the frame, or off both
  sides on a phone; `ry` = half the block + 34% of the frame), and its
  opacity is the presence: rising ahead of the block (bottom 1.34h → .96h),
  going as its last line climbs out through the upper third (.44h → .04h);
  `.pale` sections carry 1, the others .8. All of it is a transform and an
  opacity on one composited layer: nothing repaints while the page scrolls.
- **Removed**: `#movements .sec::before` and its `.pale` / wide-frame
  variants and the top mask; `body.nowebgl` hides `#pool` instead.
- Checked and left: `#hero::before` (a `closest-side` radial, 0 at its
  rim, no edge), the Brindavana captions (text shadow only), `#footer`'s
  bottom gradient (ends at the page's end), `#vignette` (radial, soft).

Same evening, three more from the owner's screenshot of the writing years:

- **The far bank at night was cotton** (pale detached blobs along the far
  shore). Two causes. hero.js applied the cards' night fog
  (`fogC.lerp(fogNightDeep, night * .9)`) inside the tail's block only, so
  through the night chapters the far tree lines kept the dawn's lavender
  haze (`#7b7495`) while the scene's fog was `#10141d`: now in the night
  block, where it belonged. And vegetation.js `farBankTexture` floated its
  back-layer crowns up to 36px clear of the scrub band, in the lightest
  tone: they now sit on the band, wider and lower, and the three tones are
  closer. The five far cards carry `userData.far` and take an extra
  `1 - night * .35` on their tint, so at night the line is a silhouette
  darker than the sky. Verified by magnifying the horizon strip of
  `ANTARANGA.snap(t)` at mv-04 (night) and the hero (dawn, unchanged).
- **The covers opened before the cover was seen**: `winds.books[i]` was
  `rangeP(id)` and stations.js opened from 10% of that range, i.e. as the
  beat entered the frame. main.js now passes `[enters, leaves, centred]`
  and stations.js opens from the centre (`rc + .02L → rc + .30L`): the
  walk arrives, the cover is read closed, then it lifts; it still closes
  as the walk leaves.
- **"Around forty-five works" → "Around 45 works"** (index.html mv-04).

Lesson 12 revised: masking a scrim's top only moves the band to its bottom.
The only scrim that can never show an edge is one whose gradient reaches 0
inside its own box, on a layer that is not a section.

### 18 Sept 2026, night · ONE JOURNEY (the whole-site pass: sky, copy, the walk, the dream, the volumes, the differences, the road, the stone)

The owner's fourth brief (Seijaku the benchmark for clarity, sky,
composition and continuity; the site still "AI-generated, too smooth in the
wrong places"; the copy placed on top rather than composed; the dream only
words; the granthas a static insert; Tattvavāda not intuitive; the moon
not a moon; the road forced; the Brindavana abrupt; scroll section-by-
section). Done, in one system:

- **Sky**: `clouds.js` rebuilt as CUMULUS: painted banks with a lit crown
  and a shaded base on far sprites, coloured by the hour (`setHour`: rose-
  cream over mauve at dawn, white by day, reddened through dusk, faint grey
  at night). **The moon** (river.js `moonDisc`) is a drawn disc, limb-
  darkened, its maria in, a faint halo; no longer a glow blob.
- **Copy**: on wide frames the column sits LOW in the frame (`.sec`
  flex-end, the pool centred at 70%), the title larger (clamp 2.5–4.2rem,
  14ch), the measure 38ch, the eyebrow given air. The stations' `ny`
  still put the subject right of it.
- **The walk never stops** (main.js camStations): the smoothstep between
  stations carries 16% of the linear, so the camera creeps through each
  station instead of halting at every screen. Stations may carry `via`
  (a waypoint the position passes through; the look stays steady): the
  house's gate on the way out, the gateway's opening on the way into the
  stone.
- **The dream** (mv-02d): keyed to its own window (`winds.dream`), the
  vision comes as LIGHT: a warm pocket in the sky behind the stone and a
  streak from it on the water (the sky/water `uMode`, now the dream's
  dial and nothing else), a gold air behind the Brindavana (hero.js
  `brndGlow`), the two deepas glowing before anyone has lit them, the
  fireflies and the motes thick over the water; then it goes and dusk
  falls into the name.
- **The volumes OPEN** (stations.js): each is a block (its first page on
  top: the work's name in Devanagari, a rule, faint set lines, `pageCanvas`)
  and a cover hinged at the spine; `winds.books` (one range per sub-beat)
  opens the cover as the walk reaches the book and closes it as it leaves.
  The object first, then its page. The Devanagari names: न्यायसुधा परिमळ,
  तन्त्रदीपिका, भाट्टसङ्ग्रह, मन्त्रार्थमञ्जरी, तत्त्वप्रकाशिका भावदीप.
- **Pañcabheda named on its objects** (stations.js `PB`, `tags`): while
  each difference is read, a small name in the site's label register stands
  on each of its two things in the view (SRI HARI · THE MOON under the
  moon, JĪVA · ITS IMAGE over its path on the water, JAḌA · THE STONE before
  the face, JĪVA · THE LIGHT / JAḌA · THE STEP at the flight's foot, JAḌA ·
  JAḌA · COURSE ON COURSE on the courses). Sized for the distance each is
  read at; windows are the middle 40% of each sub-beat (`winds.pb*`); kept
  out of the water's reflection.
- **The road**: the towns' names smaller (H 2.2, MANCHALE 2.6), lower
  over their lamps (y 4.4), quieter (.72).
- **Into the stone**: `.mv-tail` 170vh; the walk goes through the gateway's
  opening (via) across the terrace to the face; on the way (`tailP`,
  main.js → river.js → hero.js `setTail`) the deepas' warmth grows, the
  sky light falls, the air closes (fog +.016), the glow behind the stone
  turns gold; the veil into the sanctum fades in over wIn .018 (was .012).
- **Materials**: the yard's walk is seven-sided worn slabs, not boxes;
  grass tufts about the pad's foot; the trees tinted per species (tamarind
  cooler, neem warmer).

Verified desktop at the hero, the dream, mv-04a (the page reads left to
right, head away: projected), mv-05a/b/d/e, the road, Manchale, the tail.
Open: the phone frames of the labels; the dream's warm pocket is subtle by
design and may want the moon's disc shown faintly; the clouds could take a
second, higher layer.

### 18 Sept 2026, evening · THE GROVE, THE THRESHOLD, THE LAMP (an environmental pass on the river)

The owner's third brief the same day, with Seijaku as the benchmark for
environmental richness: horizontal translucent bands crossing the sky as
the chapters scrolled; a deepa on the ghat step that read as a half-broken
goblet; background trees that were flat cutouts (a card seen edge-on is a
sliver, a card seen square is a lollipop); the Bhuvanagiri house absent from
Bhuvanagiri; the whole reading as layers stacked rather than one place. The
owner attached a veena and a traditional gateway as references. Done:

- **The bands** were the three river-mist strips in hero.js: 260-unit
  planes carrying a straight vertical gradient, `fog: false`, so from the
  chapters' low cameras they lay across the sky as hard-edged panels.
  Replaced by `mistBandTexture`: three bands lying on the water, torn along
  their tops by noise, fading to nothing at both ends, coloured each frame
  from the fog itself. Nothing else in the frame is a strip.
- **The trees are volumes** (`js/world/trees.js`): trunk and limbs as
  geometry; the crown as ~300 small leaf-cluster quads (painted canvases:
  'broad' neem/mango, 'fine' pinnate tamarind) scattered through ellipsoids
  at the limb tips, crossed at random angles, every vertex's NORMAL pointing
  from the crown's centre outward so the scene's own sun and sky shade the
  mass, a per-quad occlusion tint by depth in the crown, alpha-tested (they
  write depth, cast and receive shadows, take the fog), alpha-to-coverage,
  sway in the vertex shader (`setTreeTime`), the DoubleSided normal flip
  removed in `onBeforeCompile`, and a dissolve within ~2 units of the lens.
  Coconut palms: a curved ring-scarred trunk, hinged drooping fronds, nuts.
  Shrubs of the same make. The right bank's grove behind the platform, the
  bank receding upriver, a line of palms leaning over the water, a far
  tree-line card east of the house. MEASURED: nothing upriver may stand
  inside the gateway's opening in the composition (bearing < 24° right of
  −z from (−1.5, 46)); the palms and trees keep beyond it. The banana
  clumps and reeds keep their painted cards but turn to face the camera
  about their foot (`billboard` / `faceCamera`) and dissolve near the lens.
  The old `riverTreeTexture` / `bushTexture` cards are no longer placed.
- **The threshold** (`js/world/threshold.js`, from the owner's gateway
  picture, BUILT, not photographed): a lime-plastered compound wall on a
  plinth of dressed granite with a tiled coping on rafter ends, a gatehouse
  of two granite pillars, a teak beam and a pitched tile roof, a studded
  two-leaf door standing ajar on the yard's warm light, two granite benches
  (the jagali) flanking the step, a walk of worn slabs down the bank, the
  house's own hipped roof, a palm, a neem and a plantain over the coping, a
  clay lamp on a bracket by the gate lit as the light goes. It stands on a
  levelled pad on the right bank's sweep at approach (27, pad, 33), turned
  −1.06 so its front faces the walk from the near strip. The ॐ sand tray
  (`sand.js`, moved from the ghat step) lies on the LEFT bench with its clay
  lamp; the veena (`veena.js`: kudam, soundboard, bridge, twenty-four brass
  frets, the second gourd, pegs, the yali scroll, strings, on its cloth)
  lies on the RIGHT bench. BHUVANAGIRI IS THE HOUSE: main.js STATIONS
  `mv-01` approaches the gate (14 units out along its front), `mv-02`
  stands over the sand, `mv-02m` over the veena; stations may now be
  authored as anchors `['door' | 'benchL' | 'benchR', f, r, y]` resolved by
  hero.js `thresholdPoint` (heights over the pad). The three beats carry
  `.sec.pale` (a denser reading pool) since they sit against plaster; the
  day now brightens to full by the house (`dayArc.aft`), because the house
  is seen looking away from the sunrise, whose sky is still the dawn's.
- **The courtyard** (the owner's note the same evening: the lesson made no
  sense outside the house, and the house beats' reading gradient showed
  its box's top edge as a dark band while scrolling): both door leaves
  stand swung back into the yard; behind the gate is the yard's swept
  earth, a tulasi kaṭṭe, and the house's front: a granite verandah on four
  turned teak pillars under the eave of the hipped roof, the lime wall
  behind with its dark doorway and two barred windows. The sand tray lies
  on a teak dais at the verandah's edge between the middle pillars (on
  the gate's axis), the clay lamp beside it, the veena on its cloth on the
  verandah floor between the next two. The benches outside are empty.
  STATIONS: `mv-01` approaches the gate; `mv-02` and `mv-02m` stand IN the
  yard (the walk enters through the open gate on the axis); `mv-02b`
  carries `via: ['door', 2.2, .2, 1.6]`, a waypoint camStations passes
  through (position piecewise, look steady), so the walk leaves by the
  gate and never crosses the wall. Every `.sec::before` now carries a
  mask fading its top 16%, so no pool can ever show its box's edge; the
  `.pale` pool is a denser radial.
- **The lamp**: `deepaLamp` (util.js) redrawn at 36 segments in the
  opening's own brass, a rolled-lip bowl, a bud finial and a pinched spout
  (the 18-sided version with a box on its rim was the "goblet"). The ghat
  lamp at the sand station is GONE (it stood unlit through the morning); the
  works' lamp and the sanctum's two keep the new form.
- Retired: the kage foreground wall (foreground.js, no longer imported);
  the picture planes in stations.js (jasmine / veena / gate) and their
  `winds`; `tools/cutout.py` stays for any picture the owner still wants
  keyed. Their images never landed on disk.

Verified desktop (1280×800) and phone (375×812) at the hero, mv-01, mv-02,
mv-02m, mv-02b, mv-03, mv-04, mv-06, mv-07, the return, and the walks
between. Still open: the pad's bare earth could take tufts; the plinth's
block courses read a little regular at the benches; the leaf textures could
carry more colour variety per species.

### 18 Sept 2026, later · INSIDE THE STONE, THE STUDY, THE LOTUS (the Brindavana section and the footer)

The owner's second brief the same day: the sanctum looked sloppy, the cut
into it abrupt, the layers "flat stacked forms", the footer weak; Seijaku
as the reference for depth and for the layered treatment (its craft page:
an exploded joinery model on cream with a big serif beside it); a lotus
model (`~/Downloads/pink_lotus_flower_cluster.glb`, 37 MB) for the footer.

- **Into the stone** (scroll.js VEILS[0] c .7255 w .006 wIn .012;
  pravesha.js): the walk ends on the Brindavana's black face; the veil is
  that dark; the sanctum OPENS in the same dark, very close to the seated
  form, and its two deepas are lit as the eyes adjust (`lit` over u
  .01–.13), the camera stepping back into the room (cam u 0–.14). Nothing
  is cut to.
- **The sanctum rebuilt** (pravesha.js): flagstone floor and walls of the
  opening's PBR stone (`stoneMaterial` seeds 41/43/47/49/51 + `boxUV`),
  pilasters, a lintel course, a niche with darker plaster behind the
  peetha, a three-course peetha, jasmine strewn on the floor and the seat
  (150 instanced blossoms), palm-leaf granthas, a folded saffron cloth, a
  copper kalasha with a coconut, an incense cup with four rising puffs,
  flame halos, a floor bounce, a shadow-casting left lamp. The relief
  (models/rayaru.glb) is unchanged and still has a face (open question).
- **The study on paper** (antaranga.js): the layers stand on a Bone ground
  (main.js fog `0xe3d8c1` d .012 for T9B–T9C; `body.ui-light` for t
  .7975–.8665 so every caption and the interface take dark ink), lit as a
  studio (hemi Old lace/Coyote, one warm key with a 2048 shadow onto the
  ground, a cool fill); nine courses separate with a hairline leader and a
  Karla label each (`COURSES`, `labels`, riding their parts; opacity by
  the explode, gone as the camera goes inside); the stack stands right of
  centre on wide frames (look x −3.4…−3.6) and centred above the copy on
  phones (`cam` wraps `camWide`); the interior objects sit on Bone
  pedestals; the last approach to the one śāligrāma stops at ~3 units so it
  is a lit stone, not a black disc. New caption at .799–.8135: "Nine
  courses of one black stone" (scroll.js). VEILS[1] and [2] are --night at
  k 1.
- **The lotus** (river.js, models/lotus.glb): the owner's model slimmed
  from 37 MB to 1.4 MB (python: position/normal/uv0 only, 1024 textures,
  metal-rough material; then `gltf-transform simplify --ratio .28` and
  `meshopt`, loaded with the site's MeshoptDecoder). Three clusters stand
  in the bay in front of the composition at approach (.6,−.98,33.2)
  ×2.6, (−4.4,−.98,31.4) ×1.9, (3.4,−.98,33.6) ×1.5 with ten lily pads,
  breathing on the swell, visible from the night on the bank (t ≥ .855)
  through the return, reflected by the water.
- **The footer is the last frame**: past t = 1 the footer scrolls in and
  its progress (`footerP` = (scrollY − timeline.max) / footer height,
  main.js) tilts cam10 down to the water (steeper on phones) so the lotus
  fills the lower frame; the hairline SVG garden is gone; two lines
  (mark + links, colophon) sit at the bottom over a soft gradient;
  `body.in-footer` hides the Aradhana link there. `#footer` padding-top
  118vh (phone 96vh).

- **The SOUND control** (audio.js, same evening): the owner could not turn
  the music off. `toggle()` had a special case that treated the first click
  on the button as the browser's permission click (it started the music and
  left the label at ON), so it took two clicks to stop; and Chrome runs a
  `resume()` it queued before the first gesture even after the sound was
  switched off. Now the button is a plain toggle of the preference, OFF cuts
  the master at once and suspends the context after 250 ms, and a context
  that comes up while OFF is suspended again in `statechange`. Still ON by
  default (starting at the first gesture), still remembered in localStorage.

Verified desktop and phone at .7225, .7275, .733, .748, .768, .806, .826,
.842, .866, .885, .985 and the footer. Known: the pane's screenshot
sometimes shows the previous state (take two, wait).

### 18 Sept 2026 · ONE DAY ON THE RIVER (the settled form; supersedes the night walk of 17 Sept)

The owner's brief (18 Sept): after the opening the site dropped to one dark
frame, every beat's picture was a card over it, the works were thumbnails,
Tattvavāda a diagram, the map a feature, the tail a blank green screen, the
footer a design section. Kage as the benchmark for continuity and depth;
the Brindavana layers untouched. What was done, and where it lives:

- **The light is one day, not one night** (river.js `update`, keyed to the
  chapters' progress `docP`; the hours land on the beats via `dayArc`,
  measured from the page in main.js `syncSeams`). The opening's morning
  holds through Bhuvanagiri and the schooling; the air warms to the
  afternoon (`hour.day`, the sky's `uDay`) through Madurai and Kumbakonam;
  dusk falls across the dream and the sannyāsa (the two deepas lit at the
  name); the works, Tattvavāda, the road and Manchale are night by lamp
  and moon. No `#ground` at either seam any more; no `setDusk`. The night
  was lifted so the bank reads (hero.js night: hemi .92, fill .42, amb .42,
  brndKey .84, vegetation veil .50; river.js moon light 1.35, hemi 1.0;
  sky `nightCol` lifted with the moon's own glow in the air). main.js fog
  for chapters 01–08 is `dawn → AFTERNOON (0xcfc3a4) → NIGHT` by the hour.
- **The pictures are places in the world** (`js/world/stations.js`, built
  into the river stage in the approach frame; `sl(x,y,z)` converts the
  flight's own frame, the sacred group's local, to approach coordinates):
  the ॐ written in a real sand tray on the second step with a clay lamp
  beside it (Akṣarābhyāsa); the ghat's own standing deepa at the step's
  west end, lit at dusk; the five granthas as printed volumes lying on the
  landing between the gateway and the Brindavana (covers from
  assets/works, `t.rotation = 0`, checked on the phone frame), a standing
  deepa beside them lit at night; the towns of the road as the far bank's
  lamp clusters (river.js, brighter) with their names as sprites over them
  (KUMBAKONAM · MADURAI · UDUPI) and MANCHALE over the gateway's crown
  (y 17.8, 22 on phones); two grass sheets that walk a step ahead of the
  camera at the frame's lower corners (`edge`, lagging so they read as
  ground passed over; `g` per station in main.js keeps them off the
  stone); and three optional planes for the owner's photographs
  (`assets/props/jasmine.png` at the upper right through Bhuvanagiri,
  `veena.png` on the landing's edge for the household, `gate.png` as the
  Matha's wall on the right bank). `tools/cutout.py` keys a picture on
  white to transparency. Absent files are silently skipped.
- **Pañcabheda is told on the river** (no diagram, no tap): the moon is
  low over the far bank, left of the gateway (river.js `moonDisc`, world
  (-36,16,-112); phones (-22,22,-112)), and the water carries its path
  (`uMoonDir`/`uMoonAmt` in the water shader: a tight cool glitter and a
  low sheen). Sri Hari · jīva is the moon and its reflection (Madhva's
  bimba–pratibimba, said in the copy); Sri Hari · jaḍa the moon and the
  Brindavana's black stone from beside the gateway; jīva · jīva the
  reflections broken into many; jīva · jaḍa the light on the water and the
  step at the ghat lamp; jaḍa · jaḍa the stone courses.
- **The camera is a walk between STATIONS** (main.js): one per beat,
  authored as a stand P, a subject S and where the subject sits in the
  frame (nx, ny in −1..1), per aspect (`d` wide, `m` phone), so the thing
  is right of the copy on a wide frame and above it on a phone
  (`stationShot`). Each station's progress `p` is `movements.centerP(id)`,
  so the walk lands on the words wherever the copy's length puts them.
  Between stations: smoothstep (settles into each, gathers out), with the
  opening's idle drift. `mv-lead` and `mv-07` are the composition
  (`comp`); `mv-tail` walks through the gateway to the Brindavana's face
  until the black stone fills the frame, and the veil into the sanctum
  (VEILS[0], --night) takes over from that darkness. The cut to the
  sanctum's camera happens only under the full veil (`t >= T9A + .0004`).
  cam00's leave-taking step is 1.1 (was 2.2, into the grove's foliage,
  which read as a blank olive frame once the seam was no longer hidden).
- **One reading column** (index.html, style.css THE CHAPTERS): every beat is
  eyebrow · title · one paragraph in the site's reading position (the left
  column on a wide frame, the lower frame on a phone); `.sub` beats (one
  work, one difference) have a smaller title and belong to the chapter
  before them (the rail lights that chapter; movements.js). The scrim is a
  pool behind the column, as the hero's. `.fig`, `.covers`, `.five`, `.pb`
  and the tap are gone. `.mv-lead` 64vh, `.mv-tail` 110vh.
- **The footer is the river continuing**: the dawn frame stays live under
  it; a hairline planting (the lotus, the spray, the reeds, already drawn)
  along the lower edge; one line of mark + links, one colophon line.
- The silhouette wall (foreground.js) stands far left along the near bank
  (world (-44,0,-10)), at the edge of the composition frames only.

Verified beat by beat on desktop (1024×768) and phone (375×812), `?nowebgl`.
Review aid: `window.__Y` is not built in; in the pane use
`ANTARANGA.step(ANTARANGA.timeline.tAt(y))` with y = section top + h/2 −
vh/2; the pane's first screenshot after a reload+step is a stale olive
frame (the page ground), take two.

**Still open:** the owner's three pictures are not on disk yet (run
tools/cutout.py on them, see README); the veena's pose on the landing and
the wall's place on the bank are guesses until they land; the sub-beats'
copy for the works is the approved lines plus one fact each (Parimalacharya).


**ONE NIGHT ON THE RIVER (17 Sept 2026, night). The settled form of the
middle.** After the cohesion pass the owner said the design still made no
sense: "blank at a few places, very fake", pointed to kage, Sleep Well and
Seijaku (seijaku.mengto.here.now), and called it the last attempt: premium,
storytelling driven, mobile first. The three references were walked at phone
width; what they share is that the frame is never empty, every chapter is a
poster (label, big title, one rich picture, body, tags), the 3D keeps moving
under the words, and one kit repeats. The vigil (seven lamp bands) had none
of that: dark holds between bands and giant CGI objects. It is retired
(js/world/lamps.js stays on disk, no longer imported).

What the middle is now:
- *One world, one walk.* After the dawn the same bank is seen at night and
  the life is read on it in ONE continuous camera walk (`NIGHT_KEYS` /
  `camNight` in main.js, nine stations over the chapters' progress p): wide
  at the gate, low over the water past the house, in to the ghat's two
  deepas for the name, from the right over the landing for the works, back
  and high for the five, along the bank for the road, home for Manchale.
  No curtains, no world bands, no cuts, no night ground at the head (the
  dusk falls in view, `setDusk` synced by `syncSeams`; the ground rises only
  at the tail into the sanctum).
- *The night reads.* hero.js night hemi .62 / fill .26 / amb .3; river.js
  `moon` + .9 and `hemi` + .7 at night; the sky's `nightCol` lifted. The
  scrim under a beat is a bottom gradient to .5 on a phone, a soft radial to
  .5 on desktop. When the world is not visible, the cause is always the
  darkening stack (lesson repeated).
- *The night's events* (river.js, keyed to `docP` set by main.js): the
  fireflies thicken over the water while the schooling is read; the far
  bank's lamps (`farLamps`, four clusters and a scatter) come out for the
  road and stay for Manchale.
- *Thirteen beats, one kit* (index.html `.sec`, css "THE CHAPTERS"): an
  eyebrow (gold dot, place · date, the name in Kannada at the right), a
  title in Marcellus (phone 8.4vw, desktop 3.9vw, sentence case), one
  paragraph, and one thing to look at: the four dates, a DRAFTING in the
  loader's hand (assets/ill sand / hall / map, inlined as SVG with
  `pathLength="1"` on every stroke, drawn in on arrival), the five printed
  covers (a snap strip on a phone, a row of five on desktop), the five on
  hairlines, the five by touch, the map of the road. Quiet beats
  (`.sec.quiet`) are one paragraph with the world alone above. Phone: one
  column, copy in the lower part, world above. Desktop: title left, copy
  right; a beat with a drafting (`.sec:has(.fig)`) puts the sheet in the
  left column and title + copy at the right.
- *The interface steps back* in the chapters (`body.in-doc` dims the
  wordmark and nav; hover restores), as kage hides its nav on scroll.
Verified at 375×812 and 1024×768 beat by beat with the review helpers
(`ANTARANGA.step`, `[data-rv]` forced), plus `?nowebgl`. The stills in
assets/stills (house, hall, room, desk) were judged too flat beside scene
00 and are NOT used; the draftings are the site's pictures.

**Cohesion pass (17 Sept 2026, evening).** The owner: the site felt
"forcefully patched together"; only scene 00 and the Brindavana layers were
right; make the palette and the design cohesive. A full desktop and phone
walkthrough found three colour systems (the lavender dawn; a pure black and
orange lamp world; blue-black `#060809` curtains, footer and veils), two
caption kits (kage's `.display / .lead / .k / .sec-head` in a `--pad`
column against the site's `.t-*` in the `--gutter` column), chapter numbers
and em dashes in the eyebrows, a hard black curtain block sliding up over
the dawn sky at the head of the chapters, and the stat row landing on the
lamp. Fixed without rebuilding the vigil:
- *One dark*: `--night` (see §4 Palette) everywhere a frame goes dark; every
  stray rgba and near-black in style.css replaced by lace / bone / gold /
  earth alphas; text-shadows plain black.
- *One kit, one column*: the seven bands' markup rewritten to the site's
  caption classes inside `.wcap > .cap-in` (movements.js glides `.cap-in`
  and toggles `.on`); eyebrows are place · date plus a Kannada
  `.t-loc[lang=kn]` line; the name is `.t-display.t-name` at `--size-num`
  (the scale the 1,200 shares); the places, the tap and the Brindavana link
  are `pos-center`; the four dates are `.t-stats`; the tap lost its box.
  The old kage kit (`.sec .cards .les .chips .cur .fin .cta …`) is gone
  from style.css.
- *The head seam*: `.mv-lead` 120vh (phone 90vh); river.js `setDusk(t)` is
  synced by main.js `syncSeams()` so the dusk completes exactly where the
  night `#ground` rises (over the last .85vh before `mv-01`, clearing .14vh
  into it). The ground, the curtain and the lamp air are the same colour,
  so the seam is dawn → dusk → dark → a flame, with no edge. The tail is
  the same ground over the last lamp, dissolving onto the sanctum.
- *The lamp world*: `truck` / `lift` per beat in `camV` (the subject right
  of the column on wide frames, above the copy on phones); clay lamps
  `0x4a2c1f` and dimmer; sand tinted toward Bone; the five bindings from
  the six; the works' travelling light 5.
Verified: desktop walkthrough, phone (375×812), `?nowebgl` document, footer.
Review aids unchanged (`ANTARANGA.step / snap`, `?at= ?only= ?domonly`).

**The opening, second tuning (17 Sept 2026).** Seven more notes.
- *The descender bug.* `.hw` and `.wm` (the word masks that let headings
  rise into place) are `overflow: hidden`, which had never mattered
  because uppercase Onest has no descenders. Sentence-case Marcellus does,
  and the g of "Raghavendra" was cut by ~3px. The masks now carry
  `padding-bottom: .26em; margin-bottom: -.26em` (the box opens BELOW the
  baseline, the top edge still masks), and the rest position went 112% →
  145% so nothing peeks. MEASURED after: the ink clears the mask by 6.2px.
  **Any future face change must re-check this.**
- *The hero copy* reads at 54ch (was 42ch).
- *The white path in the sky was not mist* — proved by hiding the mist
  sheets and finding it still there. It is the low CLOUD band in skyFrag,
  which in the hero was a pale smear across the sunrise rather than
  cloud: `cloudDark`'s hero end is closer to the sky now and the mix is
  `mix(0.85, 0.15, hero)` (was .42), so the dawn is a clean gradient.
- *The dust was scattered up the sky*, where warm-white specks read as
  dirt on the lens. Motes belong in the LOW air over the water: y is
  0–2.6 (recycled at 3.0), the colour is amber not white, and the size is
  down to .17. Against the dark water and the silhouettes they read as
  air; against open sky they never will.
- *The emblem is an OUTLINE*, at the owner's instruction, and that forced
  a simplification: a six-step silhouette turns to mush when stroked at
  30px, so the shrine is three courses — a wide plinth, the body with its
  niche, the crown block overhanging it — with the kalasha as a stem and
  a bead, which is how the loader and the old wordmark drew it.
- *The scroll dashes* (`#rail`) stand from the first frame now, not only
  inside the chapters. GOTCHA: a SECOND copy of the rail rules lived at
  the bottom of style.css and, being later in the cascade, silently won.
  It is gone; do not reintroduce it.
- *Testing on a phone*: `npx serve` binds to every interface, so the
  running dev server is reachable on the LAN at `http://<mac-ip>:4188`.

**The opening, tuned (17 Sept 2026, last).** Six notes from the owner
against a kage-derived reference frame.
- *The headline came down a step*: `--size-hero` clamp(2.5rem, 5.6vw,
  5.4rem) → clamp(1.9rem, 3.9vw, 3.8rem), so the hero column went back
  from 60vw to 46vw (10.213em x 3.9vw = 39.8vw for the longest line). The
  tablet override was making the headline BIGGER than the desktop clamp
  it replaced (6.4vw = 51px at 800, where desktop resolves to 31px); it
  is clamp(1.9rem, 4.6vw, 3.1rem) now.
- *The body copy was unreadable* because it crossed the horizon band, the
  brightest thing in the frame. The block was lifted (top 23vh → 17vh),
  the copy takes full lace ink, and `#hero::before` is a much wider and
  stronger radial — wide is what keeps a scrim that strong from reading
  as a panel.
- *A hairline before SOUND* (`#topnav #sound-btn::before`): it is not a
  section, so it does not sit in the same run as the section links.
- *The sky was unrealistic*: the rose band read as candy and the horizon
  as sodium yellow. mRose and mHor are muted, the deep blue is held
  higher up the dome (smoothstep .16–.50), and the pocket and the sun's
  halo are pulled back.
- *The dust* (kage's one never-stopping thing) is `dust` in river.js: 300
  additive motes (140 on a phone) rising .19/s with a slow sine sway,
  recycled to the water at y > 8. MEASURED TWICE: spread over the whole
  river they were one or two specks a frame, so the box is now held
  around the camera's own travel (x -34..14, y 0..8, z -16..34), which is
  what makes them read as air. Diffing a dust-on against a dust-off frame
  is how to check this — the eye cannot count them.
- *The mark, third attempt.* A solid silhouette of stacked tapering
  courses reads as a TURNED OBJECT at 30px: rounded it was a chess pawn
  (the owner's word), crenellated it was a rook. What a Brindavana
  actually reads as is a squat stepped block with a FLAT top, one kalasha
  off the middle of it, and a dark arched niche in its face — so the
  waist is barely narrower than the plinth, nothing is crenellated, and
  the niche is large enough to be a doorway. The wordmark's name line is
  Marcellus sentence case now (it NAMES), with the sub-line as a small
  Karla label, which is what fixed the spacing.

**Marcellus and Karla (17 Sept 2026, after the grain pass).** The
type system is TWO FAMILIES and no third, replacing Onest everywhere.
Both are OFL, fetched from Google Fonts once and VENDORED as woff2 in
`fonts/` — the site still loads no third-party stylesheet and still works
with no network.
- *Marcellus 400* (its only weight) NAMES: the wordmark, every headline,
  plate and work title, the held lines over the world, the numerals, the
  giant word. *Karla 300/400/500* (one variable file per subset)
  EXPLAINS: reading copy at 300, every label at 400.
- *The three rules*, written at the top of style.css: reading copy is
  always Karla 300 at 1.02–1.08rem, line-height 1.75–1.78; every label,
  eyebrow, button and caption is Karla 400 at .70–.76rem, uppercase,
  letter-spacing .14em; and THERE IS NO BOLD ANYWHERE — `--weight-bold`
  is 400, hierarchy is size and the serif/sans switch. Every hard-coded
  px size and every `font-weight: 500` in the stylesheet was swept onto
  the tokens; the ladder is re-anchored on 1.04rem, and the display
  clamps are authored (a lapidary serif at 5vw is composed by eye).
- *The stitch.* Neither face carries Latin Extended Additional
  (U+1E00-1E9F) — the dot-below letters the copy cannot do without
  (jaḍa, Akṣarābhyāsa, Vyākaraṇa, Mīmāṃsā, Namaḥ, ṭīkā). MEASURED, then
  fixed: each family borrows that block from a face of its own kind,
  declared under its own family name and fenced by unicode-range, so no
  third family is ever named in the CSS — Marcellus from Noto Serif's
  latin-ext (a serif ḍ in a serif word), Karla from the retired Onest.
  index.html asks for that subset BY TEXT at boot, or it is never
  fetched.
- *Refitted from measurement, not guessed.* "Sri Raghavendra Tirtha" is
  10.213em in Marcellus, so at the 5.6vw display size the longest line is
  57.2vw: the hero column went 46vw → 60vw and the headline wraps rather
  than overflowing. MANTRALAYA measures 7.019em at .04em tracking, so
  `#word` is 13.85vw (was 14.1vw for Onest). **Re-measure both if the
  face ever changes again** (the method is in the #word comment).
- *The headline is sentence case now.* A lapidary Roman serif is set as
  written, not shouted: the uppercase transform came off `.t-display`,
  `.t-q`, `.display` and `.card-lab b`, and the hero's H1 text was
  changed from THE LIFE AND WORKS OF to The life and works of. The giant
  word and the labels stay uppercase.
- *Also repointed*: the canvas type in `util.js` (`FONTS`), the in-scene
  word in `opening.js`, the two plate captions in `parimala.js`, the boot
  font gate in `main.js`, the preloads and colophon in index.html.
  Onest's and Satoshi's files are still on disk, declared nowhere except
  the Karla stitch.

**The mark, redrawn (17 Sept 2026, same pass).** The first version read
as a bottle in a keyhole: the shrine was 1:2 and its kalasha was a
bulb. It is rebuilt on `brindavana.js`'s OWN courses (total height 5.5,
plinth 4.3 wide, body 2.4, cornice flaring to 3.06) — a wide stepped
plinth, a cushion base, the narrow waist of the niche level, the band and
attic overhanging it, the cornice flaring, the crown, the cap, one small
kalasha. Height:width is 1.37, and that is what stops it reading as a
bottle. viewBox 34 x 36, shown at 30 x 32.

**Grain, the dawn palette and the mark (17 Sept 2026).** Three
self-contained changes; no geometry, no layout, no copy.
- *Film grain is back on* (`#grain`, style.css): a fixed 240px tile of
  inline-SVG `feTurbulence` at `mix-blend-mode: overlay`, z-index 40,
  opacity .31. `stitchTiles="stitch"` is what makes the tile seamless;
  overlay is what makes it read as film rather than fog, because it
  deepens the darks and lifts the lights instead of veiling both. Static
  by design: animated grain reads as video noise. (It was retired in the
  composition pass and the CSS comment said so; that comment is gone.)
- *The dawn dome is violet and amber*, not blue and peach (`skyFrag` in
  river.js): `mZen` indigo-violet, `mMid` violet, `mRose` magenta, `mHor`
  amber, with the elevation bands widened so the violet holds higher and
  the warm seam is a band. The sun's disc and halo stay amber once risen
  (they were pink, which read as a different sky from the band under
  them); the low cloud banks and the water's dawn tint and glint follow.
  The air follows the sky: `ATMOS[0]` 0x9c93b8 and the pre-dawn 0x161225
  (main.js), `fogDay`/`fogNight`/`fogNightDeep` in hero.js. The arch, the
  Brindavana and every other built thing are untouched.
- *The mark is an arch with the Brindavana standing in it* (index.html,
  header + footer + favicon; viewBox 32x40, shown at 26x32). The arch is
  a hairline in the drawing hue, the shrine a SILHOUETTE with its rosette
  band cut through by `fill-rule="evenodd"` — line work inside the arch
  mushed at 26px, and the cut band keeps the fill from reading as a blob
  on either ground.

**The foreground pass (15 Sept 2026, later).** Three
notes from the owner on the scene pass. (1) The white-out at the end of
scene 00 on scroll: that was the "morning flood" mist (hero.js `glow`,
main.js's pale fog ramp at ci 0), built to hide the old cut into
Bhuvanagiri. Removed: `glow` is 0 in river.js, the fog ramp is gone, and
the dawn simply goes to night in view (`dusk`, t .0703–.086); no light-ink
window. (2) The lime-plastered house read as forced: kage's foreground is
a SILHOUETTE with one light in it. `js/world/foreground.js` replaces
house.js: a compound wall of dark stone with a tiled coping, a gateway
with its own small roof, one deepa and a warm glow in the opening, reeds
and grass at its foot, a river tree at its end; placed at (-15.8, 0,
-1.5), rotation .42, in river.js (still called `house` there). house.js is
unreferenced, on disk. (3) The headlines read as manufactured: they are
plain sentences now ("Before he was Rayaru, he was Venkatanatha." "Around
forty-five works, written to be understood." "He travelled for fifty
years, teaching and writing." "In 1671 he chose Manchale, on the
Tungabhadra."), and the leads and bodies are past-tense biography again,
without the flourishes.

**The scene pass (15 Sept 2026).** The owner set a frame of
ours beside kage's chapter 01 and named the gap: our chapter sat on a pale
morning with an oversized headline; the cards read as staggered paper
flyers; the covers were thumbnails; the world was black with the shrine
cropped; the cut into the sanctum was harsh; the footer was wrong. Fixed:
- *The night is composed like kage's scene.* `js/world/house.js` builds the
  Bhuvanagiri house front (the retired chapter's own construction: laterite
  plinth, lime walls, the door, teak pillars, tiled hip roof, clay lamps in
  the niches, a lit doorway) and grass in front of it; river.js places it
  at the left foreground of the bank (`house.group.position (-14.6, 0,
  -5.2)`, rotation .32) with a moon and its halo over the river (`moonDisc`,
  `moonHalo`, drawn after the sky: renderOrder 12, no fog, no depth test).
  All of it is up only while the chapters are read (`docNight`), rising
  with the dusk. The camera keys (`NIGHT_KEYS`) are wide-to-mid framings
  that keep the house at the left and the stone at the right; the moves
  are in height and side, never a crop.
- *Night before the copy.* `.mv-lead` is 72vh, so the dusk (t .0703–.086)
  is over before the first chapter's heading is in frame.
- *Type at kage's size*: `.display` clamp(26px, 3.1vw, 44px), the fin at
  5.6vw, stats at 1.8vw.
- *Cards one size, photographic*: no stagger; a radial vignette, a grain
  overlay and a shadow on every still; kage's arrow on hover; a 6px lift.
- *The covers as five large cards* (`.cards-5`, object-fit contain on their
  own dark ground) with the five one-line rows beneath.
- *A slow dark into the sanctum*: a dark veil at .726 (wIn .008, w .016)
  after the chapters' dark tail, so the relief resolves over most of a
  viewport instead of cutting in.
- *The footer over the world*: a gradient scrim, the statement at reading
  size, the three columns, the colophon; the planting is hidden.

**Production pass on the kage form (14 Sept 2026, night).** The owner's screenshots showed what was still wrong against kage:
the world buried under fog, scrims and a vignette until only a black blob
and two lamps remained (so the camera's moves were invisible); a whole
viewport of blank paper at the head of the chapters (the lace flood); short
sections that let two chapters share a frame and the tap float over the
shrine; and copy that read as dutiful biography. Fixed:
- *Dusk in view, no flood.* `gTop` is 0. The morning of the leave-taking
  falls to night over the first chapter's arrival (`dusk` in river.js,
  t .0703–.090: `openT` 1→.34, `hour.night` 0→1, the mist clearing), and
  the chapter takes dark ink for the moment the light fills the frame
  (`body.ui-light #movements` tokens, faded, not switched).
- *The world readable.* `NIGHT` air back to the return's own (0x10141d,
  .0056); scrims thinned to .74 at the copy and 0 by 70%; vignette .34;
  the Brindavana's own lamplight lifted at night (hero.js: brndKey .62,
  glow .22, deepa lights ×1.8) so the close-ups read its carving.
- *A camera that moves.* `NIGHT_KEYS` now go from the wide frame to 15,
  27 and 21 units in (low over the water toward the deepas; close, looking
  up the stone to its crown and the stars, for the name; from the side
  with the landing and the lamps, for the works), back along the bank for
  the road, and to the composition before the sanctum, with the opening's
  idle drift running throughout.
- *Every chapter owns a frame* (`.sec { min-height: 100svh }`, content
  centred); the tap is a framed panel (`.pb`, kage's card) beside its
  closing lines in a `grid2`.
- *Copy in kage's register*: concrete, present tense, physical. "A tray
  of sand, a lamp, and one syllable." "The root text at the centre. His
  words around it." "Fifty years on the road, the desk always with him."
  "A small place, and on the river." The facts and the vocabulary rules
  are unchanged.

**Kage, done properly (14 Sept 2026, evening).** The
owner's verdict on the captions-only form: worse; take kage as the model
and build it at a staff level, keeping the opening and the Brindavana. The
diagnosis of why the first kage pass had felt forced: it copied kage's kit
but not its craft. Kage's richness is (a) a black world with real light
sources under every section, (b) an editorial layer with honest content in
its stat rows and lists, and (c) IMAGERY: stills of its own 3D scenes placed
as cards. This pass supplies all three.
- *Stills from the site's own worlds.* `ANTARANGA.loadStills()` builds the
  retired stages (the house and yard, the written sand, the Matha hall,
  the road) and `ANTARANGA.still({key, ci, u, t, fog, world})` renders one
  from its own camera; `tools/shot-server.js` saved them. The keepers are
  in `assets/stills/` (card-house, card-sand, card-hall, card-room,
  wide-desk, webp): the road's were weak and were not used. The chapters
  (`#movements` in index.html, `js/movements.js`, the "THE MOVEMENTS"
  block in style.css, kage's measured kit) now run: 01 Venkatanatha with
  a stat row of four honest dates (1595, 1621, 45, 1671); 02 the early
  life as three staggered still cards (the house, the ॐ in the sand, the
  hall) with two columns of copy; 03 the name (the centred `fin`); 04 the
  works as rows on hairlines, each with its cover as a thumbnail; 05
  Tattvavāda as rows, then the tap; 06 the road as chips; 07 Manchale
  with the arrow into the Brindavana. Seven chapters, ~9 viewports.
- *The world under them* is the bank at night, black air (`NIGHT` in
  ATMOS: 0x0a0c11, .0078) with the deepas and stars, and the camera moves
  chapter to chapter (`NIGHT_KEYS`/`camNight` in main.js: wide, low over
  the water, up to the stars for the name, close on the landing for the
  works, along the bank for the road, back to the composition), behind
  kage's radial scrims and a vignette (`#vignette`, `body.in-doc`). The
  seams are the grounds again (`gTop`, `gTail`); the rail, the nav's
  active link and the kage footer grid are back. The captions over the
  Brindavana and the return stay in the uppercase Onest register.
- *Retired by this pass*: the day on the empty bank (`life` in river.js is
  now a constant 0; the code stays), the column's covers and tap
  (`.t-cover`, `.t-tap`; `wireTap` in main.js is now inert).

**One place, one day (14 Sept 2026, afternoon; superseded).** The owner's
verdict on the kage pass: not cohesive, forced. The diagnosis, finally:
the two parts the owner has always called right (the opening and the
Brindavana) share one language, a single world with the copy as a caption
in one column over it, and every rebuild of the middle had grafted a
different site between them. So the middle went back to the site's own
language, with one idea that makes the whole thing one:
- *One place, one day.* After the dawn the same bank is seen again EMPTY,
  the place before he came (the hero's own line: "Before Rayaru came to
  Mantralaya, there was Venkatanatha"), and the light moves through a
  whole day while his life is read: morning at Bhuvanagiri, afternoon
  through the works, the light going on the road, dusk and the first
  stars at Manchale ("He chose it himself"); then the night sanctum
  builds the stone, the Brindavana stands on the bank at night, and the
  dawn comes a second time. `life` in river.js (t .0703–.742: `openT` 1,
  `hour.day` rising .13–.40, `hour.night` rising .60–.725, the sacred
  group withdrawn); the camera walks the bank once over the whole day
  (`camLife`, main.js), the gaze settling by evening onto the ground where
  the stone will stand. ATMOS 01–08 follow the hours.
- *The copy is captions again* (scroll.js CAPTIONS, 01–08 rewritten in the
  existing registers: `.t-loc`, `.t-sub`, `.t-body`, `.t-anno`, the
  permitted `pos-center` for the ॐ, the name, MANCHALE). The five works
  are printed objects in the column (`.t-cover`, one per beat); the five
  differences are said in it, and tapped in it (`.t-tap`, wired by
  `wireTap` in main.js). One scroll driver again (`#scroll-space`, 52/48
  pages); the piecewise timeline code in scroll.js is dormant.
- *Dark ink through the day.* `body.ui-light` runs from the pale veil at
  .070 until the light goes (`dayLight` in main.js); the captions take
  the Earth Green ink ladder and a soft Old lace scrim behind the column
  (`.cap-in::before`), fading rather than switching.
- *Gone*: `#movements`, `#ground`, `#rail`, the kage kit and footer grid,
  the seams' ground logic. `js/movements.js` is unreferenced (on disk).
  Two seams are veils again (.070 lace, .725 Earth Green). The footer is
  the simple one. Review aid: `?t=0.4` opens at a point of the story.

**The kage pass (14 Sept 2026).** The owner's verdict on the Sleep Well
revamp: the typography was not working and the design made no sense, keep
the opening and the Brindavana layers, take kage (mengto.github.io/kage,
the site's original reference) as the model. The diagnosis: the middle of
the site spoke a different language from the opening (giant serif on flat
grounds against uppercase Onest over a world). So the chapters were
rewritten in the opening's own register, measured from kage's page:
- *One world, all the way through.* The river stage stays under the
  chapters at NIGHT (`docNight` in river.js, t .0703–.740: the Brindavana
  and its deepas standing, stars), behind kage's radial scrims
  (`.sec::before`). The camera goes on from the leave-taking's last frame
  in one slow step along the bank (`camDoc`, main.js). The two seams:
  the opening's morning floods to Old lace as the chapters' edge rises
  and clears with the lead (`gTop`); the dark ground rises over Manchale
  and dissolves onto the sanctum (`gTail`). The afternoon on the empty
  bank is no longer reached (`manchale = 0`, river.js).
- *One kit for every chapter* (the "THE MOVEMENTS" block in style.css):
  `--pad` 3.4vw; an eyebrow `.k` (10px, .24em, the number in the drawing
  hue, the place's name in Kannada at the right); an uppercase Onest
  heading `.display` at 4vw (max 11ch) in the left column of `.grid2`,
  `.lead` (1.16vw) and `.body` (14px) beside it; then one structure:
  `.stats` (01, 02), the list on hairlines `.cur` > `.les` (03 the
  paramparā, 06 the five), `.cards` (05 the covers, staggered), `.chips`
  (07 the road). 04 is the one centred chapter (`.fin`: the struck old
  name, the new name at 7.4vw, a pill `.cta`). Headings arrive a word at
  a time (`data-rv="words"`, movements.js), everything else rises 26px
  once (`data-rv="up"`). The document is ~9.5 viewports.
- *Onest only, again.* Instrument Serif is removed (files, @font-face,
  the --font-serif token); the captions over the Brindavana and the
  return (`.t-display`, `.t-q`, `.t-sub`, `.t-num`, `.t-body`) are back
  in the opening's register, uppercase Onest.
- *Furniture*: the rail (`#rail`, one mark per chapter at the right edge,
  filled by movements.js, shown by `body.in-doc`), the nav's active link
  (gold underline, `setNav` in movements.js; BRINDAVANA from t .715),
  and a kage footer (statement, three columns of section links, the
  colophon; the planting stays). The seal, the dots and the grain are gone.
- *Dropped with this pass*: the ring of names, the pendulum, the growing
  line, the leaf, the rings tunnel and the map (the map SVG remains at
  `assets/ill/map.svg`, unreferenced). The Pañcabheda tap stays, restyled.

**The revamp (11 Sept 2026, night).** The owner's verdict on the first
implementation of the movements was that it looked bad and nowhere near
sleep-well-creatives.com. The document was rebuilt to that site's measured
proportions (its Webflow stylesheet: title lines 8.72rem serif AND sans of
equal size, the serif shifted left and the sans right; reading copy 2.4rem
in two 48rem columns, left one left-aligned, right one right-aligned; the
page margin `--gap` 13rem; drawings wider than the column, some wider than
the viewport; sections of two to three viewports; paper grain over flat
grounds; a seal at the top centre; an index circle; progress dots).
- *Registers* (`--mv-*` tokens in style.css, all viewport-relative): the
  title pair at 9.4vw (52–152px), reading copy at 1.85vw (19–30px, Onest
  300), the memorable line at 6.2vw, small caps at 12–14px, the page margin
  at 9vw. Every block is a `.rv` that rises into place once as it enters
  (IntersectionObserver in movements.js); no motion under reduced-motion.
- *Drawings, one per movement, hairlines in the ink with one print-textured
  fill*: 01 the small ॐ in a textured disc with the names of Sri Hari on
  two rings turning against each other with the scroll; 02 the scholar's
  day on the arcs of a pendulum (textPath), "earn" struck at the apex, the
  pendulum swinging a few degrees with the scroll; 03 the paramparā on a
  plumb line that grows as it is read (`--line-p`); 04 the old name
  letting go on saffron, the new name at 12.5vw; 05 the leaf at 92vw, the
  covers framed on the shelf with serif titles; 06 the rings (canvas,
  240vh sticky) then the tap, now serif in the circles; 07 the map at
  44vw with 22px labels; 08 the ground in section at 90vw.
- *Furniture*: `#seal` (the drafted Brindavana mark, top centre) and `#dots`
  (Antaranga · eight dots, filled as the movements pass) live in `#ui` and
  appear only while the document's ground is up (`body.in-doc`, main.js),
  so scene 00's frame is untouched; `#grain` is a feTurbulence tile at .085
  over the ground (multiply on light, screen on dark).
- *The captions over the Brindavana and the return* (`.t-display`, `.t-q`,
  `.t-sub`, `.t-num`) took the serif and the larger sizes so the site
  speaks one language; the animations themselves are unchanged. The
  footer's notes and the Devanagari salutation were enlarged to match.
- *Review aids*: `?at=<id>&dy=<px>` opens on a movement; `?nowebgl&only=<id>&dy=<px>`
  renders one block of the document alone with nothing to scroll, for
  headless Chrome (`--headless=new --screenshot`), which is how this pass
  was checked while the Browser pane could not paint.

**The movements (11 Sept 2026, later the same day).** The owner's verdict on
the refinement pass was that the site still did not feel premium: too many
3D elements, and the covers had gone. A layout-and-copy proposal was built in
the idiom of sleep-well-creatives.com (two grounds, giant serif statements,
reading copy in narrow columns, one horizontal shelf, illustrations as
diagrams of ideas) and iterated three times against the eleven scene tests
(00 where am I · 01 something specific about Venkatanatha · 02 scholarship
beside scarcity · 03 why Kumbakonam · 04 the name without melodrama · 05
explanation and commentary · 06 can I explain Pañcabheda · 07 teaching not
tourism · 08 why Manchale · 09 the Brindavana · Return feels different).
The approved prototype was then implemented here:

- *Everything between the opening and the Brindavana is a document* on a
  flat ground: `#movements` in index.html (copy and inline SVG), the
  "THE MOVEMENTS" block in style.css, `js/movements.js` for behaviour.
  The page is spacer / document / spacer; `ScrollTimeline` maps scroll px
  to t piecewise (`DOC_A`/`DOC_B`, `tAt`/`yAt`). Under the document the
  frame is not rendered (`covered` in the frame loop).
- *The devices, by test*: 01 a small ॐ beside the names of Sri Hari running
  past (the Sahasranāma, in order); 02 the scholar's day as a word grid with
  "earn" struck once; 03 the paramparā as a plumb line, gaps marked "· · ·",
  the gold dot where it reaches him; 04 the old name letting go letter by
  letter on the saffron ground, the new name beneath; 05 the leaf's shape
  (root text centred, commentary around it, both labelled), then the five
  covers on a shelf; 06 the rings, outermost to innermost, then the tap; 07
  the map from field.js with every stop labelled by verb; 08 the ground in
  section (river, Prahlada's fire beneath, the Brindavana drafted above).
- *Three stages carry the site now*: river, pravesha, antaranga. Retired
  with this pass (unreferenced, on disk): `purva.js`, `tika.js`,
  `world/purvashrama.js`, `world/bhuvanagiri.js`, `world/interior.js`,
  `world/journey.js` and `world/journey/`, `assets/ill/sand.svg`,
  `bundle.svg`, `hall.svg` (`map.svg` is inlined in index.html). The
  Manchale afternoon on the river (cam08, `setSacred(0)`) is no longer
  reached; river.js still carries it.
- *Seams*: the document's ground dissolves in over the opening's morning
  light and out onto the sanctum's first frame; the saffron veil is gone
  (04's ground is the saffron). Only the Brindavana's two dark veils remain.
- *Nav*: LIFE / WORKS / TATTVAVĀDA scroll to sections (`data-sec`),
  BRINDAVANA to t (`data-ch`).
- *Open*: the Sahasranāma names and the paramparā line should be checked by
  the owner; the leaf's marginal Devanagari is ṭīkā cadence as texture, not
  a quotation (real lines need the owner's text); the fixed header sits over
  the document's text as it scrolls under (as on Sleep Well); the decisions
  below (the face, the deletions) still stand.

**The refinement pass (11 Sept 2026)** against the owner's brief that the
site had become over-designed: constructed scenes, competing 3D, copy in
boxes, every chapter an art-direction reset, desktop spectacle over phone
clarity. An audit came first (108 frames at 375 and 1440, every line of
copy, every module; the write-up is the "Antaranga Refinement Audit"
artifact), then the changes were made at the level it pointed to. The
palette is now the owner's six: Old lace `#F7F1E1`, Bone `#E3D8C1`, Dark
goldenrod `#B4833D`, Kobicha `#66371B`, Coyote `#81754B`, Earth Green
`#3F3F2C` (tokens at the top of `style.css`).

- *Five stages carry the site* (`LATER` in main.js): river, purvashrama,
  interior, journey, pravesha + antaranga. **No longer imported by
  anything**: `bheda.js`, `manchale.js`, `presence.js`, `parimala.js`,
  `journey/landmarks.js`, and `assets/works/` (the title-page plates).
  They were left on disk only because the working tree carried
  uncommitted local edits in them at the time; delete them once that is
  committed. Two movements build no world at
  all: the works are ONE PAGE in the ṭīkā form (`js/tika.js`, `#tika`:
  the root text held in the centre, Rayaru's commentary in the margin, the
  page turning per beat) and Tattvavāda is the five words and the tap
  (`#panchabheda`, the interaction in main.js). Both stand on a HELD veil
  (`hold` in `VEILS`, scroll.js), which is their ground.
- *One place, four hours.* The river stage is the opening at dawn, Manchale
  in afternoon light with the sacred group withdrawn (`opening.setSacred`,
  hero.js; meshes only, the lamps' lights stay at zero), the Brindavana on
  its bank at night (t .870–.912, stars and fireflies), and the return, in
  which the dawn comes up a second time (`dawn2` in river.js and main.js)
  on EXACTLY the opening's composition (`frame00()` in main.js feeds
  cam00, cam08 and cam10). The old return scenery (`legacy` in river.js)
  is built but never shown. Hours are `hour: { day, night }` mixed over
  the dawn values in `hero.js update`.
- *Seams are colour states* (`VEILS`): each is one of the six, blended by
  weight when two overlap (`veilAt`). Two stay truly dark (.795, .870).
  The saffron at the sannyāsa (.336) is the only wash outside the six and
  has no black under it. `body.ui-light` gives the captions dark ink on
  light grounds (`.cap` tokens are redefined under it).
- *No numbers anywhere.* Chapter kicks, edge markers, "Work 01 of 05",
  "01 SRIRANGAM · TAMIL NADU" and the "N of 5 found" counter are gone. The
  road names four places as words on the land (`journey/labels.js`, name
  only); Srirangam is passed unnamed (`unnamed` in config.js). Stations
  were re-spaced (`uTarget`) so each named place has a viewport.
- *Kumbakonam hands to the hall at .275* (was .295): the empty corridor
  walk is cut. purvashrama.js still maps its own T0…T3 (.070–.295), so
  the study's camera is simply left at .275 and the seam is a cut under
  the Kobicha veil; `ZONE`/`QUIET` in purva.js end there. The household
  is one beat (`household`), the cover's four-place strip is gone.
- *The sannyāsa* is a change of light: the desk lamps retire one by one
  (`interior.js update`, staggered `setOn` windows in u02).
- *Length*: 52 pages desktop / 48 phone (was 62 / 58). Every beat in
  scroll.js is ≥ ~.019 t, one viewport.
- *Not changed*: scene 00 and the Brindavana layers (the owner's
  benchmarks); the carved relief with a face (`models/rayaru.glb`, hall
  and sanctum) is left as the owner added it, though the guardrail below
  still says silhouette or light: **decide, then make the two agree.**
- *Open*: the afternoon sky on the bank (river.js `uDay`) is flat; a
  warmer sun pocket and a little more contrast would help. The householder
  room's growing manuscript bundles (purvashrama.js) are still out of the
  phone framing. `journey-review/` frames predate this pass.

**Scene 02 experience pass (Sept 2026)** against the Bhuvanagiri brief. What
changed and where the dials are:

- *The arrival is a walk.* `camOut` no longer opens on a front-facing house.
  It opens across the village tank in mist (water low, palms on the near
  bund, the house a pale form beyond), follows the east bund past the ghat,
  turns in at the compound gate, crosses the yard past the tulasi kaṭṭe and
  reaches the threshold. Keys in `camOutWide` / `camOutTall`. The cover copy
  (`COVER` .080–.118) rides u .19–.9 of that walk, so the house is held
  three-quarter, right of the reading column, for all of it.
- *The settlement* is `js/world/bhuvanagiri.js` (see the layout table). The
  house now has neighbours, a wall, a lane, a tank and a horizon. The sun
  moved to (−30, 19, 46): behind the visitor's left shoulder on the walk,
  so every face toward the camera is lit and the sky pocket
  (`atan(vP.x,vP.z)+0.578`) matches it. Nothing here casts the frame-filling
  shade the old sun position did.
- *Ground:* `heightAt` carves the tank (`tankDip`, edge 6.5 so the banks are
  slopes, not cliffs) and the ghat floor (`ghatCut`). Grass sheets are
  tinted .16–.20 (they read as pale rectangles at .3). The icosahedral bush
  mounds were removed: under the sun they read as green eggs.
- *The front room* was rebuilt: red-oxide floor, lime plaster over an oxide
  dado, rafters, the entrance door open BEHIND the visitor with a cool
  `dayLight` and a floor shaft coming in, a barred window on the left. Lamp
  intensities halved (omLight 7 → 4.2, light2 9 → 5.5, mathaLight 9 → 6.5)
  and `hemiIn` .8 → .42, so the room reads in pools of light and the walls
  sit BELOW the ink in tone (the reading column crosses them).
- *The ॐ* is written INTO the sand (`sandOmCanvas`: a groove with a lit
  ridge and a shadow side, a trace of kumkum in its bed, plus a bump map),
  not printed on it. The tray stands right of the column in the held shot;
  the lamp and décor gathered on its far side.
- *Editorial:* the cover's headline shadow is a `filter: drop-shadow` on the
  block (a text-shadow inside the overflow:hidden line masks drew a visible
  box behind BHUVANAGIRI). The biographical strip is out of the live layer
  (document fallback only). Beats use the site's two registers: one
  statement in the title register, supporting copy in the body register
  (`.pv-beat p + p`). The giant gold ॐ in the DOM is gone; the syllable sits
  inline in the sentence, and the one to look at is in the sand. Copy
  rewritten in a documentary voice; "Sudheendra" and "Kumbakonam" spelled
  as in chapter 04.
- *Phone:* separate portrait tracks for BOTH halves (`camOutTall`,
  `camInTall`). The copy owns the lower third there, so every subject —
  the roofline, the sand, the Matha door — is held in the upper half.
  Verified by measuring the text blocks' rects against snap() frames (the
  pane cannot screenshot while hidden; project rects instead).
- *Draw calls:* the eight neighbour houses are merged into one mesh per
  material (`mergeGeometries`), ~160 calls fewer.
- *Second round (owner's notes).* The arrival is FRONTAL: the tank moved
  west (`TANK` x −23…−2.5, the ghat steps beside the path at x −3.6…0.6)
  so the walk runs straight up the house's axis from +z, palms on the bund
  to the right, water and the west bank under the reading column. The
  brass deepas inside are gone (see Ritual light). Scenes 03 → 04 are one
  walk: `camIn` ends AT the Matha door (u .93–1 approach it head-on),
  `cam04` opens just inside a matching entrance doorway in interior.js
  (`ENTRY_Z` −13.4) still moving forward, and `VEILS[2]` is the door's own
  light (#e8d8b6, pale), not amber. Every beat is ONE register (title,
  one paragraph); the `p + p` body rule and the Mahābhāṣya annotation
  were removed. The `matha` beat leaves at .290 so the last steps through
  the door carry no copy.

**The experience pass (Sept 2026)** against the owner's brief that the site
felt "made": transitions, camera moves and text visibly choreographed,
heavy on phones, typography and copy not one system. The diagnosis was
done first (three audits: camera grammar, copy voice, render cost, plus a
measured scrub of every seam on a 375×812 frame), and the changes were
made at the level the diagnosis pointed to. Numbers below are from that
frame, same machine, before → after.

- *The stall at every seam was shader compilation.* Three.js keys every lit
  program on the number of visible lights. Each stage was warmed alone at
  boot, but a seam shows two stages at once, and lamps toggled their
  lights' `.visible` mid-chapter, so the first scroll into a seam
  recompiled every material in view: 1015 ms at t .063 on a desktop, the
  program count growing 363 → 554 across one scrub. Now: `warm()` in
  main.js compiles each stage alone AND with the stage it hands over to
  (the house's yard and interior separately, via `setWorld`); no lamp ever
  toggles a light's visibility (util.js `setOn` drives intensity;
  `hoistLight` moves a lamp's light out of any group that is shown and
  hidden; landmarks' `focusLight` and the parimala fill are intensity
  driven; the five volumes share ONE lamp light and ONE fill that follow
  the lit stand). Result: no frame over 4 ms across a full scrub, program
  count constant through it. Do not reintroduce `light.visible = …`.
- *Phones rendered more pixels than desktops.* `DPR_CAP` was 2 on phones,
  1.5 on desktop; it is 1.5 everywhere, the governor floor is .6. The 36
  grass cutouts are 1024×512 on phones (`grassCutout` SMALL). The hero
  sun casts no shadow on phones (the map was allocated for a disabled
  pass). The study's six lamps keep flames and soot but not lights on a
  phone; two shared lights along the corridor carry the pools. Journey
  scatter and mist are lighter on phones. Per-frame `new Vector3` in the
  instance loops (parimala, antaranga) are scratch vectors. Style writes
  in the frame loop are skipped when unchanged.
- *One camera in time.* The authored shot is now a TARGET; the camera
  follows it with one critically damped lag (`camS` in main.js, λ 7.5;
  a jump over 12 units is a cut and is taken at once). Every chapter's
  keyframe stops, C0 kinks and pops share one settle. `step()`/`snap()`
  force it, so review frames are still exact. Scroll damping went 2.8 →
  4.6 so the world answers the thumb sooner. The blanket +8° phone fov is
  `min(fov + 6, 50)`.
- *Camera moves that were showing off* were reduced, not polished:
  antaranga's 48° orbit is a 15° drift and its segment pop is gone, its
  final zoom 42→32 on a smoothstep; bheda's full sine cycle in x is a
  monotone drift and its retreat is a breath; manchale opens at z 40 /
  fov 46 instead of 58 / 54; the journey's altitude peaks sit in a 6–10
  band; the house's 69° look whip across the room is a 43° pan over 1.5
  pages; presence's pull-back is shorter and not front-loaded; cam10
  opens at fov 42 to match presence. On a phone the walk to the Matha
  door holds the door centred (the narrow frame had lost it).
- *Seams.* A veil may gather over a longer run than it clears
  (`VEILS[i][5]`, halfWidthBefore): the Brindavana dissolves into light
  over .0125 t before the yard resolves in .005. The two direction
  reversals (.570, .858) have stronger veils and calmer cameras either
  side. Manchale's sky and sun were the one saturated palette on the site
  and now sit nearer the journey's haze.
- *Typography.* No inline styles in the copy: `.t-after`, `.t-close`,
  `.t-wide`. The phone column stands at 18vh / 132px off the bar, not
  15vh / 108px. The hero's legibility gradient is at .46, not .74.
- *Copy.* One voice: chapter 07's beats now each live a viewport or more
  (one beat cut, its room given to its neighbours); two Brindavana beats
  that restated the previous one were cut; fragment-and-anaphora lines
  were rewritten as sentences; names normalised (Kumbakonam, Aradhana,
  Madhva, Praṇava, śāligrāma). The works copy is untouched.

**The Works pass (Sept 2026)** against the owner's note that the stand read
as a box and the corridor's lettering made the chapter busy. All of it is in
`js/world/parimala.js`; `works.js`, `scroll.js` and `main.js` are untouched.

- *The stand is a rehal*, the folding reading stand of every matha: two
  carved boards (one `ExtrudeGeometry` from a `THREE.Shape` with an ogee
  outline, real fretwork holes and a bevel) crossed on a wooden barrel hinge,
  brass star inlays on the legs, sheesham grain from a procedural canvas
  (`woodTex`). Dials: `BETA` (board angle from horizontal, 30°), `L1`/`L2`
  (legs/wings), the hole pattern in `boardGeo`.
- *The volume lies OPEN on it.* The printed plate is the title page on the
  recto; the verso is a procedural printed page headed by the work's
  Devanagari title (`pageCanvas`, drawn a half-turn round because that is how
  the verso's faces map it), and its top leaf lifts through the window
  (`v.leaf.rotation.z`). Pages are smaller than the boards (`PW`/`PH`) so
  the carved tips show round them.
- *The camera looks DOWN at it.* `cam()` time-warps the corridor under the
  works (`SPEED`/`warp`: travel drops to ~3.5% for u .13–.90, so the stand
  is held instead of rushing past) and blends a pitch in with `hushCam`.
  `RIG` carries the per-platform framing: pitch, distance, the elevation the
  stand is seen from, and a yaw right on wide screens. The stand is placed
  from `cam(uMid)` of its own window, so it stays on the line of sight.
  MEASURED: phone 375×812, the rig spans y 20–40% above the column; wide,
  x 43–75%, right of the column.
- *Light.* One deepa at the left is the fader (the rig comes up as the lamp
  does), plus a soft fill over the reader's shoulder tied to it: without it
  the verso, which faces away from the lamp, rendered black. A lit floor
  disc under each rig (`floor`, alpha-mapped) gives the stand a ground.
- *Fades are sequential*, with a dark beat of ~.001 t between volumes; the
  first comes up with the chapter's own copy (`inA` for i = 0) so the tilt
  never lands on an empty floor.
- *The Guru Paramparā plates are gone.* Under the works they could only be
  read as a second layer of type behind the column, and the old exit dash
  put "Madhvācārya" behind "Around 45 works". The `GURUS` list, the gates
  and their update were removed.

**Refinement pass (Sept 2026)** against the cohesion brief. What changed and
where the dials are:

- *Preloader* — the drawing is now a function of the LOAD. index.html reports
  each module (0 → .56), main.js the fonts, the two opening stages and the
  first render (.58 → 1); `shown` can never run ahead of `target`, so the
  Brindavana completes exactly when the first scene is renderable and exits
  at once (no `hold`). A stalled load adds `#preloader.waiting` (a slow
  breathe). Later chapters are dynamic imports built behind the live site
  (`LATER` in main.js, `OFF` carries their Y offsets).
- *Sunrise* — the land is visible before the sun: `river.js` floors the dawn
  dial (`openT = openRaw * (.34 + .66·rise)`), `hero.js` floors the light
  (`PRE`), never fades vegetation (`uFade` stays 1; the TINT carries dawn).
  `RISE_DUR` 5.5 s, and the first scroll finishes it (`riseNow(now, t)`).
  Review aid: `ANTARANGA.setRise(0..1)`, `-1` to release.
- *00 → 01* — `cam00` HOLDS the Brindavana and eases forward; `glow`
  (river.js → hero.js) floods light and stands up three mist sprites in
  front of the lens; the seam is a PALE veil (`VEILS[0]`, `ui-light` gives
  the interface dark ink); purvashrama.js `camOut` opens in mist (`haze2`,
  `haze3`, and a fog boost in main.js for `ci === 1`).
- *Veils* carry a motif colour each (`VEILS` in scroll.js).
- *Bhuvanagiri* — damp earth (`earthCanvas`, material tints), painted-card
  trees with shade discs, painted shrubs, grass sheets (`mkGrass`; MEASURED
  frames: a phone sees only x ≈ −3…3 at the house, so the tufts sit right
  up to the approach), tulasi kaṭṭe, stepping stones, water pot, kolam.
  `ATMOS[1]` is a grey-green haze, not the old orange.
- *snap()* now advances the clock 50 ms per frame. The pane reports
  `document.hidden === true`, so rAF is asleep there and NOTHING animates
  between your ticks — the fog you see in a live screenshot of the pane is
  mid-transition. Trust snap(t, true, 60), not the pane.


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
