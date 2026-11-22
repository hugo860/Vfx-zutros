// 3D - Un oasis completo: dunas, laguna espejo turquesa, palmeras que se mecen y la camara dando una vuelta entera.
// Con logo: logo 3D en oro flotando sobre la laguna.
import { THREE, renderer3d, palmera, aguaEspejo, logo3d, listo, CON_LOGO, TAU, W, H } from './comun.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const renderer = renderer3d();
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf2b27a, 60, 190);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;
const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 500);

// cielo
scene.add(new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `varying vec3 d; void main(){
    float y = max(d.y, 0.);
    vec3 c = mix(vec3(0.95, 0.55, 0.30), vec3(0.32, 0.38, 0.62), smoothstep(0.0, 0.35, y));
    c = mix(c, vec3(0.10, 0.14, 0.34), smoothstep(0.3, 0.9, y));
    vec3 sd = normalize(vec3(-0.8, 0.12, -0.55));
    float s = max(dot(d, sd), 0.);
    c += vec3(1.0, 0.75, 0.45) * (pow(s, 600.) * 4. + pow(s, 12.) * 0.35);
    gl_FragColor = vec4(c, 1.);
    #include <colorspace_fragment>
  }` })));

// terreno de dunas con la cuenca de la laguna
const geo = new THREE.PlaneGeometry(320, 320, 220, 220); geo.rotateX(-Math.PI / 2);
const P = geo.attributes.position;
for (let i = 0; i < P.count; i++) {
  const x = P.getX(i), z = P.getZ(i), r = Math.hypot(x, z);
  let h = 2.2 * (1 - Math.abs(Math.sin(x * 0.045 + z * 0.02))) ** 1.5 * 3 + 1.5 * Math.sin(z * 0.06 + x * 0.013) + 0.8 * Math.sin(x * 0.11 - z * 0.07);
  h = h * THREE.MathUtils.smoothstep(r, 16, 60) + 0.6;          // plano cerca de la laguna
  h -= 2.2 * (1 - THREE.MathUtils.smoothstep(r, 9, 14));        // cuenca
  P.setY(i, h);
}
geo.computeVertexNormals();
const tierra = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xe3b072, roughness: 0.95 }));
tierra.receiveShadow = true; scene.add(tierra);

// laguna
const agua = await aguaEspejo(new THREE.CircleGeometry(13.5, 96), { tinte: 0x8fe0d8, fuerza: 0.55, onda: 0.004, base: [0.0, 0.05, 0.06] });
agua.rotation.x = -Math.PI / 2; agua.position.y = 0.05; scene.add(agua);

// palmeras alrededor
const matT = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.9 });
const matH = new THREE.MeshStandardMaterial({ color: 0x3f7a2a, roughness: 0.6, side: THREE.DoubleSide });
const palms = [];
for (let i = 0; i < 9; i++) {
  const a = i / 9 * TAU + (i % 2) * 0.25, r = 13.5 + (i % 3) * 2.2;
  const pa = palmera({ alto: 8 + (i * 37 % 5), curva: 1.2 + (i % 3) * 0.6, largo: 4 + (i % 2), matTronco: matT, matHoja: matH, seed: i + 3 });
  pa.grupo.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r);
  pa.grupo.rotation.y = -a + Math.PI;                             // inclinadas hacia el agua
  scene.add(pa.grupo); palms.push(pa);
}

// luz de sol de tarde
const sol = new THREE.DirectionalLight(0xffd2a0, 3.2);
sol.position.set(-60, 22, -40); sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35, near: 1, far: 200 });
sol.shadow.bias = -0.0006; scene.add(sol);
scene.add(new THREE.HemisphereLight(0x9fb4ff, 0xc08050, 0.9));

let logo = null;
if (CON_LOGO) {
  logo = await logo3d(9, 0.55, new THREE.MeshPhysicalMaterial({ color: 0xffcf7a, metalness: 1, roughness: 0.18, clearcoat: 1 }));
  logo.traverse(o => { o.castShadow = true; if (o.material && o.material.metalness === 1) o.material.envMapIntensity = 4.0; });
  const relleno = new THREE.PointLight(0xffe0b0, 120, 60, 1.5); camera.add(relleno); relleno.position.set(0, 2, 0); scene.add(camera);
  scene.add(logo);
}

listo(p => {
  const a = p + 0.4;
  // la camara da la vuelta por dentro del anillo de palmeras, sobre la orilla
  camera.position.set(Math.cos(a) * 12, 3.2 + 0.6 * Math.sin(2 * p), Math.sin(a) * 12);
  camera.lookAt(0, 4.6, 0);
  palms.forEach(pa => pa.mover(p));
  if (logo) {
    logo.position.set(0, 4.8 + 0.25 * Math.sin(2 * p), 0);
    logo.rotation.y = -a + Math.PI / 2 + 0.15 * Math.sin(p);     // mira siempre a la camara con un leve vaiven
  }
  agua.material.uniforms.p.value = p;
  renderer.render(scene, camera);
});
