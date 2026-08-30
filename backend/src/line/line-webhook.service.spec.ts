import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DeliveryStatus, MsgType } from '@clinicq/shared';
import { LineWebhookService } from './line-webhook.service';
import { LineMessagingService } from './line-messaging.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import type { LineWebhookEvent } from './line-webhook.types';

/** event ข้อความจากลูกค้า ตัดให้เหลือเฉพาะฟิลด์ที่ handler ใช้จริง */
function textEvent(text: string, lineUserId = 'Uline1'): LineWebhookEvent {
  return {
    type: 'message',
    replyToken: 'reply-token-1',
    source: { type: 'user', userId: lineUserId },
    message: { type: 'text', text },
  } as LineWebhookEvent;
}

describe('LineWebhookService — ผูกบัญชีด้วยรหัส 6 หลัก', () => {
  let service: LineWebhookService;

  const customer = {
    id: 'cus_1',
    name: 'สมหญิง ใจดี',
    lineUserId: null as string | null,
    linkCode: '482913' as string | null,
  };

  const customerDb = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const messageLogDb = { create: jest.fn() };
  const line = { replyText: jest.fn(), pushText: jest.fn() };

  beforeEach(async () => {
    [...Object.values(customerDb), messageLogDb.create, ...Object.values(line)].forEach((fn) =>
      fn.mockReset(),
    );
    customerDb.findUnique.mockResolvedValue(null);
    customerDb.update.mockResolvedValue({ ...customer, lineUserId: 'Uline1', linkCode: null });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineWebhookService,
        {
          provide: PrismaService,
          useValue: { customer: customerDb, messageLog: messageLogDb },
        },
        { provide: LineMessagingService, useValue: line },
        {
          provide: AppointmentsService,
          useValue: { confirmFromLine: jest.fn(), requestRescheduleFromLine: jest.fn() },
        },
        { provide: ConfigService, useValue: { get: () => 'Uadmin' } },
      ],
    }).compile();

    service = module.get(LineWebhookService);
  });

  it('ผูก lineUserId เข้ากับลูกค้าที่ถือรหัสนั้น แล้วล้างรหัสทิ้งเพราะใช้ได้ครั้งเดียว', async () => {
    customerDb.findFirst.mockResolvedValue(customer);

    await service.handleEvents([textEvent('482913')]);

    expect(customerDb.update).toHaveBeenCalledWith({
      where: { id: 'cus_1' },
      data: { lineUserId: 'Uline1', linkCode: null },
    });
  });

  it('ตอบยืนยันในแชทด้วยชื่อลูกค้า เพื่อให้รู้ทันทีว่าผูกถูกคน', async () => {
    customerDb.findFirst.mockResolvedValue(customer);

    await service.handleEvents([textEvent('482913')]);

    expect(line.replyText).toHaveBeenCalledWith(
      'reply-token-1',
      expect.stringContaining('สมหญิง ใจดี'),
    );
  });

  it('บันทึก MessageLog ว่าเป็นการยืนยันการเชื่อมบัญชีที่ส่งสำเร็จ', async () => {
    customerDb.findFirst.mockResolvedValue(customer);

    await service.handleEvents([textEvent('482913')]);

    expect(messageLogDb.create).toHaveBeenCalledWith({
      data: {
        customerId: 'cus_1',
        type: MsgType.LINK_CONFIRM,
        deliveryStatus: DeliveryStatus.SENT,
      },
    });
  });

  it('รหัสที่ไม่มีในระบบ ต้องไม่แตะข้อมูลลูกค้า และตอบว่ารหัสใช้ไม่ได้', async () => {
    customerDb.findFirst.mockResolvedValue(null);

    await service.handleEvents([textEvent('111111')]);

    expect(customerDb.update).not.toHaveBeenCalled();
    expect(line.replyText).toHaveBeenCalledWith('reply-token-1', expect.stringContaining('รหัส'));
  });

  it('ปฏิเสธเมื่อบัญชี LINE นี้ถูกผูกกับลูกค้าคนอื่นไปแล้ว — กันประวัติสองคนปนกัน', async () => {
    customerDb.findFirst.mockResolvedValue(customer);
    customerDb.findUnique.mockResolvedValue({ id: 'cus_other', name: 'สมชาย' });

    await service.handleEvents([textEvent('482913')]);

    expect(customerDb.update).not.toHaveBeenCalled();
    expect(line.replyText).toHaveBeenCalledWith('reply-token-1', expect.any(String));
  });

  it('ข้อความที่ไม่มีรหัส ตอบข้อความ default โดยไม่ไปค้นฐานข้อมูล', async () => {
    await service.handleEvents([textEvent('สวัสดีครับ อยากจองคิว')]);

    expect(customerDb.findFirst).not.toHaveBeenCalled();
    expect(line.replyText).toHaveBeenCalledWith('reply-token-1', expect.any(String));
  });

  it('ข้ามอีเวนต์ชนิดที่ยังไม่รองรับโดยไม่ล้ม — LINE ส่งชนิดใหม่มาได้เสมอ', async () => {
    await service.handleEvents([
      { type: 'unfollow', source: { type: 'user', userId: 'Uline1' } } as LineWebhookEvent,
    ]);

    expect(line.replyText).not.toHaveBeenCalled();
  });

  it('อีเวนต์หนึ่งพังต้องไม่ทำให้อีเวนต์ที่เหลือไม่ถูกประมวลผล', async () => {
    customerDb.findFirst
      .mockRejectedValueOnce(new Error('DB ล่ม'))
      .mockResolvedValueOnce({ ...customer, id: 'cus_2', linkCode: '482914' });

    await service.handleEvents([
      textEvent('482913'),
      { ...textEvent('482914', 'Uline2'), replyToken: 'reply-token-2' } as LineWebhookEvent,
    ]);

    expect(customerDb.update).toHaveBeenCalledWith({
      where: { id: 'cus_2' },
      data: { lineUserId: 'Uline2', linkCode: null },
    });
  });
});
