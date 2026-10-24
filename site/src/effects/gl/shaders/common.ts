/**
 * ส่วนหัว GLSL ที่ทุก preset ใช้ร่วม เขียนเป็น GLSL ES 1.00 ชุดเดียว ใช้ได้ทั้ง WebGL1 และ WebGL2
 *
 * uniform: uRes ขนาดบัฟเฟอร์ (px), uTime วินาที, uPointer เมาส์ -1..1 (หน่วงแล้ว, 0 บนจอสัมผัส),
 * uIntensity ตัวคูณแสง, uDither ความแรงของเกรน (หน่วย 1/255), uScale พิกเซลบัฟเฟอร์ต่อพิกเซล CSS
 */
export const VERTEX = /* glsl */ `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const COMMON = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform float uIntensity;
uniform float uDither;
uniform float uScale;

float hash12(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1039, 0.1117, 0.0951));
  q += dot(q, q.yzx + 31.73);
  return fract((q.x + q.y) * q.z);
}

vec2 hash22(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1039, 0.1117, 0.0951));
  q += dot(q, q.yzx + 31.73);
  return fract((q.xx + q.yz) * q.zy);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 turn = mat2(1.62, 1.18, -1.18, 1.62);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = turn * p;
    a *= 0.5;
  }
  return v;
}

/* เกรนนิ่งแบบสามเหลี่ยม -1..1 ผูกกับพิกเซลของบัฟเฟอร์ ไม่ขยับตามเวลา กันแถบสีบนไล่สีมืด และให้ผิวสัมผัสแบบงานพิมพ์ */
float grain(vec2 fc) {
  return hash12(fc) + hash12(fc + vec2(17.31, 41.77)) - 1.0;
}
`;
