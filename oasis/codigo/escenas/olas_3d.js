// 3D - Mar tropical al anochecer: malla de olas (Gerstner con periodos enteros -> loop), luna grande y luz turquesa,
// el logo flota sobre el horizonte y deja un camino de luz en el agua
import { THREE, renderer3d, tex, listo, CON_LOGO, TAU, W, H } from './comun.js';
const renderer = renderer3d();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 600);
const LOGO_POS = new THREE.Vector3(0, 9, -60);

// olas: k = 2*PI/lambda, cada ola avanza un numero entero de longitudes por loop
const OLAS = [[1, 0.2, 18, 0.38, 1], [0.8, -0.6, 11, 0.22, 2], [-0.3, 1, 7, 0.13, 2], [0.6, 0.8, 4.3, 0.07, 3],
  [-0.9, 0.4, 2.7, 0.04, 4], [0.2, -1, 1.6, 0.025, 5]];
const glslOlas = OLAS.map(([dx, dz, l, a, n]) => {
  const len = Math.hypot(dx, dz);
  return `ola(P, vec2(${(dx / len).toFixed(4)}, ${(dz / len).toFixed(4)}), ${(TAU / l).toFixed(4)}, ${a.toFixed(3)}, ${n}.0, d, nx, nz);`;
}).join('\n    ');
const u = { p: { value: 0 }, logoPos: { value: LOGO_POS }, conLogo: { value: CON_LOGO ? 1 : 0 } };
const comunGLSL = `
  uniform float p; uniform vec3 logoPos; uniform float conLogo;
  vec3 cielo(vec3 r) {
    float y = max(r.y, 0.0);
    vec3 c = mix(vec3(0.01, 0.20, 0.24), vec3(0.07, 0.012, 0.13), smoothstep(0.0, 0.12, y));
    c = mix(c, vec3(0.001, 0.001, 0.006), smoothstep(0.1, 0.45, y));
    // luna
    vec3 md = normalize(vec3(0.35, 0.16, -1.0));
    float m = dot(r, md);
    c += vec3(1.0, 0.85, 0.75) * smoothstep(0.9993, 0.9995, m) * 1.2;
    c += vec3(0.6, 0.25, 0.5) * pow(max(m, 0.), 400.) * 0.5 + vec3(0.05, 0.08, 0.15) * pow(max(m, 0.), 20.) * 0.3;
    return c;
  }`;
const agua = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 400, 400), new THREE.ShaderMaterial({ uniforms: u,
  vertexShader: `${comunGLSL}
  varying vec3 vW; varying vec3 vN;
  void ola(vec2 P, vec2 D, float k, float A, float n, inout vec3 d, inout float nx, inout float nz) {
    float f = k * dot(D, P) - n * p;            // n periodos enteros por loop
    d += vec3(D.x * A * 0.6 * cos(f), A * sin(f), D.y * A * 0.6 * cos(f));
    nx += D.x * k * A * cos(f); nz += D.y * k * A * cos(f);
  }
  void main() {
    vec3 pos = (modelMatrix * vec4(position, 1.)).xyz;
    vec2 P = pos.xz; vec3 d = vec3(0.); float nx = 0., nz = 0.;
    ${glslOlas}
    pos += d;
    vW = pos; vN = normalize(vec3(-nx, 1., -nz));
    gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.);
  }`,
  fragmentShader: `${comunGLSL}
  varying vec3 vW; varying vec3 vN;
  void main() {
    vec3 V = normalize(vW - cameraPosition);
    vec3 N = normalize(vN + 0.06 * vec3(sin(vW.x * 3.1 + p * 6.) , 0., cos(vW.z * 2.7 - p * 5.)));
    vec3 R = reflect(V, N); R.y = abs(R.y);
    float fres = 0.02 + 0.98 * pow(1. - max(dot(-V, N), 0.), 5.);
    vec3 profundo = vec3(0.0, 0.004, 0.01) + vec3(0.0, 0.07, 0.08) * max(vW.y + 0.3, 0.) * 0.5;   // crestas turquesa
    vec3 col = mix(profundo, cielo(R), fres);
    // camino de luz del logo
    if (conLogo > 0.5) {
      vec3 L = normalize(logoPos - vW);
      float s = pow(max(dot(R, L), 0.), 180.);
      col += vec3(1.0, 0.55, 0.45) * s * 1.6;
    }
    float dist = length(vW.xz - cameraPosition.xz);
    col = mix(col, cielo(normalize(vec3(V.x, 0.001, V.z))), smoothstep(80., 190., dist));   // bruma en el horizonte
    gl_FragColor = vec4(col, 1.);
    #include <colorspace_fragment>
  }` }));
agua.rotation.x = -Math.PI / 2; scene.add(agua);
const cieloM = new THREE.Mesh(new THREE.SphereGeometry(300, 64, 32), new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide,
  depthWrite: false,
  vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `${comunGLSL} varying vec3 vD; void main(){ gl_FragColor = vec4(cielo(normalize(vD)), 1.);
    #include <colorspace_fragment>
  }` }));
scene.add(cieloM);

let logo = null;
if (CON_LOGO) {
  const t = await tex('../logos/oasis_logo_atardecer.png');
  const ancho = 30, asp = t.image.height / t.image.width;
  logo = new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho * asp), new THREE.MeshBasicMaterial({ map: t, transparent: true,
    depthWrite: false, fog: false }));
  logo.position.copy(LOGO_POS); scene.add(logo);
  // halo suave detras del logo
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,140,170,0.45)'); g.addColorStop(1, 'rgba(255,140,170,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true }));
  halo.scale.set(70, 34, 1); halo.position.copy(LOGO_POS).add(new THREE.Vector3(0, 0, -2)); scene.add(halo);
  logo.userData.halo = halo;
}

listo(p => {
  u.p.value = p;
  camera.position.set(2.5 * Math.sin(p), 3.2 + 0.35 * Math.sin(2 * p), 0);
  camera.lookAt(0.8 * Math.sin(p + 0.4), 4.5, -60);
  camera.rotation.z += 0.015 * Math.sin(2 * p + 1);   // ligero balanceo como en un barco
  if (logo) {
    logo.position.y = LOGO_POS.y + 0.5 * Math.sin(p);
    logo.lookAt(camera.position);
    logo.userData.halo.material.opacity = 0.75 + 0.25 * Math.sin(2 * p);
  }
  renderer.render(scene, camera);
});
