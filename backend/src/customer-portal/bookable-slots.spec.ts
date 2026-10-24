import { BUSINESS_HOURS } from '@clinicq/shared';
import { bookableSlots, bookingViolation, type TimeSlot } from './bookable-slots';

/** เวลาไทยแบบที่คนอ่าน → Date จริง */
const bkk = (local: string): Date => new Date(`${local}:00+07:00`);

const slot = (local: string, minutes = 30): TimeSlot => {
  const startsAt = bkk(local);
  return { startsAt, endsAt: new Date(startsAt.getTime() + minutes * 60_000) };
};

/** เสาร์ 24 ต.ค. 2569 เวลา 09:20 น. ก่อนร้านเปิด */
const NOW = bkk('2026-10-24T09:20');

const bookable = (s: TimeSlot) => bookingViolation(s, NOW, BUSINESS_HOURS) === null;

describe('bookingViolation — กฎการจองเองของลูกค้า', () => {
  it('ไม่รับช่องก่อนร้านเปิด', () => {
    expect(bookable(slot('2026-10-25T09:30'))).toBe(false);
  });

  it('รับช่องแรกตอนร้านเปิดพอดี', () => {
    expect(bookable(slot('2026-10-25T10:00'))).toBe(true);
  });

  it('ไม่รับช่องที่เริ่มตอนร้านปิด', () => {
    expect(bookable(slot('2026-10-25T20:00'))).toBe(false);
  });

  it('ไม่รับนัดที่เริ่มก่อนปิดแต่จบเลยเวลาปิด', () => {
    expect(bookable(slot('2026-10-25T19:30', 60))).toBe(false);
  });

  it('รับช่องที่จบตรงเวลาปิดพอดี', () => {
    expect(bookable(slot('2026-10-25T19:30', 30))).toBe(true);
    expect(bookable(slot('2026-10-25T18:30', 90))).toBe(true);
  });

  it('ไม่รับช่องที่อยู่ในช่วงต้องจองล่วงหน้า และบอกเหตุผลเป็นจำนวนนาที', () => {
    // ตอนนี้ 09:20 ต้องล่วงหน้า 60 นาที ช่องแรกที่จองได้วันนี้จึงเป็น 10:30
    expect(bookingViolation(slot('2026-10-24T10:00'), NOW, BUSINESS_HOURS)).toContain('60 นาที');
    expect(bookable(slot('2026-10-24T10:30'))).toBe(true);
  });

  it('ไม่รับเวลาที่ผ่านไปแล้ว', () => {
    expect(bookable(slot('2026-10-23T15:00'))).toBe(false);
  });

  it('รับถึงสิ้นวันที่ครบ 60 วัน แต่ไม่รับวันถัดไป', () => {
    expect(bookable(slot('2026-12-23T19:00'))).toBe(true);
    expect(bookingViolation(slot('2026-12-24T10:00'), NOW, BUSINESS_HOURS)).toContain('60 วัน');
  });

  it('ไม่รับเวลาที่ไม่ตรงช่อง 30 นาที — ยิง startsAt เองมาได้ทุกค่า', () => {
    expect(bookable(slot('2026-10-25T10:15'))).toBe(false);
  });
});

describe('bookableSlots', () => {
  it('คัดช่องทั้ง 24 ชั่วโมงจากระบบนัดให้เหลือ 10:00–19:30 สำหรับบริการ 30 นาที', () => {
    const dayStart = bkk('2026-10-25T00:00').getTime();
    const allDay: TimeSlot[] = Array.from({ length: 48 }, (_, i) => ({
      startsAt: new Date(dayStart + i * 30 * 60_000),
      endsAt: new Date(dayStart + (i + 1) * 30 * 60_000),
    }));

    const result = bookableSlots(allDay, NOW, BUSINESS_HOURS);

    expect(result).toHaveLength(20);
    expect(result[0]?.startsAt).toEqual(bkk('2026-10-25T10:00'));
    expect(result.at(-1)?.startsAt).toEqual(bkk('2026-10-25T19:30'));
  });
});
