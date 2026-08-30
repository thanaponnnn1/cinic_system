import { ApptStatus, WaitlistStatus } from '@clinicq/shared';
import { DashboardService } from './dashboard.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { ClockService } from '../clock/clock.service';

const NOW = new Date('2026-09-10T10:00:00.000Z'); // 17:00 น. ตามเวลาไทย

function appt(status: ApptStatus, providerId: string, price: number, startsAt = NOW) {
  return { status, providerId, startsAt, service: { price } };
}

describe('DashboardService', () => {
  const appointmentDb = { findMany: jest.fn(), count: jest.fn() };
  const providerDb = { findMany: jest.fn() };
  const waitlistDb = { count: jest.fn() };
  const campaignRunDb = { aggregate: jest.fn() };
  const courseDb = { findMany: jest.fn() };

  function build(): DashboardService {
    return new DashboardService(
      {
        appointment: appointmentDb,
        provider: providerDb,
        waitlistEntry: waitlistDb,
        campaignRun: campaignRunDb,
        customerCourse: courseDb,
      } as unknown as PrismaService,
      { now: () => NOW, refresh: jest.fn() } as unknown as ClockService,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    appointmentDb.findMany.mockResolvedValue([]);
    appointmentDb.count.mockResolvedValue(0);
    providerDb.findMany.mockResolvedValue([
      { id: 'prov_1', name: 'คุณแนน' },
      { id: 'prov_2', name: 'คุณเบส' },
    ]);
    waitlistDb.count.mockResolvedValue(0);
    campaignRunDb.aggregate.mockResolvedValue({ _count: 0, _sum: { revenue: null } });
    courseDb.findMany.mockResolvedValue([]);
  });

  describe('สรุปรายวัน', () => {
    beforeEach(() => {
      appointmentDb.findMany.mockResolvedValue([
        appt(ApptStatus.COMPLETED, 'prov_1', 1500),
        appt(ApptStatus.COMPLETED, 'prov_1', 900),
        appt(ApptStatus.COMPLETED, 'prov_2', 2200),
        appt(ApptStatus.BOOKED, 'prov_2', 600),
        appt(ApptStatus.NO_SHOW, 'prov_1', 800),
        appt(ApptStatus.CANCELLED, 'prov_2', 3000),
      ]);
      appointmentDb.count.mockResolvedValue(5);
    });

    it('รายได้จริงนับเฉพาะเคสที่ปิดงานแล้ว', async () => {
      const summary = await build().summary({ date: '2026-09-10' });

      expect(summary.revenue).toBe(4600);
      expect(summary.completed).toBe(3);
    });

    it('รายได้ที่คาดว่าจะได้ไม่นับคิวที่ยกเลิก แต่นับคิวที่ยังไม่ถึงเวลา', async () => {
      const summary = await build().summary({ date: '2026-09-10' });

      // 1500 + 900 + 2200 + 600 + 800 = 6000 โดยตัดใบที่ยกเลิก 3000 ออก
      expect(summary.expectedRevenue).toBe(6000);
      expect(summary.cancelled).toBe(1);
    });

    it('แยกยอดต่อช่าง เรียงจากคนที่ทำรายได้มากที่สุด', async () => {
      const summary = await build().summary({ date: '2026-09-10' });

      expect(summary.byProvider.map((p) => [p.name, p.revenue])).toEqual([
        ['คุณแนน', 2400],
        ['คุณเบส', 2200],
      ]);
      expect(summary.byProvider[0].noShow).toBe(1);
    });

    it('ไม่ระบุวันที่ = ใช้วันนี้ตามเวลาของระบบ ไม่ใช่นาฬิกาเครื่อง', async () => {
      const summary = await build().summary({});

      expect(summary.date).toBe('2026-09-10');
    });
  });

  describe('การ์ดหน้าแรก', () => {
    it('รายได้ 7 วันเรียงเก่าไปใหม่ ครบทุกวันแม้วันที่ไม่มีเคส', async () => {
      appointmentDb.findMany.mockImplementation(({ where }: { where: { status?: string } }) =>
        where.status === ApptStatus.COMPLETED
          ? Promise.resolve([
              appt(ApptStatus.COMPLETED, 'prov_1', 1500, new Date('2026-09-10T03:00:00.000Z')),
              appt(ApptStatus.COMPLETED, 'prov_1', 900, new Date('2026-09-08T03:00:00.000Z')),
            ])
          : Promise.resolve([]),
      );

      const kpi = await build().kpi();

      expect(kpi.last7Days).toHaveLength(7);
      expect(kpi.last7Days.at(0)?.date).toBe('2026-09-04');
      expect(kpi.last7Days.at(-1)).toEqual({ date: '2026-09-10', revenue: 1500, completed: 1 });
      expect(kpi.todayRevenue).toBe(1500);
    });

    it('นับคิวที่ขายต่อได้จากใบจองคิวรอที่ถูกกดรับในเดือนนี้', async () => {
      waitlistDb.count.mockResolvedValue(3);

      const kpi = await build().kpi();

      expect(waitlistDb.count.mock.calls[0][0].where.status).toBe(WaitlistStatus.CLAIMED);
      expect(kpi.rescuedSlotsThisMonth).toBe(3);
    });

    it('รวมผลแคมเปญของเดือนนี้ ทั้งจำนวนคนและรายได้', async () => {
      campaignRunDb.aggregate.mockResolvedValue({ _count: 4, _sum: { revenue: 6800 } });

      const kpi = await build().kpi();

      expect(kpi.winbackReturnedThisMonth).toBe(4);
      expect(kpi.winbackRevenueThisMonth).toBe(6800);
    });

    it('นับคอร์สใกล้หมดอายุเฉพาะใบที่ยังมีครั้งเหลือ', async () => {
      courseDb.findMany.mockResolvedValue([
        { usedSessions: 6, package: { totalSessions: 10 } },
        { usedSessions: 10, package: { totalSessions: 10 } },
      ]);

      const kpi = await build().kpi();

      expect(kpi.expiringCourses).toBe(1);
    });
  });
});
