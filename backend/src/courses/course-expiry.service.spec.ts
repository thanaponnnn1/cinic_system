import { DeliveryStatus, MsgType } from '@clinicq/shared';
import { CourseExpiryService, RENOTIFY_AFTER_DAYS } from './course-expiry.service';
import { formatCourseExpiry } from './course-expiry-message';
import { sleep } from '../common/sleep';
import type { PrismaService } from '../prisma/prisma.service';
import type { LineMessagingService } from '../line/line-messaging.service';
import type { ClockService } from '../clock/clock.service';

jest.mock('../common/sleep');

const NOW = new Date('2026-09-01T02:00:00.000Z'); // 09:00 น. ตามเวลาไทย

function course(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cc_1',
    usedSessions: 6,
    expiresAt: new Date('2026-09-21T00:00:00.000Z'),
    customer: { id: 'cus_1', name: 'สมหญิง', lineUserId: 'Uline1' },
    package: { name: 'คอร์สทรีตเมนต์ 10 ครั้ง', totalSessions: 10 },
    ...overrides,
  };
}

describe('CourseExpiryService', () => {
  const customerCourseDb = { findMany: jest.fn() };
  const messageLogDb = { findMany: jest.fn(), create: jest.fn() };
  const line = { pushText: jest.fn() };

  function build(): CourseExpiryService {
    return new CourseExpiryService(
      { customerCourse: customerCourseDb, messageLog: messageLogDb } as unknown as PrismaService,
      line as unknown as LineMessagingService,
      { now: () => NOW, refresh: jest.fn() } as unknown as ClockService,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    customerCourseDb.findMany.mockResolvedValue([course()]);
    messageLogDb.findMany.mockResolvedValue([]);
    messageLogDb.create.mockResolvedValue({});
    line.pushText.mockResolvedValue(true);
  });

  it('หาเฉพาะคอร์สที่ยังไม่หมดอายุแต่เหลือไม่เกิน 30 วัน ของลูกค้าที่ยินยอมและผูก LINE แล้ว', async () => {
    await build().notifyExpiring();

    const where = customerCourseDb.findMany.mock.calls[0][0].where;

    expect(where.expiresAt).toEqual({
      gt: NOW,
      lte: new Date(NOW.getTime() + 30 * 86_400_000),
    });
    expect(where.customer).toEqual({
      isActive: true,
      lineUserId: { not: null },
      consentReminder: true,
    });
  });

  it('ข้ามคอร์สที่ใช้ครบทุกครั้งแล้ว — หมดอายุไปก็ไม่มีอะไรเสียหาย', async () => {
    customerCourseDb.findMany.mockResolvedValue([course({ usedSessions: 10 })]);

    const result = await build().notifyExpiring();

    expect(line.pushText).not.toHaveBeenCalled();
    expect(result.notified).toBe(0);
  });

  it('ข้ามคนที่เพิ่งได้รับข้อความเรื่องคอร์สไปแล้วในรอบนี้ — ไม่ทวงทุกเช้า 30 วันติด', async () => {
    messageLogDb.findMany.mockResolvedValue([{ customerId: 'cus_1' }]);

    const result = await build().notifyExpiring();

    expect(messageLogDb.findMany).toHaveBeenCalledWith({
      where: {
        customerId: { in: ['cus_1'] },
        type: MsgType.COURSE_EXPIRY,
        deliveryStatus: DeliveryStatus.SENT,
        sentAt: { gte: new Date(NOW.getTime() - RENOTIFY_AFTER_DAYS * 86_400_000) },
      },
      select: { customerId: true },
    });
    expect(line.pushText).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
  });

  it('ลูกค้าที่มีสองคอร์สใกล้หมดอายุได้ข้อความเดียวที่มีสองบรรทัด ไม่ใช่สองฉบับ', async () => {
    customerCourseDb.findMany.mockResolvedValue([
      course(),
      course({
        id: 'cc_2',
        usedSessions: 2,
        package: { name: 'คอร์สนวดหน้า 5 ครั้ง', totalSessions: 5 },
      }),
    ]);

    const result = await build().notifyExpiring();

    expect(line.pushText).toHaveBeenCalledTimes(1);
    expect(line.pushText.mock.calls[0][1]).toContain('คอร์สทรีตเมนต์ 10 ครั้ง');
    expect(line.pushText.mock.calls[0][1]).toContain('คอร์สนวดหน้า 5 ครั้ง');
    expect(result.notified).toBe(1);
  });

  it('บันทึก MessageLog ทุกครั้งไม่ว่าจะส่งสำเร็จหรือไม่', async () => {
    line.pushText.mockResolvedValue(false);

    const result = await build().notifyExpiring();

    expect(messageLogDb.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'cus_1',
        type: MsgType.COURSE_EXPIRY,
        deliveryStatus: DeliveryStatus.FAILED,
      }),
    });
    expect(result.failed).toBe(1);
  });

  it('หน่วงจังหวะระหว่างคน กัน rate limit ของ LINE — คนแรกออกทันที', async () => {
    customerCourseDb.findMany.mockResolvedValue([
      course(),
      course({ id: 'cc_2', customer: { id: 'cus_2', name: 'ปิยะดา', lineUserId: 'Uline2' } }),
    ]);

    await build().notifyExpiring();

    expect(sleep).toHaveBeenCalledTimes(1);
  });
});

describe('formatCourseExpiry', () => {
  it('บอกครั้งที่เหลือ วันหมดอายุแบบไทย และจำนวนวันที่เหลือ', () => {
    const text = formatCourseExpiry('สมหญิง', [
      {
        packageName: 'คอร์สทรีตเมนต์ 10 ครั้ง',
        remainingSessions: 4,
        expiresAt: new Date('2026-09-30T00:00:00.000Z'),
        daysLeft: 29,
      },
    ]);

    expect(text).toContain('เหลือ 4 ครั้ง');
    expect(text).toContain('30 ก.ย. 2569');
    expect(text).toContain('อีก 29 วัน');
  });
});
