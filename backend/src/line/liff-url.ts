/**
 * ลิงก์เปิดหน้าลูกค้าใน LINE เช่น https://liff.line.me/1234567890-AbCdEfGh/c/book
 *
 * LINE เอา path ต่อท้าย endpoint URL ของ LIFF app ให้เอง จึงต้องตั้ง endpoint เป็นรากของเว็บ
 * ไม่ตั้ง LIFF_ID = ไม่มีลิงก์ ข้อความทุกฉบับต้องเหมือนก่อนมีหน้าลูกค้าทุกตัวอักษร
 */
export function liffUrl(liffId: string | undefined, path = ''): string | undefined {
  if (!liffId) return undefined;

  return `https://liff.line.me/${liffId}${path}`;
}

/** หน้าที่ข้อความแต่ละชนิดพาลูกค้าไป */
export const LIFF_PATH = {
  book: '/c/book',
  courses: '/c/courses',
} as const;
