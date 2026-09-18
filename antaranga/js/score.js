// RAYARA ANTARANGA · THE SCORE
//
// One authored timeline for the whole site. Everything that moves with the
// scroll (the camera, the copy, the light, the water, the volumes, the
// layers of the stone, the map of the day, the footer) derives from this
// one table, never from the DOM, never from a second table of its own.
//
//   scroll px → y (damped once, scroll.js) → global t = y / max
//            → chapter → beat → local u (0..1 across the beat)
//            → copy window · camera keys · environment cues · object cues
//
// A BEAT is one stretch of physical scroll, sized in viewports (vh) for
// what happens in it: a reading beat is long enough to be read at a
// walking pace with the world still moving under it; a travel beat is
// short and the camera moves far. `copy` is the window of the beat (0..1)
// in which its words stand in the frame: the camera arrives as they
// enter, drifts while they are read, and leaves as they go. A beat with no
// copy is travel: the camera and the world move, nothing is read.
//
// Sizes are the desktop's; `m` is the phone's where it differs (a phone
// flicks two or three viewports at a time and its viewport is shorter, so
// its beats are a little shorter, never a scaled copy of the desktop).
// The physical lengths are AUTHORED, per beat, for the amount of copy, the
// size of the reveal, and the distance the camera has to go. They are not
// a constant.
export const SCORE = [
  { id: 'c00', num: '00', name: 'Mantralaya', beats: [
    /* the landscape answers the first scroll: the camera settles forward a
       step while the heading is read, the sun still coming up; then the
       words go and the camera walks on into the morning */
    { id: 'hero',    vh: 2.2, m: 2.0, copy: [0, .66] },
    { id: 'leave',   vh: 1.4, m: 1.2 },
  ]},
  { id: 'c01', num: '01', name: 'Venkatanatha', beats: [
    /* the walk from the composition along the bank to the house's gate,
       the first words arriving as the camera does */
    { id: 'mv-lead', vh: 1.1, m: 1.0 },
    { id: 'mv-01',   vh: 2.3, m: 2.1, copy: [.06, .90] },
    { id: 'mv-02',   vh: 2.4, m: 2.2, copy: [.08, .92] },
  ]},
  { id: 'c02', num: '02', name: 'Gṛhastha', beats: [
    { id: 'mv-02m',  vh: 2.1, m: 1.9, copy: [.08, .92] },
  ]},
  { id: 'c03', num: '03', name: 'Kumbakonam', beats: [
    /* out of the yard by the gate and down the bank to the Matha: travel */
    { id: 'way-02b', vh: .9,  m: .8 },
    { id: 'mv-02b',  vh: 1.9, m: 1.8, copy: [.10, .92] },
    /* the dream: the light rises behind the stone in the middle of the reading */
    { id: 'mv-02d',  vh: 2.3, m: 2.1, copy: [.08, .92] },
  ]},
  { id: 'c04', num: '04', name: 'Raghavendra', beats: [
    /* the name: dusk falls into it, the two deepas are lit */
    { id: 'mv-03',   vh: 2.7, m: 2.4, copy: [.08, .92] },
  ]},
  { id: 'c05', num: '05', name: 'The Works', beats: [
    { id: 'mv-04',   vh: 2.1, m: 1.9, copy: [.10, .90] },
    /* one volume each: the walk lands on it, the cover lifts as the first
       sentence is read, closes as the words go */
    { id: 'mv-04a',  vh: 1.6, m: 1.5, copy: [.14, .90] },
    { id: 'mv-04b',  vh: 1.6, m: 1.5, copy: [.14, .90] },
    { id: 'mv-04c',  vh: 1.6, m: 1.5, copy: [.14, .90] },
    { id: 'mv-04d',  vh: 1.6, m: 1.5, copy: [.14, .90] },
    { id: 'mv-04e',  vh: 1.6, m: 1.5, copy: [.14, .90] },
  ]},
  { id: 'c06', num: '06', name: 'Tattvavāda', beats: [
    /* off the landing, out through the gateway's opening onto the bay */
    { id: 'way-05',  vh: .8,  m: .7 },
    { id: 'mv-05',   vh: 2.7, m: 2.4, copy: [.10, .92] },
    /* the five differences: one each, the gaze turning between them */
    { id: 'mv-05a',  vh: 1.6, m: 1.5, copy: [.14, .90] },
    { id: 'mv-05b',  vh: 1.6, m: 1.5, copy: [.14, .90] },
    { id: 'mv-05c',  vh: 1.5, m: 1.4, copy: [.14, .90] },
    { id: 'mv-05d',  vh: 1.6, m: 1.5, copy: [.14, .90] },
    { id: 'mv-05e',  vh: 1.5, m: 1.4, copy: [.14, .90] },
    { id: 'mv-05f',  vh: 2.1, m: 1.9, copy: [.10, .90] },
  ]},
  { id: 'c07', num: '07', name: 'The Journey', beats: [
    { id: 'mv-06',   vh: 2.3, m: 2.1, copy: [.10, .90] },
  ]},
  { id: 'c08', num: '08', name: 'Manchale', beats: [
    /* the arrival: the composition reached by arriving at it, then held while it is read */
    { id: 'mv-07',   vh: 2.5, m: 2.3, copy: [.14, .90] },
    /* through the gateway to the stone, the lamps' warmth growing, the air closing */
    { id: 'mv-tail', vh: 1.5, m: 1.3 },
  ]},
  { id: 'c09', num: '09', name: 'Brindavana', beats: [
    /* the day breaks over Manchale; the stone that stands there today lifts
       away while the day of Pravesha is read (it is not yet built) */
    { id: 'b-day',     vh: 2.3, m: 2.1, copy: [.06, .86] },
    /* the bank is cut open and the camera goes down to the chamber: travel */
    { id: 'b-down',    vh: 1.5, m: 1.3 },
    { id: 'b-chamber', vh: 2.7, m: 2.4, copy: [.08, .92] },
    { id: 'b-kurma',   vh: 2.1, m: 1.9, copy: [.10, .92] },
    { id: 'b-plate',   vh: 1.8, m: 1.7, copy: [.10, .92] },
    { id: 'b-shals',   vh: 2.5, m: 2.3, copy: [.08, .92] },
    { id: 'b-stone',   vh: 2.7, m: 2.4, copy: [.08, .92] },
    { id: 'b-grain',   vh: 1.8, m: 1.7, copy: [.10, .92] },
    { id: 'b-deities', vh: 2.3, m: 2.1, copy: [.08, .90] },
    /* the camera draws back out of it all to the opening's own hold: travel */
    { id: 'b-out',     vh: 1.7, m: 1.5 },
  ]},
  { id: 'c10', num: '00', name: 'Return', beats: [
    { id: 'r-year',    vh: 2.4, m: 2.2, copy: [.10, .90] },
    { id: 'r-today',   vh: 2.4, m: 2.2, copy: [.10, .90] },
    /* the last words gone, the place held; the footer follows in the same scroll */
    { id: 'r-hold',    vh: .8,  m: .7 },
  ]},
];

