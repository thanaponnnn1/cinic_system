import { ApptStatus } from '@clinicq/shared';
import { DigestService } from './digest.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { LineMessagingService } from '../line/line-messaging.service';
import type { ClockService } from '../clock/clock.service';
import type { ConfigService } from '@nestjs/config';

const NOW = new Date('2026-08-31T14:00:00.000Z'); // 21:00 น. ตามเวลาไทย

function appt(status: ApptStatus, providerName: string, price: number) {
  return {
    status,
    provider: { name: providerName },
    service: { price },
  };
}

describe('DigestService', () => {
  const appointmentDb = { findMany: jest.fn(), count: jest.fn() };
  const line = { pushText: jest.fn() };
  let adminUserId: string | undefined;

  function build(): DigestService {
    return new DigestService(
      { appointment: appointmentDb } as unknown as PrismaService,
      line as unknown as LineMessagingService,
      { now: () => NOW, refresh: jest.fn() } as unknown as ClockService,
      { get: () => adminUserId } as unknown as ConfigService,
    );
  }

  beforeEach(() => {
    adminUserId = 'Uadmin';
    appointmentDb.findMany
      .mockReset()
      .mockResolvedValue([
        appt(ApptStatus.COMPLETED, 'คุณฟ้า', 1500),
        appt(ApptStatus.COMPLETED, 'คุณฟ้า', 2700),
        appt(ApptStatus.COMPLETED, 'คุณเบส', 2600),
        appt(ApptStatus.NO_SHOW, 'คุณเบส', 900),
        appt(ApptStatus.CANCELLED, 'คุณฟ้า', 800),
      ]);
    appointmentDb.count.mockReset().mockResolvedValue(7);
    line.pushText.mockReset().mockResolvedValue(true);
  });

  it('นับรายได้เฉพาะเคสที่ปิดงานแล้ว — นัดที่ยกเลิกหรือไม่มาไม่ใช่รายได้', async () => {
    const digest = await build().buildDigest();

    expect(digest.revenue).toBe(6800);
    expect(digest.completed).toBe(3);
  });

  it('นับจำนวนที่ไม่มาตามนัดและที่ยกเลิกแยกกัน', async () => {
    const digest = await build().buildDigest();

    expect(digest.noShow).toBe(1);
    expect(digest.cancelled).toBe(1);
  });

  it('แยกตัวเลขรายช่าง เรียงจากรายได้มากไปน้อย', async () => {
    const digest = await build().buildDigest();

    expect(digest.byProvider).toEqual([
      { name: 'คุณฟ้า', completed: 2, revenue: 4200 },
      { name: 'คุณเบส', completed: 1, revenue: 2600 },
    ]);
  });

  it('นับคิวพรุ่งนี้เฉพาะนัดที่ยังมีผลอยู่', async () => {
    const digest = await build().buildDigest();

    expect(digest.tomorrowCount).toBe(7);
    expect(appointmentDb.count.mock.calls[0][0].where.status).toEqual({
      in: [ApptStatus.BOOKED, ApptStatus.CONFIRMED],
    });
  });

  it('ใช้วันตามเวลาที่ ClockService บอก เพื่อให้ปุ่มข้ามเวลาในเดโมสรุปวันที่ถูก', async () => {
    await build().buildDigest();

    const range = appointmentDb.findMany.mock.calls[0][0].where.startsAt;
    expect(range.gte.toISOString()).toBe('2026-08-30T17:00:00.000Z'); // 31 ส.ค. 00:00 น. ไทย
    expect(range.lt.toISOString()).toBe('2026-08-31T17:00:00.000Z');
  });

  it('ส่งสรุปเข้า LINE ของเจ้าของร้าน', async () => {
    await build().sendDailyDigest();

    const [to, text] = line.pushText.mock.calls[0];
    expect(to).toBe('Uadmin');
    expect(text).toContain('สรุปปิดร้าน');
    expect(text).toContain('6,800');
  });

  it('ไม่ได้ตั้ง LINE_ADMIN_USER_ID ก็ไม่ส่ง และต้องไม่ล้ม', async () => {
    adminUserId = undefined;

    await expect(build().sendDailyDigest()).resolves.toBe(false);
    expect(line.pushText).not.toHaveBeenCalled();
  });
});
