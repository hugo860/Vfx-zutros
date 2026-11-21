import { THREE, base, oro, logo3d, bokeh, listo, CON_LOGO, TAU } from './comun.js';
const { renderer, scene, camera } = base(0x070303);
const c = document.createElement('canvas'); c.width = 1920; c.height = 1080;
const x = c.getContext('2d'); const g = x.createRadialGradient(700, 500, 40, 900, 540, 1200);
g.addColorStop(0, '#2a0b08'); g.addColorStop(0.5, '#100504'); g.addColorStop(1, '#030101');
x.fillStyle = g; x.fillRect(0, 0, 1920, 1080);
const bgt = new THREE.CanvasTexture(c); bgt.colorSpace = THREE.SRGBColorSpace; scene.background = bgt;
// wine glass from a lathe profile
scene.environmentIntensity = 0.3;
const prof = [[0, 0], [0.9, 0], [0.95, 0.03], [0.9, 0.06], [0.12, 0.12], [0.07, 0.3], [0.06, 1.5], [0.1, 1.62], [0.35, 1.72],
  [0.7, 1.95], [0.95, 2.35], [1.05, 2.8], [1.0, 3.3], [0.9, 3.75], [0.86, 3.95]].map(p => new THREE.Vector2(p[0], p[1]));
const vidrio = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.16,
  side: THREE.FrontSide, depthWrite: false, clearcoat: 1, envMapIntensity: 5 });
const copa = new THREE.Group(); scene.add(copa);
const vaso = new THREE.Mesh(new THREE.LatheGeometry(prof, 128), vidrio); vaso.renderOrder = 5; copa.add(vaso);
// wine body
const wp = [[0, 1.7], [0.33, 1.73], [0.66, 1.94], [0.9, 2.33], [0.98, 2.75], [0.97, 2.85], [0, 2.85]].map(p => new THREE.Vector2(p[0] * 0.97, p[1]));
const vinoM = new THREE.MeshPhysicalMaterial({ color: 0x4a0006, roughness: 0.1, clearcoat: 1, emissive: 0x1a0002, emissiveIntensity: 1 });
const vino = new THREE.Mesh(new THREE.LatheGeometry(wp, 128), vinoM); copa.add(vino);
const sup = new THREE.Mesh(new THREE.CircleGeometry(0.95, 96), new THREE.MeshPhysicalMaterial({ color: 0x300004, roughness: 0.02, clearcoat: 1, metalness: 0.2, emissive: 0x120001 }));
sup.rotation.x = -Math.PI / 2; sup.position.y = 2.85; copa.add(sup);
// base stand: dark mirror disc with gold edge
const piso = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.1, 128), new THREE.MeshStandardMaterial({ color: 0x060303, metalness: 0, roughness: 0.45, envMapIntensity: 0.1 }));
piso.position.y = -0.05; scene.add(piso);
const aro = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.03, 16, 256), oro(0.2)); aro.rotation.x = Math.PI / 2; scene.add(aro);
const key = new THREE.SpotLight(0xffd6a0, 300, 30, 0.45, 0.7); scene.add(key); scene.add(key.target); key.target.position.set(0, 2, 0);
const rim = new THREE.PointLight(0xff5a3a, 80, 20); rim.position.set(-3, 3, -3); scene.add(rim);
const rim2 = new THREE.PointLight(0xffc070, 50, 20); rim2.position.set(3, 4, -2.5); scene.add(rim2);
const frente = new THREE.PointLight(0xffe0c0, 60, 20); frente.position.set(4, 3.5, 6); scene.add(frente);
let logo = null;
if (CON_LOGO) { logo = await logo3d(3.6, 0.22); logo.position.set(2.9, 2.2, 0.6); scene.add(logo); copa.position.x = -1.6; piso.position.x = aro.position.x = -0.2; }
const bk = bokeh(scene, 55, [-14, 14, -2, 10, -16, -6], 5);
listo(p => {
  const a = 0.35 * Math.sin(p);
  camera.position.set(12 * Math.sin(a) + (logo ? 0.6 : 0), 3.6 + 0.3 * Math.sin(2 * p), 12 * Math.cos(a));
  camera.lookAt(logo ? 0.6 : 0, 1.9, 0);
  // wine gently swirling: surface tilts around the circle
  const tilt = 0.06; sup.rotation.set(-Math.PI / 2 + tilt * Math.cos(p * 2), 0, tilt * Math.sin(p * 2));
  key.position.set(5 * Math.cos(p * 1), 7, 5 + 2 * Math.sin(p));
  if (logo) { logo.rotation.y = -0.35 + 0.12 * Math.sin(p + 1); logo.position.y = 2.2 + 0.08 * Math.sin(2 * p); }
  bk(p);
  renderer.render(scene, camera);
});
