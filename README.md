# Rayara Antaranga

A scroll-driven cinematic biography of **Sri Raghavendra Tirtha**, built for the
355th Aradhana (Mantralaya, 2026).

One continuous Three.js world rather than a set of pages: the whole site is a
pure function of a single global scroll position `t ∈ [0,1]`, and the eleven
chapters are movements within one authored camera travel — from the Tungabhadra
at first light, through Bhuvanagiri, Kumbhakonam, the works and Tattvavāda, the
pilgrimage across South India, Manchale, and into the Brindavana.

Everything is generated in the browser. There are no 3D asset downloads beyond
the small models in `models/` (the temple arch, the relief, the ruins bundle,
the lotus): the terrain, architecture, water, vegetation and in-scene
typography are all built procedurally at load time.

**Continuing this work on another machine: start with
[HANDOVER.md](HANDOVER.md).**

## Running it

The site is static: vanilla ES modules and a vendored three.js, nothing to
compile. `antaranga/` is the source folder and is served as-is in
development.

```bash
npm install
npm run dev        # serves antaranga/ locally
```

Then open the printed URL. (`.claude/launch.json` carries the same command for
editor-integrated preview.)

## Deploying it

```bash
npm run build      # copies antaranga/ to dist/ and checks every reference resolves
npm run preview    # serves dist/ locally, as a host would
```

| setting | value |
| --- | --- |
| build command | `npm run build` |
| output (publish) directory | `dist` |
| Node | 18.17 or later |
| environment variables | none |

`netlify.toml` and `vercel.json` carry these for Netlify and Vercel; on any
other static host (Cloudflare Pages, Render, GitHub Pages via an action) enter
the same two settings. Every path in the site is relative, so it also works
from a sub-path. The build fails, naming the file, if anything `index.html`
or the stylesheets reference is missing from the output.

## Layout

```
antaranga/
  index.html          markup, font preloads, the import map
  css/style.css       the type system and the editorial layer
  js/
    main.js           renderer, chapter routing, one camera, one render loop
    scroll.js         the global timeline: chapters, captions, transition veils
    util.js           shared math, canvas texture helpers, in-scene type
    scroll.js         also carries every caption for chapters 01–08: the
                      life is read over the same bank through one day
    works.js          the five granthas as data
    world/            one module per world, offset vertically in one scene:
                      the river (the opening, the night, the return) and the
                      Brindavana (pravesha, antaranga). The house, the hall and
                      the road modules are retired and no longer imported.
  vendor/             three.js and BufferGeometryUtils
  fonts/  assets/  models/
```

### The owner's pictures

The owner's photographs of a veena and of a traditional gateway are the
references for two things now BUILT in the world: the veena on the house's
bench (`js/world/veena.js`) and the Bhuvanagiri house's entrance on the bank
(`js/world/threshold.js`). Nothing photographic is placed as a plane;
`antaranga/tools/cutout.py` remains for keying a picture on white should one
ever be wanted.

Each chapter module exports a `create…Stage(ctx)` returning
`{ group, setVisible, cam(u), update(…) }`. `main.js` decides which stages are
live, asks the active one for this frame's camera, and renders once. The full
stage contract, the chapter/`t` map and the design guardrails are in
[HANDOVER.md](HANDOVER.md).

### Chapter 07 · The Journey

The pilgrimage chapter is a stylised 3D landscape of South India rather than a
map: the road as a line on the land, and four places named as words standing
on it. It is split under `js/world/journey/`, and `field.js` is the single
source of geographic truth — coastlines, the Western Ghats, the rivers, the worn
route and the ground height. Terrain, water, the route trace, the planting, the
atmosphere, the words and the camera all sample it, so nothing can float above
the ground or contradict the geography. Notes, dials and regression traps:
[docs/journey-chapter.md](docs/journey-chapter.md) (written before the temple
models were removed). Reference frames from that earlier build:
[journey-review/](journey-review/).

## Accessibility and fallbacks

- The full narrative also exists as flowing text: without WebGL the site renders
  as a document (`?nowebgl` forces this for testing).
- `prefers-reduced-motion` is honoured throughout — motion stops, the narrative
  does not.
- Ambient sound is synthesised and strictly opt-in.

## Debugging

`window.ANTARANGA` exposes `step(t)`, `tick()` and `snap(t)` — `snap` renders any
scroll position synchronously and returns a JPEG data URL, which is how the
scenes are art-directed frame by frame. `tools/shot-server.js` catches those
frames to disk; the workflow is written up in [HANDOVER.md](HANDOVER.md).
