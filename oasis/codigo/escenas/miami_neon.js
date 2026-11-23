// 3D - Miami neon al atardecer (estilo del flyer de Oasis): cielo naranja-magenta-morado, skyline con ventanas
// encendidas, palmeras en silueta, laguna espejo, helicoptero cruzando y el logo con halo neon rosado.
import { THREE, renderer3d, tex, palmera, aguaEspejo, bokeh, listo, CON_LOGO, TAU, T, W, H } from './comun.js';
const renderer = renderer3d();
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 500);
const u = { p: { value: 0 } };
const vtx = 'varying vec2 v; void main(){ v = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }';

// cielo
const cielo = new THREE.Mesh(new THREE.PlaneGeometry(400, 320), new THREE.ShaderMaterial({ uniforms: u, depthWrite: false,
  vertexShader: vtx, fragmentShader: `uniform float p; varying vec2 v;
  float h(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 q){ vec2 i = floor(q), f = fract(q); f = f*f*(3.-2.*f);
    return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
  void main(){
    vec2 q = vec2((v.x - 0.5) * 400., v.y * 320. - 10.);
    float y = max(q.y, 0.) / 90.;
    vec3 c = mix(vec3(1.0, 0.50, 0.12), vec3(1.0, 0.20, 0.45), smoothstep(0.04, 0.3, y));
    c = mix(c, vec3(0.55, 0.12, 0.62), smoothstep(0.18, 0.5, y));
    c = mix(c, vec3(0.10, 0.03, 0.22), smoothstep(0.45, 1.0, y));
    // nubes pintadas, alargadas, que se balancean (loop)
    float cl = n(vec2(q.x * 0.025 + 0.9 * sin(p), q.y * 0.22)) * 0.7 + n(vec2(q.x * 0.07 - 0.6 * sin(p), q.y * 0.5)) * 0.3;
    float banda = smoothstep(0.08, 0.2, y) * smoothstep(0.75, 0.35, y);
    c = mix(c, mix(vec3(1.0, 0.45, 0.6), vec3(0.75, 0.25, 0.8), smoothstep(0.2, 0.6, y)), smoothstep(0.45, 0.75, cl) * banda * 0.65);
    // sol
    vec2 s = q - vec2(-6., 10.);
    float r = length(s);
    vec3 sun = mix(vec3(1.0, 0.45, 0.3), vec3(1.0, 0.9, 0.5), smoothstep(-12., 12., s.y));
    c = mix(c, sun * 1.5, smoothstep(13., 12.5, r));
    c += vec3(1.0, 0.45, 0.3) * exp(-r / 18.) * 0.6;
    gl_FragColor = vec4(clamp(c, 0., 8.), 1.);
  }` }));
cielo.position.set(0, 150, -160); scene.add(cielo);

// skyline: fachadas planas con ventanas encendidas (algunas parpadean, frecuencias enteras)
let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
const edificio = (x, z, w, h, tono) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({ uniforms: { p: u.p, sz: { value: new THREE.Vector2(w, h) },
    sd: { value: rnd() * 100 }, tono: { value: tono } }, vertexShader: vtx,
    fragmentShader: `uniform float p; uniform vec2 sz; uniform float sd; uniform float tono; varying vec2 v;
    float h(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){
      vec2 m = v * sz;
      vec3 c = mix(vec3(0.012, 0.004, 0.03), vec3(0.04, 0.012, 0.075), v.y) * tono;
      vec2 g = floor(m / vec2(1.1, 1.4)); vec2 f = fract(m / vec2(1.1, 1.4));
      float win = step(0.25, f.x) * step(f.x, 0.75) * step(0.3, f.y) * step(f.y, 0.75);
      float r = h(g + sd);
      float on = step(0.6, r);
      float tw = step(0.97, h(g + sd + 3.)) * step(0.5, sin(p * (1. + floor(h(g + 5.) * 4.)) + r * 20.));
      vec3 wc = r > 0.9 ? vec3(1.0, 0.35, 0.75) : (r > 0.83 ? vec3(0.4, 0.85, 1.0) : vec3(1.0, 0.78, 0.42));
      float borde = step(1.0, m.x) * step(m.x, sz.x - 1.0) * step(m.y, sz.y - 1.2) * step(1.5, m.y);
      c += wc * win * on * (1. - tw) * borde * 0.75;
      // linea neon en la azotea
      c += vec3(1.0, 0.25, 0.7) * exp(-(sz.y - m.y) * 6.) * 0.8 * step(0.5, h(vec2(sd)));
      gl_FragColor = vec4(c, 1.);
      #include <colorspace_fragment>
    }` }));
  m.position.set(x, h / 2 - 0.5, z); scene.add(m);
};
for (let i = 0; i < 46; i++) {
  const x = -110 + i * 4.8 + rnd() * 2, lejos = Math.min(1, Math.abs(x) / 60);
  edificio(x, -92 - rnd() * 10, 4 + rnd() * 3.5, 4 + rnd() * 5 + lejos * (6 + rnd() * 14), 0.8 + rnd() * 0.4);   // bajos en el centro: se ve el sol
}
[-95, -72, -50, 48, 70, 92].forEach(x => edificio(x + rnd() * 6, -130, 8 + rnd() * 6, 22 + rnd() * 18, 0.6));   // torres al fondo

