import { ApptStatus, DeliveryStatus, MsgType, WaitlistStatus } from '@clinicq/shared';
import { WaitlistEngineService } from './waitlist-engine.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { LineMessagingService } from '../line/line-messaging.service';
import type { ClockService } from '../clock/clock.service';
import type { ConfigService } from '@nestjs/config';

const NOW = new Date('2026-09-01T03:00:00.000Z'); // 10:00 น. ตามเวลาไทย
const SLOT_START = new Date('2026-09-02T03:30:00.000Z'); // 10:30 น. วันถัดไป
const SLOT_END = new Date('2026-09-02T04:00:00.000Z');

const SLOT = {
  providerId: 'prov_1',
  serviceId: 'svc_1',
  slotStart: SLOT_START,
  slotEnd: SLOT_END,
};

function entry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wl_1',
    customerId: 'cus_1',
    serviceId: 'svc_1',
    status: WaitlistStatus.WAITING,
    windowStart: new Date('2026-09-01T00:00:00.000Z'),
    windowEnd: new Date('2026-09-03T00:00:00.000Z'),
    offeredSlotAt: null as Date | null,
    offerExpiresAt: null as Date | null,
    offeredProviderId: null as string | null,
    customer: {
      id: 'cus_1',
      name: 'สมหญิง ใจดี',
      lineUserId: 'Uline1',
      consentReminder: true,
    },
    service: { id: 'svc_1', name: 'ทรีตเมนต์ผิวหน้า', durationMin: 30 },
    ...overrides,
  };
}

