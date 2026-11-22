// 2D - Arena dorada vista desde arriba: ondulaciones del viento, brillo de granos y una luz rasante que gira.
// Con logo: el logo en oro pulido en relieve, semienterrado en la arena.
import { THREE, shader2d, logoAsp, listo } from './comun.js';
const L = await logoAsp('../logos/oasis_relieve.png');
const draw = shader2d(`
uniform sampler2D logo; uniform float asp;
float n2(vec2 q) { vec2 i = floor(q), f = fract(q); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
// altura de la arena: ondas de viento deformadas por ruido; la fase avanza 1 vuelta por loop
float arena(vec2 a) {
  float w = n2(a * 3.) * 2.0 + n2(a * 7.) * 0.6;
  float r = sin(a.x * 70. + a.y * 18. + w * 5. - p) * 0.5 + 0.5;
  r = pow(r, 1.6);
  return r * 0.008 + n2(a * 90.) * 0.001;
}
float logoH(vec2 uv) { return conLogo > 0.5 ? logoAt(logo, uv, vec2(.5, .5), .62, asp).r : 0.; }
void main() {
  vec2 uv = gl_FragCoord.xy / res;
  float ar = res.x / res.y;
  vec2 a = uv * vec2(ar, 1.);
  vec2 e = vec2(1.5 / res.y, 0.);
  float hl = logoH(uv);
  float m = smoothstep(0.35, 0.65, hl);                 // mascara de letras
  // altura total: letras elevadas, la arena se aplana sobre ellas
  float H(vec2 q) ;
  float h0 = arena(a) * (1. - m) + hl * 0.035;
  float hx = arena(a + e.xy) * (1. - m) + logoH(uv + e.xy / vec2(ar, 1.)) * 0.035;
  float hy = arena(a + e.yx) * (1. - m) + logoH(uv + e.yx) * 0.035;
  vec3 N = normalize(vec3(-(hx - h0) / e.x, -(hy - h0) / e.x, 1.));
  // luz rasante que gira una vuelta por loop
  vec3 Ld = normalize(vec3(cos(p + 0.6), sin(p + 0.6), 0.45));
  float dif = max(dot(N, Ld), 0.);
  vec3 V = vec3(0., 0., 1.);
  float spec = pow(max(dot(reflect(-Ld, N), V), 0.), 40.);
  vec3 sand = mix(vec3(0.78, 0.52, 0.28), vec3(0.95, 0.74, 0.45), n2(a * 4.));
  vec3 col = sand * (0.25 + 0.95 * dif) + vec3(1., 0.85, 0.6) * spec * 0.08;
  // destellos de granos (titilan con frecuencias enteras)
  vec2 g = floor(gl_FragCoord.xy / 2.);
  float gr = hash(g);
  if (gr > 0.996) col += vec3(1., 0.9, 0.7) * pow(max(0., sin(p * (1. + floor(hash(g + 5.) * 3.)) + gr * 80.)), 8.) * dif * 1.2;
  // letras en oro pulido
  if (m > 0.) {
    vec3 oro = vec3(1.0, 0.72, 0.28);
    float sp = pow(max(dot(reflect(-Ld, N), V), 0.), 18.);
    float env = 0.5 + 0.5 * N.y;                          // reflejo de cielo calido
    vec3 c = oro * (0.3 + 0.75 * dif) + oro * env * 0.3 + vec3(1., 0.95, 0.8) * sp * 1.6;
    col = mix(col, c, m);
  }
  // sombra que proyectan las letras sobre la arena
  if (conLogo > 0.5) {
    vec2 off = -Ld.xy / vec2(ar, 1.) * 0.012;
    float sh = smoothstep(0.3, 0.7, logoH(uv - off * 1.0)) * (1. - m);
    col *= 1. - 0.45 * sh;
  }
  float v = length((uv - .5) * vec2(1., .9));
  col *= 1. - 0.55 * v * v;
  gl_FragColor = vec4(col, 1.);
}`.replace('  float H(vec2 q) ;\n', ''), { logo: { value: L.t }, asp: { value: L.asp } });
listo(draw);
