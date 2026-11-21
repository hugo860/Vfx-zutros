import { THREE, base, oro, logo3d, bokeh, listo, CON_LOGO, TAU } from './comun.js';
const { renderer, scene, camera } = base();
// background: deep wine radial glow
const c = document.createElement('canvas'); c.width = 1920; c.height = 1080;
const x = c.getContext('2d'); const g = x.createRadialGradient(960, 540, 50, 960, 540, 1100);
g.addColorStop(0, '#3b0b0a'); g.addColorStop(0.5, '#170605'); g.addColorStop(1, '#040202');
x.fillStyle = g; x.fillRect(0, 0, 1920, 1080);
const bgt = new THREE.CanvasTexture(c); bgt.colorSpace = THREE.SRGBColorSpace; scene.background = bgt;

const key = new THREE.SpotLight(0xffd7a0, 260, 40, 0.5, 0.6); key.position.set(4, 6, 8); scene.add(key);
const rim = new THREE.PointLight(0xff7a4a, 60, 30); rim.position.set(-5, -2, -3); scene.add(rim);
scene.add(new THREE.AmbientLight(0x402018, 0.6));

const anillos = [];
const cfg = [[3.0, 0.045, [1, 0, 0], 1], [2.7, 0.03, [0, 1, 0], -1], [2.4, 0.05, [1, 1, 0], 3], [2.1, 0.025, [0, 1, 1], -1]];
cfg.forEach(([r, t, ax, k], i) => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 24, 256), oro(0.18 + i * 0.04));
  const piv = new THREE.Group(); piv.add(m); scene.add(piv);
  // little gold beads riding each ring
  for (let b = 0; b < 2; b++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(t * 2.2, 24, 16), oro(0.1));
    const a = b * Math.PI; s.position.set(r * Math.cos(a), r * Math.sin(a), 0); m.add(s);
  }
  piv.rotation.set(0.5 * i, 0.9 * i, 0.3 * i);
  anillos.push({ m, ax: new THREE.Vector3(...ax).normalize(), k });
});
let logo = null;
if (CON_LOGO) { logo = await logo3d(2.9, 0.16); scene.add(logo); }
const bk = bokeh(scene, 70);
listo(p => {
  // each ring turns half a revolution per loop (a torus maps onto itself after pi) -> slow & seamless
  anillos.forEach(a => a.m.quaternion.setFromAxisAngle(a.ax, a.k * p / 2));
  if (logo) { logo.rotation.y = 0.22 * Math.sin(p); logo.rotation.x = 0.05 * Math.sin(2 * p); }
  camera.position.set(1.2 * Math.sin(p), 0.5 * Math.sin(p + 1), 10.5 + 0.4 * Math.cos(p));
  camera.lookAt(0, 0, 0);
  key.position.set(5 * Math.cos(p), 5, 7 + 2 * Math.sin(p));
  bk(p);
  renderer.render(scene, camera);
});
