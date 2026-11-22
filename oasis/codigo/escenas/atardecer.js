// 2D - Atardecer caribeno: sol a rayas (como la O del logo) bajando al mar, reflejo que tiembla en el agua
import { THREE, shader2d, logoAsp, listo } from './comun.js';
const L = await logoAsp('../logos/oasis_logo_atardecer.png');
const draw = shader2d(`
uniform sampler2D logo; uniform float asp;
void main() {
  vec2 uv = gl_FragCoord.xy / res;
  float ar = res.x / res.y;
  float hz = 0.30;                        // horizonte
  vec2 sc = vec2(0.5, hz + 0.09);         // centro del sol
  float R = 0.17;
  vec3 col;
  if (uv.y > hz) {
    float y = (uv.y - hz) / (1. - hz);
    col = mix(vec3(1.0, 0.62, 0.30), vec3(0.93, 0.32, 0.38), smoothstep(0.0, 0.35, y));
    col = mix(col, vec3(0.42, 0.13, 0.38), smoothstep(0.3, 0.7, y));
    col = mix(col, vec3(0.10, 0.05, 0.20), smoothstep(0.65, 1.0, y));
    // nubes finas horizontales que se desplazan (periodo = loop)
    float cl = 0.;
    for (int j = 0; j < 3; j++) { float f = float(j + 1);
      cl += smoothstep(0.55, 1., sin(uv.x * 3. * f - p * f + f * 2. + sin(uv.x * 9. + f) * 0.4) * 0.5 + 0.5)
          * exp(-pow((y - 0.18 * f - 0.05) * 40., 2.)); }
    col = mix(col, vec3(1., 0.55, 0.45), cl * 0.35);
    // sol
    vec2 d = (uv - sc) * vec2(ar, 1.);
    float r = length(d);
    float disc = smoothstep(R, R - 0.003, r);
    // rayas que bajan por la mitad inferior del sol
    float yy = (uv.y - hz) / R;            // 0 en el horizonte
    float s = fract(yy * 6. + p / TAU);
    float grosor = 0.6 * clamp(1. - yy / 1.05, 0., 1.);
    float raya = yy < 1.05 ? smoothstep(grosor - 0.04, grosor + 0.04, s) : 1.;
    vec3 sun = mix(vec3(1.0, 0.35, 0.42), vec3(1.0, 0.86, 0.45), clamp(yy / 2., 0., 1.));
    col = mix(col, sun, disc * raya);
    col += vec3(1., 0.55, 0.3) * 0.35 * exp(-r * 5.) + vec3(1., 0.4, 0.3) * 0.25 * exp(-r * 1.8);
  } else {
    float y = (hz - uv.y) / hz;          // 0 horizonte .. 1 abajo
    col = mix(vec3(0.45, 0.18, 0.30), vec3(0.03, 0.05, 0.12), pow(y, 0.6));
    // olas: lineas horizontales con perspectiva
    float z = 1. / (y + 0.04);
    float wv = sin(z * 3. + sin(uv.x * 6. + z) * 1.2 + p * 3.) * sin(uv.x * 40. / z + p * 2. + z);
    // columna de reflejo del sol, rota en franjas
    float ancho = (0.16 + 0.22 * y) / ar;
    float col_r = exp(-pow((uv.x - 0.5 + 0.01 * wv) / ancho, 2.));
    float fr = smoothstep(0.1, 0.6, sin(z * 9. - p * 4. + wv * 2.) * 0.5 + 0.5 + 0.3 * wv);
    col += vec3(1.0, 0.55, 0.35) * col_r * fr * (1.0 - y * 0.6) * 0.9;
    col += vec3(0.7, 0.3, 0.4) * 0.04 * wv * (1. - y);
    col += vec3(1., 0.6, 0.4) * 0.25 * exp(-y * 25.);
  }
  // logo arriba, con halo oscuro para separarlo del cielo
  if (conLogo > 0.5) {
    vec2 lc = vec2(0.5, 0.775);
    float halo = 0.;
    for (int j = 0; j < 8; j++) { float an = float(j) / 8. * TAU;
      halo += logoAt(logo, uv + 0.012 * vec2(cos(an), sin(an)), lc, 0.40, asp).a; }
    col *= 1. - 0.35 * halo / 8.;
    vec4 lg = logoAt(logo, uv, lc, 0.40, asp);
    // brillo que recorre las letras
    float sw = pow(max(0., sin((uv.x - uv.y * 0.3) * 6. - p)), 30.);
    col = mix(col, lg.rgb * vec3(1., 0.97, 0.92) + vec3(1., .8, .5) * sw * 0.4, lg.a);
  }
  float v = length((uv - .5) * vec2(1., .9));
  col *= 1. - 0.4 * v * v;
  gl_FragColor = vec4(col, 1.);
}`, { logo: { value: L.t }, asp: { value: L.asp } });
listo(draw);
