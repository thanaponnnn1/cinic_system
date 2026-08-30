import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '@clinicq/shared';
import { CoursesService } from './courses.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { ClockService } from '../clock/clock.service';

const NOW = new Date('2026-09-01T03:00:00.000Z');

const PACKAGE = {
  id: 'pkg_1',
  name: 'คอร์สทรีตเมนต์ 10 ครั้ง',
  serviceId: 'svc_1',
  totalSessions: 10,
  validDays: 180,
  price: 12000,
  isActive: true,
};

function purchased(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cc_1',
    customerId: 'cus_1',
    packageId: 'pkg_1',
    usedSessions: 6,
    purchasedAt: new Date('2026-08-01T00:00:00.000Z'),
    expiresAt: new Date('2026-09-21T00:00:00.000Z'),
    customer: { name: 'สมหญิง ใจดี', phone: '0810000001' },
    package: { name: PACKAGE.name, totalSessions: 10 },
    ...overrides,
  };
}

describe('CoursesService', () => {
  const customerDb = { findUnique: jest.fn() };
  const packageDb = { findUnique: jest.fn() };
  const courseDb = { create: jest.fn(), findMany: jest.fn(), count: jest.fn() };

  function build(): CoursesService {
    return new CoursesService(
      {
        customer: customerDb,
        coursePackage: packageDb,
        customerCourse: courseDb,
      } as unknown as PrismaService,
      { now: () => NOW, refresh: jest.fn() } as unknown as ClockService,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    customerDb.findUnique.mockResolvedValue({ id: 'cus_1', name: 'สมหญิง ใจดี', isActive: true });
    packageDb.findUnique.mockResolvedValue(PACKAGE);
    courseDb.create.mockResolvedValue(purchased());
    courseDb.findMany.mockResolvedValue([purchased()]);
    courseDb.count.mockResolvedValue(1);
  });

  describe('บันทึกการซื้อคอร์ส', () => {
    it('วันหมดอายุ = วันที่ซื้อ + อายุคอร์สของแม่แบบ ณ ตอนนั้น', async () => {
      await build().purchase({ customerId: 'cus_1', packageId: 'pkg_1' }, Role.STAFF);

      expect(courseDb.create.mock.calls[0][0].data).toMatchObject({
        customerId: 'cus_1',
        packageId: 'pkg_1',
        purchasedAt: NOW,
        expiresAt: new Date(NOW.getTime() + 180 * 86_400_000),
      });
    });

    it('บันทึกย้อนหลังได้ โดยอายุคอร์สนับจากวันที่ซื้อจริง ไม่ใช่วันที่บันทึก', async () => {
      await build().purchase(
        { customerId: 'cus_1', packageId: 'pkg_1', purchasedAt: '2026-06-01T00:00:00.000Z' },
        Role.STAFF,
      );

      expect(courseDb.create.mock.calls[0][0].data.expiresAt).toEqual(
        new Date(new Date('2026-06-01T00:00:00.000Z').getTime() + 180 * 86_400_000),
      );
    });

    it('คอร์สที่เลิกขายแล้วขายซ้ำไม่ได้', async () => {
      packageDb.findUnique.mockResolvedValue({ ...PACKAGE, isActive: false });

      await expect(
        build().purchase({ customerId: 'cus_1', packageId: 'pkg_1' }, Role.STAFF),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ไม่มีลูกค้ารายนี้ก็ขายไม่ได้', async () => {
      customerDb.findUnique.mockResolvedValue(null);

      await expect(
        build().purchase({ customerId: 'cus_1', packageId: 'pkg_1' }, Role.STAFF),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('รายชื่อคอร์สใกล้หมดอายุ', () => {
    it('เอาเฉพาะคอร์สที่ยังไม่หมดอายุภายในจำนวนวันที่ถาม ของลูกค้าที่ยังใช้งานอยู่', async () => {
      await build().findExpiring({ days: 30 }, Role.ADMIN);

      expect(courseDb.findMany.mock.calls[0][0].where).toEqual({
        expiresAt: { gt: NOW, lte: new Date(NOW.getTime() + 30 * 86_400_000) },
        customer: { isActive: true },
      });
    });

    it('คัดคอร์สที่ใช้ครบครั้งแล้วออก — ไม่ใช่รายชื่อที่ต้องโทรตาม', async () => {
      courseDb.findMany.mockResolvedValue([
        purchased(),
        purchased({ id: 'cc_2', usedSessions: 10 }),
      ]);

      const rows = await build().findExpiring({ days: 30 }, Role.ADMIN);

      expect(rows.map((row) => row.id)).toEqual(['cc_1']);
    });

    it('บอกครั้งที่เหลือและจำนวนวันที่เหลือให้ร้านเรียงลำดับการโทรได้', async () => {
      const [row] = await build().findExpiring({ days: 30 }, Role.ADMIN);

      expect(row.remainingSessions).toBe(4);
      expect(row.daysLeft).toBe(20);
    });

    it('ระดับ VIEWER ไม่ได้รับเบอร์โทรติดไปกับรายชื่อ (ข้อกำหนด PDPA)', async () => {
      const [row] = await build().findExpiring({ days: 30 }, Role.VIEWER);

      expect(row.customerPhone).toBeUndefined();
      expect(row.customerName).toBe('สมหญิง ใจดี');
    });
  });

  describe('คอร์สที่ลูกค้าซื้อไว้', () => {
    it('ไม่ระบุอะไร = เห็นเฉพาะคอร์สที่ยังไม่หมดอายุ', async () => {
      await build().findPurchases({ page: 1, limit: 20, skip: 0 }, Role.STAFF);

      expect(courseDb.findMany.mock.calls[0][0].where).toEqual({ expiresAt: { gt: NOW } });
    });

    it('ขอดูของหมดอายุด้วยก็ไม่กรองวันหมดอายุ', async () => {
      await build().findPurchases(
        { page: 1, limit: 20, skip: 0, includeExpired: true, customerId: 'cus_1' },
        Role.STAFF,
      );

      expect(courseDb.findMany.mock.calls[0][0].where).toEqual({ customerId: 'cus_1' });
    });
  });
});
