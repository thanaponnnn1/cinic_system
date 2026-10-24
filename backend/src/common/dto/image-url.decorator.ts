import { applyDecorators } from '@nestjs/common';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * ที่อยู่รูปที่หน้าร้านฝั่งลูกค้าจะเอาไปใส่ใน <img> ตรง ๆ
 *
 * รับแค่ path ในเว็บเราเอง (ขึ้นต้นด้วย / ตัวเดียว) หรือ https เต็ม ๆ เท่านั้น
 * กัน "//โดเมนอื่น" กับ http: หรือ javascript: ไม่ให้ถูกบันทึกเข้าไปแสดงในหน้าลูกค้า
 */
export function IsImageUrl(): PropertyDecorator {
  return applyDecorators(
    IsOptional(),
    IsString(),
    MaxLength(500, { message: 'ที่อยู่รูปยาวเกิน 500 ตัวอักษร' }),
    Matches(/^(\/(?!\/)|https:\/\/)/, {
      message: 'ที่อยู่รูปต้องขึ้นต้นด้วย / (รูปในเว็บของร้าน) หรือ https://',
    }),
  );
}
