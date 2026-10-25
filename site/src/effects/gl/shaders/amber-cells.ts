import { COMMON } from './common';

/**
 * โมเสกเซลล์ voronoi แต่ละเซลล์มีแสงอำพันจากกลางเซลล์ ขอบเซลล์เป็นเส้นทองจาง ๆ
 * เซลล์ขยับตำแหน่งและหายใจ (สว่างขึ้นลง) ช้ามาก เซลล์กว้างราว 230px ของ CSS ทุกขนาดจอ
 */
export const AMBER_CELLS = /* glsl */ `${COMMON}
const vec3 INK = vec3(0.016, 0.030, 0.052);
const vec3 NAVY = vec3(0.043, 0.082, 0.137);
const vec3 AMBER = vec3(0.820, 0.430, 0.130);
const vec3 GOLD = vec3(0.900, 0.700, 0.360);

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = gl_FragCoord.xy / (230.0 * uScale) + uPointer * 0.06;
  float t = uTime * 0.05;

  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float f1 = 9.0;
  float f2 = 9.0;
  vec2 id = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 h = hash22(ip + g);
      vec2 r = g + 0.5 + 0.36 * sin(t + 6.2831 * h) - fp;
      float d = dot(r, r);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = ip + g;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  f1 = sqrt(f1);
  f2 = sqrt(f2);

  float h = hash12(id);
  float breathe = 0.6 + 0.4 * sin(uTime * 0.22 + h * 6.2831);
  float glow = exp(-f1 * 2.3) * (0.15 + 0.85 * h * h) * breathe;
  float edge = 1.0 - smoothstep(0.0, 0.022, f2 - f1);

  vec3 col = mix(INK, NAVY, smoothstep(-0.2, 1.1, uv.y));
  col = mix(col, mix(AMBER, GOLD, h) * 0.5, clamp(glow * 0.95, 0.0, 1.0));
  col = mix(col, GOLD * 0.42, edge * 0.3);
  col *= 0.72 + 0.28 * smoothstep(1.25, 0.2, length((uv - 0.5) * vec2(1.0, 1.6)));

  col = mix(NAVY * 0.6, col, uIntensity);
  col += grain(gl_FragCoord.xy) * (uDither / 255.0);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
