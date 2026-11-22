// 2D - Modo discoteca: gotas que caen en el agua al ritmo de 120 BPM (20 golpes por loop), anillos neon
import { THREE, shader2d, logoAsp, listo } from './comun.js';
const L = await logoAsp('../logos/oasis_glow.png');
const draw = shader2d(`
uniform sampler2D logo; uniform float asp;
vec3 pal(float i) { i = mod(i, 3.);
  return i < 1. ? vec3(0.0, 0.95, 1.0) : (i < 2. ? vec3(1.0, 0.15, 0.75) : vec3(1.0, 0.7, 0.25)); }
void main() {
  vec2 uv = gl_FragCoord.xy / res;
  vec2 a = (uv - .5) * vec2(res.x / res.y, 1.);
  float beat = p / TAU * 20.;          // 20 golpes en el loop
  float env = exp(-fract(beat) * 5.);
  vec3 col = vec3(0.01, 0.01, 0.03);
  float h = 0.;                         // altura del agua para refraccion
  vec3 glow = vec3(0.);
  // 10 gotas, cada una cae en un golpe par/impar distinto y su onda vive 4 golpes
  for (int k = 0; k < 20; k++) {
    float fk = float(k);
    vec2 c = vec2(hash(vec2(fk, 1.)) - .5, hash(vec2(fk, 2.)) - .5) * vec2(1.5, 0.85);
    float age = mod(beat - fk, 20.);    // golpes desde que cayo
    if (age > 6.) continue;
    float r = length(a - c);
    float R = age * 0.11;
    float fade = exp(-age * 0.6);
    float ring = 0.;
    for (int j = 0; j < 3; j++) {
      float d = r - (R - float(j) * 0.035);
      ring += exp(-d * d * 9000.) * (1. - float(j) * 0.3);
      h += sin(d * 120.) * exp(-d * d * 300.) * fade;
    }
    glow += pal(fk) * ring * fade * 1.3;
    glow += pal(fk) * exp(-r * r * 400.) * exp(-age * 4.) * 1.5;   // flash del impacto
  }
  // suelo: rejilla fina refractada por las ondas
  vec2 g = fract((a + h * 0.004) * 16.);
  float grid = max(exp(-pow(g.x - .5, 2.) * 3000.), exp(-pow(g.y - .5, 2.) * 3000.));
  col += vec3(0.05, 0.12, 0.2) * grid * (0.6 + 0.4 * env);
  col += glow;
  if (conLogo > 0.5) {
    vec4 lg = logoAt(logo, uv + vec2(h * 0.0012), vec2(.5, .5), 0.62, asp);
    float hue = beat / 4.;                 // el halo cambia de color cada 4 golpes
    vec3 hc = mix(pal(floor(hue)), pal(floor(hue) + 1.), smoothstep(0.85, 1., fract(hue)));
    col *= 1. - 0.9 * lg.g;
    col += hc * lg.b * lg.b * (0.55 + 0.6 * env) * (1. - lg.g);
    col += mix(vec3(1.), hc, 0.15) * lg.g * (0.95 + 0.2 * env);
  }
  float v = length(uv - .5);
  col *= 1. - 0.6 * v * v;
  gl_FragColor = vec4(col / (1. + col * 0.25), 1.);
}`, { logo: { value: L.t }, asp: { value: L.asp } });
listo(draw);
