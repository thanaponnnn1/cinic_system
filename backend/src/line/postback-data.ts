/**
 * ปุ่มใน Flex Message ส่งค่าอะไรกลับมาบ้าง
 *
 * เก็บเป็น query string ไม่ใช่ JSON เพราะ LINE จำกัด data ไว้ที่ 300 ตัวอักษร
 * และ query string อ่านออกตอนไล่ดู log ว่าลูกค้ากดปุ่มไหน
 */
export enum PostbackAction {
  CONFIRM = 'confirm',
  RESCHEDULE = 'reschedule',
}

export interface PostbackPayload {
  action: PostbackAction;
  appointmentId: string;
}

const KNOWN_ACTIONS = new Set<string>(Object.values(PostbackAction));

export function encodePostback(payload: PostbackPayload): string {
  return new URLSearchParams({
    action: payload.action,
    appointmentId: payload.appointmentId,
  }).toString();
}

/**
 * ถอด data ที่ลูกค้ากดปุ่มส่งกลับมา
 *
 * คืน null เมื่อรูปแบบไม่ตรง — data มาจากฝั่งนอกระบบเสมอ จึงต้องถือว่าไม่น่าเชื่อถือ
 * จนกว่าจะตรวจครบ ผู้เรียกจะได้ตอบข้อความสุภาพแทนการโยน error ใส่ลูกค้า
 */
export function parsePostback(data: string): PostbackPayload | null {
  if (!data) return null;

  const params = new URLSearchParams(data);
  const action = params.get('action');
  const appointmentId = params.get('appointmentId');

  if (!action || !appointmentId || !KNOWN_ACTIONS.has(action)) return null;

  return { action: action as PostbackAction, appointmentId };
}
