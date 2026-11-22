// 3D - Logo en cromo con la O encendida en colores de atardecer, flotando sobre agua espejo de noche, luces neon de club
import { THREE, renderer3d, logo3d, bokeh, listo, CON_LOGO, TAU, ATARDECER, W, H } from './comun.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
const renderer = renderer3d();
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03050d);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 1.0;
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 200);

// agua espejo con ondulaciones (shader del Reflector modificado)
const RS = Reflector.ReflectorShader;
const shader = {
  name: 'Agua', uniforms: { ...THREE.UniformsUtils.clone(RS.uniforms), p: { value: 0 } },
  vertexShader: RS.vertexShader.replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec3 vPos;')
    .replace('vUv = textureMatrix * vec4( position, 1.0 );', 'vUv = textureMatrix * vec4( position, 1.0 ); vPos = position;'),
  fragmentShader: `
    uniform vec3 color; uniform sampler2D tDiffuse; uniform float p;
    varying vec4 vUv; varying vec3 vPos;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      vec2 q = vPos.xy;
      vec2 d = vec2(0.);
      d += vec2(sin(q.y * 1.7 + p * 2.), cos(q.x * 1.3 - p)) * 0.6;
      d += vec2(sin(q.y * 4.1 - q.x * 1.1 - p * 3.), cos(q.x * 3.7 + q.y * 0.9 + p * 4.)) * 0.3;
      d += vec2(sin(q.y * 9.3 + p * 5.), sin(q.x * 8.1 - p * 6.)) * 0.12;
      vec4 u = vUv; u.xy += d * 0.006 * u.w * exp(-u.w / 30.); // menos ondulacion lejos: horizonte limpio
      vec4 base = texture2DProj(tDiffuse, u);
      float fres = 0.45;
      gl_FragColor = vec4(base.rgb * color * fres + vec3(0.004, 0.008, 0.02), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
};
const agua = new Reflector(new THREE.PlaneGeometry(300, 300, 1, 1), { textureWidth: W, textureHeight: H, color: 0x9fb8d8, shader });
agua.rotation.x = -Math.PI / 2; scene.add(agua);

// fondo: degradado con resplandor de horizonte
const cielo = new THREE.Mesh(new THREE.PlaneGeometry(140, 60), new THREE.ShaderMaterial({ depthWrite: false, fog: false,
  vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `varying vec2 v; void main(){
    float y = max(0., (v.y * 60. - 5.) / 55.); vec3 c = mix(vec3(0.30,0.006,0.10), vec3(0.001,0.0005,0.006), pow(smoothstep(0.0, 0.32, y), 0.6));
    c = mix(c, vec3(0.0,0.0,0.001), smoothstep(0.3, 0.7, y));
    c += vec3(0.0,0.08,0.14) * exp(-pow((v.x-0.5)*3.,2.)) * exp(-y*14.) * 0.5;
    gl_FragColor = vec4(c, 1.);
    #include <colorspace_fragment>
  }` }));
cielo.position.set(0, 25, -40); scene.add(cielo); // borde inferior bajo el agua: el reflejo no tiene huecos

let pieza;
if (CON_LOGO) {
  pieza = await logo3d(7, 0.45);
  pieza.position.y = pieza.userData.alto / 2 + 0.15;
} else {
  // sin logo: sol a rayas en 3D dentro de un aro de cromo
  pieza = new THREE.Group();
  const aro = new THREE.Mesh(new THREE.TorusGeometry(2, 0.12, 32, 200),
    new THREE.MeshPhysicalMaterial({ color: 0xf4f6fa, metalness: 1, roughness: 0.1, clearcoat: 1 }));
  pieza.add(aro);
  for (let i = 0; i < 7; i++) {
    const y = 1.45 - i * 0.48, hw = Math.sqrt(Math.max(0.05, 1.75 * 1.75 - y * y));
    const c = new THREE.Color(ATARDECER[Math.min(4, Math.floor(i * 5 / 7))]);
    const b = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 0.34 - i * 0.03, 0.25), new THREE.MeshStandardMaterial({
      color: c, emissive: c, emissiveIntensity: 0.8, roughness: 0.3 }));
    b.position.y = y; pieza.add(b);
  }
  pieza.position.y = 2.3;
}
scene.add(pieza);
const baseY = pieza.position.y;

// luces de club que barren
const luces = [[0x00e5ff, 1], [0xff2bd0, 2], [0xffb347, 1]].map(([c, f], i) => {
  const l = new THREE.PointLight(c, 60, 30, 1.6); scene.add(l); return { l, f, ph: i * TAU / 3 };
});
scene.add(new THREE.AmbientLight(0x202840, 0.4));
const bk = bokeh(scene, 30, [-22, 22, 0.5, 12, -30, -14], [0x00e5ff, 0xff2bd0, 0xffb347, 0x7a5cff], 11);

listo(p => {
  camera.position.set(4.5 * Math.sin(p), 2.2 + 0.4 * Math.sin(2 * p), 15 + 0.8 * Math.cos(p));
  camera.lookAt(0, baseY - 0.3, 0);
  pieza.position.y = baseY + 0.12 * Math.sin(2 * p);
  pieza.rotation.y = CON_LOGO ? 0.22 * Math.sin(p + 0.6) : p;   // sin logo: vuelta completa
  luces.forEach(({ l, f, ph }) => l.position.set(8 * Math.sin(f * p + ph), 3 + 1.5 * Math.cos(p + ph), 5 + 2 * Math.cos(f * p + ph)));
  agua.material.uniforms.p.value = p;
  bk(p);
  renderer.render(scene, camera);
});
