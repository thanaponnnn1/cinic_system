import { COMMON } from './common';

/**
 * ก้อนแสงใหญ่ไม่กี่ก้อนไหลผ่านกัน บนเงากรมท่าเกือบดำ: ก้อนแชมเปญสว่างมุมขวาบน, ช่วงกลางคราม,
 * ทองต่ำ ๆ และเขียวหัวเป็ดจาง ๆ ด้านล่างขวา มุมซ้ายล่างจมเป็นเงา พร้อมเกรนชัดแบบงานพิมพ์
 *
 * ก้อนสว่างวางชิดขวาบนเพราะทุก section ที่ใช้ preset นี้วางข้อความไว้ซ้าย
 * จอแนวตั้ง (มือถือ) ข้อความกินเต็มกว้าง จึงดันก้อนสว่างออกนอกกรอบให้เห็นแค่ขอบแสง
 */
export const MESH_DRIFT = /* glsl */ `${COMMON}
const vec3 INK = vec3(0.010, 0.020, 0.040);
const vec3 NAVY = vec3(0.038, 0.074, 0.135);
const vec3 INDIGO = vec3(0.060, 0.095, 0.280);
const vec3 TEAL = vec3(0.035, 0.170, 0.180);
const vec3 WARM = vec3(0.450, 0.290, 0.110);
const vec3 CHAMPAGNE = vec3(0.960, 0.800, 0.540);

float lobe(vec2 p, vec2 c, vec2 r) {
  vec2 d = (p - c) / r;
  return exp(-dot(d, d));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float wide = smoothstep(0.8, 1.6, aspect);
  vec2 p = vec2(uv.x * aspect, uv.y) + uPointer * 0.025;
  float t = uTime * 0.045;

  vec2 q = p + 0.16 * vec2(fbm(p * 1.1 + vec2(t, -t * 0.7)) - 0.5, fbm(p * 1.1 + vec2(-t * 0.6, t) + 5.2) - 0.5);

  vec3 col = mix(INK, NAVY, smoothstep(0.0, 1.0, uv.x * 0.55 + uv.y * 0.6));

  vec2 cChamp = mix(vec2(aspect * 0.95, 1.12), vec2(aspect * 0.80, 0.92), wide)
    + vec2(0.10 * sin(t * 1.3), 0.07 * cos(t * 1.1)) * vec2(aspect * 0.5, 1.0);
  vec2 rChamp = mix(vec2(0.55, 0.42), vec2(0.62 * aspect * 0.5 + 0.2, 0.62), wide);
  vec2 cIndigo = vec2(aspect * (0.30 + 0.10 * sin(t * 0.9 + 1.7)), 0.42 + 0.12 * cos(t * 0.8));
  vec2 cTeal = vec2(aspect * (0.88 + 0.06 * cos(t * 0.7)), 0.06 + 0.08 * sin(t * 1.2 + 2.0));
  vec2 cWarm = vec2(aspect * (0.66 + 0.12 * sin(t * 0.6 + 4.0)), 0.30 + 0.10 * sin(t * 1.0 + 0.5));
  vec2 cShadow = vec2(aspect * (0.08 + 0.05 * sin(t * 0.8)), 0.10 + 0.06 * cos(t * 0.9));

  col = mix(col, INDIGO, lobe(q, cIndigo, vec2(0.62 * aspect * 0.5 + 0.25, 0.55)) * 0.55);
  col = mix(col, TEAL, lobe(q, cTeal, vec2(0.45, 0.35)) * 0.45);
  col += WARM * lobe(q, cWarm, vec2(0.40, 0.30)) * 0.18;
  float champ = lobe(q, cChamp, rChamp);
  col = col * (1.0 - champ * 0.85) + CHAMPAGNE * champ * 0.86;
  col *= 1.0 - lobe(q, cShadow, vec2(0.75, 0.65)) * 0.55;

  col = mix(NAVY * 0.6, col, uIntensity);
  col += grain(gl_FragCoord.xy) * (uDither / 255.0) * (0.45 + 0.55 * sqrt(max(col.g, 0.0)));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
