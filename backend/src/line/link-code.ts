import { randomInt } from 'node:crypto';

/** ช่วงของรหัสเชื่อม — 6 หลักและไม่ขึ้นต้นด้วยศูนย์ เพื่อให้บอกกันปากเปล่าไม่ผิด */
const MIN_CODE = 100_000;
const MAX_CODE = 999_999;

/** เลข 6 หลักที่ไม่มีตัวเลขติดอยู่ทั้งซ้ายและขวา — กันหยิบเลข 6 ตัวกลางเบอร์โทรมาใช้ */
const CODE_IN_TEXT = /(?<!\d)\d{6}(?!\d)/;

/**
 * สร้างรหัสเชื่อมบัญชีให้พนักงานอ่านให้ลูกค้าฟัง
 *
 * ใช้ randomInt ของ crypto ไม่ใช่ Math.random เพราะรหัสนี้คือสิ่งเดียวที่กั้นไม่ให้
 * คนอื่นผูกบัญชี LINE ตัวเองเข้ากับประวัติลูกค้าคนอื่น
 */
export function generateLinkCode(): string {
  return String(randomInt(MIN_CODE, MAX_CODE + 1));
}

/**
 * ดึงรหัสเชื่อมออกจากข้อความที่ลูกค้าพิมพ์เข้ามาในแชท
 *
 * ลูกค้าจริงไม่ได้พิมพ์แค่ตัวเลขเปล่า ๆ — มักพิมพ์ว่า "รหัส 482913 ครับ"
 * คืน null เมื่อไม่พบรหัสที่หน้าตาถูกต้อง ผู้เรียกจะได้ตอบข้อความ default แทน
 */
export function extractLinkCode(text: string): string | null {
  return CODE_IN_TEXT.exec(text.trim())?.[0] ?? null;
}
