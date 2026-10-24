import { applyDecorators } from '@nestjs/common';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * ชื่อในลิงก์จากเว็บร้าน เช่น /c/book?service=haircut
 *
 * บังคับตัวพิมพ์เล็กกับขีดอย่างเดียวแทนการแปลงให้เงียบ ๆ — ลิงก์ในเว็บร้านพิมพ์ไว้ตายตัว
 * ถ้าระบบแอบแปลง "Haircut" เป็น "haircut" เจ้าของร้านจะไม่รู้ว่าลิงก์ที่ตัวเองพิมพ์ไม่ตรงกับที่บันทึก
 */
export function IsSlug(): PropertyDecorator {
  return applyDecorators(
    IsOptional(),
    IsString(),
    MaxLength(60, { message: 'slug ยาวเกิน 60 ตัวอักษร' }),
    Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
      message: 'slug ใช้ได้แค่ a-z ตัวเล็ก ตัวเลข และขีดคั่นระหว่างคำ เช่น facial-treatment',
    }),
  );
}
