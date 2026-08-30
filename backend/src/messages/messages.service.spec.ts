import { DeliveryStatus, MsgType } from '@clinicq/shared';
import { MessagesService } from './messages.service';
import type { PrismaService } from '../prisma/prisma.service';

const ROW = {
  id: 'log_1',
  customerId: 'cus_1',
  appointmentId: 'appt_1',
  type: MsgType.REMINDER_1D,
  deliveryStatus: DeliveryStatus.SKIPPED_NO_CONSENT,
  errorMessage: null,
  sentAt: new Date('2026-09-01T03:00:00.000Z'),
  customer: { name: 'สมหญิง ใจดี' },
  appointment: { startsAt: new Date('2026-09-02T03:30:00.000Z') },
};

describe('MessagesService', () => {
  const messageLogDb = { findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn() };

  function build(): MessagesService {
    return new MessagesService({ messageLog: messageLogDb } as unknown as PrismaService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    messageLogDb.findMany.mockResolvedValue([ROW]);
    messageLogDb.count.mockResolvedValue(1);
    messageLogDb.groupBy.mockResolvedValue([
      { deliveryStatus: DeliveryStatus.SENT, _count: 40 },
      { deliveryStatus: DeliveryStatus.SKIPPED_NO_CONSENT, _count: 7 },
    ]);
  });

  it('แปลผลการส่งเป็นภาษาไทยให้เลย หน้าจอจะได้ไม่ต้องแปลกันเอง', async () => {
    const feed = await build().findAll({ page: 1, limit: 20, skip: 0 });

    expect(feed.data[0].deliveryLabel).toBe('ไม่ส่ง — ไม่ได้ให้ความยินยอม');
    expect(feed.data[0].customerName).toBe('สมหญิง ใจดี');
    expect(feed.data[0].appointmentAt).toEqual(ROW.appointment.startsAt);
  });

  it('เรียงจากใหม่ไปเก่า เพราะคนเปิดหน้านี้อยากรู้ว่าเมื่อกี้เกิดอะไรขึ้น', async () => {
    await build().findAll({ page: 1, limit: 20, skip: 0 });

    expect(messageLogDb.findMany.mock.calls[0][0].orderBy).toEqual({ sentAt: 'desc' });
  });

  it('กรองตามชนิดข้อความและผลการส่งได้', async () => {
    await build().findAll({
      page: 1,
      limit: 20,
      skip: 0,
      type: MsgType.WINBACK,
      deliveryStatus: DeliveryStatus.SENT,
    });

    expect(messageLogDb.findMany.mock.calls[0][0].where).toEqual({
      type: MsgType.WINBACK,
      deliveryStatus: DeliveryStatus.SENT,
    });
  });

  it('ยอดรวมนับทั้งระบบ ชนิดที่ไม่มีแถวเลยต้องเป็น 0 ไม่ใช่หายไป', async () => {
    const feed = await build().findAll({ page: 1, limit: 20, skip: 0 });

    expect(feed.stats).toEqual({
      sent: 40,
      failed: 0,
      skippedNoConsent: 7,
      skippedNoLine: 0,
      skippedDuplicate: 0,
    });
  });
});
