# Rayara Antaranga

A scroll-driven cinematic biography of **Sri Raghavendra Tirtha**, built for the
355th Aradhana (Mantralaya, 2026).

One continuous Three.js world rather than a set of pages: the whole site is a
pure function of a single global scroll position `t ∈ [0,1]`, and the eleven
chapters are movements within one authored camera travel — from the Tungabhadra
at first light, through Bhuvanagiri, Kumbhakonam, the works and Tattvavāda, the
pilgrimage across South India, Manchale, and into the Brindavana.

Everything is generated in the browser. There are no 3D asset downloads: the
terrain, architecture, water, vegetation and in-scene typography are all built
procedurally at load time.

## Running it

Any static file server will do — there is no build step.

```bash
npx serve antaranga
```

Then open the printed URL. (`.claude/launch.json` carries the same command for
editor-integrated preview.)

## Layout

```
antaranga/
  index.html          markup, font preloads, the import map
  css/style.css       the type system and the editorial layer
  js/
    main.js           renderer, chapter routing, one camera, one render loop
    scroll.js         the global timeline: chapters, captions, transition veils
    util.js           shared math, canvas texture helpers, in-scene type
    works.js          chapter 05 — the horizontal canvas of the five granthas
    world/            one module per chapter, offset vertically in one scene
      journey/        chapter 07's terrain system (see below)
  vendor/             three.js and BufferGeometryUtils
  fonts/  assets/  models/
```

Each chapter module exports a `create…Stage(ctx)` returning
`{ group, setVisible, cam(u), update(…) }`. `main.js` decides which stages are
live, asks the active one for this frame's camera, and renders once.

### Chapter 07 · The Journey

The pilgrimage chapter is a stylised 3D landscape of South India rather than a
map. It is split under `js/world/journey/`, and `field.js` is the single source
of geographic truth — coastlines, the Western Ghats, the rivers, the worn route
and the ground height. Terrain, water, the route trace, the five temple
landmarks, the planting, the atmosphere, the labels and the camera all sample it,
so nothing can float above the ground or contradict the geography.

## Accessibility and fallbacks

- The full narrative also exists as flowing text: without WebGL the site renders
  as a document (`?nowebgl` forces this for testing).
- `prefers-reduced-motion` is honoured throughout — motion stops, the narrative
  does not.
- Ambient sound is synthesised and strictly opt-in.

## Debugging

`window.ANTARANGA` exposes `step(t)`, `tick()` and `snap(t)` — `snap` renders any
scroll position synchronously and returns a JPEG data URL, which is how the
scenes are art-directed frame by frame.
