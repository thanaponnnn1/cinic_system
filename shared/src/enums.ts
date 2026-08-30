/**
 * Enum ที่ backend กับ frontend ต้องเข้าใจตรงกัน
 *
 * ค่าทุกตัวต้องตรงกับ enum ใน backend/prisma/schema.prisma เป๊ะ ๆ
 * (Prisma generate ให้ type ฝั่ง backend อยู่แล้ว แต่ frontend เข้าไม่ถึง
 *  จึงประกาศไว้ที่นี่เป็นแหล่งกลาง แล้วมี test ฝั่ง backend คอยยืนยันว่าไม่หลุดจากกัน)
 */

/** สิทธิ์ผู้ใช้ฝั่งร้าน — VIEWER เห็นตารางนัดแต่ไม่เห็นข้อมูลติดต่อลูกค้า (ข้อกำหนด PDPA) */
export const Role = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  VIEWER: 'VIEWER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/** สถานะนัด — การเปลี่ยนสถานะคุมด้วย state machine ฝั่ง backend */
export const ApptStatus = {
  BOOKED: 'BOOKED',
  CONFIRMED: 'CONFIRMED',
  RESCHEDULE_REQUESTED: 'RESCHEDULE_REQUESTED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  COMPLETED: 'COMPLETED',
} as const;
export type ApptStatus = (typeof ApptStatus)[keyof typeof ApptStatus];

/** สถานะคิวรอ (waitlist) */
export const WaitlistStatus = {
  WAITING: 'WAITING',
  OFFERED: 'OFFERED',
  CLAIMED: 'CLAIMED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;
export type WaitlistStatus = (typeof WaitlistStatus)[keyof typeof WaitlistStatus];

/** ชนิดข้อความที่ระบบส่งออก */
export const MsgType = {
  REMINDER_1D: 'REMINDER_1D',
  REMINDER_2H: 'REMINDER_2H',
  SLOT_OFFER: 'SLOT_OFFER',
  WINBACK: 'WINBACK',
  COURSE_EXPIRY: 'COURSE_EXPIRY',
  DAILY_DIGEST: 'DAILY_DIGEST',
  LINK_CONFIRM: 'LINK_CONFIRM',
} as const;
export type MsgType = (typeof MsgType)[keyof typeof MsgType];

/**
 * ผลการส่งข้อความ
 *
 * ค่า SKIPPED_* สำคัญไม่แพ้ SENT — มันคือหลักฐานว่าระบบไม่ส่งข้อความ
 * หาคนที่ไม่ได้ให้ความยินยอม ซึ่งเป็นสิ่งที่ต้องพิสูจน์ได้ตาม PDPA
 */
export const DeliveryStatus = {
  SENT: 'SENT',
  FAILED: 'FAILED',
  SKIPPED_NO_CONSENT: 'SKIPPED_NO_CONSENT',
  SKIPPED_NO_LINE: 'SKIPPED_NO_LINE',
  SKIPPED_DUPLICATE: 'SKIPPED_DUPLICATE',
} as const;
export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

/** ป้ายภาษาไทยสำหรับแสดงผล — เก็บคู่กับ enum เพื่อไม่ให้แต่ละหน้าจอแปลกันเอง */
export const APPT_STATUS_LABEL: Record<ApptStatus, string> = {
  BOOKED: 'รอยืนยัน',
  CONFIRMED: 'ยืนยันแล้ว',
  RESCHEDULE_REQUESTED: 'ขอเลื่อนนัด',
  CANCELLED: 'ยกเลิก',
  NO_SHOW: 'ไม่มาตามนัด',
  COMPLETED: 'รับบริการแล้ว',
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'ผู้ดูแลระบบ',
  STAFF: 'พนักงาน',
  VIEWER: 'ดูอย่างเดียว',
};

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  SENT: 'ส่งแล้ว',
  FAILED: 'ส่งไม่สำเร็จ',
  SKIPPED_NO_CONSENT: 'ไม่ส่ง — ไม่ได้ให้ความยินยอม',
  SKIPPED_NO_LINE: 'ไม่ส่ง — ยังไม่ได้ผูก LINE',
  SKIPPED_DUPLICATE: 'ไม่ส่ง — ส่งไปแล้ว',
};
