import { DeliveryStatus, MsgType } from '@clinicq/shared';
import { WinbackService, personalize } from './winback.service';
import { sleep } from '../common/sleep';
import type { PrismaService } from '../prisma/prisma.service';
import type { LineMessagingService } from '../line/line-messaging.service';
import type { ClockService } from '../clock/clock.service';

// หน่วงจังหวะจริงหนึ่งวินาทีต่อข้อความ ทำให้เทสต์ช้าโดยไม่ได้พิสูจน์อะไรเพิ่ม
// จึงแทนที่ด้วย mock แล้วตรวจแทนว่า "ถูกเรียกกี่ครั้ง" ซึ่งคือสิ่งที่ต้องการรับประกันจริง ๆ
jest.mock('../common/sleep');

const NOW = new Date('2026-09-01T03:00:00.000Z'); // 10:00 น. ตามเวลาไทย

const CAMPAIGN = {
  id: 'camp_1',
  name: 'ดึงลูกค้ากลับ 15%',
  message: 'คิดถึงคุณ {name} จังเลยค่ะ',
  inactiveDays: 90,
  isActive: true,
};

function target(id: string, name: string, lineUserId: string | null = `U${id}`) {
  return { id, name, lineUserId };
}

describe('WinbackService', () => {
  const campaignDb = { findMany: jest.fn(), findUnique: jest.fn() };
  const customerDb = { findMany: jest.fn() };
  const campaignRunDb = { create: jest.fn(), delete: jest.fn() };
  const messageLogDb = { create: jest.fn() };
  const line = { pushText: jest.fn() };

  const prisma = {
    campaign: campaignDb,
    customer: customerDb,
    campaignRun: campaignRunDb,
    messageLog: messageLogDb,
  };

  function build(): WinbackService {
    return new WinbackService(
      prisma as unknown as PrismaService,
      line as unknown as LineMessagingService,
      { now: () => NOW, refresh: jest.fn() } as unknown as ClockService,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    campaignDb.findMany.mockResolvedValue([CAMPAIGN]);
    campaignDb.findUnique.mockResolvedValue(CAMPAIGN);
    customerDb.findMany.mockResolvedValue([]);
    campaignRunDb.create.mockImplementation(() => Promise.resolve({ id: 'run_1' }));
    campaignRunDb.delete.mockResolvedValue({});
    messageLogDb.create.mockResolvedValue({});
    line.pushText.mockResolvedValue(true);
  });

  describe('การคัดรายชื่อ', () => {
    it('ส่งเฉพาะคนที่ยินยอมรับการตลาด ผูก LINE แล้ว และยังไม่เคยถูกส่งในแคมเปญนี้', async () => {
      await build().runCampaign('camp_1');

      const where = customerDb.findMany.mock.calls[0][0].where;

      expect(where.isActive).toBe(true);
      expect(where.consentMarketing).toBe(true);
      expect(where.lineUserId).toEqual({ not: null });
      expect(where.campaignRuns).toEqual({ none: { campaignId: 'camp_1' } });
    });

    it('เส้นแบ่ง "ลูกค้าหาย" นับจากเวลาของระบบ ไม่ใช่นาฬิกาเครื่อง — ตอนเดโมมีการข้ามเวลา', async () => {
      await build().runCampaign('camp_1');

      const [visited, neverVisited] = customerDb.findMany.mock.calls[0][0].where.OR;
      const cutoff = new Date(NOW.getTime() - 90 * 86_400_000);

      expect(visited.lastVisitAt).toEqual({ lt: cutoff });
      // คนที่ยังไม่เคยมาเลยก็นับว่าหาย แต่ต้องเป็นโปรไฟล์ที่สร้างไว้นานพอกัน
      expect(neverVisited.AND).toEqual([{ lastVisitAt: null }, { createdAt: { lt: cutoff } }]);
    });
  });

  describe('การส่ง', () => {
    it('แทน {name} ด้วยชื่อลูกค้าแต่ละคน', async () => {
      customerDb.findMany.mockResolvedValue([target('cus_1', 'สมหญิง')]);

      await build().runCampaign('camp_1');

      expect(line.pushText).toHaveBeenCalledWith('Ucus_1', 'คิดถึงคุณ สมหญิง จังเลยค่ะ');
    });

    it('จองสิทธิ์ใน CampaignRun ก่อนส่ง — งานที่ถูกรันซ้ำต้องไม่กลายเป็นข้อความซ้ำ', async () => {
      customerDb.findMany.mockResolvedValue([target('cus_1', 'สมหญิง')]);

      await build().runCampaign('camp_1');

      expect(campaignRunDb.create.mock.invocationCallOrder[0]).toBeLessThan(
        line.pushText.mock.invocationCallOrder[0],
      );
      expect(campaignRunDb.create).toHaveBeenCalledWith({
        data: { campaignId: 'camp_1', customerId: 'cus_1', sentAt: NOW },
        select: { id: true },
      });
    });

    it('คนที่ชน unique ของแคมเปญ (มีโปรเซสอื่นส่งไปแล้ว) ต้องไม่ถูกส่งซ้ำ', async () => {
      customerDb.findMany.mockResolvedValue([target('cus_1', 'สมหญิง')]);
      campaignRunDb.create.mockRejectedValue(new Error('unique constraint'));

      const result = await build().runCampaign('camp_1');

      expect(line.pushText).not.toHaveBeenCalled();
      expect(result.sent).toBe(0);
    });

    it('ส่งไม่สำเร็จแล้วถอนสิทธิ์คืน เพื่อให้งานของวันพรุ่งนี้ลองใหม่ได้', async () => {
      customerDb.findMany.mockResolvedValue([target('cus_1', 'สมหญิง')]);
      line.pushText.mockResolvedValue(false);

      const result = await build().runCampaign('camp_1');

      expect(campaignRunDb.delete).toHaveBeenCalledWith({ where: { id: 'run_1' } });
      expect(result.failed).toBe(1);
      expect(result.sent).toBe(0);
    });

    it('บันทึก MessageLog ทุกครั้งไม่ว่าจะส่งสำเร็จหรือไม่ — หลักฐานตาม PDPA', async () => {
      customerDb.findMany.mockResolvedValue([target('cus_1', 'สมหญิง')]);
      line.pushText.mockResolvedValue(false);

      await build().runCampaign('camp_1');

      expect(messageLogDb.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: 'cus_1',
          type: MsgType.WINBACK,
          deliveryStatus: DeliveryStatus.FAILED,
        }),
      });
    });

    it('หน่วงจังหวะระหว่างฉบับ กัน rate limit ของ LINE — ฉบับแรกออกทันที', async () => {
      customerDb.findMany.mockResolvedValue([
        target('cus_1', 'ก'),
        target('cus_2', 'ข'),
        target('cus_3', 'ค'),
      ]);

      const result = await build().runCampaign('camp_1');

      expect(result.sent).toBe(3);
      expect(sleep).toHaveBeenCalledTimes(2);
    });
  });

  describe('งานรายวัน', () => {
    it('ยิงทุกแคมเปญที่เปิดอยู่', async () => {
      campaignDb.findMany.mockResolvedValue([CAMPAIGN, { ...CAMPAIGN, id: 'camp_2' }]);
      campaignDb.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve({ ...CAMPAIGN, id: where.id }),
      );

      const results = await build().runActiveCampaigns();

      expect(campaignDb.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      expect(results.map((r) => r.campaignId)).toEqual(['camp_1', 'camp_2']);
    });

    it('ไม่มีแคมเปญที่เปิดอยู่ก็ไม่แตะรายชื่อลูกค้าเลย', async () => {
      campaignDb.findMany.mockResolvedValue([]);

      await build().runActiveCampaigns();

      expect(customerDb.findMany).not.toHaveBeenCalled();
    });
  });
});

describe('personalize', () => {
  it('แทนตัวแทนชื่อทุกจุดที่ปรากฏ', () => {
    expect(personalize('คุณ{name} คะ {name}', 'ฟ้า')).toBe('คุณฟ้า คะ ฟ้า');
  });

  it('ข้อความที่ไม่มีตัวแทนชื่อส่งได้ตามเดิม', () => {
    expect(personalize('มีโปรพิเศษค่ะ', 'ฟ้า')).toBe('มีโปรพิเศษค่ะ');
  });
});