describe('WaitlistEngineService', () => {
  const waitlistDb = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const appointmentDb = { findFirst: jest.fn(), create: jest.fn() };
  const providerDb = { findUnique: jest.fn() };
  const messageLogDb = { create: jest.fn() };
  const line = { push: jest.fn(), pushText: jest.fn() };
  const clock = { now: () => NOW, refresh: jest.fn() };

  const prisma = {
    waitlistEntry: waitlistDb,
    appointment: appointmentDb,
    provider: providerDb,
    messageLog: messageLogDb,
    $executeRaw: jest.fn(),
    // ธุรกรรมจริงรันคำสั่งใน callback — ที่นี่ใช้ mock ชุดเดียวกันเพื่อดูลำดับการเรียก
    $transaction: jest.fn(),
  };

  function build(): WaitlistEngineService {
    return new WaitlistEngineService(
      prisma as unknown as PrismaService,
      line as unknown as LineMessagingService,
      clock as unknown as ClockService,
      { get: () => 'Uadmin' } as unknown as ConfigService,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prisma));
    prisma.$executeRaw.mockResolvedValue(1);
    waitlistDb.findMany.mockResolvedValue([]);
    waitlistDb.update.mockResolvedValue(entry());
    waitlistDb.updateMany.mockResolvedValue({ count: 1 });
    appointmentDb.findFirst.mockResolvedValue(null);
    appointmentDb.create.mockResolvedValue({ id: 'appt_new', startsAt: SLOT_START });
    providerDb.findUnique.mockResolvedValue({ id: 'prov_1', name: 'คุณแอน' });
    line.push.mockResolvedValue(true);
    line.pushText.mockResolvedValue(true);
  });

  describe('เสนอคิวว่าง', () => {
    it('หาเฉพาะคนที่รออยู่ บริการตรงกัน และช่วงเวลาที่สะดวกครอบคิวนี้', async () => {
      await build().offerSlot(SLOT);

      const where = waitlistDb.findMany.mock.calls[0][0].where;
      expect(where.status).toBe(WaitlistStatus.WAITING);
      expect(where.serviceId).toBe('svc_1');
      expect(where.windowStart).toEqual({ lte: SLOT_START });
      expect(where.windowEnd).toEqual({ gte: SLOT_END });
    });

    it('ตั้งสถานะเป็นเสนอแล้ว พร้อมเก็บช่างและเส้นตาย 30 นาที', async () => {
      waitlistDb.findMany.mockResolvedValue([entry()]);

      await build().offerSlot(SLOT);

      expect(waitlistDb.update).toHaveBeenCalledWith({
        where: { id: 'wl_1' },
        data: {
          status: WaitlistStatus.OFFERED,
          offeredSlotAt: SLOT_START,
          offeredProviderId: 'prov_1',
          offerExpiresAt: new Date(NOW.getTime() + 30 * 60_000),
        },
      });
    });

    it('ยิงข้อความหาทุกคนที่เข้าเกณฑ์ ไม่ใช่แค่คนแรก — ใครกดก่อนได้ก่อน', async () => {
      waitlistDb.findMany.mockResolvedValue([
        entry(),
        entry({
          id: 'wl_2',
          customerId: 'cus_2',
          customer: { ...entry().customer, id: 'cus_2', lineUserId: 'Uline2' },
        }),
      ]);

      const offered = await build().offerSlot(SLOT);

      expect(offered).toBe(2);
      expect(line.push).toHaveBeenCalledTimes(2);
      expect(line.push.mock.calls.map((call) => call[0])).toEqual(['Uline1', 'Uline2']);
    });

    it('บันทึก MessageLog เป็นข้อความเสนอคิวว่างที่ส่งสำเร็จ', async () => {
      waitlistDb.findMany.mockResolvedValue([entry()]);

      await build().offerSlot(SLOT);

      expect(messageLogDb.create).toHaveBeenCalledWith({
        data: {
          customerId: 'cus_1',
          type: MsgType.SLOT_OFFER,
          deliveryStatus: DeliveryStatus.SENT,
          errorMessage: null,
        },
      });
    });

    it('ข้ามคนที่ยังไม่ผูก LINE และบันทึกเหตุผลไว้ ไม่กันคิวให้เขา', async () => {
      waitlistDb.findMany.mockResolvedValue([
        entry({ customer: { ...entry().customer, lineUserId: null } }),
      ]);

      const offered = await build().offerSlot(SLOT);

      expect(offered).toBe(0);
      expect(waitlistDb.update).not.toHaveBeenCalled();
      expect(messageLogDb.create.mock.calls[0][0].data.deliveryStatus).toBe(
        DeliveryStatus.SKIPPED_NO_LINE,
      );
    });

    it('ข้ามคนที่ไม่ได้ให้ความยินยอม — หลักฐาน PDPA อยู่ใน MessageLog', async () => {
      waitlistDb.findMany.mockResolvedValue([
        entry({ customer: { ...entry().customer, consentReminder: false } }),
      ]);

      await build().offerSlot(SLOT);

      expect(messageLogDb.create.mock.calls[0][0].data.deliveryStatus).toBe(
        DeliveryStatus.SKIPPED_NO_CONSENT,
      );
    });

    it('ไม่มีใครในคิวรอเข้าเกณฑ์ ก็จบเงียบ ๆ ไม่ต้องรบกวนใคร', async () => {
      const offered = await build().offerSlot(SLOT);

      expect(offered).toBe(0);
      expect(line.push).not.toHaveBeenCalled();
    });
  });

  describe('กดรับคิว', () => {
    const offered = entry({
      status: WaitlistStatus.OFFERED,
      offeredSlotAt: SLOT_START,
      offeredProviderId: 'prov_1',
      offerExpiresAt: new Date(NOW.getTime() + 10 * 60_000),
    });

    beforeEach(() => waitlistDb.findUnique.mockResolvedValue(offered));

    it('สร้างนัดใหม่ให้คนที่กดทัน โดยใช้ช่างและเวลาที่เสนอไป ไม่ใช่ค่าที่ส่งมากับปุ่ม', async () => {
      const result = await build().claim('wl_1', 'Uline1');

      expect(result.status).toBe('ok');
      const data = appointmentDb.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        customerId: 'cus_1',
        providerId: 'prov_1',
        serviceId: 'svc_1',
        startsAt: SLOT_START,
        endsAt: SLOT_END,
        status: ApptStatus.BOOKED,
      });
    });

    it('ล็อกช่างและตรวจว่าคิวยังว่างก่อนสร้างนัด', async () => {
      await build().claim('wl_1', 'Uline1');

      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(appointmentDb.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
        appointmentDb.create.mock.invocationCallOrder[0],
      );
    });

    it('ยึดใบจองแบบมีเงื่อนไขสถานะ — คนที่กดช้าจะได้ count 0 แล้วต้องไม่ได้นัด', async () => {
      waitlistDb.updateMany.mockResolvedValue({ count: 0 });

      const result = await build().claim('wl_1', 'Uline1');

      expect(result.status).toBe('taken');
      expect(appointmentDb.create).not.toHaveBeenCalled();
    });

    it('คนอื่นที่ได้รับข้อเสนอเดียวกันกลับไปรออยู่ในคิวเหมือนเดิม ไม่ถูกลบทิ้ง', async () => {
      await build().claim('wl_1', 'Uline1');

      const revert = waitlistDb.updateMany.mock.calls.find(
        (call) => call[0].data.status === WaitlistStatus.WAITING,
      );
      expect(revert[0].where).toMatchObject({
        status: WaitlistStatus.OFFERED,
        offeredSlotAt: SLOT_START,
        offeredProviderId: 'prov_1',
      });
      expect(revert[0].data).toMatchObject({
        status: WaitlistStatus.WAITING,
        offeredSlotAt: null,
        offerExpiresAt: null,
        offeredProviderId: null,
      });
    });

    it('คิวถูกจองไปแล้วระหว่างทาง ตอบว่ามีคนจองแล้ว ไม่ใช่ error', async () => {
      appointmentDb.findFirst.mockResolvedValue({ id: 'appt_อื่น' });

      const result = await build().claim('wl_1', 'Uline1');

      expect(result.status).toBe('taken');
      expect(appointmentDb.create).not.toHaveBeenCalled();
    });

    it('กดหลังหมดเขตแล้วตอบว่าหมดเวลา', async () => {
      waitlistDb.findUnique.mockResolvedValue(
        entry({
          status: WaitlistStatus.OFFERED,
          offeredSlotAt: SLOT_START,
          offeredProviderId: 'prov_1',
          offerExpiresAt: new Date(NOW.getTime() - 60_000),
        }),
      );

      expect((await build().claim('wl_1', 'Uline1')).status).toBe('expired');
    });

    it('บัญชี LINE ที่กดไม่ใช่เจ้าของใบจอง ต้องไม่ได้คิว', async () => {
      const result = await build().claim('wl_1', 'Uline-คนอื่น');

      expect(result.status).toBe('forbidden');
      expect(appointmentDb.create).not.toHaveBeenCalled();
    });

    it('ไม่พบใบจองคิวรอ', async () => {
      waitlistDb.findUnique.mockResolvedValue(null);

      expect((await build().claim('ไม่มีจริง', 'Uline1')).status).toBe('not_found');
    });

    it('คนที่ได้คิวไปแล้วกดปุ่มซ้ำ ต้องได้คำตอบว่าจองไว้แล้ว ไม่ใช่ว่าคนอื่นแย่งไป', async () => {
      waitlistDb.findUnique.mockResolvedValue(
        entry({ status: WaitlistStatus.CLAIMED, offeredSlotAt: SLOT_START }),
      );

      expect((await build().claim('wl_1', 'Uline1')).status).toBe('already_claimed');
    });

    it('สองคนกดพร้อมกัน ต้องมีคนเดียวที่ได้นัด และนัดถูกสร้างครั้งเดียว', async () => {
      // ใบจองคนละใบแต่ชี้คิวเดียวกัน — จำลองสองเครื่องกดในเสี้ยววินาทีเดียวกัน
      const second = entry({
        id: 'wl_2',
        customerId: 'cus_2',
        status: WaitlistStatus.OFFERED,
        offeredSlotAt: SLOT_START,
        offeredProviderId: 'prov_1',
        offerExpiresAt: new Date(NOW.getTime() + 10 * 60_000),
        customer: { ...entry().customer, id: 'cus_2', lineUserId: 'Uline2' },
      });
      waitlistDb.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve(where.id === 'wl_1' ? offered : second),
      );

      // ฐานข้อมูลจริงยอมให้ยึดใบจองสำเร็จได้ใบเดียว ใบที่สองจะได้ count 0
      let claimed = false;
      waitlistDb.updateMany.mockImplementation(({ data }: { data: { status: WaitlistStatus } }) => {
        if (data.status !== WaitlistStatus.CLAIMED) return Promise.resolve({ count: 1 });
        if (claimed) return Promise.resolve({ count: 0 });
        claimed = true;
        return Promise.resolve({ count: 1 });
      });

      const service = build();
      const [first, latecomer] = await Promise.all([
        service.claim('wl_1', 'Uline1'),
        service.claim('wl_2', 'Uline2'),
      ]);

      expect([first.status, latecomer.status].sort()).toEqual(['ok', 'taken']);
      expect(appointmentDb.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('ข้อเสนอที่หมดเวลา', () => {
    it('เปลี่ยนใบที่เลยเส้นตายเป็นหมดอายุ และคืนค่าที่เสนอไว้ให้ว่าง', async () => {
      waitlistDb.findMany.mockResolvedValue([
        entry({ status: WaitlistStatus.OFFERED, offeredSlotAt: SLOT_START }),
      ]);

      const expired = await build().expireOffers();

      expect(expired).toBe(1);
      expect(waitlistDb.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['wl_1'] } },
        data: {
          status: WaitlistStatus.EXPIRED,
          offeredSlotAt: null,
          offerExpiresAt: null,
          offeredProviderId: null,
        },
      });
    });

    it('บอกร้านว่ามีคิวว่างที่ไม่มีใครรับ เพื่อให้พนักงานโทรหาลูกค้าเอง', async () => {
      waitlistDb.findMany.mockResolvedValue([
        entry({ status: WaitlistStatus.OFFERED, offeredSlotAt: SLOT_START }),
      ]);

      await build().expireOffers();

      expect(line.pushText).toHaveBeenCalledWith('Uadmin', expect.stringContaining('10:30'));
    });

    it('ไม่มีใบไหนหมดเวลาก็ไม่ต้องรบกวนร้าน', async () => {
      const expired = await build().expireOffers();

      expect(expired).toBe(0);
      expect(line.pushText).not.toHaveBeenCalled();
    });
  });
});
