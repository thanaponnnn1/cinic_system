import type { DayBoard } from '@/lib/api-types';

export function boardAppointmentIds(board: DayBoard): Set<string> {
  return new Set(board.providers.flatMap((provider) => provider.appointments.map((a) => a.id)));
}

/**
 * id ของคิวที่เพิ่งเข้าบอร์ดเทียบกับรอบก่อน
 *
 * previous เป็น null ตอนโหลดครั้งแรก (หรือเพิ่งเปลี่ยนวัน) แล้วคืนชุดว่าง — คิวทั้งหมดที่เห็น
 * ตอนเปิดหน้าไม่ใช่ "คิวใหม่" ถ้าขอบทองขึ้นทุกใบตั้งแต่แรก คนดูจะแยกไม่ออกว่าใบไหนเพิ่งมา
 */
export function newlyArrivedIds(
  previous: ReadonlySet<string> | null,
  current: ReadonlySet<string>,
): string[] {
  if (previous === null) return [];
  return [...current].filter((id) => !previous.has(id));
}
