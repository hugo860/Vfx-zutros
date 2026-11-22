// Utilidades comunes. Cada escena expone window.seek(t) y es funcion pura de p = 2*PI*t/T -> loop sin costura.
import * as THREE from 'three';
export { THREE };
export const Q = new URLSearchParams(location.search);
export const W = +(Q.get('w') || 1920), H = +(Q.get('h') || 1080);
export const T = +(Q.get('dur') || 10);
export const CON_LOGO = Q.get('logo') !== '0';
export const TAU = Math.PI * 2;

export function renderer3d() {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(W, H);
  r.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(r.domElement);
  return r;
}

export function tex(url) {
  return new Promise(ok => new THREE.TextureLoader().load(url, t => {
    t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; ok(t);
  }));
}

// GLSL helpers compartidos por las escenas 2D
export const GLSL = `
precision highp float;
#define TAU 6.28318530718
uniform float p; uniform vec2 res; uniform float conLogo;
// muestrea un logo centrado en c (uv 0-1, y arriba), ancho w (fraccion de pantalla), aspecto asp (alto/ancho de la imagen)
vec4 logoAt(sampler2D t, vec2 uv, vec2 c, float w, float asp) {
  vec2 d = uv - c; d.x /= w; d.y /= w * asp * res.x / res.y;
  vec2 st = d + 0.5;
  if (st.x < 0. || st.x > 1. || st.y < 0. || st.y > 1.) return vec4(0.);
  return texture2D(t, st);
}
float hash(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
`;

// escena 2D: un quad a pantalla completa con un fragment shader
export function shader2d(frag, uniforms = {}) {
  const r = renderer3d();
  r.outputColorSpace = THREE.LinearSRGBColorSpace; // el shader escribe color final
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const u = { p: { value: 0 }, res: { value: new THREE.Vector2(W, H) }, conLogo: { value: CON_LOGO ? 1 : 0 }, ...uniforms };
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: 'void main(){gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: GLSL + frag });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m));
  return p => { u.p.value = p; r.render(scene, cam); };
}

export async function logoAsp(url) {
  const t = await tex(url); return { t, asp: t.image.height / t.image.width };
}

export function listo(fn) {
  window.seek = t => { fn(TAU * ((t % T) / T)); return true; }; window.LISTO = true;
  // ?vivo=1 -> animacion en tiempo real en el navegador (para previsualizar sin renderizar)
  if (Q.get('vivo') === '1') { const t0 = performance.now(); const loop = () => { window.seek((performance.now() - t0) / 1000); requestAnimationFrame(loop); }; loop(); }
}

// logo 3D extruido desde logo_shapes.json: letras en cromo blanco + franjas de la O en degradado atardecer (emisivas)
export const ATARDECER = [0xffc04a, 0xff8a3d, 0xff5a5a, 0xf03c7a, 0xc02a9a];
export async function logo3d(ancho = 6, prof = 0.25, matLetras) {
  const d = await (await fetch('../logo_shapes.json')).json();
  const g = new THREE.Group();
  const geo = (shapes, depth) => {
    const ss = shapes.map(s => {
      const sh = new THREE.Shape(s.o.map(q => new THREE.Vector2(q[0], q[1])));
      sh.holes = s.h.map(h => new THREE.Path(h.map(q => new THREE.Vector2(q[0], q[1]))));
      return sh;
    });
    const gg = new THREE.ExtrudeGeometry(ss, { depth, bevelEnabled: true, bevelThickness: depth * 0.3,
      bevelSize: 0.002, bevelSegments: 3, curveSegments: 1 });
    gg.translate(0, 0, -depth / 2); return gg;
  };
  const m = new THREE.Mesh(geo(d.letras, prof / ancho), matLetras || new THREE.MeshPhysicalMaterial({
    color: 0xf4f6fa, metalness: 1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
  m.castShadow = true; g.add(m);
  // franjas ordenadas de arriba a abajo
  const fr = d.franjas.map(s => ({ s, y: Math.max(...s.o.map(q => q[1])) })).sort((a, b) => b.y - a.y);
  fr.forEach((f, i) => {
    const c = new THREE.Color(ATARDECER[Math.min(i, ATARDECER.length - 1)]);
    g.add(new THREE.Mesh(geo([f.s], prof / ancho * 0.7), new THREE.MeshStandardMaterial({
      color: c, emissive: c, emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.2 })));
  });
  g.scale.setScalar(ancho);
  g.userData.alto = d.aspect * ancho;
  return g;
}

function discoTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.6)');
  gr.addColorStop(0.72, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
// bokeh de colores tropicales/neon en trayectorias cerradas (frecuencias enteras -> loop)
export function bokeh(scene, n, zona, colores, seed = 3) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const tx = discoTex(); const items = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.SpriteMaterial({ map: tx, color: new THREE.Color(colores[i % colores.length]), transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.15 + rnd() * 0.35 });
    const sp = new THREE.Sprite(m); const sz = 0.5 + rnd() * 1.8; sp.scale.set(sz, sz, 1); scene.add(sp);
    items.push({ sp, x: zona[0] + rnd() * (zona[1] - zona[0]), y: zona[2] + rnd() * (zona[3] - zona[2]),
      z: zona[4] + rnd() * (zona[5] - zona[4]), r: 0.3 + rnd() * 1.2, f: 1 + Math.floor(rnd() * 2),
      ph: rnd() * TAU, o: m.opacity, tw: 1 + Math.floor(rnd() * 3) });
  }
  return p => items.forEach(b => {
    b.sp.position.set(b.x + b.r * Math.cos(b.f * p + b.ph), b.y + b.r * 0.6 * Math.sin(b.f * p + b.ph), b.z);
    b.sp.material.opacity = b.o * (0.6 + 0.4 * Math.sin(b.tw * p + b.ph * 2));
  });
}