// laguna / bahia
const agua = await aguaEspejo(new THREE.PlaneGeometry(300, 100), { tinte: 0xffb0d8, fuerza: 0.6, base: [0.01, 0.002, 0.02] });
agua.rotation.x = -Math.PI / 2; scene.add(agua);

// palmeras en silueta morada
const matT = new THREE.MeshBasicMaterial({ color: 0x12041a });
const matH = new THREE.MeshBasicMaterial({ color: 0x12041a, side: THREE.DoubleSide });
const palms = [
  { x: -15, z: -16, alto: 14, curva: -2.6, rot: 0.2, sd: 1 }, { x: -11, z: -21, alto: 10, curva: 1.4, rot: 2.6, sd: 2 },
  { x: -20, z: -26, alto: 8, curva: 0.8, rot: 1.0, sd: 3 },
  { x: 14.5, z: -17, alto: 13, curva: 2.4, rot: 2.9, sd: 4 }, { x: 19, z: -24, alto: 9, curva: -1.2, rot: 0.6, sd: 5 },
].map(c => {
  const pa = palmera({ alto: c.alto, curva: c.curva, largo: c.alto * 0.42, matTronco: matT, matHoja: matH, seed: c.sd });
  pa.grupo.position.set(c.x, -0.3, c.z); pa.grupo.rotation.y = c.rot; scene.add(pa.grupo); return pa;
});

// helicoptero en silueta que cruza el cielo una vez por loop (entra y sale fuera de cuadro)
const heli = new THREE.Group(); const negro = new THREE.MeshBasicMaterial({ color: 0x0b0312 });
const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), negro); cuerpo.scale.set(1.6, 0.8, 0.8); heli.add(cuerpo);
const cola = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 3.2, 8), negro); cola.rotation.z = Math.PI / 2; cola.position.set(-2.6, 0.25, 0); heli.add(cola);
const aleta = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.08), negro); aleta.position.set(-4.1, 0.6, 0); heli.add(aleta);
[-0.5, 0.5].forEach(zz => { const s = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.08), negro); s.position.set(0, -1.05, zz); heli.add(s); });
const rotor = new THREE.Mesh(new THREE.CircleGeometry(3.4, 32), new THREE.MeshBasicMaterial({ color: 0x0b0312, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
rotor.rotation.x = -Math.PI / 2; rotor.position.y = 0.95; heli.add(rotor);
const pala = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.05, 0.22), negro); pala.position.y = 0.95; heli.add(pala);
const luz = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3050 })); luz.position.set(-4.2, 1.1, 0); heli.add(luz);
heli.scale.setScalar(0.9); scene.add(heli);

// logo con halo neon
let logo = null;
if (CON_LOGO) {
  const t = await tex('../logos/oasis_glow.png');
  const ancho = 26;
  logo = new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho * t.image.height / t.image.width), new THREE.ShaderMaterial({
    uniforms: { map: { value: t }, p: u.p }, transparent: true, depthWrite: false, vertexShader: vtx,
    fragmentShader: `uniform sampler2D map; uniform float p; varying vec2 v; void main(){
      vec4 t = texture2D(map, v);
      float pulso = 0.8 + 0.2 * sin(p * 4.);
      vec3 neon = vec3(1.0, 0.15, 0.65);
      vec3 c = neon * pow(t.r, 1.3) * 2.6 * pulso * (1. - t.g) + vec3(1.0, 0.92, 0.98) * t.g * 1.15;
      float a = max(t.g, min(1., pow(t.r, 1.3) * 1.3 * pulso));
      gl_FragColor = vec4(c / max(a, 0.001), a);
      #include <colorspace_fragment>
    }` }));
  logo.position.set(0, 13, -40); logo.renderOrder = 2; scene.add(logo);
}
const bk = bokeh(scene, 24, [-30, 30, 1, 12, -34, -12], [0xff5fb0, 0xffa060, 0xb070ff], 33);

listo(p => {
  u.p.value = p; agua.material.uniforms.p.value = p;
  camera.position.set(2.2 * Math.sin(p), 2.0 + 0.25 * Math.sin(2 * p), 16);
  camera.lookAt(0.6 * Math.sin(p), 8.5, -60);
  palms.forEach(pa => pa.mover(p));
  const k = p / TAU;                                         // 0..1 a lo largo del loop
  heli.position.set(-95 + 190 * k, 27 + 1.2 * Math.sin(2 * p), -55);
  heli.rotation.z = -0.12;                                   // nariz abajo, avanzando
  pala.rotation.y = p * 60;                                  // 60 vueltas por loop
  if (logo) logo.position.y = 13 + 0.3 * Math.sin(p);
  bk(p);
  renderer.render(scene, camera);
});
