import {
  bangkokDayRange,
  formatBangkokDate,
  formatBangkokDateTime,
  formatBangkokTime,
} from './bangkok-time';

describe('bangkok-time', () => {
  describe('bangkokDayRange', () => {
    it('เริ่มที่เที่ยงคืนเวลาไทย ซึ่งคือ 17:00 UTC ของวันก่อนหน้า', () => {
      const { start, end } = bangkokDayRange('2026-09-01');

      expect(start.toISOString()).toBe('2026-08-31T17:00:00.000Z');
      expect(end.toISOString()).toBe('2026-09-01T17:00:00.000Z');
    });

    it('ครอบพอดี 24 ชั่วโมง', () => {
      const { start, end } = bangkokDayRange('2026-09-01');

      expect(end.getTime() - start.getTime()).toBe(86_400_000);
    });

    it('ข้ามปีได้ถูกต้อง', () => {
      const { start } = bangkokDayRange('2027-01-01');

      expect(start.toISOString()).toBe('2026-12-31T17:00:00.000Z');
    });

    it.each(['1 ก.ย. 2026', '2026-9-1', '2026/09/01', 'พรุ่งนี้', ''])(
      'ปฏิเสธรูปแบบที่ไม่ใช่ YYYY-MM-DD: "%s"',
      (input) => {
        expect(() => bangkokDayRange(input)).toThrow();
      },
    );
  });

  describe('การแสดงผล', () => {
    // 2026-09-01 10:30 เวลาไทย = 03:30 UTC
    const t = new Date('2026-09-01T03:30:00.000Z');

    it('แสดงวันที่ตามปฏิทินไทย', () => {
      expect(formatBangkokDate(t)).toBe('2026-09-01');
    });

    it('แสดงเวลาไทย', () => {
      expect(formatBangkokTime(t)).toBe('10:30');
    });

    it('แสดงวันและเวลาไทยพร้อมกัน', () => {
      expect(formatBangkokDateTime(t)).toBe('2026-09-01 10:30');
    });

    it('นับเป็นวันถัดไปเมื่อข้ามเที่ยงคืนเวลาไทย', () => {
      // 18:00 UTC = 01:00 เวลาไทยของวันถัดไป
      const late = new Date('2026-09-01T18:00:00.000Z');

      expect(formatBangkokDate(late)).toBe('2026-09-02');
      expect(formatBangkokTime(late)).toBe('01:00');
    });

    it('ยังนับเป็นวันเดิมเมื่อยังไม่ถึงเที่ยงคืนเวลาไทย', () => {
      // 16:59 UTC = 23:59 เวลาไทยของวันเดียวกัน
      const almost = new Date('2026-09-01T16:59:00.000Z');

      expect(formatBangkokDate(almost)).toBe('2026-09-01');
      expect(formatBangkokTime(almost)).toBe('23:59');
    });
  });
});
