import { THREE, base, listo, CON_LOGO, W, H, TAU, NOISE, logoPlano } from './comun.js';
const { renderer, scene } = base(0x000000);
renderer.toneMapping = THREE.NoToneMapping;
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
const U = { p: { value: 0 }, res: { value: new THREE.Vector2(W, H) } };
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: U, depthTest: false,
  vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader: NOISE + `uniform float p; uniform vec2 res; varying vec2 vUv;
  float fbm(vec3 x){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*snoise(x);x=x*2.02+vec3(3.1,1.7,5.3);a*=.5;}return s;}
  void main(){
    vec2 uv=(vUv-.5)*vec2(res.x/res.y,1.);
    vec3 o=vec3(cos(p),sin(p),0.)*.45;
    // coal bed: cracked glowing texture at the bottom
    float bed=smoothstep(-.18,-.5,uv.y);
    float n=fbm(vec3(uv*vec2(4.,7.),0.)+o*.6);
    float cracks=pow(1.-abs(snoise(vec3(uv*vec2(9.,14.),1.)+o*.4)),6.);
    float heat=bed*(.45+.55*n)+cracks*bed*.8;
    // rising heat haze / flame tongues
    vec2 q=uv; q.y-=.0; float fl=fbm(vec3(q.x*3.,q.y*2.5-0.,2.)+vec3(0.,-1.,0.)*0.+o);
    float flame=smoothstep(.15,-.45,uv.y+fl*.25)*(.35+.65*smoothstep(-.1,.6,fl));
    vec3 col=vec3(0.);
    col+=vec3(1.,.35,.05)*heat*1.2+vec3(1.,.75,.3)*pow(heat,3.)*1.5;
    col+=vec3(.9,.22,.03)*flame*.55+vec3(1.,.6,.2)*pow(flame,3.)*.5;
    // dark smoky top with faint warm glow
    float sm=fbm(vec3(uv*2.,4.)+o*.8);
    col+=vec3(.08,.03,.02)*(.5+.5*sm)*smoothstep(1.,-.3,uv.y);
    col*=1.-.5*smoothstep(.6,1.2,abs(uv.x));
    gl_FragColor=vec4(col,1.);
  }` })));
// embers: integer number of climbs per loop -> seamless
const N = 900; const pos = new Float32Array(N * 3), ph = [];
let sd = 7; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < N; i++) ph.push({ x: r() * 2 - 1, o: r(), k: 1 + Math.floor(r() * 3), a: 0.02 + r() * 0.08, f: 1 + Math.floor(r() * 4), s: r() });
const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const sz = new Float32Array(N); g.setAttribute('sz', new THREE.BufferAttribute(sz, 1));
const al = new Float32Array(N); g.setAttribute('al', new THREE.BufferAttribute(al, 1));
scene.add(new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthTest: false, blending: THREE.AdditiveBlending,
  vertexShader: 'attribute float sz; attribute float al; varying float va; void main(){va=al; gl_PointSize=sz; gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader: 'varying float va; void main(){ float d=length(gl_PointCoord-.5); float g=exp(-d*d*28.); gl_FragColor=vec4(vec3(1.,.55,.15)*g*va+vec3(1.,.9,.6)*pow(g,4.)*va,1.); }' })));
let lp = null;
if (CON_LOGO) lp = await logoPlano(scene, '../logo_blanco.png', 0.95, { y: 0.18, tinte: [1, .93, .85] });
listo(p => {
  U.p.value = p; const t = p / TAU;
  for (let i = 0; i < N; i++) { const e = ph[i]; const u = (e.k * t + e.o) % 1;
    pos[i * 3] = e.x + e.a * Math.sin(e.f * p + e.o * 20) + 0.15 * u * (e.s - .5);
    pos[i * 3 + 1] = -1.05 + 2.2 * u;
    sz[i] = (3 + 7 * e.s) * (1 - u * 0.5) * H / 1080 * 1.6;
    al[i] = Math.pow(1 - u, 1.5) * (0.6 + 0.4 * Math.sin(e.f * 3 * p + e.o * 50)) * (0.8 + 1.2 * e.s);
  }
  g.attributes.position.needsUpdate = g.attributes.sz.needsUpdate = g.attributes.al.needsUpdate = true;
  if (lp) lp(p);
  renderer.render(scene, cam);
});
