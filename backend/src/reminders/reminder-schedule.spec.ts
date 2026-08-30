import { MsgType } from '@clinicq/shared';
import { plannedReminders, reminderJobId } from './reminder-schedule';

const HOUR = 3_600_000;
const NOW = new Date('2026-09-01T03:00:00.000Z'); // 10:00 น. ตามเวลาไทย

describe('reminderJobId', () => {
  it('ผูกกับนัดและชนิดข้อความ — id ซ้ำแปลว่า BullMQ ไม่รับงานซ้ำ กันส่งซ้ำโดยโครงสร้าง', () => {
    expect(reminderJobId('appt_1', MsgType.REMINDER_1D)).toBe('appt_1-REMINDER_1D');
  });

  it('ห้ามมีเครื่องหมาย : เพราะ BullMQ ปฏิเสธ jobId ที่มีตัวนี้ (เจอตอนรันจริง)', () => {
    expect(reminderJobId('appt_1', MsgType.REMINDER_2H)).not.toContain(':');
  });

  it('คนละชนิดต้องได้คนละ id ไม่งั้นเตือน 2 ชั่วโมงจะไปทับเตือน 1 วัน', () => {
    expect(reminderJobId('appt_1', MsgType.REMINDER_1D)).not.toBe(
      reminderJobId('appt_1', MsgType.REMINDER_2H),
    );
  });
});

describe('plannedReminders', () => {
  it('นัดพรุ่งนี้ได้งานเตือน 2 ตัว ล่วงหน้า 1 วัน และก่อนถึงเวลา 2 ชั่วโมง', () => {
    const startsAt = new Date(NOW.getTime() + 30 * HOUR);

    const jobs = plannedReminders(startsAt, NOW);

    expect(jobs.map((j) => j.type)).toEqual([MsgType.REMINDER_1D, MsgType.REMINDER_2H]);
    expect(jobs[0].runAt).toEqual(new Date(startsAt.getTime() - 24 * HOUR));
    expect(jobs[1].runAt).toEqual(new Date(startsAt.getTime() - 2 * HOUR));
  });

  it('บอก delay เป็นมิลลิวินาทีนับจากตอนนี้ เพราะ BullMQ รับเป็น delay ไม่ใช่เวลาปลายทาง', () => {
    const startsAt = new Date(NOW.getTime() + 30 * HOUR);

    expect(plannedReminders(startsAt, NOW)[0].delayMs).toBe(6 * HOUR);
  });

  it('นัดที่จองกระชั้น ข้ามงานที่เลยเวลาไปแล้ว เหลือเฉพาะตัวที่ยังส่งทัน', () => {
    const startsAt = new Date(NOW.getTime() + 3 * HOUR);

    expect(plannedReminders(startsAt, NOW).map((j) => j.type)).toEqual([MsgType.REMINDER_2H]);
  });

  it('นัดที่เหลือไม่ถึง 2 ชั่วโมง ไม่ต้องตั้งงานเลย — เตือนตอนนั้นไม่ทันแล้ว', () => {
    expect(plannedReminders(new Date(NOW.getTime() + HOUR), NOW)).toEqual([]);
  });

  it('นัดที่ผ่านไปแล้วไม่ตั้งงานย้อนหลัง', () => {
    expect(plannedReminders(new Date(NOW.getTime() - HOUR), NOW)).toEqual([]);
  });
});
