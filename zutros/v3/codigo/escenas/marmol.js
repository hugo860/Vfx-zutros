import { THREE, base, listo, CON_LOGO, W, H, TAU, NOISE, logoPlano } from './comun.js';
const { renderer, scene } = base(0x000000);
renderer.toneMapping = THREE.NoToneMapping;
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
const U = { p: { value: 0 }, res: { value: new THREE.Vector2(W, H) } };
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: U, depthTest: false,
  vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader: NOISE + `uniform float p; uniform vec2 res; varying vec2 vUv;
  float fbm(vec3 x){float a=.5,s=0.;for(int i=0;i<6;i++){s+=a*snoise(x);x=x*2.03+vec3(3.1,1.7,5.3);a*=.5;}return s;}
  void main(){
    vec2 uv=(vUv-.5)*vec2(res.x/res.y,1.);
    vec3 o=vec3(cos(p),sin(p),0.)*.18;   // slow flow, loops
    vec2 q=uv*1.3;
    float w=fbm(vec3(q,0.)+o);
    float v1=abs(sin((q.x*1.2+q.y*.8)*3.+w*5.));
    float v2=abs(sin((q.x*-.7+q.y*1.3)*5.+fbm(vec3(q*1.7,3.)+o*1.3)*6.));
    float vein=pow(1.-v1,28.)+.6*pow(1.-v2,40.);
    float soft=pow(1.-v1,5.)*.25;
    vec3 base=vec3(.025,.022,.024)+vec3(.05,.045,.05)*(.5+.5*fbm(vec3(q*3.,7.)));
    vec3 gold=vec3(.95,.70,.32);
    vec3 col=base+gold*vein*.9+vec3(.12,.09,.06)*soft;
    // polished reflection sweep
    float s=fract(p/6.2831853); float d=uv.x*.8+uv.y*.6-(-1.6+3.2*s);
    col+=vec3(.9,.8,.6)*exp(-d*d/.02)*.12*(.3+vein*3.);
    // gold glints on the veins
    col+=vec3(1.,.85,.5)*pow(vein,3.)*pow(.5+.5*sin(p*3.+q.x*20.+q.y*13.),8.)*.8;
    float r=length(uv*vec2(.8,1.1)); col*=1.-.55*smoothstep(.4,1.2,r);
    gl_FragColor=vec4(col,1.);
  }` })));
let lp = null;
if (CON_LOGO) lp = await logoPlano(scene, '../logo_red_oro.png', 1.0, { brillo: 0.7 });
listo(p => { U.p.value = p; if (lp) lp(p); renderer.render(scene, cam); });
