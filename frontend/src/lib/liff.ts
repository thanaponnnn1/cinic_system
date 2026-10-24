import type { Liff } from '@line/liff';

/**
 * LIFF SDK แบบโหลดเมื่อจำเป็น
 *
 * ค่า LIFF ID ฝังตอน build (NEXT_PUBLIC_) เพราะ SDK ต้องใช้ในเบราว์เซอร์ตั้งแต่ก่อนคุยกับ server
 * build ที่ไม่ได้ตั้งค่านี้จะไม่โหลด SDK เลย หน้าเดโมบนโน้ตบุ๊กจึงไม่ต้องแบก SDK ที่ไม่ได้ใช้
 */
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? '';

export const liffConfigured = LIFF_ID.length > 0;

let ready: Promise<Liff> | null = null;

/** init ครั้งเดียวต่อหน้า — LIFF โยน error ถ้า init ซ้ำ และทุกหน้าที่เรียกต้องได้ตัวเดียวกัน */
export function loadLiff(): Promise<Liff> {
  if (!liffConfigured) return Promise.reject(new Error('ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LIFF_ID'));

  ready ??= import('@line/liff').then(async ({ default: liff }) => {
    await liff.init({ liffId: LIFF_ID });
    return liff;
  });

  // init ล้มแล้วให้ลองใหม่ได้ในครั้งถัดไป ไม่ใช่ค้าง promise ที่ล้มไว้ตลอดอายุหน้า
  ready.catch(() => {
    ready = null;
  });

  return ready;
}

export type LiffIdentity =
  | { status: 'id_token'; idToken: string }
  /** กำลังพาไปหน้า login ของ LINE — หน้าจะถูกโหลดใหม่เมื่อกลับมา */
  | { status: 'redirecting' };

/**
 * ขอ ID token ของผู้ใช้ LINE คนนี้ ถ้ายังไม่ได้ login จะพาไป login แล้วกลับมาที่ URL เดิม
 *
 * ใน LINE app ผู้ใช้ login อยู่แล้วเสมอ ทาง redirect มีไว้สำหรับคนที่เปิดลิงก์ LIFF จากเบราว์เซอร์ทั่วไป
 */
export async function liffIdentity(): Promise<LiffIdentity> {
  const liff = await loadLiff();

  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
    return { status: 'redirecting' };
  }

  const idToken = liff.getIDToken();
  if (!idToken) throw new Error('LINE ไม่ส่ง ID token มา กรุณาเปิดจากเมนูของร้านใน LINE อีกครั้ง');

  return { status: 'id_token', idToken };
}
