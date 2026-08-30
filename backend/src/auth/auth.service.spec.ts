import { parseDuration } from './auth.service';

describe('parseDuration', () => {
  it.each([
    ['15m', 15 * 60_000],
    ['1h', 3_600_000],
    ['7d', 7 * 86_400_000],
    ['30s', 30_000],
  ])('แปลง %s ได้ถูกต้อง', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });

  it.each(['15', 'm', '15 minutes', '1w', '', '-5m'])('ปฏิเสธรูปแบบที่ไม่รองรับ: "%s"', (input) => {
    // ต้องพังตั้งแต่ตอน boot ไม่ใช่ไปเงียบ ๆ แล้วออกโทเคนที่อายุผิด
    expect(() => parseDuration(input)).toThrow();
  });
});
