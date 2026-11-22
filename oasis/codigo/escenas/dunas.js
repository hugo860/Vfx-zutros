// 2D - Dunas doradas a la hora dorada: crestas en capas con paralaje, viento levantando arena de las crestas, sol bajo
import { THREE, shader2d, logoAsp, listo } from './comun.js';
const L = await logoAsp('../logos/oasis_logo_atardecer.png');
const draw = shader2d(`
uniform sampler2D logo; uniform float asp;
// ruido periodico en x (periodo P celdas) -> se puede desplazar P celdas por loop sin costura
float hp(vec2 i, float P) { i.x = mod(i.x, P); return fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453); }
float np(vec2 q, float P) { vec2 i = floor(q), f = fract(q); f = f * f * (3. - 2. * f);
  return mix(mix(hp(i, P), hp(i + vec2(1, 0), P), f.x), mix(hp(i + vec2(0, 1), P), hp(i + vec2(1, 1), P), f.x), f.y); }
float duna(float x, float s) {
  float c = 1. - abs(sin(x * 0.5 + s));                 // crestas afiladas
  return pow(c, 1.6) * 0.7 + 0.3 * (0.5 + 0.5 * sin(x * 1.3 + s * 2.)) * 0.6 + 0.1 * sin(x * 3.1 + s * 5.);
}
void main() {
  vec2 uv = gl_FragCoord.xy / res;
  float ar = res.x / res.y;
  float x = (uv.x - 0.5) * ar;
  vec2 sol = vec2(-0.45 * ar * 0.5, 0.56);
  // cielo
  float ys = uv.y;
  vec3 col = mix(vec3(1.0, 0.72, 0.38), vec3(0.95, 0.45, 0.28), smoothstep(0.42, 0.75, ys));
  col = mix(col, vec3(0.35, 0.18, 0.32), smoothstep(0.7, 1.0, ys));
  float rs = length(vec2(x, ys) - sol);
  col += vec3(1.0, 0.8, 0.45) * smoothstep(0.062, 0.058, rs) * 0.6 + vec3(1.0, 0.6, 0.3) * exp(-rs * 7.) * 0.45;
  // capas de dunas de lejos (0) a cerca (5)
  float profundidad = 0.;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float horizonte = 0.46 - fi * 0.075;
    float A = 0.05 + fi * 0.035;
    float esc = 6. - fi * 0.8;
    float par = 0.04 + fi * 0.06;                          // paralaje: lo cercano se mueve mas
    float xx = x * esc + sin(p) * par * esc + fi * 13.7;
    float top = horizonte + A * duna(xx, fi * 1.7);
    if (uv.y < top) {
      float e = 0.002;
      float xs = xx + (top - uv.y) * esc * 2.2;               // la linea luz/sombra baja en diagonal desde la cresta
      float sl = (duna(xs + e * esc, fi * 1.7) - duna(xs - e * esc, fi * 1.7)) / (2. * e);
      float luz = 0.5 + 0.5 * tanh(-sl * 1.6);              // sol a la izquierda: pendientes que miran a la izq. se iluminan
      vec3 claro = vec3(1.0, 0.68, 0.34), sombra = vec3(0.55, 0.22, 0.12);
      vec3 c = mix(sombra, claro, luz);
      c *= 0.75 + 0.25 * smoothstep(top - 0.25, top, uv.y);
      // ondulaciones de arena (ripples) en las capas cercanas
      float rip = sin((x * 90. + uv.y * 260. + sin(x * 7. + fi) * 3.) * (0.4 + fi * 0.15));
      c *= 1. + 0.05 * rip * smoothstep(1., 4., fi) * luz;
      // brillo en el filo de la cresta
      c += vec3(1., 0.8, 0.5) * exp(-(top - uv.y) * 220.) * 0.35 * luz;
      // bruma por distancia
      c = mix(c, vec3(1.0, 0.7, 0.45), (1. - fi / 5.) * 0.55);
      col = c; profundidad = fi;
      // arena que vuela desde la cresta (ruido que se desplaza 16 celdas por loop)
    }
    float sobre = uv.y - top;
    if (sobre > 0. && sobre < 0.12) {
      float w = np(vec2((x * 9. - p / 6.2831853 * 16.) , sobre * 30. - x * 3.), 16. * 1.) ;
      float w2 = np(vec2(x * 23. - p / 6.2831853 * 46., sobre * 80.), 46.);
      float viento = smoothstep(0.55, 0.95, w * 0.7 + w2 * 0.4) * exp(-sobre * 40.) * smoothstep(0.75, 1., duna(xx, fi * 1.7));
      col = mix(col, vec3(1.0, 0.82, 0.55), viento * 0.5 * (0.4 + fi * 0.12));
    }
  }
  // espejismo/calor: ligera vibracion horizontal de la luz cerca del horizonte
  if (conLogo > 0.5) {
    vec2 lc = vec2(0.5, 0.8);
    float halo = 0.;
    for (int j = 0; j < 8; j++) { float an = float(j) / 8. * 6.2831853;
      halo += logoAt(logo, uv + 0.01 * vec2(cos(an), sin(an)) + vec2(-0.004, 0.006), lc, 0.40, asp).a; }
    col *= 1. - 0.3 * halo / 8.;
    vec4 lg = logoAt(logo, uv, lc, 0.40, asp);
    float sw = pow(max(0., sin((uv.x + uv.y * 0.3) * 5. - p)), 40.);
    col = mix(col, lg.rgb * vec3(1., 0.97, 0.92) + vec3(1., .85, .6) * sw * 0.5, lg.a);
  }
  float v = length((uv - .5) * vec2(1., .9));
  col *= 1. - 0.45 * v * v;
  gl_FragColor = vec4(pow(col, vec3(1.05)), 1.);
}`, { logo: { value: L.t }, asp: { value: L.asp } });
listo(draw);
