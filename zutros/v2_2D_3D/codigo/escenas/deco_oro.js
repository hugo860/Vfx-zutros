// 2D canvas: art-deco golden sunburst with light pulses travelling along the rays
import { listo, CON_LOGO, W, H, TAU } from './comun.js';
const cv = document.createElement('canvas'); cv.width = W; cv.height = H; document.body.appendChild(cv);
const x = cv.getContext('2d');
const s = H / 1080, cx = W / 2, cy = H * 0.5;
let logo = null;
if (CON_LOGO) { logo = new Image(); logo.src = '../logo_blanco.png'; await logo.decode(); }
const oroG = (x0, y0, x1, y1) => { const g = x.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#7a5a24'); g.addColorStop(0.35, '#f3d48c'); g.addColorStop(0.5, '#fff2c8');
  g.addColorStop(0.65, '#d6a64e'); g.addColorStop(1, '#6e4e1c'); return g; };
const NR = 48;
listo(p => {
  const t = p / TAU;
  // background: black with deep wine centre
  const bg = x.createRadialGradient(cx, cy, 0, cx, cy, W * 0.6);
  bg.addColorStop(0, '#2a0708'); bg.addColorStop(0.55, '#0c0404'); bg.addColorStop(1, '#030202');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.save(); x.translate(cx, cy);
  const rot = 0.03 * Math.sin(p);
  x.rotate(rot);
  const R0 = 340 * s, R1 = W * 0.75;
  // rays (alternating long/short), drawn thin in gold
  for (let i = 0; i < NR; i++) {
    const a = i / NR * TAU; const len = i % 2 ? R1 * 0.78 : R1;
    const c = Math.cos(a), sn = Math.sin(a);
    x.strokeStyle = `rgba(214,166,78,${i % 2 ? 0.22 : 0.38})`; x.lineWidth = (i % 2 ? 1.2 : 2) * s;
    x.beginPath(); x.moveTo(c * R0, sn * R0); x.lineTo(c * len, sn * len); x.stroke();
    // pulses: each ray carries 2 comets moving outward, integer laps per loop
    for (let k = 0; k < 2; k++) {
      const u = ((t * (1 + (i % 3 === 0)) + k / 2 + (i * 0.618) % 1) % 1);
      const r = R0 + (len - R0) * u; const L = 140 * s;
      const gr = x.createLinearGradient(c * (r - L), sn * (r - L), c * r, sn * r);
      const al = Math.sin(Math.PI * u) * 0.9;
      gr.addColorStop(0, 'rgba(255,220,150,0)'); gr.addColorStop(1, `rgba(255,236,190,${al})`);
      x.strokeStyle = gr; x.lineWidth = 2.6 * s; x.beginPath();
      x.moveTo(c * Math.max(r - L, R0), sn * Math.max(r - L, R0)); x.lineTo(c * r, sn * r); x.stroke();
    }
  }
  // concentric deco arcs with stepped scallops
  for (let k = 0; k < 4; k++) {
    const r = R0 + (60 + k * 95) * s;
    x.strokeStyle = `rgba(230,190,110,${0.5 - k * 0.09})`; x.lineWidth = (k ? 1.2 : 2.4) * s;
    x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke();
    if (k === 1) for (let i = 0; i < 64; i++) { // beads
      const a = i / 64 * TAU + p / 8 * (i % 2 ? 1 : 1); x.fillStyle = 'rgba(240,205,130,0.7)';
      x.beginPath(); x.arc(Math.cos(a) * r, Math.sin(a) * r, 2.6 * s, 0, TAU); x.fill(); }
  }
  x.restore();
  // central medallion (counter rotation so the logo sits still)
  x.save(); x.translate(cx, cy);
  const m = x.createRadialGradient(0, 0, 0, 0, 0, R0);
  m.addColorStop(0, '#1d0606'); m.addColorStop(1, '#0a0303');
  x.fillStyle = m; x.beginPath(); x.arc(0, 0, R0, 0, TAU); x.fill();
  // gold ring with a moving highlight
  const ha = p; x.lineWidth = 10 * s;
  x.strokeStyle = oroG(Math.cos(ha) * R0, Math.sin(ha) * R0, -Math.cos(ha) * R0, -Math.sin(ha) * R0);
  x.beginPath(); x.arc(0, 0, R0, 0, TAU); x.stroke();
  x.lineWidth = 2 * s; x.strokeStyle = 'rgba(240,205,130,0.8)';
  x.beginPath(); x.arc(0, 0, R0 - 22 * s, 0, TAU); x.stroke();
  if (logo) {
    const lw = R0 * 1.72, lh = lw * logo.height / logo.width;
    x.globalAlpha = 0.97; x.drawImage(logo, -lw / 2, -lh / 2, lw, lh); x.globalAlpha = 1;
    // shimmer across the logo
    const sh = (t * 1.6 - 0.3) * lw * 2 - lw; const al = Math.pow(Math.sin(Math.PI * t), 2);
    x.save(); x.globalCompositeOperation = 'source-atop';
    x.restore();
    x.globalCompositeOperation = 'lighter';
    const gg = x.createLinearGradient(sh - 120 * s, 0, sh + 120 * s, 0);
    gg.addColorStop(0, 'rgba(255,200,120,0)'); gg.addColorStop(0.5, `rgba(255,200,120,${0.18 * al})`); gg.addColorStop(1, 'rgba(255,200,120,0)');
    x.fillStyle = gg; x.beginPath(); x.arc(0, 0, R0 - 24 * s, 0, TAU); x.fill();
    x.globalCompositeOperation = 'source-over';
  } else {
    x.strokeStyle = 'rgba(240,205,130,0.6)'; x.lineWidth = 1.5 * s;
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + p / 4;
      x.beginPath(); x.ellipse(0, 0, R0 * 0.62, R0 * 0.18, a, 0, TAU); x.stroke(); }
  }
  x.restore();
  // fine art-deco frame
  x.strokeStyle = 'rgba(214,166,78,0.55)'; x.lineWidth = 1.5 * s;
  const mg = 36 * s; x.strokeRect(mg, mg, W - 2 * mg, H - 2 * mg);
  x.strokeRect(mg + 10 * s, mg + 10 * s, W - 2 * mg - 20 * s, H - 2 * mg - 20 * s);
});
