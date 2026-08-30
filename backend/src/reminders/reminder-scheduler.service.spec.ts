import { MsgType } from '@clinicq/shared';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import type { ClockService } from '../clock/clock.service';

const HOUR = 3_600_000;
const NOW = new Date('2026-09-01T03:00:00.000Z');

describe('ReminderSchedulerService', () => {
  const queue = { add: jest.fn(), remove: jest.fn() };
  const clock = { now: () => NOW } as unknown as ClockService;
  let scheduler: ReminderSchedulerService;

  beforeEach(() => {
    queue.add.mockReset().mockResolvedValue({ id: 'job' });
    queue.remove.mockReset().mockResolvedValue(1);
    scheduler = new ReminderSchedulerService(queue as never, clock);
  });

  it('ตั้งงานเตือน 2 ใบให้นัดพรุ่งนี้ พร้อม jobId ที่ผูกกับนัด', async () => {
    await scheduler.sync('appt_1', new Date(NOW.getTime() + 30 * HOUR));

    const jobIds = queue.add.mock.calls.map((call) => call[2].jobId);
    expect(jobIds).toEqual(['appt_1-REMINDER_1D', 'appt_1-REMINDER_2H']);
  });

  it('ส่ง appointmentId กับชนิดข้อความไปกับงาน เพราะ worker ต้องใช้ตัดสินใจตอนถึงเวลา', async () => {
    await scheduler.sync('appt_1', new Date(NOW.getTime() + 30 * HOUR));

    expect(queue.add.mock.calls[0][1]).toEqual({
      appointmentId: 'appt_1',
      type: MsgType.REMINDER_1D,
    });
  });

  it('หน่วงงานตามเวลาที่ ClockService บอก ไม่ใช่เวลาจริงของเครื่อง — ปุ่มข้ามเวลาจึงมีผลจริง', async () => {
    await scheduler.sync('appt_1', new Date(NOW.getTime() + 30 * HOUR));

    expect(queue.add.mock.calls[0][2].delay).toBe(6 * HOUR);
  });

  it('ลบงานเก่าก่อนตั้งใหม่เสมอ — เลื่อนนัดแล้วงานของเวลาเดิมต้องไม่ค้างอยู่', async () => {
    await scheduler.sync('appt_1', new Date(NOW.getTime() + 30 * HOUR));

    expect(queue.remove).toHaveBeenCalledWith('appt_1-REMINDER_1D');
    expect(queue.remove).toHaveBeenCalledWith('appt_1-REMINDER_2H');
    expect(queue.remove.mock.invocationCallOrder[0]).toBeLessThan(
      queue.add.mock.invocationCallOrder[0],
    );
  });

  it('นัดที่จองกระชั้นตั้งเฉพาะงานที่ยังส่งทัน', async () => {
    await scheduler.sync('appt_1', new Date(NOW.getTime() + 3 * HOUR));

    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add.mock.calls[0][2].jobId).toBe('appt_1-REMINDER_2H');
  });

  it('ยกเลิกนัดแล้วลบงานทั้งสองใบ ไม่งั้นลูกค้าได้ข้อความเตือนนัดที่ยกเลิกไปแล้ว', async () => {
    await scheduler.cancel('appt_1');

    expect(queue.remove).toHaveBeenCalledWith('appt_1-REMINDER_1D');
    expect(queue.remove).toHaveBeenCalledWith('appt_1-REMINDER_2H');
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('ลบงานที่ไม่มีอยู่แล้วต้องไม่ทำให้การสร้างนัดล้ม', async () => {
    queue.remove.mockRejectedValue(new Error('job not found'));

    await expect(
      scheduler.sync('appt_1', new Date(NOW.getTime() + 30 * HOUR)),
    ).resolves.not.toThrow();
    expect(queue.add).toHaveBeenCalledTimes(2);
  });

  it('ตั้งงานไม่สำเร็จต้องไม่ทำให้การสร้างนัดล้ม — นัดสำคัญกว่าข้อความเตือน', async () => {
    queue.add.mockRejectedValue(new Error('Redis ล่ม'));

    await expect(
      scheduler.sync('appt_1', new Date(NOW.getTime() + 30 * HOUR)),
    ).resolves.not.toThrow();
  });
});
