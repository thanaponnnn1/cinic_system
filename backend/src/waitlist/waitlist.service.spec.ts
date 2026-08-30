import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { WaitlistStatus } from '@clinicq/shared';
import { WaitlistService } from './waitlist.service';
import { PrismaService } from '../prisma/prisma.service';
import { FindWaitlistQueryDto } from './dto/waitlist.dto';

const WINDOW_START = '2026-09-02T02:00:00.000Z';
const WINDOW_END = '2026-09-02T10:00:00.000Z';

const row = {
  id: 'wl_1',
  customerId: 'cus_1',
  serviceId: 'svc_1',
  status: WaitlistStatus.WAITING,
  windowStart: new Date(WINDOW_START),
  windowEnd: new Date(WINDOW_END),
  offeredSlotAt: null,
  offerExpiresAt: null,
  createdAt: new Date('2026-09-01T03:00:00.000Z'),
  customer: { id: 'cus_1', name: 'สมหญิง ใจดี', lineUserId: 'Uline1' },
  service: { id: 'svc_1', name: 'ทรีตเมนต์ผิวหน้า' },
};

describe('WaitlistService', () => {
  let service: WaitlistService;

  const waitlistDb = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const customerDb = { findUnique: jest.fn() };
  const serviceDb = { findUnique: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    customerDb.findUnique.mockResolvedValue({ id: 'cus_1', isActive: true });
    serviceDb.findUnique.mockResolvedValue({ id: 'svc_1', isActive: true });
    waitlistDb.findFirst.mockResolvedValue(null);
    waitlistDb.create.mockResolvedValue(row);
    waitlistDb.findUnique.mockResolvedValue(row);
    waitlistDb.update.mockResolvedValue({ ...row, status: WaitlistStatus.CANCELLED });
    waitlistDb.findMany.mockResolvedValue([row]);
    waitlistDb.count.mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        {
          provide: PrismaService,
          useValue: { waitlistEntry: waitlistDb, customer: customerDb, service: serviceDb },
        },
      ],
    }).compile();

    service = module.get(WaitlistService);
  });

  describe('เพิ่มลูกค้าเข้าคิวรอ', () => {
    const dto = {
      customerId: 'cus_1',
      serviceId: 'svc_1',
      windowStart: WINDOW_START,
      windowEnd: WINDOW_END,
    };

    it('บันทึกช่วงเวลาที่ลูกค้าสะดวก พร้อมสถานะรอคิว', async () => {
      await service.create(dto);

      expect(waitlistDb.create.mock.calls[0][0].data).toMatchObject({
        customerId: 'cus_1',
        serviceId: 'svc_1',
        windowStart: new Date(WINDOW_START),
        windowEnd: new Date(WINDOW_END),
      });
    });

    it('ปฏิเสธช่วงเวลาที่จบก่อนเริ่ม', async () => {
      await expect(
        service.create({ ...dto, windowStart: WINDOW_END, windowEnd: WINDOW_START }),
      ).rejects.toThrow(BadRequestException);
    });

    it('แจ้งชัดเจนเมื่อไม่พบลูกค้า', async () => {
      customerDb.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('แจ้งชัดเจนเมื่อไม่พบบริการ', async () => {
      serviceDb.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('กันลงชื่อซ้ำ — ลูกค้าคนเดิม บริการเดิม ช่วงเวลาเดิม ที่ยังรออยู่', async () => {
      waitlistDb.findFirst.mockResolvedValue(row);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(waitlistDb.create).not.toHaveBeenCalled();
    });
  });

  describe('ดูรายการคิวรอ', () => {
    it('ค่าตั้งต้นแสดงเฉพาะคนที่ยังรอและที่ถูกเสนอคิวอยู่ — ที่เหลือคือประวัติ', async () => {
      await service.findAll(new FindWaitlistQueryDto());

      expect(waitlistDb.findMany.mock.calls[0][0].where.status).toEqual({
        in: [WaitlistStatus.WAITING, WaitlistStatus.OFFERED],
      });
    });

    it('กรองตามสถานะที่ระบุได้', async () => {
      const query = new FindWaitlistQueryDto();
      query.status = WaitlistStatus.CLAIMED;

      await service.findAll(query);

      expect(waitlistDb.findMany.mock.calls[0][0].where.status).toEqual({
        in: [WaitlistStatus.CLAIMED],
      });
    });

    it('เรียงจากคนที่ลงชื่อก่อน เพราะพนักงานใช้ลำดับนี้ตอนโทรตาม', async () => {
      await service.findAll(new FindWaitlistQueryDto());

      expect(waitlistDb.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'asc' });
    });
  });

  describe('ยกเลิกคิวรอ', () => {
    it('เปลี่ยนสถานะเป็นยกเลิก ไม่ลบทิ้ง เพราะต้องตอบได้ว่าเคยมีคนรอคิวนี้', async () => {
      await service.cancel('wl_1');

      expect(waitlistDb.update).toHaveBeenCalledWith({
        where: { id: 'wl_1' },
        data: { status: WaitlistStatus.CANCELLED },
      });
    });

    it('ยกเลิกใบที่ได้คิวไปแล้วไม่ได้ — ต้องไปยกเลิกที่ตัวนัดแทน', async () => {
      waitlistDb.findUnique.mockResolvedValue({ ...row, status: WaitlistStatus.CLAIMED });

      await expect(service.cancel('wl_1')).rejects.toThrow(BadRequestException);
    });

    it('แจ้งชัดเจนเมื่อไม่พบใบจองคิวรอ', async () => {
      waitlistDb.findUnique.mockResolvedValue(null);

      await expect(service.cancel('ไม่มีจริง')).rejects.toThrow(NotFoundException);
    });
  });
});
