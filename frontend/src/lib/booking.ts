import { bangkokDayRange, formatBangkokDate, formatBangkokTime } from '@clinicq/shared';
import type { CustomerCourseView, CustomerShop, TimeSlot } from '@/lib/customer-types';

/**
 * ขั้นตอนจองคิวฝั่งลูกค้า เขียนเป็น reducer ล้วน
 *
 * ทุกการเลือกล้างเฉพาะสิ่งที่พึ่งพามันจริง ๆ: เปลี่ยนบริการล้างเวลาและคอร์ส (ความยาวนัด
 * กับคอร์สที่ใช้ได้เปลี่ยน) เปลี่ยนช่างหรือวันล้างแค่เวลา — ลูกค้าย้อนกลับไปแก้ขั้นเดียว
 * โดยไม่ต้องเลือกขั้นอื่นใหม่ทั้งหมด และช่องที่เพิ่งถูกแย่งไปก็ล้างแค่เวลาเช่นกัน
 */

export const BOOKING_STEPS = ['service', 'provider', 'time', 'confirm'] as const;
export type BookingStep = (typeof BOOKING_STEPS)[number];

export const STEP_LABEL: Record<BookingStep, string> = {
  service: 'บริการ',
  provider: 'ช่าง',
  time: 'วันเวลา',
  confirm: 'ยืนยัน',
};

/** 'any' = "ช่างคนไหนก็ได้" ซึ่งลูกค้าเลือกเองจริง ต่างจาก null ใน draft ที่แปลว่ายังไม่ได้เลือก */
export type ProviderChoice = { kind: 'any' } | { kind: 'provider'; id: string };

export interface BookingDraft {
  step: BookingStep;
  serviceId: string | null;
  provider: ProviderChoice | null;
  date: string;
  slot: TimeSlot | null;
  courseId: string | null;
}

export type BookingEvent =
  | { type: 'pickService'; serviceId: string }
  | { type: 'pickProvider'; provider: ProviderChoice }
  | { type: 'pickDate'; date: string }
  | { type: 'pickSlot'; slot: TimeSlot }
  | { type: 'setCourse'; courseId: string | null }
  | { type: 'goTo'; step: BookingStep }
  | { type: 'slotTaken' };

/** ขั้นนี้เข้าได้หรือยัง — ขั้นที่ยังไม่มีข้อมูลก่อนหน้าครบเข้าไม่ได้ */
export function canEnter(step: BookingStep, draft: BookingDraft): boolean {
  switch (step) {
    case 'service':
      return true;
    case 'provider':
      return draft.serviceId !== null;
    case 'time':
      return draft.serviceId !== null && draft.provider !== null;
    case 'confirm':
      return draft.serviceId !== null && draft.provider !== null && draft.slot !== null;
  }
}

/** ขั้นแรกที่ยังขาดข้อมูล — ใช้ตอนเปิดหน้าจองพร้อมของที่เลือกมาจากหน้าอื่นแล้ว */
export function firstOpenStep(draft: BookingDraft): BookingStep {
  if (draft.serviceId === null) return 'service';
  if (draft.provider === null) return 'provider';
  if (draft.slot === null) return 'time';
  return 'confirm';
}

export function bookingReducer(draft: BookingDraft, event: BookingEvent): BookingDraft {
  switch (event.type) {
    case 'pickService': {
      const changed = event.serviceId !== draft.serviceId;
      const next = {
        ...draft,
        serviceId: event.serviceId,
        slot: changed ? null : draft.slot,
        courseId: changed ? null : draft.courseId,
      };
      return { ...next, step: draft.provider ? 'time' : 'provider' };
    }
    case 'pickProvider':
      return { ...draft, provider: event.provider, slot: null, step: 'time' };
    case 'pickDate':
      return event.date === draft.date ? draft : { ...draft, date: event.date, slot: null };
    case 'pickSlot':
      return { ...draft, slot: event.slot, step: 'confirm' };
    case 'setCourse':
      return { ...draft, courseId: event.courseId };
    case 'goTo':
      return canEnter(event.step, draft) ? { ...draft, step: event.step } : draft;
    case 'slotTaken':
      return { ...draft, slot: null, step: 'time' };
  }
}

export function initialDraft(
  preset: { serviceId?: string | null; providerId?: string | null; courseId?: string | null },
  today: string,
): BookingDraft {
  const draft: BookingDraft = {
    step: 'service',
    serviceId: preset.serviceId ?? null,
    provider: preset.providerId ? { kind: 'provider', id: preset.providerId } : null,
    date: today,
    slot: null,
    courseId: preset.courseId ?? null,
  };
  return { ...draft, step: firstOpenStep(draft) };
}

/** ของที่เลือกมาทาง URL ตามที่พิมพ์มา ยังไม่รู้ว่ามีอยู่จริงไหม */
export interface BookingPreset {
  service: string | null;
  provider: string | null;
  course: string | null;
}

