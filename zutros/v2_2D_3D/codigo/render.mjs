// node render.mjs <escena> <logo 0|1> <frames|still> <salida> [w h]
import { chromium } from 'playwright';
import { spawn } from 'child_process';
const [esc, logo, modo, out, w = 1920, h = 1080] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: +w, height: +h } });
pg.on('console', m => console.log('page:', m.text())); pg.on('pageerror', e => console.log('ERROR', e.message));
await pg.goto(`http://127.0.0.1:8765/escenas/${esc}.html?logo=${logo}&w=${w}&h=${h}`);
await pg.waitForFunction('window.LISTO === true', null, { timeout: 30000 });
const T = 10;
const shot = async t => { await pg.evaluate(t => window.seek(t), t); return pg.screenshot({ type: 'png', clip: { x: 0, y: 0, width: +w, height: +h } }); };
if (modo === 'still') {
  const fs = await import('fs');
  for (const [i, f] of [0, 0.33, 0.66].entries()) fs.writeFileSync(`${out}_${i}.png`, await shot(f * T));
} else {
  const N = +modo;
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
    '-c:v', 'hap', '-format', 'hap', '-chunks', '4', `${out}_HAP.mov`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-g', '30', '-movflags', '+faststart', `${out}_H264.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < N; f++) {
    const buf = await shot(f / N * T);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) console.log(esc, f, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log('done', esc, logo);
}
await b.close();
