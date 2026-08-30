import { Inject, Injectable, Logger } from '@nestjs/common';
import type IORedis from 'ioredis';
import { MsgType } from '@clinicq/shared';
import { QUEUE_CONNECTION } from '../queue/queue.tokens';
import { ReminderProcessorService } from '../reminders/reminder-processor.service';
import type { ReminderJobData } from '../reminders/reminder-scheduler.service';
import { DigestService } from '../digest/digest.service';
import { WinbackService } from '../campaigns/winback.service';
import { CourseExpiryService } from '../courses/course-expiry.service';
import { WaitlistEngineService } from '../waitlist/waitlist-engine.service';
import { ClockService } from '../clock/clock.service';
import {
  WAITLIST_EXPIRE_JOB,
  WAITLIST_MATCH_JOB,
  type WaitlistMatchJobData,
} from '../waitlist/waitlist-queue.service';

/** ชื่องานตามรอบเวลา */
export const DAILY_DIGEST_JOB = 'daily-digest';
export const HEARTBEAT_JOB = 'heartbeat';
export const WINBACK_JOB = 'winback-campaign';
export const COURSE_EXPIRY_JOB = 'course-expiry';

/** คีย์ที่ heartbeat เขียนเวลาล่าสุดไว้ — Phase 8 จะมีตัวเฝ้าระบบมาอ่านค่านี้ */
export const HEARTBEAT_KEY = 'clinicq:worker:heartbeat';

/**
 * ตัวแยกว่างานที่หลุดออกจากคิวเป็นงานอะไร แล้วส่งต่อให้คนที่รับผิดชอบ
 *
 * แยกออกจากตัวสร้าง Worker เพื่อให้เทสต์การแยกงานได้โดยไม่ต้องมี Redis จริง
 */
@Injectable()
export class JobDispatcherService {
  private readonly logger = new Logger(JobDispatcherService.name);

  constructor(
    private readonly reminders: ReminderProcessorService,
    private readonly digest: DigestService,
    @Inject(QUEUE_CONNECTION) private readonly redis: IORedis,
    private readonly waitlist: WaitlistEngineService,
    private readonly clock: ClockService,
    private readonly winback: WinbackService,
    private readonly courseExpiry: CourseExpiryService,
  ) {}

  async dispatch(
    name: string,
    data: ReminderJobData | WaitlistMatchJobData | undefined,
  ): Promise<unknown> {
    // ฝั่ง API เป็นคนกดข้ามเวลาตอนเดโม worker จึงต้องอ่าน offset ล่าสุดก่อนตัดสินใจทุกงาน
    // ไม่ใช่เฉพาะงานเตือนนัด — งานปิดข้อเสนอคิวว่างก็ตัดสินจากเวลาเหมือนกัน
    await this.clock.refresh();

    if (name === MsgType.REMINDER_1D || name === MsgType.REMINDER_2H) {
      return this.reminders.process(data as ReminderJobData);
    }

    if (name === DAILY_DIGEST_JOB) {
      return this.digest.sendDailyDigest();
    }

    if (name === WAITLIST_MATCH_JOB) {
      const slot = data as WaitlistMatchJobData | undefined;

      // ข้อมูลไม่ครบแปลว่างานมาจากรุ่นเก่าหรือถูกแก้มา — ไม่เดาค่าที่หายไปแล้วไปแตะฐานข้อมูล
      if (!slot?.providerId || !slot.serviceId || !slot.slotStart || !slot.slotEnd) {
        this.logger.warn('งานจับคู่คิวว่างข้อมูลไม่ครบ — ข้ามไป');
        return null;
      }

      return this.waitlist.offerSlot({
        providerId: slot.providerId,
        serviceId: slot.serviceId,
        slotStart: new Date(slot.slotStart),
        slotEnd: new Date(slot.slotEnd),
      });
    }

    if (name === WINBACK_JOB) {
      return this.winback.runActiveCampaigns();
    }

    if (name === COURSE_EXPIRY_JOB) {
      return this.courseExpiry.notifyExpiring();
    }

    if (name === WAITLIST_EXPIRE_JOB) {
      return this.waitlist.expireOffers();
    }

    if (name === HEARTBEAT_JOB) {
      await this.redis.set(HEARTBEAT_KEY, new Date().toISOString());
      return true;
    }

    // งานชนิดใหม่ที่ worker รุ่นเก่ายังไม่รู้จัก เกิดได้ตอน deploy ทีละส่วน — ปล่อยผ่านดีกว่าทำให้ล้ม
    this.logger.warn(`ไม่รู้จักงานชนิด "${name}" — ข้ามไป`);
    return null;
  }
}
