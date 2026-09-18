// RAYARA ANTARANGA · the build.
//
// The site is static (vanilla ES modules, three.js vendored): there is nothing
// to compile. The build copies the site folder to dist/, leaves the
// development-only files behind (the local server's config, the picture
// tools), and then checks that everything the page references is actually in
// the output: every script, stylesheet, font, model and asset path named in
// index.html, the import map and the two stylesheets. A missing file fails
// the build with its name, so a host never publishes a page with a hole in it.
import { cpSync, rmSync, readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const SRC = 'antaranga';
const OUT = 'dist';
const LEAVE = new Set(['serve.json', 'tools', '.DS_Store']);   // development only

rmSync(OUT, { recursive: true, force: true });
cpSync(SRC, OUT, { recursive: true, filter: (src) => !LEAVE.has(basename(src)) });

/* ---- the references the page makes, all relative to index.html ---- */
const refs = new Map();   // path → where it was named
const add = (p, from) => { if (!/^(https?:|data:|mailto:|#|javascript:)/i.test(p)) refs.set(p.split(/[?#]/)[0], from); };
const html = readFileSync(join(OUT, 'index.html'), 'utf8');
for (const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) add(m[1], 'index.html');
for (const m of html.matchAll(/\bcontent="([^"]+\.(?:jpg|jpeg|png|webp|svg|ico))"/g)) add(m[1], 'index.html (meta)');
const im = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
if (im) for (const p of Object.values(JSON.parse(im[1]).imports || {})) add(p.replace(/^\.\//, ''), 'import map');
for (const sheet of ['css/style.css', 'fonts/fonts.local.css']) {
  const css = readFileSync(join(OUT, sheet), 'utf8');
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    if (/^(data:|#|%23)/.test(m[1])) continue;   // a data URI, or a fragment (#id, %23id inside an inline SVG): not a file
    add(join(dirname(sheet), m[1]).replace(/\\/g, '/'), sheet);
  }
}
const missing = [...refs].filter(([p]) => !existsSync(join(OUT, p)));
if (missing.length) {
  console.error(`build failed: ${missing.length} reference(s) point at nothing in ${OUT}/:`);
  for (const [p, from] of missing) console.error(`  ${p}   (named in ${from})`);
  process.exit(1);
}

/* ---- the summary ---- */
let files = 0, bytes = 0;
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); const s = statSync(p); if (s.isDirectory()) walk(p); else { files++; bytes += s.size; } } })(OUT);
console.log(`built ${resolve(OUT)}: ${files} files, ${(bytes / 1048576).toFixed(1)} MB; ${refs.size} references checked`);
