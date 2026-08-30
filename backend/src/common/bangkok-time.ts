/**
 * ตัวช่วยเรื่องเวลาไทย
 *
 * ไม่พึ่ง TZ ของ process โดยตั้งใจ — ถ้าเซิร์ฟเวอร์ถูก deploy ไปโดยลืมตั้ง TZ
 * ผลลัพธ์ต้องยังถูกต้อง ไม่ใช่เพี้ยนไป 7 ชั่วโมงแบบเงียบ ๆ ซึ่งจะกลายเป็น
 * การส่งข้อความเตือนนัดผิดเวลาโดยไม่มีอะไรฟ้อง
 *
 * ไทยไม่มีการปรับเวลาตามฤดูกาล ค่าชดเชยจึงคงที่ที่ +07:00 ตลอดปี
 */

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** '2026-09-01' → ช่วงเวลาที่ครอบวันนั้นทั้งวันตามเวลาไทย */
export function bangkokDayRange(dateStr: string): { start: Date; end: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`รูปแบบวันที่ต้องเป็น YYYY-MM-DD ได้รับ: "${dateStr}"`);
  }

  const start = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`วันที่ไม่ถูกต้อง: "${dateStr}"`);
  }

  // เที่ยงคืนตามเวลาไทย = 17:00 UTC ของวันก่อนหน้า
  start.setTime(start.getTime() - BANGKOK_OFFSET_MS);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

/** วันที่ตามปฏิทินไทยของเวลานี้ → 'YYYY-MM-DD' */
export function formatBangkokDate(date: Date): string {
  return shifted(date).toISOString().slice(0, 10);
}

/** เวลาไทยของช่วงเวลานี้ → 'HH:MM' */
export function formatBangkokTime(date: Date): string {
  return shifted(date).toISOString().slice(11, 16);
}

/** 'YYYY-MM-DD HH:MM' ตามเวลาไทย */
export function formatBangkokDateTime(date: Date): string {
  const iso = shifted(date).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

/**
 * เลื่อนเวลาไปข้างหน้า 7 ชั่วโมงเพื่อให้ส่วน UTC ของค่าที่ได้อ่านออกมาเป็นเวลาไทย
 * ใช้ภายในเท่านั้น — ค่าที่คืนไม่ใช่เวลาจริง ห้ามเอาไปบันทึกลงฐานข้อมูล
 */
function shifted(date: Date): Date {
  return new Date(date.getTime() + BANGKOK_OFFSET_MS);
}

/** ชื่อวันแบบไทยเต็ม เรียงตามค่าที่ Date.getUTCDay() คืน (0 = อาทิตย์) */
const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'] as const;

/** ชื่อเดือนแบบย่อ เรียงตามค่าที่ Date.getUTCMonth() คืน (0 = มกราคม) */
const THAI_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

/**
 * วันที่แบบที่ลูกค้าอ่านในแชท เช่น 'พุธ 2 ก.ย. 2569'
 *
 * ประกอบเองไม่ใช้ Intl เพราะ container ที่ deploy จริงมักไม่มีข้อมูล locale ไทยติดมาด้วย
 * แล้วจะกลายเป็นภาษาอังกฤษเงียบ ๆ ตอนขึ้นคลาวด์ ซึ่งเป็นจุดที่ตรวจเจอยากที่สุด
 */
export function formatThaiDate(date: Date): string {
  const local = shifted(date);
  const day = THAI_DAYS[local.getUTCDay()];
  const month = THAI_MONTHS[local.getUTCMonth()];

  return `${day} ${local.getUTCDate()} ${month} ${local.getUTCFullYear() + 543}`;
}
