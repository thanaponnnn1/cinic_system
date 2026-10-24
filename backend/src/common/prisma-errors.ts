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
