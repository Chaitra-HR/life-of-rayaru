// RAYARA ANTARANGA · a track: keys over t, blended without a stop.
//
// The camera (and anything else keyed along the scroll) is a list of keys
// at points of global t, each a vector of components. Between keys the
// track is a monotone cubic (Fritsch–Carlson): C1, so the velocity never
// jumps, and never overshooting a key, so a walk past a wall stays on its
// path. Two identical keys in a row are a hold, eased into and out of.
// Keys spaced close together in t with little between them read as a slow
// drift (the camera settling while words are read); keys far apart with
// far to go read as travel. The spacing IS the pacing: nothing here is a
// duration, everything is a place in the scroll.
export function makeTrack(keys) {
  /* keys: [{ t, v: number[] }] sorted by t; every v the same length */
  const n = keys.length, dim = keys[0].v.length;
  const T = keys.map(k => k.t);
  const V = keys.map(k => k.v);
  /* tangents per key per component */
  const M = keys.map(() => new Array(dim).fill(0));
  for (let c = 0; c < dim; c++) {
    if (n < 2) break;
    const d = [], hs = [];
    for (let i = 0; i < n - 1; i++) { const hh = Math.max(1e-9, T[i + 1] - T[i]); hs.push(hh); d.push((V[i + 1][c] - V[i][c]) / hh); }
    M[0][c] = d[0];
    M[n - 1][c] = d[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) { M[i][c] = 0; continue; }
      const w1 = 2 * hs[i] + hs[i - 1], w2 = hs[i] + 2 * hs[i - 1];
      M[i][c] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
    /* the ends: never steeper than three times the first slope (the F–C limit) */
    const lim = (i, k) => { if (d[k] === 0) M[i][c] = 0; else if (Math.sign(M[i][c]) !== Math.sign(d[k])) M[i][c] = 0; else if (Math.abs(M[i][c]) > 3 * Math.abs(d[k])) M[i][c] = 3 * d[k]; };
    lim(0, 0); lim(n - 1, n - 2);
  }
  const out = new Array(dim).fill(0);
  return (t, res = out) => {
    if (t <= T[0]) { for (let c = 0; c < dim; c++) res[c] = V[0][c]; return res; }
    if (t >= T[n - 1]) { for (let c = 0; c < dim; c++) res[c] = V[n - 1][c]; return res; }
    let i = 0; while (i < n - 2 && t >= T[i + 1]) i++;
    const h = T[i + 1] - T[i], s = (t - T[i]) / h;
    const s2 = s * s, s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    for (let c = 0; c < dim; c++) res[c] = h00 * V[i][c] + h10 * h * M[i][c] + h01 * V[i + 1][c] + h11 * h * M[i + 1][c];
    return res;
  };
}
