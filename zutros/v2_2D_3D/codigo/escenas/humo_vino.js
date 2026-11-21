import { THREE, base, listo, CON_LOGO, W, H, TAU } from './comun.js';
const { renderer, scene } = base(0x000000);
renderer.toneMapping = THREE.NoToneMapping;
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
const NOISE = `
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
const U = { p: { value: 0 }, res: { value: new THREE.Vector2(W, H) } };
const fondo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: U,
  vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader: NOISE + `
  uniform float p; uniform vec2 res; varying vec2 vUv;
  // time enters only as a point on a circle -> perfect loop
  float fbm(vec2 q){ vec3 o=vec3(cos(p),sin(p),0.)*0.55; float a=.5,s=0.; vec3 x=vec3(q,0.);
    for(int i=0;i<5;i++){ s+=a*snoise(x+o); x=x*2.03+vec3(1.7,9.2,3.1); o*=1.6; a*=.5;} return s; }
  float h(float n){ return fract(sin(n)*43758.5453); }
  void main(){
    vec2 uv=(vUv-.5)*vec2(res.x/res.y,1.);
    vec2 q=uv*0.95;
    vec2 w=vec2(fbm(q+vec2(0.,0.)),fbm(q+vec2(5.2,1.3)));
    vec2 w2=vec2(fbm(q+2.2*w+vec2(1.7,9.2)),fbm(q+2.2*w+vec2(8.3,2.8)));
    float f=fbm(q+2.6*w2);
    float v=smoothstep(-.35,.95,f);
    vec3 col=mix(vec3(.015,.004,.004),vec3(.32,.02,.03),v);
    col=mix(col,vec3(.75,.12,.08),pow(v,3.2));
    // silky gold rims where the smoke folds
    float rim=smoothstep(.02,.0,abs(f-.32))*.6+smoothstep(.015,.0,abs(f-.58))*.35;
    col+=vec3(1.,.72,.38)*rim*(.35+.65*length(w2));
    // vignette and centre glow behind the logo
    float r=length(uv*vec2(.85,1.15));
    col*=1.-.65*smoothstep(.35,1.15,r);
    col+=vec3(.25,.07,.04)*exp(-r*r*6.);
    // sparkles: fixed points that twinkle with integer frequencies
    vec2 g=floor(vUv*res/9.); float id=h(g.x*91.7+g.y*13.1);
    if(id>.9965){ vec2 c=(g+.5)*9.; float d=length(vUv*res-c);
      float tw=.5+.5*sin(p*floor(1.+h(id*7.)*3.)+id*60.);
      col+=vec3(1.,.8,.5)*exp(-d*d/3.)*tw*tw*1.4; }
    gl_FragColor=vec4(pow(col,vec3(.95)),1.);
  }` }));
scene.add(fondo);
let logoU = null;
if (CON_LOGO) {
  const tex = await new THREE.TextureLoader().loadAsync('../logo_blanco.png');
  tex.anisotropy = 8;
  const asp = tex.image.height / tex.image.width, lw = 1.05;
  logoU = { p: { value: 0 }, t: { value: tex } };
  const lm = new THREE.Mesh(new THREE.PlaneGeometry(lw * 2 * H / W, lw * 2 * asp), new THREE.ShaderMaterial({
    uniforms: logoU, transparent: true,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `uniform float p; uniform sampler2D t; varying vec2 vUv;
      void main(){ vec4 c=texture2D(t,vUv);
        float s=fract(p/6.2831853); float d=vUv.x+vUv.y*.35-(-.4+1.8*s);
        float band=exp(-d*d/.004)*pow(sin(3.1415926*s),2.);
        vec3 base=vec3(.97,.92,.86); vec3 col=base+vec3(1.,.75,.4)*band*.9;
        gl_FragColor=vec4(col,c.a); }` }));
  // soft dark halo under the logo for legibility
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.7 * H / W * 2, 1.3), new THREE.ShaderMaterial({ transparent: true,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: 'varying vec2 vUv; void main(){ vec2 d=(vUv-.5)*vec2(1.,1.3); gl_FragColor=vec4(0.,0.,0.,.45*exp(-dot(d,d)*9.)); }' }));
  scene.add(halo, lm);
}
listo(p => { U.p.value = p; if (logoU) logoU.p.value = p; renderer.render(scene, cam); });
