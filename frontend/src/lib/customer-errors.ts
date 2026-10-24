import { ApiErrorCode } from '@clinicq/shared';
import { ApiError } from '@/lib/api';

/**
 * ข้อความ error ที่ลูกค้าเห็น
 *
 * รหัสที่ลูกค้าต้องทำอะไรต่อสักอย่างได้ข้อความที่บอกทางไปต่อ ส่วนรหัสอื่นใช้ข้อความภาษาไทย
 * จาก backend ตรง ๆ ซึ่งอธิบายสาเหตุจริงอยู่แล้ว (เช่น กฎเวลาจอง หรือรูปแบบเบอร์โทร)
 */
const MESSAGE_BY_CODE: Partial<Record<string, string>> = {
  [ApiErrorCode.PHONE_ALREADY_REGISTERED]:
    'เบอร์นี้มีประวัติกับร้านอยู่แล้ว กรุณาขอรหัสเชื่อม 6 หลักจากร้าน แล้วเลือก "เคยใช้บริการแล้ว"',
  [ApiErrorCode.BOOKING_LIMIT_REACHED]:
    'คุณมีนัดที่รออยู่ครบจำนวนที่จองเองได้แล้ว ยกเลิกนัดที่ไม่สะดวกในหน้า "นัดของฉัน" ก่อน แล้วจองใหม่ได้เลย',
  [ApiErrorCode.SLOT_TAKEN]: 'เวลานี้เพิ่งมีคนจองไป กรุณาเลือกเวลาอื่น',
  [ApiErrorCode.UNAUTHORIZED]: 'กรุณาเข้าสู่ระบบอีกครั้ง',
};

export function customerErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const known = error.code ? MESSAGE_BY_CODE[error.code] : undefined;
    if (known) return known;
    if (error.status < 500 && error.message) return error.message;
    return 'ระบบของร้านขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง';
  }

  // fetch โยน TypeError ตอนเน็ตหลุด — เป็นเรื่องปกติในมือถือ บอกตรง ๆ ดีกว่าโชว์ข้อความภาษาอังกฤษ
  return 'เชื่อมต่อไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
}

export function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof ApiError && error.code === code;
}
