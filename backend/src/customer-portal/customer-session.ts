/** ค่าที่ฝังใน token ลูกค้าเพื่อบอกว่า "นี่คือ session ลูกค้า" — token พนักงานไม่มีฟิลด์นี้ */
export const CUSTOMER_TOKEN_TYPE = 'customer';

/** ลูกค้าเปิดจาก LINE ทุกสองสามวัน อายุ 7 วันจึงไม่ต้องยืนยันตัวตนกับ LINE ใหม่ทุกครั้งที่เปิด */
export const CUSTOMER_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

/** ข้อมูลที่ฝังอยู่ใน customer session token — ตั้งใจให้มีแค่ตัวตน ไม่มีข้อมูลส่วนตัว */
export interface CustomerSessionPayload {
  /** customer id */
  sub: string;
  typ: typeof CUSTOMER_TOKEN_TYPE;
}

/** ลูกค้าที่ผ่าน CustomerAuthGuard แล้ว — ตัวนี้จะถูกแนบไปกับ request */
export interface AuthenticatedCustomer {
  id: string;
}

/**
 * ตรวจรูปร่างของ payload หลังลายเซ็นผ่านแล้ว
 *
 * ลายเซ็นบอกแค่ว่าเราเป็นคนออก token แต่ไม่ได้บอกว่าออกให้ใคร — ต้องเช็ก typ ด้วยเสมอ
 * เผื่อวันหนึ่ง secret ถูกตั้งซ้ำกันหรือมี token ชนิดใหม่ที่เซ็นด้วย secret เดียวกัน
 */
export function isCustomerSession(payload: unknown): payload is CustomerSessionPayload {
  if (typeof payload !== 'object' || payload === null) return false;

  const { sub, typ } = payload as { sub?: unknown; typ?: unknown };
  return typ === CUSTOMER_TOKEN_TYPE && typeof sub === 'string' && sub.length > 0;
}
