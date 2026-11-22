// Escena base del oasis: laguna espejo, palmeras, dunas en capas y cielo. modo = 'atardecer' | 'noche'
import { Q, THREE, renderer3d, tex, palmera, aguaEspejo, bokeh, listo, CON_LOGO, TAU, W, H } from './comun.js';

export async function oasis(modo) {
  const noche = modo === 'noche';
  const renderer = renderer3d();
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(Q.get("dbg") ? 0xff0000 : 0x000000);
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 400);
  const u = { p: { value: 0 } };

  // cielo
  const cielo = new THREE.Mesh(new THREE.PlaneGeometry(400, 320), new THREE.ShaderMaterial({ uniforms: u, depthWrite: false,
    vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float p; varying vec2 v;
    float h(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 q){ vec2 i = floor(q), f = fract(q); f = f*f*(3.-2.*f);
      return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    void main(){
      vec2 q = vec2((v.x - 0.5) * 400., v.y * 320. - 10.);    // metros; horizonte en y=0
      float y = max(q.y, 0.) / 90.;
      vec3 c;
      ${noche ? `
      c = mix(vec3(0.06, 0.09, 0.20), vec3(0.012, 0.016, 0.045), smoothstep(0.0, 0.6, y));
      c += vec3(0.10, 0.12, 0.22) * exp(-y * 6.);               // resplandor del horizonte
      // via lactea en diagonal
      float d = abs(q.y * 0.9 - q.x * 0.45 - 25.) / 22.;
      float mw = exp(-d * d) * (0.5 + 0.5 * n(q * 0.08)) * (0.6 + 0.4 * n(q * 0.3));
      c += vec3(0.10, 0.09, 0.14) * mw;
      // estrellas que titilan (frecuencias enteras -> loop)
      vec2 g = floor(q * 1.6); vec2 f = fract(q * 1.6) - 0.5;
      float r = h(g);
      if (r > 0.93) { float tw = 0.6 + 0.4 * sin(p * (1. + floor(h(g + 3.) * 4.)) + r * 50.);
        float s = exp(-dot(f, f) * (60. + 120. * h(g + 7.))) * tw * (0.4 + 2.0 * pow(h(g + 9.), 6.));
        c += vec3(0.9, 0.95, 1.0) * s * smoothstep(0.0, 0.08, y) * (1. + mw * 2.); }
      // luna creciente
      vec2 m = q - vec2(-8., 54.);
      float luna = smoothstep(5.2, 5.0, length(m)) * smoothstep(4.6, 4.9, length(m - vec2(2.2, 1.4)));
      c += vec3(1.0, 0.92, 0.75) * luna * 1.5 + vec3(0.25, 0.22, 0.3) * exp(-length(m) / 9.) * 0.25;
      ` : `
      c = mix(vec3(1.0, 0.45, 0.12), vec3(0.85, 0.16, 0.20), smoothstep(0.0, 0.25, y));
      c = mix(c, vec3(0.30, 0.06, 0.22), smoothstep(0.2, 0.55, y));
      c = mix(c, vec3(0.05, 0.02, 0.08), smoothstep(0.5, 1.0, y));
      // nubes alargadas
      float cl = n(vec2(q.x * 0.02 + 0.8 * sin(p), q.y * 0.25)) * n(vec2(q.x * 0.05 + 3., q.y * 0.4));
      c = mix(c, vec3(1.0, 0.5, 0.35) * 0.9, smoothstep(0.35, 0.7, cl) * smoothstep(0.05, 0.25, y) * smoothstep(0.7, 0.3, y) * 0.5);
      // sol
      vec2 s = q - vec2(0., 9.);
      float r = length(s);
      c = mix(c, vec3(1.0, 0.85, 0.45) * 1.6, smoothstep(10.5, 10., r));
      c += vec3(1.0, 0.5, 0.2) * exp(-r / 16.) * 0.7 + vec3(1., 0.3, 0.2) * exp(-r / 60.) * 0.3;
      `}
      c = clamp(c, 0., 8.); if (any(isnan(c))) c = vec3(0.02, 0.03, 0.06);
      gl_FragColor = vec4(c, 1.);
    }`.replace(/TAU/g, '6.2831853') }));
  cielo.position.set(0, 150, -160); if (!Q.get("sincielo")) scene.add(cielo);

  // dunas en capas (silueta por shader, perspectiva aerea)
  const capas = noche ? [[-150, 0x07081a, 9, 1], [-110, 0x050614, 7, 2], [-75, 0x030410, 5.5, 3], [-48, 0x02030a, 4, 4]]
                      : [[-150, 0x8a3a3a, 9, 1], [-110, 0x5e2430, 7, 2], [-75, 0x3a1424, 5.5, 3], [-48, 0x1e0a14, 4, 4]];
  capas.forEach(([z, col, alto, sd]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(600, 40), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { col: { value: new THREE.Color(col) } },
      vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 col; varying vec2 v; void main(){
        float x = v.x * 600.; float y = v.y * 40.;
        float top = ${alto.toFixed(1)} * (0.55 + 0.25 * sin(x * 0.021 + ${sd}.0) + 0.15 * sin(x * 0.053 + ${sd * 2}.0) + 0.05 * sin(x * 0.13 + ${sd}.0)) + 2.;
        float a = smoothstep(top + 0.08, top - 0.08, y);
        // cresta iluminada
        float rim = exp(-max(top - y, 0.) * ${noche ? '6.' : '2.5'}) * a;
        vec3 c = col * (0.8 + 0.2 * v.y) + ${noche ? 'vec3(0.03,0.04,0.08)' : 'vec3(0.35,0.12,0.05)'} * rim;
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }` }));
    m.position.set(0, 18, z); m.renderOrder = 1; scene.add(m);
  });

  // orilla de arena alrededor de la laguna
  const arena = new THREE.Mesh(new THREE.PlaneGeometry(400, 40), new THREE.MeshStandardMaterial({
    color: noche ? 0x0a0c18 : 0x4a2018, roughness: 1 }));
  arena.rotation.x = -Math.PI / 2; arena.position.set(0, -0.02, -44); if (!Q.get("sinarena")) scene.add(arena);

  // laguna
  const agua = await aguaEspejo(new THREE.PlaneGeometry(200, 50), noche
    ? { tinte: 0xa0b8e0, fuerza: 0.55, base: [0.002, 0.004, 0.01] } : { tinte: 0xffd0b8, fuerza: 0.6, base: [0.01, 0.004, 0.006] });
  agua.rotation.x = -Math.PI / 2; agua.position.set(0, 0, 0); scene.add(agua);

  // palmeras en silueta
  const matT = new THREE.MeshBasicMaterial({ color: noche ? 0x010205 : 0x0c0406 });
  const matH = new THREE.MeshBasicMaterial({ color: noche ? 0x010205 : 0x0c0406, side: THREE.DoubleSide });
  const palms = [
    { x: -15, z: -16, alto: 13, curva: -2.4, rot: 0.2, sd: 1 }, { x: -11, z: -20, alto: 10, curva: 1.4, rot: 2.6, sd: 2 },
    { x: -19, z: -24, alto: 8, curva: 0.8, rot: 1.0, sd: 3 },
    { x: 14, z: -18, alto: 12, curva: 2.2, rot: 2.9, sd: 4 }, { x: 18, z: -23, alto: 9, curva: -1.2, rot: 0.6, sd: 5 },
    { x: 10.5, z: -25, alto: 7, curva: 0.9, rot: 1.8, sd: 6 },
    { x: -40, z: -46, alto: 9, curva: 1, rot: 1, sd: 7 }, { x: 33, z: -46, alto: 10, curva: -1.5, rot: 2, sd: 8 },
  ].map(c => {
    const pa = palmera({ alto: c.alto, curva: c.curva, largo: c.alto * 0.42, matTronco: matT, matHoja: matH, seed: c.sd });
    pa.grupo.position.set(c.x, -0.3, c.z); pa.grupo.rotation.y = c.rot; scene.add(pa.grupo); return pa;
  });

  // logo flotando sobre el horizonte
  let logo = null;
  if (CON_LOGO) {
    const t = await tex(noche ? '../logos/oasis_logo_blanco.png' : '../logos/oasis_logo_atardecer.png');
    const ancho = 22;
    logo = new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho * t.image.height / t.image.width),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false,
        color: noche ? 0xdfe8ff : 0xffffff }));
    logo.position.set(0, 12, -40); logo.renderOrder = 2; scene.add(logo);
  }
  const bk = bokeh(scene, noche ? 30 : 22, [-30, 30, 1, 12, -34, -12],
    noche ? [0xffd36b, 0xffe9a0, 0xb8ff9a] : [0xffc070, 0xff9060], 21);

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  listo(p => {
    u.p.value = p; agua.material.uniforms.p.value = p;
    camera.position.set(2.2 * Math.sin(p), 2.0 + 0.25 * Math.sin(2 * p), 16);
    camera.lookAt(0.6 * Math.sin(p), 8, -60);
    palms.forEach(pa => pa.mover(p));
    if (logo) logo.position.y = 12 + 0.3 * Math.sin(p);
    bk(p);
    renderer.render(scene, camera);
  });
}