/**
 * หาบริการหรือช่างจากค่าใน URL — ลิงก์ในแอปส่ง id ลิงก์จากเว็บร้านส่ง slug
 *
 * เทียบ id ก่อนเสมอ ลิงก์ในแอปจะได้ไม่มีวันไปโดนแถวอื่นที่บังเอิญตั้ง slug ตรงกับ id นั้น
 */
export function findByRef<T extends { id: string; slug: string | null }>(
  items: readonly T[],
  ref: string | null,
): T | null {
  if (!ref) return null;
  return items.find((item) => item.id === ref) ?? items.find((item) => item.slug === ref) ?? null;
}

/**
 * แปลงของที่เลือกมาทาง URL เป็น id ที่มีอยู่จริง ตัวที่หาไม่เจอทิ้งไปเฉย ๆ
 *
 * slug ผิดหรือบริการที่ร้านปิดไปแล้วต้องไม่ทำให้หน้าว่าง ลูกค้าได้ขั้นเลือกบริการตามปกติแทน
 * คอร์สที่ผูกบริการไว้เลือกบริการนั้นให้เลย ลูกค้ากด "จองโดยใช้คอร์สนี้" แล้วไม่ต้องหาบริการเอง
 */
export function resolvePreset(
  preset: BookingPreset,
  shop: Pick<CustomerShop, 'services' | 'providers'>,
  courses: readonly CustomerCourseView[],
): { serviceId: string | null; providerId: string | null; courseId: string | null } {
  const course = courses.find((c) => c.id === preset.course) ?? null;
  const service = findByRef(shop.services, preset.service ?? course?.serviceId ?? null);
  const provider = findByRef(shop.providers, preset.provider);
  const courseUsable =
    course !== null && service !== null && usableCourses([course], service.id).length > 0;

  return {
    serviceId: service?.id ?? null,
    providerId: provider?.id ?? null,
    courseId: courseUsable ? course.id : null,
  };
}

/**
 * คอร์สที่ใช้จองบริการนี้ได้
 *
 * กรองตามสถานะที่ backend คิดมาให้ ไม่คำนวณวันหมดอายุซ้ำเอง — คอร์สที่ไม่ผูกบริการใช้ได้ทุกบริการ
 * ตามที่ร้านตั้งไว้ backend อาจยังปฏิเสธถ้าครั้งที่เหลือถูกนัดอื่นจองไว้หมดแล้ว ซึ่งหน้านี้มองไม่เห็น
 */
export function usableCourses(
  courses: readonly CustomerCourseView[],
  serviceId: string,
): CustomerCourseView[] {
  return courses.filter(
    (course) =>
      (course.status === 'ACTIVE' || course.status === 'EXPIRING_SOON') &&
      course.remainingSessions > 0 &&
      (course.serviceId === null || course.serviceId === serviceId),
  );
}

// ── วันและช่วงเวลา ─────────────────────────────────────────

const DAY_MS = 86_400_000;
const SHORT_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'] as const;
const SHORT_MONTHS = [
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

export interface DateChip {
  date: string;
  weekday: string;
  day: number;
  month: string;
  isToday: boolean;
}

/** วันตามปฏิทินไทยนับจากวันนี้ — ใช้ปฏิทินไทยเสมอ ไม่ใช่เขตเวลาของมือถือ */
export function upcomingDays(now: Date, count: number): DateChip[] {
  const today = formatBangkokDate(now);
  const start = bangkokDayRange(today).start.getTime();

  return Array.from({ length: count }, (_, index) => {
    // เที่ยงวันของแต่ละวันกันพลาดข้ามวันจากการปัดเศษ
    const noon = new Date(start + index * DAY_MS + DAY_MS / 2);
    const date = formatBangkokDate(noon);
    const [year, month, day] = date.split('-').map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

    return {
      date,
      weekday: SHORT_DAYS[weekday],
      day,
      month: SHORT_MONTHS[month - 1],
      isToday: index === 0,
    };
  });
}

export type DayPeriod = 'morning' | 'afternoon' | 'evening';

export const PERIOD_LABEL: Record<DayPeriod, string> = {
  morning: 'ช่วงเช้า',
  afternoon: 'ช่วงบ่าย',
  evening: 'ช่วงเย็น',
};

/** เช้า = ก่อนเที่ยง · บ่าย = เที่ยงถึงก่อนห้าโมงเย็น · เย็น = ห้าโมงเย็นขึ้นไป ตามเวลาไทย */
export function periodOf(slot: TimeSlot): DayPeriod {
  const hour = Number(formatBangkokTime(new Date(slot.startsAt)).slice(0, 2));
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function groupSlotsByPeriod(slots: readonly TimeSlot[]): [DayPeriod, TimeSlot[]][] {
  const groups: Record<DayPeriod, TimeSlot[]> = { morning: [], afternoon: [], evening: [] };
  for (const slot of slots) groups[periodOf(slot)].push(slot);

  return (Object.keys(groups) as DayPeriod[])
    .map((period): [DayPeriod, TimeSlot[]] => [period, groups[period]])
    .filter(([, list]) => list.length > 0);
}
