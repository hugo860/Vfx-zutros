// 2D canvas: golden dust swirls, gathers into the Zutros logo, holds, and scatters again (loop)
import { listo, W, H, TAU } from './comun.js';
const cv = document.createElement('canvas'); cv.width = W; cv.height = H; document.body.appendChild(cv);
const x = cv.getContext('2d'); const s = H / 1080;
const img = new Image(); img.src = '../logo_red_oro.png'; await img.decode();
const lw = W * 0.5, lh = lw * img.height / img.width;
const oc = document.createElement('canvas'); oc.width = Math.round(lw); oc.height = Math.round(lh);
const ox = oc.getContext('2d'); ox.drawImage(img, 0, 0, oc.width, oc.height);
const d = ox.getImageData(0, 0, oc.width, oc.height).data;
let sd = 11; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
const P = []; const step = Math.max(2, Math.round(3 * s));
for (let yy = 0; yy < oc.height; yy += step) for (let xx = 0; xx < oc.width; xx += step) {
  const i = (yy * oc.width + xx) * 4; if (d[i + 3] < 140) continue;
  const rojo = d[i] > 60 && d[i+1] < 100;
  P.push({ tx: W / 2 - lw / 2 + xx + (r() - .5) * step, ty: H / 2 - lh / 2 + yy + (r() - .5) * step, rojo,
    R: (0.25 + r() * 0.6) * W, a0: r() * TAU, k: r() < .5 ? 1 : -1, e: 0.2 + r() * 0.5, dl: r() * 0.12, sz: (1.6 + r() * 1.8) * s, ph: r() * TAU });
}
const polvo = Array.from({ length: 260 }, () => ({ x: r() * W, y: r() * H, a: r() * TAU, rr: 20 + r() * 80, sz: (0.5 + r() * 1.5) * s }));
const ease = u => u < 0 ? 0 : u > 1 ? 1 : u * u * u * (u * (6 * u - 15) + 10);
listo(p => {
  const t = p / TAU;
  const bg = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.65);
  bg.addColorStop(0, '#1c0606'); bg.addColorStop(0.6, '#080303'); bg.addColorStop(1, '#020101');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'lighter';
  for (const q of polvo) { const px = q.x + q.rr * Math.cos(p + q.a), py = q.y + q.rr * 0.5 * Math.sin(p + q.a);
    x.fillStyle = `rgba(230,180,100,${0.15 + 0.15 * Math.sin(2 * p + q.a)})`; x.fillRect(px, py, q.sz * 2, q.sz * 2); }
  for (const q of P) {
    // assemble 0.08..0.38, hold, scatter 0.70..0.98 (per-particle delay); w(0)=w(1)=0
    const w = ease((t - 0.08 - q.dl) / 0.3) * (1 - ease((t - 0.68 - q.dl) / 0.26));
    const ang = q.a0 + q.k * p;  // orbit, one lap per loop
    const sx = W / 2 + q.R * Math.cos(ang), sy = H / 2 + q.R * q.e * Math.sin(ang);
    const px = sx + (q.tx - sx) * w, py = sy + (q.ty - sy) * w;
    const tw = 0.6 + 0.4 * Math.sin(3 * p + q.ph);
    const al = (0.35 + 0.65 * w) * tw;
    x.fillStyle = q.rojo && w > 0.5 ? `rgba(${235 + 10 * (1 - w) | 0},${45 + 150 * (1 - w) | 0},${40 + 80 * (1 - w) | 0},${Math.min(1, al * 1.3)})` : `rgba(245,200,120,${al})`;
    const z = q.sz * (1.6 - 0.6 * w);
    x.fillRect(px - z / 2, py - z / 2, z, z);
  }
  // soft glow when the logo is formed
  const hold = ease((t - 0.3) / 0.1) * (1 - ease((t - 0.66) / 0.1));
  if (hold > 0) { const gl = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, lw * 0.6);
    gl.addColorStop(0, `rgba(160,30,20,${0.18 * hold})`); gl.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gl; x.fillRect(0, 0, W, H); }
  x.globalCompositeOperation = 'source-over';
});
