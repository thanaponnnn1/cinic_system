import { bangkokDayRange, formatBangkokDate } from '../common/bangkok-time';

/** กรอบเวลาที่ลูกค้าจองเองได้ — ค่าจริงอยู่ที่ BUSINESS_HOURS ใน shared/src/brand.ts */
export interface BusinessHours {
  /** 'HH:MM' ตามเวลาไทย */
  open: string;
  /** 'HH:MM' ตามเวลาไทย — นัดต้องจบไม่เกินเวลานี้ */
  close: string;
  slotMinutes: number;
  minLeadMinutes: number;
  maxAdvanceDays: number;
}

export interface TimeSlot {
  startsAt: Date;
  endsAt: Date;
}

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** ตัวเลขทุกตัวที่กฎต้องใช้ คำนวณครั้งเดียวต่อหนึ่งช่อง */
interface SlotFrame {
  start: number;
  end: number;
  openAt: number;
  closeAt: number;
  slotMs: number;
  earliest: number;
  latest: number;
}

/**
 * กฎการจองเอง เรียงตามลำดับที่ลูกค้าควรได้ยินเหตุผล
 *
 * เป็นตารางแทนเงื่อนไขก้อนเดียว เพราะหน้าจองต้องบอกได้ว่า "ทำไมจองไม่ได้" เป็นภาษาคน
 * ไม่ใช่แค่ว่าจองไม่ได้ — และตัวกรองช่องว่างกับตัวตรวจตอนจองใช้ตารางเดียวกันนี้
 * ช่องที่หน้าจอแสดงจึงจองผ่านเสมอ ส่วนเวลาที่ไม่มีในหน้าจอก็จองไม่ผ่าน
 */
const BOOKING_RULES: readonly {
  ok: (frame: SlotFrame) => boolean;
  reason: (hours: BusinessHours) => string;
}[] = [
  {
    ok: (f) => f.start >= f.openAt && f.end <= f.closeAt,
    reason: (h) => `ร้านรับจองช่วง ${h.open}–${h.close} น. และนัดต้องจบก่อนร้านปิด`,
  },
  {
    ok: (f) => (f.start - f.openAt) % f.slotMs === 0,
    reason: (h) => `เวลานัดต้องตรงกับช่องละ ${h.slotMinutes} นาที`,
  },
  {
    ok: (f) => f.start >= f.earliest,
    reason: (h) => `ต้องจองล่วงหน้าอย่างน้อย ${h.minLeadMinutes} นาที`,
  },
  {
    ok: (f) => f.start < f.latest,
    reason: (h) => `จองล่วงหน้าได้ไม่เกิน ${h.maxAdvanceDays} วัน`,
  },
];

/**
 * เหตุผลที่ช่องนี้จองเองไม่ได้ หรือ null เมื่อจองได้
 *
 * คิดตามวันปฏิทินไทยของเวลาเริ่มนัด ไทยไม่มีการปรับเวลาตามฤดูกาล เวลาเปิดปิดจึงห่างจาก
 * เที่ยงคืนเท่าเดิมทุกวัน ส่วน maxAdvanceDays นับถึงสิ้นวันที่ครบกำหนด ไม่ใช่ถึงนาทีเดียวกับตอนนี้
 */
export function bookingViolation(slot: TimeSlot, now: Date, hours: BusinessHours): string | null {
  const dayStart = bangkokDayRange(formatBangkokDate(slot.startsAt)).start.getTime();
  const lastDay = formatBangkokDate(new Date(now.getTime() + hours.maxAdvanceDays * DAY_MS));

  const frame: SlotFrame = {
    start: slot.startsAt.getTime(),
    end: slot.endsAt.getTime(),
    openAt: dayStart + minutesOfDay(hours.open) * MINUTE_MS,
    closeAt: dayStart + minutesOfDay(hours.close) * MINUTE_MS,
    slotMs: hours.slotMinutes * MINUTE_MS,
    earliest: now.getTime() + hours.minLeadMinutes * MINUTE_MS,
    latest: bangkokDayRange(lastDay).end.getTime(),
  };

  const broken = BOOKING_RULES.find((rule) => !rule.ok(frame));
  return broken ? broken.reason(hours) : null;
}

/**
 * คัดช่องว่างจากระบบนัด (ซึ่งคืนมาทั้ง 24 ชั่วโมง) ให้เหลือเฉพาะช่องที่ลูกค้าจองเองได้
 */
export function bookableSlots<T extends TimeSlot>(
  slots: readonly T[],
  now: Date,
  hours: BusinessHours,
): T[] {
  return slots.filter((slot) => bookingViolation(slot, now, hours) === null);
}

/** '10:30' → 630 */
function minutesOfDay(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}
