import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * เปิดให้เรียกได้โดยไม่ต้องล็อกอิน
 *
 * ระบบตั้ง JwtAuthGuard เป็น guard ระดับแอป ทุก endpoint จึงถูกปิดไว้ก่อนโดยปริยาย
 * การเปิดต้องทำอย่างจงใจด้วย decorator ตัวนี้เท่านั้น — ปลอดภัยกว่าการต้องไล่ใส่ guard
 * ทีละจุดแล้วลืมสักจุดหนึ่ง
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
