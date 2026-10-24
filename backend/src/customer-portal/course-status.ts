import { EXPIRY_WINDOW_DAYS } from '../courses/course-expiry.service';

/** สถานะคอร์สในมุมลูกค้า — หน้าคอร์สของฉันใช้เลือกสีป้ายและปุ่ม "จองโดยใช้คอร์สนี้" */
export const CourseStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRING_SOON: 'EXPIRING_SOON',
  EXPIRED: 'EXPIRED',
  USED_UP: 'USED_UP',
} as const;
export type CourseStatus = (typeof CourseStatus)[keyof typeof CourseStatus];

export interface CourseProgress {
  usedSessions: number;
  totalSessions: number;
  expiresAt: Date;
}

const DAY_MS = 86_400_000;

/**
 * สถานะของคอร์สหนึ่งใบ ณ เวลาหนึ่ง
 *
 * ลำดับความสำคัญ USED_UP > EXPIRED > EXPIRING_SOON > ACTIVE ตั้งใจให้คอร์สที่ใช้ครบแล้ว
 * ไม่มีวันขึ้นป้าย "ใกล้หมดอายุ" — ลูกค้าที่ใช้ครบแล้วโดนทวงให้รีบมาใช้คือความสับสนล้วน ๆ
 * กฎเดียวกับงานเตือนคอร์สใกล้หมดอายุที่ไม่ส่งหาคนที่ใช้ครบแล้ว และใช้ช่วงเวลาเตือนเดียวกัน
 */
export function courseStatus(course: CourseProgress, now: Date): CourseStatus {
  if (course.usedSessions >= course.totalSessions) return CourseStatus.USED_UP;

  const msLeft = course.expiresAt.getTime() - now.getTime();

  if (msLeft <= 0) return CourseStatus.EXPIRED;
  if (msLeft <= EXPIRY_WINDOW_DAYS * DAY_MS) return CourseStatus.EXPIRING_SOON;
  return CourseStatus.ACTIVE;
}
