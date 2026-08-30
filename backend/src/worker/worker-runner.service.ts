import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import type IORedis from 'ioredis';
import { REMINDERS_QUEUE } from '../reminders/reminder-schedule';
import { QUEUE_CONNECTION, REMINDERS_QUEUE_TOKEN } from '../queue/queue.tokens';
import type { Queue } from 'bullmq';
import type { ReminderJobData } from '../reminders/reminder-scheduler.service';
import { DAILY_DIGEST_JOB, HEARTBEAT_JOB, JobDispatcherService } from './job-dispatcher.service';

/** ส่งสรุปปิดร้านสามทุ่มตามเวลาไทย — หลังร้านปิดแต่ยังไม่ดึกเกินกว่าที่เจ้าของร้านจะอ่าน */
const DAILY_DIGEST_CRON = '0 21 * * *';

/** เต้นทุก 5 นาที ตัวเฝ้าระบบภายนอกจะจับได้เร็วเมื่อ worker ตาย (ใช้ต่อใน Phase 8) */
const HEARTBEAT_CRON = '*/5 * * * *';

/**
 * ตัวที่ทำให้ worker เป็น worker จริง ๆ
 *
 * รันแยกโปรเซสจาก API เพราะงานเตือนนัดต้องตื่นตลอด 24 ชั่วโมง ไม่ได้ผูกกับการมีคนเปิดหน้าจอ
 * และการแยกโปรเซสทำให้คำขอจากลูกค้าไม่ถูกงานเบื้องหลังแย่งเวลา CPU ไป
 */
@Injectable()
export class WorkerRunnerService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(WorkerRunnerService.name);
  private worker?: Worker;

  constructor(
    private readonly dispatcher: JobDispatcherService,
    @Inject(QUEUE_CONNECTION) private readonly redis: IORedis,
    @Inject(REMINDERS_QUEUE_TOKEN) private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.registerRepeatableJobs();

    this.worker = new Worker(
      REMINDERS_QUEUE,
      (job: Job<ReminderJobData | undefined>) => this.dispatcher.dispatch(job.name, job.data),
      {
        connection: this.redis.duplicate(),
        // ส่งทีละ 5 งานพอ — LINE มี rate limit และงานเตือนนัดไม่ได้เร่งด่วนระดับวินาที
        concurrency: 5,
      },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(`งาน ${job?.name} (${job?.id}) ล้มเหลว: ${error.message}`);
    });

    this.logger.log(`worker พร้อมรับงานจากคิว "${REMINDERS_QUEUE}"`);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }

  /**
   * งานตามรอบเวลา ตั้งด้วย jobId คงที่ทุกครั้งที่ worker ขึ้น
   *
   * upsertJobScheduler ใช้ id เดิมทับของเก่าเสมอ การรีสตาร์ต worker จึงไม่ทำให้มีงาน
   * สรุปปิดร้านซ้อนกันหลายใบ ซึ่งจะกลายเป็นข้อความซ้ำในแชทเจ้าของร้าน
   */
  private async registerRepeatableJobs(): Promise<void> {
    await this.queue.upsertJobScheduler(
      DAILY_DIGEST_JOB,
      { pattern: DAILY_DIGEST_CRON, tz: 'Asia/Bangkok' },
      { name: DAILY_DIGEST_JOB, opts: { removeOnComplete: { count: 30 } } },
    );

    await this.queue.upsertJobScheduler(
      HEARTBEAT_JOB,
      { pattern: HEARTBEAT_CRON },
      {
        name: HEARTBEAT_JOB,
        opts: { removeOnComplete: { count: 5 }, removeOnFail: { count: 5 } },
      },
    );
  }
}
