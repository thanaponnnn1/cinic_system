import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { LineMessagingService } from '../line/line-messaging.service';
import type { ConfigService } from '@nestjs/config';

const CAMPAIGN = {
  id: 'camp_1',
  name: 'ดึงลูกค้ากลับ 15%',
  message: 'คิดถึงคุณ {name} จังเลยค่ะ',
  inactiveDays: 90,
  isActive: true,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
};

describe('CampaignsService', () => {
  const campaignDb = { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() };
  const campaignRunDb = { count: jest.fn(), aggregate: jest.fn() };
  const line = { pushText: jest.fn() };
  let adminUserId: string | undefined;

  function build(): CampaignsService {
    return new CampaignsService(
      { campaign: campaignDb, campaignRun: campaignRunDb } as unknown as PrismaService,
      line as unknown as LineMessagingService,
      { get: () => adminUserId } as unknown as ConfigService,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    adminUserId = 'Uadmin';
    campaignDb.findUnique.mockResolvedValue(CAMPAIGN);
    campaignRunDb.count.mockResolvedValue(0);
    campaignRunDb.aggregate.mockResolvedValue({ _sum: { revenue: null } });
    line.pushText.mockResolvedValue(true);
  });

  describe('ผลของแคมเปญ (ROI)', () => {
    it('รวมส่ง กลับมา และรายได้ จาก CampaignRun ตรง ๆ', async () => {
      campaignRunDb.count.mockResolvedValueOnce(12).mockResolvedValueOnce(4);
      campaignRunDb.aggregate.mockResolvedValue({ _sum: { revenue: 6800 } });

      const results = await build().results('camp_1');

      expect(results).toEqual({
        campaignId: 'camp_1',
        name: 'ดึงลูกค้ากลับ 15%',
        sent: 12,
        returned: 4,
        returnRate: 33.3,
        revenue: 6800,
      });
    });

    it('ยังไม่ได้ส่งหาใครเลยต้องได้ 0 ไม่ใช่ NaN', async () => {
      const results = await build().results('camp_1');

      expect(results.returnRate).toBe(0);
      expect(results.revenue).toBe(0);
    });

    it('ไม่มีแคมเปญนี้ก็ไม่ต้องไปนับอะไร', async () => {
      campaignDb.findUnique.mockResolvedValue(null);

      await expect(build().results('camp_1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('ส่งข้อความทดสอบ', () => {
    it('ส่งเข้า LINE แอดมิน พร้อมแทนตัวแทนชื่อให้เห็นหน้าตาจริง', async () => {
      await build().sendTest('camp_1');

      expect(line.pushText).toHaveBeenCalledWith(
        'Uadmin',
        expect.stringContaining('คิดถึงคุณ คุณลูกค้า จังเลยค่ะ'),
      );
    });

    it('ยังไม่ได้ตั้งค่าปลายทางต้องบอกให้ชัด ไม่ใช่เงียบไปเฉย ๆ', async () => {
      adminUserId = undefined;

      await expect(build().sendTest('camp_1')).rejects.toBeInstanceOf(BadRequestException);
      expect(line.pushText).not.toHaveBeenCalled();
    });
  });
});
