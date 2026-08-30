import { formatThaiDate } from '../common/bangkok-time';

/** คอร์สหนึ่งใบที่กำลังจะหมดอายุ เท่าที่ข้อความต้องใช้ */
export interface ExpiringCourseLine {
  packageName: string;
  remainingSessions: number;
  expiresAt: Date;
  daysLeft: number;
}

/**
 * ข้อความเตือนคอร์สใกล้หมดอายุที่ส่งหาลูกค้า
 *
 * แยกออกมาจากตัวส่งเพื่อให้ทดสอบถ้อยคำได้โดยไม่ต้องแตะ LINE หรือฐานข้อมูล — หลักการ
 * เดียวกับ digest-message.ts ใน Phase 4
 *
 * ข้อความบอกแค่ชื่อคอร์ส ครั้งที่เหลือ และวันหมดอายุ ไม่มีรายละเอียดการรักษาโดยโครงสร้าง
 * (ข้อ 4 ของ docs/plan-clinic-demo.md) — ระบบไม่ได้เก็บข้อมูลนั้นไว้ตั้งแต่แรกอยู่แล้ว
 */
export function formatCourseExpiry(customerName: string, courses: ExpiringCourseLine[]): string {
  const lines = courses.map(
    (course) =>
      `• ${course.packageName} — เหลือ ${course.remainingSessions} ครั้ง ` +
      `หมดอายุ ${formatThaiDate(course.expiresAt)} (อีก ${Math.max(0, course.daysLeft)} วัน)`,
  );

  return [
    `📋 คุณ${customerName} มีคอร์สที่ใกล้หมดอายุค่ะ`,
    '',
    ...lines,
    '',
    'จองคิวมาใช้ให้ครบนะคะ ทักแชทนี้ได้เลยค่ะ',
  ].join('\n');
}
