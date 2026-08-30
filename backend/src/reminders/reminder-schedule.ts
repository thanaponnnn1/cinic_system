import { MsgType } from '@clinicq/shared';

/** ชื่อคิวเดียวที่งานเตือนนัดทั้งหมดอยู่ */
export const REMINDERS_QUEUE = 'reminders';

/**
 * เตือนล่วงหน้าเท่าไหร่ก่อนถึงเวลานัด
 *
 * สองจังหวะนี้มาจากประโยคขายใน use-cases.md ข้อ 13 โดยตรง:
 * "เตือนนัดล่วงหน้า 1 วัน และซ้ำอีกครั้งก่อน 2 ชั่วโมง"
 */
export const REMINDER_LEAD_MS: Record<string, number> = {
  [MsgType.REMINDER_1D]: 24 * 3_600_000,
  [MsgType.REMINDER_2H]: 2 * 3_600_000,
};

/** เรียงตามลำดับเวลาที่จะส่ง — ตัวที่ล่วงหน้ามากที่สุดมาก่อน */
const REMINDER_TYPES = [MsgType.REMINDER_1D, MsgType.REMINDER_2H] as const;

export interface PlannedReminder {
  type: MsgType;
  /** เวลาที่ควรส่งจริง */
  runAt: Date;
  /** หน่วงกี่มิลลิวินาทีนับจากเวลาที่ให้มา — BullMQ รับค่านี้ */
  delayMs: number;
}

/**
 * id ของงานหนึ่งใบ
 *
 * ผูกกับนัดและชนิดข้อความ เพราะ BullMQ ไม่รับงานที่ jobId ซ้ำกับงานที่ยังอยู่ในคิว
 * การกันส่งซ้ำจึงเกิดจากโครงสร้าง ไม่ใช่จากการที่โค้ดจำได้ว่าเคยตั้งไปแล้ว
 *
 * คั่นด้วยขีดกลาง ไม่ใช่ทวิภาค — BullMQ ใช้ทวิภาคเป็นตัวคั่นคีย์ของตัวเองใน Redis
 * และปฏิเสธ jobId ที่มีตัวนี้ด้วยข้อความ "Custom Id cannot contain :"
 */
export function reminderJobId(appointmentId: string, type: MsgType): string {
  return `${appointmentId}-${type}`;
}

/**
 * งานเตือนที่ควรตั้งสำหรับนัดหนึ่งใบ
 *
 * ข้ามจังหวะที่เลยเวลาไปแล้ว — นัดที่จองกระชั้นจะได้เฉพาะเตือนก่อน 2 ชั่วโมง
 * และนัดที่เหลือไม่ถึง 2 ชั่วโมงจะไม่มีงานเลย เพราะส่งตอนนั้นไม่ทันอยู่ดี
 */
export function plannedReminders(startsAt: Date, now: Date): PlannedReminder[] {
  return REMINDER_TYPES.map((type) => {
    const runAt = new Date(startsAt.getTime() - REMINDER_LEAD_MS[type]);

    return { type, runAt, delayMs: runAt.getTime() - now.getTime() };
  }).filter((job) => job.delayMs > 0);
}
