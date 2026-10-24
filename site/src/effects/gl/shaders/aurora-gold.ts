import { COMMON } from './common';

/**
 * ม่านแสงทองอำพันแนวตั้ง ไหลช้า ๆ บนพื้นกรมท่า ส่งออกเฉพาะแสง (alpha แบบ premultiplied)
 * พื้นของ section จึงยังเป็นสีเดิมหรือรูปเดิม ชายล่างของม่านสว่างสุด จางขึ้นด้านบน และจางหมดก่อนขอบบน
 * ฝั่งซ้ายหรี่ลงในตัว shader เพราะทุกที่ที่ใช้วางข้อความไว้ซ้าย (หรี่ด้วย CSS mask ทำให้ต้องอ่านพิกเซลกลับทุกเฟรมบางเครื่อง)
 */
export const AURORA_GOLD = /* glsl */ `${COMMON}
const vec3 AMBER = vec3(0.82, 0.42, 0.13);
const vec3 GOLD = vec3(0.95, 0.73, 0.36);
const vec3 CHAMPAGNE = vec3(1.0, 0.9, 0.66);

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y) + uPointer * vec2(0.035, 0.018);
  float t = uTime * 0.035;

  vec3 light = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float sx = p.x * (1.0 + 0.3 * fi) + fi * 2.37 + t * 0.2 * (fi - 1.0);
    float warp = fbm(vec2(sx * 0.5 + t * 0.6, fi * 4.1 + t * 0.25));
    float x = sx + (warp - 0.5) * 2.2;

    float hem = 0.14 + 0.12 * fi + 0.24 * (fbm(vec2(x * 0.7, fi * 9.0 + t * 0.4)) - 0.5);
    float d = p.y - hem;
    float above = exp(-max(d, 0.0) * (3.0 - 0.6 * fi));
    float under = smoothstep(-0.06, 0.0, d);
    float edgeGlow = exp(-abs(d) * 26.0) * 0.55;

    float folds = fbm(vec2(x * 1.8, t * 0.7 + fi * 11.0));
    float curtain = smoothstep(0.36, 0.64, folds);
    curtain *= curtain;
    float rays = noise(vec2(x * 38.0, p.y * 0.45 + fi * 5.0 - t * 1.2));
    rays = 0.4 + 0.6 * rays * rays;

    vec3 tint = mix(CHAMPAGNE, GOLD, smoothstep(0.0, 0.08, d));
    tint = mix(tint, AMBER, smoothstep(0.08, 0.4, d));
    light += tint * curtain * (above * rays + edgeGlow) * under * (1.1 - 0.25 * fi);
  }

  light *= 1.0 - smoothstep(0.5, 0.98, uv.y);
  light *= mix(0.32, 1.0, smoothstep(0.12, 0.68, uv.x));
  light *= uIntensity;
  light = light / (1.0 + light * 0.75);
  light += grain(gl_FragCoord.xy) * (uDither / 255.0) * smoothstep(0.0, 0.08, light);
  light = clamp(light, 0.0, 1.0);
  float alpha = max(light.r, max(light.g, light.b));
  gl_FragColor = vec4(light, alpha);
}
`;
