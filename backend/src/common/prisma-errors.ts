import { ConflictException } from '@nestjs/common';

/** รหัส error ของ Prisma ตอนชน unique constraint */
const PRISMA_UNIQUE_VIOLATION = 'P2002';

/**
 * ตรวจว่าการเขียนชน unique constraint หรือไม่
 *
 * ใช้คู่กับการเช็กก่อนเขียนเสมอ — เช็กก่อนให้ได้คำตอบที่อ่านรู้เรื่อง แล้วตัวนี้จับกรณี
 * สองคำขอมาพร้อมกันและผ่านการเช็กทั้งคู่ ซึ่งไม่งั้นจะกลายเป็น 500
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === PRISMA_UNIQUE_VIOLATION
  );
}

/**
 * แปลง slug ซ้ำเป็น 409 ภาษาไทย ไม่งั้นหลุดเป็น 500
 *
 * ตารางบริการกับช่างมี unique แค่ id (cuid) กับ slug ชน unique ตอนเขียนสองตารางนี้จึงแปลว่า slug ซ้ำเสมอ
 * ไม่ต้องเช็กก่อนเขียนแบบเบอร์โทร — ข้อความนี้บอกครบแล้วว่าต้องแก้อะไร และจับคำขอที่มาพร้อมกันในที่เดียว
 */
export function rethrowSlugTaken(
  error: unknown,
  slug: string | undefined,
  owner: 'บริการ' | 'ช่าง',
): never {
  if (isUniqueViolation(error)) {
    throw new ConflictException(`slug "${slug}" ถูกใช้กับ${owner}อื่นแล้ว เลือกชื่ออื่น`);
  }
  throw error;
}
