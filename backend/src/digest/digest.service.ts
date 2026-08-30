import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApptStatus } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line/line-messaging.service';
import { ClockService } from '../clock/clock.service';
import { bangkokDayRange, formatBangkokDate } from '../common/bangkok-time';
import { type DailyDigest, formatDailyDigest } from './digest-message';

/** สถานะที่ยังนับเป็นคิวของวันพรุ่งนี้ */
const ACTIVE = [ApptStatus.BOOKED, ApptStatus.CONFIRMED];

/**
 * สรุปปิดร้านรายวันที่ส่งเข้า LINE ของเจ้าของร้าน
 *
 * ตัวเลขชุดนี้คือเหตุผลที่เจ้าของร้านเปิดแอปทุกวัน — รายได้ จำนวนเคสต่อช่าง คิวที่หลุด
 * และคิวของพรุ่งนี้ ทั้งหมดคำนวณจากนัดของวันนั้นตรง ๆ ไม่มีตารางสรุปแยกให้ข้อมูลเพี้ยนกัน
 */
@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly line: LineMessagingService,
    private readonly clock: ClockService,
    private readonly config: ConfigService,
  ) {}

  async buildDigest(): Promise<DailyDigest> {
    const now = this.clock.now();
    const today = bangkokDayRange(formatBangkokDate(now));
    const tomorrow = bangkokDayRange(formatBangkokDate(new Date(now.getTime() + 86_400_000)));

    const [appointments, tomorrowCount] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { startsAt: { gte: today.start, lt: today.end } },
        select: {
          status: true,
          provider: { select: { name: true } },
          service: { select: { price: true } },
        },
      }),
      this.prisma.appointment.count({
        where: { startsAt: { gte: tomorrow.start, lt: tomorrow.end }, status: { in: ACTIVE } },
      }),
    ]);

    const byProvider = new Map<string, { name: string; completed: number; revenue: number }>();
    let revenue = 0;
    let completed = 0;
    let noShow = 0;
    let cancelled = 0;

    for (const appointment of appointments) {
      if (appointment.status === ApptStatus.NO_SHOW) noShow += 1;
      if (appointment.status === ApptStatus.CANCELLED) cancelled += 1;
      if (appointment.status !== ApptStatus.COMPLETED) continue;

      // Prisma คืน Decimal มา ต้องแปลงเป็นตัวเลขก่อนบวก ไม่งั้นจะได้สตริงต่อกัน
      const price = Number(appointment.service.price);
      const name = appointment.provider.name;
      const row = byProvider.get(name) ?? { name, completed: 0, revenue: 0 };

      row.completed += 1;
      row.revenue += price;
      byProvider.set(name, row);

      completed += 1;
      revenue += price;
    }

    return {
      date: now,
      revenue,
      completed,
      noShow,
      cancelled,
      byProvider: [...byProvider.values()].sort((a, b) => b.revenue - a.revenue),
      tomorrowCount,
    };
  }

  /** คืน true เมื่อส่งออกจริง — false แปลว่ายังไม่ได้ตั้งค่าปลายทางไว้ */
  async sendDailyDigest(): Promise<boolean> {
    const adminUserId = this.config.get<string>('LINE_ADMIN_USER_ID');

    if (!adminUserId) {
      this.logger.warn('ยังไม่ได้ตั้ง LINE_ADMIN_USER_ID — ไม่มีใครได้รับสรุปปิดร้าน');
      return false;
    }

    const digest = await this.buildDigest();

    return this.line.pushText(adminUserId, formatDailyDigest(digest));
  }
}
