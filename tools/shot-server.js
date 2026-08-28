// Review helper for art-directing the Three.js scenes frame by frame.
//
//   node tools/shot-server.js ./journey-review
//
// Then, from the browser console on the running site:
//
//   const shot = async (t, name) => {
//     const img = window.ANTARANGA.snap(t);
//     await fetch('http://localhost:4599', { method: 'POST', body: JSON.stringify({ img, name }) });
//   };
//   await shot(0.570 + 0.32 * 0.085, '04-madurai.jpg');
//
// `snap(t)` renders any scroll position synchronously and hands back a JPEG data
// URL, which is the only reliable way to inspect a scroll-driven scene: sampled
// screenshots of a live page catch the camera mid-damp and tell you nothing.
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(process.argv[2] || '.');
const PORT = Number(process.env.PORT) || 4599;

fs.mkdirSync(OUT, { recursive: true });

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.end();

  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    try {
      const { img, name } = JSON.parse(body);
      // refuse anything that would escape the output directory
      const safe = path.basename(String(name || 'shot.jpg'));
      const data = String(img).replace(/^data:image\/\w+;base64,/, '');
      if (data.length < 2000) throw new Error('empty frame — is the canvas 0×0? dispatch a resize first');
      fs.writeFileSync(path.join(OUT, safe), Buffer.from(data, 'base64'));
      console.log('wrote', safe, `(${Math.round(data.length * 0.75 / 1024)} KB)`);
      res.end('ok');
    } catch (e) {
      console.error('failed:', e.message);
      res.statusCode = 500;
      res.end(String(e.message));
    }
  });
}).listen(PORT, () => console.log(`shot server on ${PORT} → ${OUT}`));
