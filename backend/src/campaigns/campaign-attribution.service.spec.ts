import {
  ATTRIBUTION_WINDOW_DAYS,
  CampaignAttributionService,
} from './campaign-attribution.service';
import type { PrismaService } from '../prisma/prisma.service';

const BOOKED_AT = new Date('2026-09-01T03:00:00.000Z');

describe('CampaignAttributionService', () => {
  const campaignRunDb = { updateMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() };

  function build(): CampaignAttributionService {
    return new CampaignAttributionService({
      campaignRun: campaignRunDb,
    } as unknown as PrismaService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    campaignRunDb.updateMany.mockResolvedValue({ count: 1 });
    campaignRunDb.findFirst.mockResolvedValue({ id: 'run_1' });
    campaignRunDb.update.mockResolvedValue({});
  });

  describe('ประทับการกลับมาจอง', () => {
    it('นับเฉพาะการจองที่เกิดหลังได้รับข้อความ และยังอยู่ในเพดานเวลาที่ยอมนับ', async () => {
      await build().stampReturn('cus_1', BOOKED_AT);

      expect(campaignRunDb.updateMany).toHaveBeenCalledWith({
        where: {
          customerId: 'cus_1',
          returnedAt: null,
          sentAt: {
            lte: BOOKED_AT,
            gte: new Date(BOOKED_AT.getTime() - ATTRIBUTION_WINDOW_DAYS * 86_400_000),
          },
        },
        data: { returnedAt: BOOKED_AT },
      });
    });

    it('ไม่ทับรอบที่เคยประทับไว้แล้ว — การกลับมาครั้งแรกคือครั้งที่นับ', async () => {
      await build().stampReturn('cus_1', BOOKED_AT);

      expect(campaignRunDb.updateMany.mock.calls[0][0].where.returnedAt).toBeNull();
    });

    it('เขียนสถิติพลาดต้องไม่ทำให้การจองล้มตามไปด้วย', async () => {
      campaignRunDb.updateMany.mockRejectedValue(new Error('ฐานข้อมูลล่ม'));

      await expect(build().stampReturn('cus_1', BOOKED_AT)).resolves.toBe(0);
    });
  });

  describe('ประทับรายได้', () => {
    it('ประทับให้รอบที่กลับมาแล้วและยังไม่มีรายได้ เอารอบล่าสุดก่อน', async () => {
      await build().stampRevenue('cus_1', 1500);

      expect(campaignRunDb.findFirst).toHaveBeenCalledWith({
        where: { customerId: 'cus_1', returnedAt: { not: null }, revenue: null },
        orderBy: { sentAt: 'desc' },
        select: { id: true },
      });
      expect(campaignRunDb.update).toHaveBeenCalledWith({
        where: { id: 'run_1' },
        data: { revenue: 1500 },
      });
    });

    it('ลูกค้าที่ไม่ได้อยู่ในแคมเปญไหนเลยต้องไม่ถูกเขียนอะไร', async () => {
      campaignRunDb.findFirst.mockResolvedValue(null);

      await expect(build().stampRevenue('cus_1', 1500)).resolves.toBe(false);
      expect(campaignRunDb.update).not.toHaveBeenCalled();
    });

    it('เขียนพลาดต้องไม่ทำให้การปิดงานล้มตามไปด้วย', async () => {
      campaignRunDb.update.mockRejectedValue(new Error('ฐานข้อมูลล่ม'));

      await expect(build().stampRevenue('cus_1', 1500)).resolves.toBe(false);
    });
  });
});
