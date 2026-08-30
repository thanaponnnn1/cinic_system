import { DeliveryStatus, MsgType } from '@clinicq/shared';
import { NotificationsController } from './notifications.controller';
import type { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  const sendAppointmentReminder = jest.fn();
  const controller = new NotificationsController({
    sendAppointmentReminder,
  } as unknown as NotificationsService);

  beforeEach(() => sendAppointmentReminder.mockReset());

  it('ส่งข้อความเตือนนัดตามชนิดที่ระบุ แล้วบอกผลว่าส่งจริงหรือถูกข้าม', async () => {
    sendAppointmentReminder.mockResolvedValue(DeliveryStatus.SENT);

    const result = await controller.sendReminder('appt_1', { type: MsgType.REMINDER_1D });

    expect(sendAppointmentReminder).toHaveBeenCalledWith('appt_1', MsgType.REMINDER_1D);
    expect(result).toEqual({ deliveryStatus: DeliveryStatus.SENT });
  });

  it('ใช้ข้อความเตือนล่วงหน้า 1 วันเป็นค่าตั้งต้น เพราะเป็นตัวที่ใช้บ่อยที่สุดหน้าร้าน', async () => {
    sendAppointmentReminder.mockResolvedValue(DeliveryStatus.SENT);

    await controller.sendReminder('appt_1', {});

    expect(sendAppointmentReminder).toHaveBeenCalledWith('appt_1', MsgType.REMINDER_1D);
  });

  it('บอกผลตามจริงเมื่อระบบข้ามการส่งเพราะไม่มีความยินยอม', async () => {
    sendAppointmentReminder.mockResolvedValue(DeliveryStatus.SKIPPED_NO_CONSENT);

    const result = await controller.sendReminder('appt_1', { type: MsgType.REMINDER_2H });

    expect(result).toEqual({ deliveryStatus: DeliveryStatus.SKIPPED_NO_CONSENT });
  });
});
