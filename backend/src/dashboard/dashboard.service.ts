import { Injectable } from '@nestjs/common';
import { ApptStatus, WaitlistStatus } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ClockService } from '../clock/clock.service';
import { bangkokDayRange, formatBangkokDate } from '../common/bangkok-time';
import type {
  DailySummaryDto,
  DashboardKpiDto,
  ProviderSummaryDto,
  RevenuePointDto,
  SummaryQueryDto,
} from './dto/dashboard.dto';

/** คิวที่ยังกินที่ในตาราง = ยังไม่ถูกยกเลิก */
const NOT_CANCELLED = [
  ApptStatus.BOOKED,
  ApptStatus.CONFIRMED,
  ApptStatus.RESCHEDULE_REQUESTED,
  ApptStatus.NO_SHOW,
  ApptStatus.COMPLETED,
];

/** เตือนคอร์สเมื่อเหลืออายุไม่เกินเท่านี้ — ตรงกับ CourseExpiryService */
const EXPIRY_WINDOW_DAYS = 30;

/**
 * ตัวเลขของหน้าสรุปและการ์ดหน้าแรก
 *
 * คำนวณจากนัดและ CampaignRun ตรง ๆ ทุกครั้ง ไม่มีตารางสรุปแยก เพราะตารางสรุปที่อัปเดต
 * ไม่ทันคือที่มาของหน้าจอที่เล่าคนละเรื่องกับฐานข้อมูล ซึ่งพังความเชื่อถือทันทีที่ลูกค้าจับได้
 *
 * ปริมาณข้อมูลของร้านเดียวเล็กมาก (หลักพันแถวต่อปี) การนับสดจึงเร็วกว่าการดูแลตารางสรุปให้ถูก
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
  ) {}

  async summary(query: SummaryQueryDto): Promise<DailySummaryDto> {
    const now = this.clock.now();
    const date = query.date ?? formatBangkokDate(now);
    const today = bangkokDayRange(date);
    // ปลายวันนี้คือต้นวันพรุ่งนี้พอดี ไม่ต้องบวกวันแล้วแปลงกลับให้มีโอกาสพลาด
    const tomorrow = { start: today.end, end: new Date(today.end.getTime() + 86_400_000) };

    const [appointments, providers, tomorrowCount] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { startsAt: { gte: today.start, lt: today.end } },
        select: {
          status: true,
          providerId: true,
          service: { select: { price: true } },
        },
      }),
      this.prisma.provider.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.appointment.count({
        where: {
          startsAt: { gte: tomorrow.start, lt: tomorrow.end },
          status: { in: [ApptStatus.BOOKED, ApptStatus.CONFIRMED] },
        },
      }),
    ]);

    const rows = new Map<string, ProviderSummaryDto>(
      providers.map((p) => [
        p.id,
        { providerId: p.id, name: p.name, completed: 0, booked: 0, noShow: 0, revenue: 0 },
      ]),
    );

    let revenue = 0;
    let expectedRevenue = 0;
    let completed = 0;
    let noShow = 0;
    let cancelled = 0;

    for (const appointment of appointments) {
      const price = Number(appointment.service.price.toString());
      const row = rows.get(appointment.providerId);

      if (appointment.status === ApptStatus.CANCELLED) {
        cancelled += 1;
        continue;
      }

      expectedRevenue += price;
      if (row) row.booked += 1;

      if (appointment.status === ApptStatus.NO_SHOW) {
        noShow += 1;
        if (row) row.noShow += 1;
      }

      if (appointment.status === ApptStatus.COMPLETED) {
        completed += 1;
        revenue += price;
        if (row) {
          row.completed += 1;
          row.revenue += price;
        }
      }
    }

    return {
      date,
      revenue,
      expectedRevenue,
      completed,
      noShow,
      cancelled,
      tomorrowCount,
      byProvider: [...rows.values()].sort((a, b) => b.revenue - a.revenue),
    };
  }

  async kpi(): Promise<DashboardKpiDto> {
    const now = this.clock.now();
    const today = bangkokDayRange(formatBangkokDate(now));
    const monthStart = bangkokDayRange(`${formatBangkokDate(now).slice(0, 7)}-01`).start;

    const [last7Days, todayAppointments, rescued, winback, noShowThisMonth, expiringCourses] =
      await Promise.all([
        this.revenueByDay(now, 7),
        this.prisma.appointment.count({
          where: {
            startsAt: { gte: today.start, lt: today.end },
            status: { in: NOT_CANCELLED },
          },
        }),
        this.prisma.waitlistEntry.count({
          where: { status: WaitlistStatus.CLAIMED, updatedAt: { gte: monthStart } },
        }),
        this.prisma.campaignRun.aggregate({
          where: { returnedAt: { gte: monthStart } },
          _count: true,
          _sum: { revenue: true },
        }),
        this.prisma.appointment.count({
          where: { startsAt: { gte: monthStart }, status: ApptStatus.NO_SHOW },
        }),
        this.countExpiringCourses(now),
      ]);

    // ชุดข้อมูลย้อนหลัง 7 วันเรียงเก่าไปใหม่ ตัวสุดท้ายคือวันนี้ ตัวก่อนหน้าคือเมื่อวาน
    const todayRevenue = last7Days.at(-1)?.revenue ?? 0;
    const yesterdayRevenue = last7Days.at(-2)?.revenue ?? 0;

    return {
      todayRevenue,
      yesterdayRevenue,
      todayCases: todayAppointments,
      rescuedSlotsThisMonth: rescued,
      winbackReturnedThisMonth: winback._count,
      winbackRevenueThisMonth: Number(winback._sum.revenue ?? 0),
      noShowThisMonth,
      expiringCourses,
      last7Days,
    };
  }

  /** รายได้รายวันย้อนหลัง n วัน (รวมวันนี้) — คิดจากนัดที่ปิดงานแล้วเท่านั้น */
  private async revenueByDay(now: Date, days: number): Promise<RevenuePointDto[]> {
    const oldest = bangkokDayRange(
      formatBangkokDate(new Date(now.getTime() - (days - 1) * 86_400_000)),
    ).start;
    const end = bangkokDayRange(formatBangkokDate(now)).end;

    const appointments = await this.prisma.appointment.findMany({
      where: {
        startsAt: { gte: oldest, lt: end },
        status: ApptStatus.COMPLETED,
      },
      select: { startsAt: true, service: { select: { price: true } } },
    });

    const buckets = new Map<string, RevenuePointDto>();

    for (let i = 0; i < days; i += 1) {
      const date = formatBangkokDate(new Date(now.getTime() - (days - 1 - i) * 86_400_000));
      buckets.set(date, { date, revenue: 0, completed: 0 });
    }

    for (const appointment of appointments) {
      const bucket = buckets.get(formatBangkokDate(appointment.startsAt));
      if (!bucket) continue;

      bucket.revenue += Number(appointment.service.price.toString());
      bucket.completed += 1;
    }

    return [...buckets.values()];
  }

  /**
   * คอร์สที่ใกล้หมดอายุและยังมีครั้งเหลือ
   *
   * ต้องคัดคอร์สที่ใช้ครบแล้วออกด้วยโค้ด เพราะจำนวนครั้งทั้งหมดอยู่คนละตารางกับ
   * จำนวนครั้งที่ใช้ไป — เหตุผลเดียวกับ CoursesService.findExpiring()
   */
  private async countExpiringCourses(now: Date): Promise<number> {
    const rows = await this.prisma.customerCourse.findMany({
      where: {
        expiresAt: { gt: now, lte: new Date(now.getTime() + EXPIRY_WINDOW_DAYS * 86_400_000) },
        customer: { isActive: true },
      },
      select: { usedSessions: true, package: { select: { totalSessions: true } } },
    });

    return rows.filter((row) => row.usedSessions < row.package.totalSessions).length;
  }
}
