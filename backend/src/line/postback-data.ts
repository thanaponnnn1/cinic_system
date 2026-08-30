/**
 * ปุ่มใน Flex Message ส่งค่าอะไรกลับมาบ้าง
 *
 * เก็บเป็น query string ไม่ใช่ JSON เพราะ LINE จำกัด data ไว้ที่ 300 ตัวอักษร
 * และ query string อ่านออกตอนไล่ดู log ว่าลูกค้ากดปุ่มไหน
 */
export enum PostbackAction {
  CONFIRM = 'confirm',
  RESCHEDULE = 'reschedule',
  CLAIM_SLOT = 'claim-slot',
}

/** ปุ่มที่ทำงานกับนัดหมายที่มีอยู่แล้ว */
export interface AppointmentPostback {
  action: PostbackAction.CONFIRM | PostbackAction.RESCHEDULE;
  appointmentId: string;
}

/** ปุ่มรับคิวว่างจากคิวรอ — อ้างถึงใบจองคิวรอ ไม่ใช่ตัวนัด เพราะนัดยังไม่เกิด */
export interface ClaimSlotPostback {
  action: PostbackAction.CLAIM_SLOT;
  waitlistEntryId: string;
}

export type PostbackPayload = AppointmentPostback | ClaimSlotPostback;

export function encodePostback(payload: PostbackPayload): string {
  const params: Record<string, string> =
    payload.action === PostbackAction.CLAIM_SLOT
      ? { action: payload.action, waitlistEntryId: payload.waitlistEntryId }
      : { action: payload.action, appointmentId: payload.appointmentId };

  return new URLSearchParams(params).toString();
}

/**
 * ถอด data ที่ลูกค้ากดปุ่มส่งกลับมา
 *
 * คืน null เมื่อรูปแบบไม่ตรง — data มาจากฝั่งนอกระบบเสมอ จึงต้องถือว่าไม่น่าเชื่อถือ
 * จนกว่าจะตรวจครบ ผู้เรียกจะได้ตอบข้อความสุภาพแทนการโยน error ใส่ลูกค้า
 *
 * แต่ละ action ต้องมาพร้อม id ที่คู่กันเท่านั้น การสลับ id ข้ามชนิดถือว่าใช้ไม่ได้
 */
export function parsePostback(data: string): PostbackPayload | null {
  if (!data) return null;

  const params = new URLSearchParams(data);
  const action = params.get('action');

  if (action === PostbackAction.CLAIM_SLOT) {
    const waitlistEntryId = params.get('waitlistEntryId');

    return waitlistEntryId ? { action, waitlistEntryId } : null;
  }

  if (action === PostbackAction.CONFIRM || action === PostbackAction.RESCHEDULE) {
    const appointmentId = params.get('appointmentId');

    return appointmentId ? { action, appointmentId } : null;
  }

  return null;
}
