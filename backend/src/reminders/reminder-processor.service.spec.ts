import { NotFoundException } from '@nestjs/common';
import { DeliveryStatus, MsgType } from '@clinicq/shared';
import { ReminderProcessorService } from './reminder-processor.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { ClockService } from '../clock/clock.service';

describe('ReminderProcessorService', () => {
  const notifications = { sendAppointmentReminder: jest.fn() };
  const clock = { refresh: jest.fn() };
  let processor: ReminderProcessorService;

  beforeEach(() => {
    notifications.sendAppointmentReminder.mockReset().mockResolvedValue(DeliveryStatus.SENT);
    clock.refresh.mockReset().mockResolvedValue(0);
    processor = new ReminderProcessorService(
      notifications as unknown as NotificationsService,
      clock as unknown as ClockService,
    );
  });

  it('ส่งข้อความตามนัดและชนิดที่ระบุไว้ในงาน', async () => {
    await processor.process({ appointmentId: 'appt_1', type: MsgType.REMINDER_1D });

    expect(notifications.sendAppointmentReminder).toHaveBeenCalledWith(
      'appt_1',
      MsgType.REMINDER_1D,
    );
  });

  it('ซิงก์เวลากับ store ก่อนทำงานเสมอ — worker คนละโปรเซสต้องเห็นเวลาที่ถูกข้ามมาแล้ว', async () => {
    await processor.process({ appointmentId: 'appt_1', type: MsgType.REMINDER_2H });

    expect(clock.refresh.mock.invocationCallOrder[0]).toBeLessThan(
      notifications.sendAppointmentReminder.mock.invocationCallOrder[0],
    );
  });

  it('คืนผลการส่งไว้ให้เห็นในหน้าจอคิว', async () => {
    notifications.sendAppointmentReminder.mockResolvedValue(DeliveryStatus.SKIPPED_NO_CONSENT);

    await expect(
      processor.process({ appointmentId: 'appt_1', type: MsgType.REMINDER_1D }),
    ).resolves.toBe(DeliveryStatus.SKIPPED_NO_CONSENT);
  });

  it('นัดถูกลบไปแล้วถือว่างานจบ ไม่ retry — ลองใหม่กี่ครั้งนัดก็ไม่กลับมา', async () => {
    notifications.sendAppointmentReminder.mockRejectedValue(new NotFoundException('ไม่พบนัด'));

    await expect(
      processor.process({ appointmentId: 'appt_1', type: MsgType.REMINDER_1D }),
    ).resolves.toBeNull();
  });

  it('ข้อผิดพลาดชั่วคราวต้องโยนต่อ เพื่อให้คิวลองส่งใหม่ตามรอบ retry', async () => {
    notifications.sendAppointmentReminder.mockRejectedValue(new Error('LINE API ล่ม'));

    await expect(
      processor.process({ appointmentId: 'appt_1', type: MsgType.REMINDER_1D }),
    ).rejects.toThrow('LINE API ล่ม');
  });
});
