import { Injectable, Logger } from '@nestjs/common';
import { DeliveryStatus, MsgType } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line/line-messaging.service';
import { ClockService } from '../clock/clock.service';
import { sleep } from '../common/sleep';
import { daysBetween } from './dto/course.dto';
import { formatCourseExpiry, type ExpiringCourseLine } from './course-expiry-message';

/** เตือนเมื่อเหลืออายุไม่เกิน 30 วัน — นานพอที่ลูกค้าจะหาคิวมาใช้ให้ครบได้จริง */
export const EXPIRY_WINDOW_DAYS = 30;

/**
 * เว้นระยะการเตือนคนเดิม
 *
 * ยาวเท่ากับช่วงที่เฝ้าอยู่พอดี ลูกค้าหนึ่งคนจึงได้รับข้อความเรื่องคอร์สอย่างมากหนึ่งฉบับ
 * ต่อหนึ่งช่วงหมดอายุ — งานนี้ทำงานทุกวัน ถ้าไม่มีตัวกันนี้ลูกค้าจะโดนทวงคอร์สทุกเช้า 30 วันติด
 */
export const RENOTIFY_AFTER_DAYS = 30;

/** หน่วงจังหวะเท่ากับแคมเปญดึงลูกค้ากลับ ด้วยเหตุผลเดียวกันคือ rate limit ของ LINE */
const THROTTLE_MS = 1_000;

export interface CourseExpiryResult {
  /** จำนวนคนที่ได้รับข้อความจริง */
  notified: number;
  /** จำนวนคนที่เข้าเกณฑ์แต่เพิ่งได้รับข้อความไปแล้วในรอบนี้ */
  skipped: number;
  failed: number;
}

/**
 * งานรายวันที่เตือนลูกค้าเรื่องคอร์สใกล้หมดอายุ
 *
 * ฝั่งร้านไม่ได้เตือนด้วยข้อความ แต่ดูจาก GET /api/courses/expiring ซึ่งเป็นรายชื่อ
 * ที่เรียงตามวันหมดอายุอยู่แล้ว — เอาไว้ไล่โทรตามได้ทันที
 *
 * ความยินยอมที่ใช้คือ consentReminder ไม่ใช่ consentMarketing เพราะนี่เป็นข้อความเกี่ยวกับ
 * ของที่ลูกค้าจ่ายเงินซื้อไปแล้วและกำลังจะหมดอายุ ไม่ใช่การเสนอขายของใหม่
 */
@Injectable()
export class CourseExpiryService {
  private readonly logger = new Logger(CourseExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly line: LineMessagingService,
    private readonly clock: ClockService,
  ) {}

  async notifyExpiring(): Promise<CourseExpiryResult> {
    const now = this.clock.now();
    const until = new Date(now.getTime() + EXPIRY_WINDOW_DAYS * 86_400_000);
    const result: CourseExpiryResult = { notified: 0, skipped: 0, failed: 0 };

    const courses = await this.prisma.customerCourse.findMany({
      where: {
        expiresAt: { gt: now, lte: until },
        // คัดคนที่ส่งไม่ได้ออกตั้งแต่ในคำสั่งค้นหา ข้อความจึงไม่มีทางออกไปหาคนที่ไม่ยินยอม
        customer: { isActive: true, lineUserId: { not: null }, consentReminder: true },
      },
      include: {
        customer: { select: { id: true, name: true, lineUserId: true } },
        package: { select: { name: true, totalSessions: true } },
      },
      orderBy: { expiresAt: 'asc' },
    });

    const pending = courses.filter((course) => course.usedSessions < course.package.totalSessions);

    if (pending.length === 0) {
      this.logger.log('ไม่มีคอร์สที่ใกล้หมดอายุและยังมีครั้งเหลือ');
      return result;
    }

    const recentlyNotified = await this.recentlyNotified(
      [...new Set(pending.map((course) => course.customer.id))],
      now,
    );

    // รวมเป็นข้อความเดียวต่อลูกค้าหนึ่งคน คนที่มีสองคอร์สจะได้ข้อความเดียวที่มีสองบรรทัด
    // ไม่ใช่สองฉบับติดกัน ซึ่งอ่านแล้วเหมือนระบบส่งซ้ำ
    const byCustomer = new Map<
      string,
      { name: string; lineUserId: string; lines: ExpiringCourseLine[] }
    >();

    for (const course of pending) {
      const { customer } = course;
      if (!customer.lineUserId) continue;

      const entry = byCustomer.get(customer.id) ?? {
        name: customer.name,
        lineUserId: customer.lineUserId,
        lines: [],
      };

      entry.lines.push({
        packageName: course.package.name,
        remainingSessions: course.package.totalSessions - course.usedSessions,
        expiresAt: course.expiresAt,
        daysLeft: daysBetween(now, course.expiresAt),
      });

      byCustomer.set(customer.id, entry);
    }

    let index = 0;

    for (const [customerId, entry] of byCustomer) {
      if (recentlyNotified.has(customerId)) {
        result.skipped += 1;
        continue;
      }

      if (index > 0) await sleep(THROTTLE_MS);
      index += 1;

      const sent = await this.line.pushText(
        entry.lineUserId,
        formatCourseExpiry(entry.name, entry.lines),
      );

      await this.prisma.messageLog.create({
        data: {
          customerId,
          type: MsgType.COURSE_EXPIRY,
          deliveryStatus: sent ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
          errorMessage: sent ? null : 'ส่งข้อความเตือนคอร์สใกล้หมดอายุผ่าน LINE ไม่สำเร็จ',
          sentAt: now,
        },
      });

      if (sent) result.notified += 1;
      else result.failed += 1;
    }

    this.logger.log(
      `เตือนคอร์สใกล้หมดอายุ ${result.notified} คน · ข้ามเพราะเพิ่งเตือนไป ${result.skipped} คน`,
    );

    return result;
  }

  /** ใครเพิ่งได้รับข้อความเรื่องคอร์สไปแล้วในรอบนี้ */
  private async recentlyNotified(customerIds: string[], now: Date): Promise<Set<string>> {
    const since = new Date(now.getTime() - RENOTIFY_AFTER_DAYS * 86_400_000);

    const logs = await this.prisma.messageLog.findMany({
      where: {
        customerId: { in: customerIds },
        type: MsgType.COURSE_EXPIRY,
        deliveryStatus: DeliveryStatus.SENT,
        sentAt: { gte: since },
      },
      select: { customerId: true },
    });

    return new Set(logs.map((log) => log.customerId));
  }
}
