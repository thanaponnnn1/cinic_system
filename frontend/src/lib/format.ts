import { formatBangkokTime, formatThaiDate } from '@clinicq/shared';

/**
 * ตัวจัดรูปแบบที่หน้าจอใช้
 *
 * วันเวลาทั้งหมดผ่าน @clinicq/shared ตัวเดียวกับที่ backend ใช้ประกอบข้อความ LINE
 * หน้าจอกับข้อความในแชทจึงพูดวันเดียวกันเสมอ ไม่มีทางเพี้ยนกันเงียบ ๆ
 */

/** '2026-09-01T03:30:00.000Z' → '10:30' */
export function timeOf(iso: string): string {
  return formatBangkokTime(new Date(iso));
}

/** '2026-09-01T03:30:00.000Z' → 'อังคาร 1 ก.ย. 2569' */
export function thaiDateOf(iso: string): string {
  return formatThaiDate(new Date(iso));
}

/** ช่วงเวลาของนัดหนึ่งใบ → '10:30–11:00' */
export function timeRange(startsAt: string, endsAt: string): string {
  return `${timeOf(startsAt)}–${timeOf(endsAt)}`;
}

/** 12400 → '12,400' — ไม่ใส่คำว่าบาท เพราะแต่ละที่วางหน่วยไม่เหมือนกัน */
export function money(amount: number): string {
  return amount.toLocaleString('th-TH', { maximumFractionDigits: 0 });
}

/** จำนวนวันที่หายไป → ข้อความที่อ่านแล้วรู้ทันทีว่าควรโทรตามไหม */
export function absenceLabel(days: number | null | undefined): string {
  if (days === null || days === undefined) return 'ยังไม่เคยมา';
  if (days === 0) return 'มาวันนี้';
  if (days === 1) return 'มาเมื่อวาน';
  if (days < 30) return `หายไป ${days} วัน`;

  const months = Math.floor(days / 30);
  return `หายไป ${months} เดือน`;
}

/** ป้ายบอกความเร่งด่วนของคอร์สที่ใกล้หมดอายุ */
export function expiryTone(daysLeft: number): 'urgent' | 'soon' | 'ok' {
  if (daysLeft <= 7) return 'urgent';
  if (daysLeft <= 30) return 'soon';
  return 'ok';
}
