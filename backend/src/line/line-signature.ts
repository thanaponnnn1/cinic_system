import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * ตรวจว่า request มาจาก LINE จริง ไม่ใช่คนที่เดา URL ของ webhook เจอ
 *
 * ทำไมต้องเข้มขนาดนี้: postback หนึ่งครั้งเปลี่ยนสถานะนัดในฐานข้อมูลได้ทันที
 * ถ้าไม่ตรวจลายเซ็น ใครก็ยิง JSON ปลอมเข้ามายืนยัน/ยกเลิกนัดของลูกค้าคนอื่นได้
 *
 * ต้องคำนวณจาก raw body ตัวจริงเท่านั้น — ถ้าเอา object ที่ผ่าน JSON.parse แล้ว
 * มา stringify ใหม่ ลำดับ key หรือช่องว่างจะเพี้ยนไปจากที่ LINE เซ็นมา แล้วจะไม่ตรงเสมอ
 */
export function verifyLineSignature(
  rawBody: Buffer,
  signature: string | undefined,
  channelSecret: string,
): boolean {
  if (!signature || !channelSecret) return false;

  const expected = createHmac('sha256', channelSecret).update(rawBody).digest();
  const received = Buffer.from(signature, 'base64');

  // ความยาวไม่เท่ากัน timingSafeEqual จะโยน error — เช็กก่อนเพื่อให้ตอบ false เฉย ๆ
  if (expected.length !== received.length) return false;

  return timingSafeEqual(expected, received);
}
