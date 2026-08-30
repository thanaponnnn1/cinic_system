import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ApptStatus } from '@clinicq/shared';
import { LineWebhookService } from './line-webhook.service';
import { LineMessagingService } from './line-messaging.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { PostbackAction, encodePostback } from './postback-data';
import type { LineWebhookEvent } from './line-webhook.types';

function postbackEvent(data: string, lineUserId = 'Uline1'): LineWebhookEvent {
  return {
    type: 'postback',
    replyToken: 'reply-token-1',
    source: { type: 'user', userId: lineUserId },
    postback: { data },
  } as LineWebhookEvent;
}

const OK_RESULT = {
  status: 'ok' as const,
  appointment: {
    id: 'appt_1',
    startsAt: new Date('2026-09-02T03:30:00.000Z'),
    providerName: 'คุณแอน',
    serviceName: 'ทรีตเมนต์ผิวหน้า',
    customerId: 'cus_1',
  },
};

describe('LineWebhookService — ปุ่มยืนยัน/ขอเลื่อนในแชท', () => {
  let service: LineWebhookService;

  const appointments = { confirmFromLine: jest.fn(), requestRescheduleFromLine: jest.fn() };
  const line = { replyText: jest.fn(), pushText: jest.fn() };
  let adminUserId: string | undefined;

  const confirmData = encodePostback({
    action: PostbackAction.CONFIRM,
    appointmentId: 'appt_1',
  });
  const rescheduleData = encodePostback({
    action: PostbackAction.RESCHEDULE,
    appointmentId: 'appt_1',
  });

  beforeEach(async () => {
    [...Object.values(appointments), ...Object.values(line)].forEach((fn) => fn.mockReset());
    adminUserId = 'Uadmin';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineWebhookService,
        {
          provide: PrismaService,
          useValue: {
            customer: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
            messageLog: { create: jest.fn() },
          },
        },
        { provide: LineMessagingService, useValue: line },
        { provide: AppointmentsService, useValue: appointments },
        { provide: ConfigService, useValue: { get: () => adminUserId } },
      ],
    }).compile();

    service = module.get(LineWebhookService);
  });

  it('ส่ง appointmentId และบัญชี LINE ที่กด ไปให้ระบบนัดตรวจสิทธิ์เอง', async () => {
    appointments.confirmFromLine.mockResolvedValue(OK_RESULT);

    await service.handleEvents([postbackEvent(confirmData)]);

    expect(appointments.confirmFromLine).toHaveBeenCalledWith('appt_1', 'Uline1');
  });

  it('ยืนยันสำเร็จแล้วตอบในแชทพร้อมวันเวลาที่นัดไว้', async () => {
    appointments.confirmFromLine.mockResolvedValue(OK_RESULT);

    await service.handleEvents([postbackEvent(confirmData)]);

    const reply = line.replyText.mock.calls[0][1] as string;
    expect(reply).toContain('ยืนยัน');
    expect(reply).toContain('10:30');
  });

  it('ขอเลื่อนสำเร็จแล้วบอกลูกค้าว่าทางร้านจะติดต่อกลับ', async () => {
    appointments.requestRescheduleFromLine.mockResolvedValue(OK_RESULT);

    await service.handleEvents([postbackEvent(rescheduleData)]);

    expect(line.replyText.mock.calls[0][1]).toContain('ติดต่อกลับ');
  });

  it('ขอเลื่อนแล้วต้องเด้งบอกแอดมินร้านทันที ไม่งั้นไม่มีใครรู้ว่าต้องโทรกลับ', async () => {
    appointments.requestRescheduleFromLine.mockResolvedValue(OK_RESULT);

    await service.handleEvents([postbackEvent(rescheduleData)]);

    const [to, text] = line.pushText.mock.calls[0];
    expect(to).toBe('Uadmin');
    expect(text).toContain('10:30');
    expect(text).toContain('คุณแอน');
  });

  it('ยืนยันนัดไม่ต้องรบกวนแอดมิน — เด้งเฉพาะเรื่องที่ต้องลงมือทำ', async () => {
    appointments.confirmFromLine.mockResolvedValue(OK_RESULT);

    await service.handleEvents([postbackEvent(confirmData)]);

    expect(line.pushText).not.toHaveBeenCalled();
  });

  it('ยังตอบลูกค้าได้ตามปกติแม้ยังไม่ได้ตั้ง LINE_ADMIN_USER_ID', async () => {
    adminUserId = undefined;
    appointments.requestRescheduleFromLine.mockResolvedValue(OK_RESULT);

    const module = await Test.createTestingModule({
      providers: [
        LineWebhookService,
        {
          provide: PrismaService,
          useValue: { customer: {}, messageLog: {} },
        },
        { provide: LineMessagingService, useValue: line },
        { provide: AppointmentsService, useValue: appointments },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    await module.get(LineWebhookService).handleEvents([postbackEvent(rescheduleData)]);

    expect(line.pushText).not.toHaveBeenCalled();
    expect(line.replyText).toHaveBeenCalled();
  });

  it('กดปุ่มเดิมซ้ำ ตอบสถานะปัจจุบันแทนการขึ้น error', async () => {
    appointments.confirmFromLine.mockResolvedValue({
      status: 'unchanged',
      current: ApptStatus.CONFIRMED,
    });

    await service.handleEvents([postbackEvent(confirmData)]);

    expect(line.replyText.mock.calls[0][1]).toContain('ยืนยันไว้แล้ว');
  });

  it('กดขอเลื่อนหลังยืนยันไปแล้ว บอกให้ติดต่อร้านแทน เพราะกฎไม่ให้เปลี่ยนตรง ๆ', async () => {
    appointments.requestRescheduleFromLine.mockResolvedValue({
      status: 'invalid',
      current: ApptStatus.CONFIRMED,
    });

    await service.handleEvents([postbackEvent(rescheduleData)]);

    expect(line.replyText.mock.calls[0][1]).toContain('ติดต่อ');
  });

  it('ปุ่มของนัดที่ไม่ใช่ของบัญชีนี้ ตอบกลาง ๆ ไม่บอกว่ามีนัดนั้นอยู่จริง', async () => {
    appointments.confirmFromLine.mockResolvedValue({ status: 'forbidden' });

    await service.handleEvents([postbackEvent(confirmData)]);

    const reply = line.replyText.mock.calls[0][1] as string;
    expect(reply).not.toContain('appt_1');
    expect(reply.length).toBeGreaterThan(0);
  });

  it('นัดถูกลบไปแล้ว ตอบว่าหาไม่พบ', async () => {
    appointments.confirmFromLine.mockResolvedValue({ status: 'not_found' });

    await service.handleEvents([postbackEvent(confirmData)]);

    expect(line.replyText).toHaveBeenCalled();
  });

  it('data ที่แต่งขึ้นเอง ต้องไม่ถูกส่งต่อไปแตะฐานข้อมูล', async () => {
    await service.handleEvents([postbackEvent('action=ลบนัด&appointmentId=appt_1')]);

    expect(appointments.confirmFromLine).not.toHaveBeenCalled();
    expect(appointments.requestRescheduleFromLine).not.toHaveBeenCalled();
    expect(line.replyText).toHaveBeenCalled();
  });
});
