import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ApptStatus } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ClockService } from '../clock/clock.service';
import { ReminderSchedulerService } from '../reminders/reminder-scheduler.service';
import { buildDemoSchedule, latestCompletedStartByCustomer } from './demo-schedule';

/** ลูกค้าที่มาภายในกี่วันถึงถูกใส่ในตารางเดโม — ตรงกับเกณฑ์ "หายไป" ของแคมเปญดึงลูกค้ากลับ */
const ACTIVE_WITHIN_DAYS = 90;

export interface DemoResetResult {
  now: Date;
  deleted: { appointments: number; waitlistEntries: number; messageLogs: number };
  created: { total: number; byStatus: Partial<Record<ApptStatus, number>> };
  /** นัดที่ตั้งงานเตือนให้ใหม่ — นัดที่เหลือไม่ถึง 2 ชั่วโมงผ่าน sync แล้วจะไม่มีงานในคิว */
  remindersSynced: number;
  /** ลูกค้าที่วันที่มาล่าสุดถูกขยับมาตรงกับนัดที่เสร็จแล้วในตารางใหม่ */
  lastVisitsAdvanced: number;
}

/**
 * รีเซ็ตข้อมูลนัดของเดโมให้บอร์ดคิวดูมีชีวิตทุกครั้งก่อนอัดคลิปหรือเข้าพบลูกค้า
 *
 * ลบเฉพาะนัด คิวรอ และบันทึกข้อความที่ผูกกับนัด ไม่แตะคอร์สหรือแคมเปญ
 * เพราะตัวเลข ROI ของแคมเปญดึงลูกค้ากลับคือสไลด์ปิดการขาย ต้องเหมือนเดิมทุกครั้ง
 * ลูกค้าในตารางจึงคัดเฉพาะคนที่มาภายใน 90 วัน กลุ่มเป้าหมายแคมเปญจะได้ไม่เปลี่ยน
 * ในตัวลูกค้าแก้แค่วันที่มาล่าสุด ให้ตรงกับนัดที่เสร็จแล้วบนบอร์ด
 */
@Injectable()
export class DemoDataService {
  private readonly logger = new Logger(DemoDataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly reminders: ReminderSchedulerService,
  ) {}

  async reset(): Promise<DemoResetResult> {
    if (!this.clock.demoMode) {
      throw new ForbiddenException('รีเซ็ตข้อมูลเดโมใช้ได้เฉพาะโหมดเดโมเท่านั้น');
    }

    // คืนนาฬิกาก่อนวางตาราง ไม่งั้น "วันนี้" ของบอร์ดคือวันที่ปุ่มข้ามเวลาพาไป
    await this.clock.reset();
    const now = this.clock.now();

    const [providers, services, customers] = await Promise.all([
      this.prisma.provider.findMany({
        where: { isActive: true },
        select: { id: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.service.findMany({
        where: { isActive: true },
        select: { id: true, durationMin: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.customer.findMany({
        where: {
          isActive: true,
          lastVisitAt: { gte: new Date(now.getTime() - ACTIVE_WITHIN_DAYS * 86_400_000) },
        },
        select: { id: true },
        orderBy: { phone: 'asc' },
      }),
    ]);

    const plan = buildDemoSchedule({
      now,
      providers,
      services,
      customerIds: customers.map((c) => c.id),
    });

    const { removedIds, deleted, created, lastVisitsAdvanced } = await this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.appointment.findMany({ select: { id: true } });
        const waitlistEntries = await tx.waitlistEntry.deleteMany({});
        const messageLogs = await tx.messageLog.deleteMany({
          where: { appointmentId: { not: null } },
        });
        const appointments = await tx.appointment.deleteMany({});
        const rows = await tx.appointment.createManyAndReturn({
          data: plan,
          select: { id: true, startsAt: true, status: true },
        });

        // ไม่งั้นหน้าลูกค้าบอก "หายไป 76 วัน" ทั้งที่บอร์ดมีนัดเสร็จแล้วของคนนั้นเมื่อวาน
        // เงื่อนไข lt ทำให้วันที่ขยับไปข้างหน้าเท่านั้น ลูกค้าในตารางมาภายใน 90 วันอยู่แล้ว
        // กลุ่มเป้าหมายแคมเปญดึงลูกค้ากลับจึงเหมือนเดิม
        let lastVisitsAdvanced = 0;
        for (const [customerId, startsAt] of latestCompletedStartByCustomer(plan)) {
          const { count } = await tx.customer.updateMany({
            where: {
              id: customerId,
              OR: [{ lastVisitAt: null }, { lastVisitAt: { lt: startsAt } }],
            },
            data: { lastVisitAt: startsAt },
          });
          lastVisitsAdvanced += count;
        }

        return {
          removedIds: existing.map((a) => a.id),
          deleted: {
            appointments: appointments.count,
            waitlistEntries: waitlistEntries.count,
            messageLogs: messageLogs.count,
          },
          created: rows,
          lastVisitsAdvanced,
        };
      },
    );

    // คิวงานอยู่นอกธุรกรรมของฐานข้อมูล จึงทำหลัง commit — งานเตือนของนัดที่ลบไปแล้วต้องไม่ยิง
    for (const id of removedIds) await this.reminders.cancel(id);

    const upcoming = created.filter(
      (a) =>
        a.startsAt > now && (a.status === ApptStatus.BOOKED || a.status === ApptStatus.CONFIRMED),
    );
    for (const a of upcoming) await this.reminders.sync(a.id, a.startsAt);

    const byStatus: Partial<Record<ApptStatus, number>> = {};
    for (const a of created) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;

    this.logger.log(
      `รีเซ็ตข้อมูลเดโม — ลบนัด ${deleted.appointments} ใบ สร้างใหม่ ${created.length} ใบ`,
    );

    return {
      now,
      deleted,
      created: { total: created.length, byStatus },
      remindersSynced: upcoming.length,
      lastVisitsAdvanced,
    };
  }
}
