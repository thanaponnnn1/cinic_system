import type { ApptStatus } from '@clinicq/shared';

/** ข้อมูลนัดเท่าที่ข้อความตอบกลับในแชทต้องใช้ */
export interface LineActionAppointment {
  id: string;
  startsAt: Date;
  providerName: string;
  serviceName: string;
  customerId: string;
}

/**
 * ผลของการกดปุ่มในแชท
 *
 * ตั้งใจคืนเป็นค่า ไม่ใช่โยน exception เหมือน endpoint ฝั่งพนักงาน เพราะปลายทางคือ
 * ข้อความที่ลูกค้าอ่าน — ทุกกรณีต้องมีคำตอบที่สุภาพและบอกว่าต้องทำอะไรต่อ
 */
export type LineActionResult =
  /** เปลี่ยนสถานะสำเร็จ */
  | { status: 'ok'; appointment: LineActionAppointment }
  /** สถานะเป็นแบบที่ขอไปอยู่แล้ว (กดปุ่มซ้ำ) หรือมีคนแก้แทรกกลางคัน */
  | { status: 'unchanged'; current: ApptStatus }
  /** เปลี่ยนจากสถานะปัจจุบันไปเป็นสถานะที่ขอไม่ได้ตามกฎ */
  | { status: 'invalid'; current: ApptStatus }
  /** บัญชี LINE ที่กดไม่ใช่เจ้าของนัดนี้ */
  | { status: 'forbidden' }
  | { status: 'not_found' };
