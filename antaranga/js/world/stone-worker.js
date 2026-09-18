// ANTARANGA · the stone thread.
// Draws the four maps for one stone set and hands the bytes back by transfer —
// no copy, and not one millisecond of it on the thread the drawing lives on.

import { stoneMaps } from './stone-maps.js';

self.onmessage = (e) => {
  const { id, seed, opts } = e.data;
  try {
    const m = stoneMaps(seed, opts);
    self.postMessage({ id, ...m },
      [m.alb.buffer, m.nrm.buffer, m.rough.buffer, m.ao.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
