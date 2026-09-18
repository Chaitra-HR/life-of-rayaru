// ANTARANGA · the preloader's own thread. It owns the canvas, so the drawing
// keeps its frames while the page parses three.js and raises the world.
import { createDrafting } from './preloader-draw.js';

let engine = null, running = false, lastStep = 0;
const raf = self.requestAnimationFrame
  ? (f) => self.requestAnimationFrame(f)
  : (f) => setTimeout(f, 16);

function tick() {
  if (!engine || !running) return;
  lastStep = performance.now();
  running = engine.step();
}
function loop() {
  tick();
  if (running) raf(loop);
}
/* a hidden page pauses the worker's frames too: a timer keeps the drawing
   advancing so the loader never waits for the tab to be shown */
const guard = setInterval(() => {
  if (!engine) return;
  if (!running) { clearInterval(guard); return; }
  if (performance.now() - lastStep > 250) tick();
}, 120);

self.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'init') {
    const ctx = m.canvas.getContext('2d');
    engine = createDrafting(ctx, m.data, {
      reduced: m.reduced, swift: m.swift,
      post: (msg) => self.postMessage(msg),
    });
    engine.resize(m.w, m.h, m.dpr);
    running = true;
    lastStep = performance.now();
    raf(loop);
  } else if (!engine) {
    return;
  } else if (m.type === 'target') {
    engine.setTarget(m.p);
  } else if (m.type === 'resize') {
    engine.resize(m.w, m.h, m.dpr);
    if (!running) engine.step();
  }
};
