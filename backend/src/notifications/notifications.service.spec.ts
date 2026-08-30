import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ApptStatus, DeliveryStatus, MsgType } from '@clinicq/shared';
import { NotificationsService } from './notifications.service';
import { NOTIFICATION_CHANNEL } from './notification-channel';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationsService — เตือนนัด', () => {
  let service: NotificationsService;

  const appointment = {
    id: 'appt_1',
    status: ApptStatus.BOOKED,
    startsAt: new Date('2026-09-02T03:30:00.000Z'),
    customer: {
      id: 'cus_1',
      name: 'สมหญิง ใจดี',
      lineUserId: 'Uline1',
      consentReminder: true,
    },
    provider: { name: 'คุณแอน' },
    service: { name: 'ทรีตเมนต์ผิวหน้า' },
  };

  const appointmentDb = { findUnique: jest.fn() };
  const messageLogDb = { findFirst: jest.fn(), create: jest.fn() };
  const channel = { send: jest.fn() };

  beforeEach(async () => {
    [appointmentDb.findUnique, messageLogDb.findFirst, messageLogDb.create, channel.send].forEach(
      (fn) => fn.mockReset(),
    );
    appointmentDb.findUnique.mockResolvedValue(appointment);
    messageLogDb.findFirst.mockResolvedValue(null);
    channel.send.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: { appointment: appointmentDb, messageLog: messageLogDb },
        },
        { provide: NOTIFICATION_CHANNEL, useValue: channel },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('ส่งข้อความไปยังบัญชี LINE ของลูกค้า พร้อมปุ่มยืนยัน/ขอเลื่อน', async () => {
    const result = await service.sendAppointmentReminder('appt_1', MsgType.REMINDER_1D);

    expect(result).toBe(DeliveryStatus.SENT);
    const [to, message] = channel.send.mock.calls[0];
    expect(to).toBe('Uline1');
    expect(JSON.stringify(message)).toContain('ยืนยันนัด');
  });

  it('บันทึก MessageLog ผูกกับนัดและชนิดข้อความ เพื่อตรวจย้อนหลังได้', async () => {
    await service.sendAppointmentReminder('appt_1', MsgType.REMINDER_1D);

    expect(messageLogDb.create).toHaveBeenCalledWith({
      data: {
        customerId: 'cus_1',
        appointmentId: 'appt_1',
        type: MsgType.REMINDER_1D,
        deliveryStatus: DeliveryStatus.SENT,
        errorMessage: null,
      },
    });
  });

  it('ไม่ส่งเมื่อลูกค้ายังไม่ได้ผูกบัญชี LINE แต่ต้องบันทึกไว้ว่าข้ามเพราะเหตุนี้', async () => {
    appointmentDb.findUnique.mockResolvedValue({
      ...appointment,
      customer: { ...appointment.customer, lineUserId: null },
    });

    const result = await service.sendAppointmentReminder('appt_1', MsgType.REMINDER_1D);

    expect(channel.send).not.toHaveBeenCalled();
    expect(result).toBe(DeliveryStatus.SKIPPED_NO_LINE);
    expect(messageLogDb.create.mock.calls[0][0].data.deliveryStatus).toBe(
      DeliveryStatus.SKIPPED_NO_LINE,
    );
  });

  it('ไม่ส่งเมื่อลูกค้าไม่ได้ให้ความยินยอมรับการเตือนนัด — หลักฐาน PDPA อยู่ใน MessageLog', async () => {
    appointmentDb.findUnique.mockResolvedValue({
      ...appointment,
      customer: { ...appointment.customer, consentReminder: false },
    });

    const result = await service.sendAppointmentReminder('appt_1', MsgType.REMINDER_1D);

    expect(channel.send).not.toHaveBeenCalled();
    expect(result).toBe(DeliveryStatus.SKIPPED_NO_CONSENT);
    expect(messageLogDb.create.mock.calls[0][0].data.deliveryStatus).toBe(
      DeliveryStatus.SKIPPED_NO_CONSENT,
    );
  });

  it('ไม่ส่งซ้ำเมื่อข้อความชนิดเดียวกันของนัดนี้ส่งสำเร็จไปแล้ว', async () => {
    messageLogDb.findFirst.mockResolvedValue({ id: 'log_1' });

    const result = await service.sendAppointmentReminder('appt_1', MsgType.REMINDER_1D);

    expect(channel.send).not.toHaveBeenCalled();
    expect(result).toBe(DeliveryStatus.SKIPPED_DUPLICATE);
  });

  it('บันทึก FAILED พร้อมเหตุผลเมื่อส่งไม่ออก จะได้รู้ว่าคิวไหนไม่ได้รับการเตือน', async () => {
    channel.send.mockResolvedValue(false);

    const result = await service.sendAppointmentReminder('appt_1', MsgType.REMINDER_1D);

    expect(result).toBe(DeliveryStatus.FAILED);
    expect(messageLogDb.create.mock.calls[0][0].data.deliveryStatus).toBe(DeliveryStatus.FAILED);
  });

  it('ไม่เตือนนัดที่ยกเลิกไปแล้ว', async () => {
    appointmentDb.findUnique.mockResolvedValue({ ...appointment, status: ApptStatus.CANCELLED });

    const result = await service.sendAppointmentReminder('appt_1', MsgType.REMINDER_1D);

    expect(channel.send).not.toHaveBeenCalled();
    expect(result).toBe(DeliveryStatus.SKIPPED_DUPLICATE);
  });

  it('แจ้งชัดเจนเมื่อไม่พบนัด', async () => {
    appointmentDb.findUnique.mockResolvedValue(null);

    await expect(service.sendAppointmentReminder('ไม่มีจริง', MsgType.REMINDER_1D)).rejects.toThrow(
      NotFoundException,
    );
  });
});