/* the fades of every copy block, in viewports: the same at every beat, so
   every passage arrives and leaves at one pace whatever its length */
export const COPY_IN = .20, COPY_OUT = .20;

/* ---- the laid-out score: every beat given its place in the scroll ----
   layout(h, phone) returns the chapters and beats with y0/y1 (px) and
   t0/t1 (global t), plus lookups. Called on every resize; nothing here is
   measured from the DOM. */
export function layout(h, phone = false) {
  const chapters = [], beats = [], byId = {};
  let y = 0;
  for (const ch of SCORE) {
    const c = { ...ch, beats: [], y0: y };
    for (const b of ch.beats) {
      const span = (phone && b.m !== undefined ? b.m : b.vh) * h;
      const beat = { ...b, ch: c, y0: y, y1: y + span, span, i: beats.length };
      y += span;
      c.beats.push(beat); beats.push(beat); byId[b.id] = beat;
    }
    c.y1 = y;
    chapters.push(c);
  }
  const max = y;
  for (const b of beats) {
    b.t0 = b.y0 / max; b.t1 = b.y1 / max;
    /* the copy window in t, and its centre */
    if (b.copy) {
      b.cA = b.t0 + b.copy[0] * (b.t1 - b.t0);
      b.cB = b.t0 + b.copy[1] * (b.t1 - b.t0);
      b.cC = (b.cA + b.cB) / 2;
    }
  }
  for (const c of chapters) { c.t0 = c.y0 / max; c.t1 = c.y1 / max; c.a = c.t0; c.b = c.t1; }
  /* a beat's local u at t, clamped */
  const uAt = (b, t) => Math.max(0, Math.min(1, (t - b.t0) / Math.max(1e-9, b.t1 - b.t0)));
  /* the point in t of a beat-local u */
  const tAt = (id, u) => { const b = byId[id]; return b ? b.t0 + u * (b.t1 - b.t0) : 0; };
  const beatAt = (t) => { let i = 0; while (i < beats.length - 1 && t >= beats[i + 1].t0) i++; return beats[i]; };
  const chapterAt = (t) => { let i = 0; while (i < chapters.length - 1 && t >= chapters[i + 1].t0) i++; return i; };
  return { chapters, beats, byId, max, h, phone, uAt, tAt, beatAt, chapterAt };
}
