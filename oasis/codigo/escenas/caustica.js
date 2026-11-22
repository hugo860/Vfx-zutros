// 2D - Fondo de piscina: causticas turquesa, rayos de luz y el logo flotando con su sombra en el fondo
import { THREE, shader2d, logoAsp, listo } from './comun.js';
const L = await logoAsp('../logos/oasis_logo_blanco.png');
const draw = shader2d(`
uniform sampler2D logo; uniform float asp;
float caust(vec2 q, float sh) {
  vec2 i = q; float c = 1.0; float inten = .005;
  const float k[5] = float[5](-2., -1., -1., 1., 2.);
  for (int n = 0; n < 5; n++) {
    float t = p * k[n] + sh;
    i = q + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(q.x / (sin(i.x + t) / inten), q.y / (cos(i.y + t) / inten)));
  }
  c /= 5.; c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}
void main() {
  vec2 uv = gl_FragCoord.xy / res;
  vec2 a = uv * vec2(res.x / res.y, 1.);
  // ligera ondulacion de la superficie (desplaza todo el fondo)
  vec2 w = 0.006 * vec2(sin(a.y * 9. + p * 2.), cos(a.x * 7. - p * 3.));
  vec2 q = (a + w) * TAU * 1.1 - 250.;
  float c = caust(q, 0.);
  float c2 = caust(q * 1.02 + 0.15, 0.4); // dispersion cromatica
  // azulejos de piscina
  vec2 g = fract((a + w) * 11.);
  float tile = smoothstep(0.0, 0.035, g.x) * smoothstep(0.0, 0.035, g.y) * smoothstep(1.0, 0.965, g.x) * smoothstep(1.0, 0.965, g.y);
  vec3 base = mix(vec3(0.0, 0.18, 0.26), vec3(0.02, 0.42, 0.52), uv.y);
  base *= 0.82 + 0.18 * tile;
  // sombra del logo en el fondo (desplazada y difusa por la ondulacion)
  float sombra = 0.;
  if (conLogo > 0.5) {
    for (int j = 0; j < 8; j++) {
      float an = float(j) / 8. * TAU;
      sombra += logoAt(logo, uv + w * 2. + vec2(-0.018, 0.035) + 0.006 * vec2(cos(an), sin(an)), vec2(.5, .53), .56, asp).a;
    }
    sombra /= 8.;
  }
  vec3 col = base + vec3(c * 0.75, c * 0.95, c) * 0.9 * (1. - 0.75 * sombra) + vec3(0., 0.15, 0.2) * (c2 - c);
  col *= 1. - 0.45 * sombra;
  // rayos de luz desde arriba
  float rays = 0.;
  for (int j = 1; j <= 4; j++) { float f = float(j);
    rays += pow(0.5 + 0.5 * sin(uv.x * 7. * f + uv.y * 2.5 + p * (j % 2 == 0 ? 1. : -1.) * f + f * 1.7), 6.); }
  col += vec3(0.3, 0.7, 0.75) * rays * 0.12 * smoothstep(0.2, 1., uv.y);
  // logo blanco nacarado con causticas encima
  if (conLogo > 0.5) {
    vec4 lg = logoAt(logo, uv + w * 0.4, vec2(.5, .53), .56, asp);
    vec3 lc = vec3(0.92, 0.98, 1.0) * (0.82 + 0.35 * c) + vec3(0.0, 0.08, 0.1) * rays;
    col = mix(col, lc, lg.a);
  }
  float v = length((uv - .5) * vec2(1., .8));
  col *= 1. - 0.55 * v * v;
  gl_FragColor = vec4(pow(col, vec3(0.95)), 1.);
}`, { logo: { value: L.t }, asp: { value: L.asp } });
listo(draw);
