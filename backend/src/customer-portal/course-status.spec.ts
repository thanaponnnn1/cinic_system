import { CourseStatus, courseStatus } from './course-status';

const NOW = new Date('2026-10-24T03:00:00.000Z');
const inDays = (days: number) => new Date(NOW.getTime() + days * 86_400_000);

describe('courseStatus', () => {
  it('ใช้ครบแล้วเป็น USED_UP แม้จะเหลืออายุอีกไม่กี่วัน — ต้องไม่ถูกทวงว่าใกล้หมดอายุ', () => {
    expect(courseStatus({ usedSessions: 5, totalSessions: 5, expiresAt: inDays(5) }, NOW)).toBe(
      CourseStatus.USED_UP,
    );
  });

  it('ใช้ครบแล้วเป็น USED_UP แม้จะหมดอายุไปแล้ว', () => {
    expect(courseStatus({ usedSessions: 5, totalSessions: 5, expiresAt: inDays(-3) }, NOW)).toBe(
      CourseStatus.USED_UP,
    );
  });

  it('หมดอายุทั้งที่ยังมีครั้งเหลือเป็น EXPIRED', () => {
    expect(courseStatus({ usedSessions: 2, totalSessions: 5, expiresAt: inDays(-1) }, NOW)).toBe(
      CourseStatus.EXPIRED,
    );
  });

  it('หมดอายุตรงเวลานี้พอดีถือว่าหมดแล้ว', () => {
    expect(courseStatus({ usedSessions: 0, totalSessions: 5, expiresAt: NOW }, NOW)).toBe(
      CourseStatus.EXPIRED,
    );
  });

  it('เหลือไม่เกิน 30 วันเป็น EXPIRING_SOON', () => {
    expect(courseStatus({ usedSessions: 1, totalSessions: 5, expiresAt: inDays(30) }, NOW)).toBe(
      CourseStatus.EXPIRING_SOON,
    );
  });

  it('เหลือเกิน 30 วันเป็น ACTIVE', () => {
    expect(courseStatus({ usedSessions: 1, totalSessions: 5, expiresAt: inDays(31) }, NOW)).toBe(
      CourseStatus.ACTIVE,
    );
  });
});
