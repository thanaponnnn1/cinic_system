import { Inject, Injectable, Logger } from '@nestjs/common';
import type IORedis from 'ioredis';
import { MsgType } from '@clinicq/shared';
import { QUEUE_CONNECTION } from '../queue/queue.tokens';
import { ReminderProcessorService } from '../reminders/reminder-processor.service';
import type { ReminderJobData } from '../reminders/reminder-scheduler.service';
import { DigestService } from '../digest/digest.service';

/** ชื่องานตามรอบเวลา */
export const DAILY_DIGEST_JOB = 'daily-digest';
export const HEARTBEAT_JOB = 'heartbeat';

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
  ) {}

  async dispatch(name: string, data: ReminderJobData | undefined): Promise<unknown> {
    if (name === MsgType.REMINDER_1D || name === MsgType.REMINDER_2H) {
      return this.reminders.process(data as ReminderJobData);
    }

    if (name === DAILY_DIGEST_JOB) {
      return this.digest.sendDailyDigest();
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
