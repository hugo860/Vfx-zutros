// Shared helpers: every scene exposes window.seek(t) and is a pure function of t (seamless loop of length T)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export { THREE };
export const Q = new URLSearchParams(location.search);
export const W = +(Q.get('w') || 1920), H = +(Q.get('h') || 1080);
export const T = +(Q.get('dur') || 10);
export const CON_LOGO = Q.get('logo') !== '0';
export const TAU = Math.PI * 2;

export function base(bg = 0x0b0605) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 200);
  return { renderer, scene, camera };
}

export const oro = (rough = 0.22) => new THREE.MeshPhysicalMaterial({
  color: 0xd9ad5b, metalness: 1, roughness: rough, clearcoat: 0.3, clearcoatRoughness: 0.2 });
export const vino = () => new THREE.MeshPhysicalMaterial({
  color: 0x7a0508, metalness: 0.35, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.3, sheenColor: 0xff6650 });

export async function logo3d(ancho = 4, prof = 0.12) {
  const d = await (await fetch('../logo_shapes.json')).json();
  const g = new THREE.Group();
  const mk = (shapes, mat, depth) => {
    const ss = shapes.map(s => {
      const sh = new THREE.Shape(s.o.map(p => new THREE.Vector2(p[0], p[1])));
      sh.holes = s.h.map(h => new THREE.Path(h.map(p => new THREE.Vector2(p[0], p[1]))));
      return sh;
    });
    const geo = new THREE.ExtrudeGeometry(ss, { depth, bevelEnabled: true, bevelThickness: depth * 0.25,
      bevelSize: 0.0025, bevelSegments: 3, curveSegments: 1 });
    geo.translate(0, 0, -depth / 2);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  };
  g.add(mk(d.rojo, vino(), prof / ancho));
  g.add(mk(d.texto, oro(0.3), prof / ancho * 0.6));
  g.scale.setScalar(ancho);
  return g;
}

function discoTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.75, 'rgba(255,255,255,0.15)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// warm bokeh discs drifting on closed paths (integer frequencies -> loops)
export function bokeh(scene, n = 60, zona = [-14, 14, -8, 8, -18, -6], seed = 3) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const tex = discoTex(); const items = [];
  for (let i = 0; i < n; i++) {
    const col = new THREE.Color().setHSL(0.08 + rnd() * 0.04, 0.8, 0.55 + rnd() * 0.2);
    const m = new THREE.SpriteMaterial({ map: tex, color: col, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.2 + rnd() * 0.35 });
    const sp = new THREE.Sprite(m);
    const sz = 0.4 + rnd() * 1.4; sp.scale.set(sz, sz, 1);
    scene.add(sp);
    items.push({ sp, x: zona[0] + rnd() * (zona[1] - zona[0]), y: zona[2] + rnd() * (zona[3] - zona[2]),
      z: zona[4] + rnd() * (zona[5] - zona[4]), r: 0.3 + rnd() * 1.2, f: 1 + Math.floor(rnd() * 2),
      ph: rnd() * TAU, o: m.opacity, tw: 1 + Math.floor(rnd() * 3) });
  }
  return p => items.forEach(b => {
    b.sp.position.set(b.x + b.r * Math.cos(b.f * p + b.ph), b.y + b.r * 0.6 * Math.sin(b.f * p + b.ph), b.z);
    b.sp.material.opacity = b.o * (0.6 + 0.4 * Math.sin(b.tw * p + b.ph * 2));
  });
}

export function listo(fn) { window.seek = t => { fn(TAU * ((t % T) / T)); return true; }; window.LISTO = true; }
