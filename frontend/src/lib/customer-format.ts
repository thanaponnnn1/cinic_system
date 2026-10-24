import { money } from '@/lib/format';

/** ราคาแบบที่ลูกค้าอ่าน — 0 บาทคือบริการที่ไม่มีค่าใช้จ่าย ไม่ใช่ "฿0" ซึ่งดูเหมือนข้อมูลหาย */
export function priceLabel(price: number): string {
  return price === 0 ? 'ไม่มีค่าใช้จ่าย' : `฿${money(price)}`;
}

/** 90 → '1 ชม. 30 นาที' — ลูกค้ากะเวลาเป็นชั่วโมง ไม่ใช่นาทีล้วน */
export function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} นาที`;
  return rest === 0 ? `${hours} ชม.` : `${hours} ชม. ${rest} นาที`;
}
