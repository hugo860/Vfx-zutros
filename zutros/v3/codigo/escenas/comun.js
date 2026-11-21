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

export const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}vec4 tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;
// full-screen logo overlay (PNG) with soft halo and a gloss sweep once per loop
export async function logoPlano(scene, archivo, ancho = 1.05, opts = {}) {
  const tex = await new THREE.TextureLoader().loadAsync(archivo); tex.anisotropy = 8;
  const asp = tex.image.height / tex.image.width;
  const U = { p: { value: 0 }, t: { value: tex }, tinte: { value: new THREE.Vector3(...(opts.tinte || [1, 1, 1])) },
    brillo: { value: opts.brillo ?? 0.9 } };
  const cy = opts.y || 0;
  const geo = new THREE.PlaneGeometry(ancho * 2 * H / W, ancho * 2 * asp); geo.translate(0, cy, 0);
  if (opts.halo !== false) {
    const hg = new THREE.PlaneGeometry(ancho * 1.6 * 2 * H / W, ancho * 1.25); hg.translate(0, cy, 0);
    scene.add(new THREE.Mesh(hg, new THREE.ShaderMaterial({ transparent: true, depthTest: false,
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: 'varying vec2 vUv; void main(){ vec2 d=(vUv-.5)*vec2(1.,1.3); gl_FragColor=vec4(0.,0.,0.,.5*exp(-dot(d,d)*9.)); }' })));
  }
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthTest: false,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `uniform float p; uniform sampler2D t; uniform vec3 tinte; uniform float brillo; varying vec2 vUv;
      void main(){ vec4 c=texture2D(t,vUv);
        float s=fract(p/6.2831853); float d=vUv.x+vUv.y*.35-(-.4+1.8*s);
        float band=exp(-d*d/.004)*pow(sin(3.1415926*s),2.);
        vec3 col=c.rgb*tinte+vec3(1.,.78,.45)*band*brillo;
        gl_FragColor=vec4(col,c.a); }` }));
  m.renderOrder = 10; scene.add(m);
  return p => { U.p.value = p; };
}
