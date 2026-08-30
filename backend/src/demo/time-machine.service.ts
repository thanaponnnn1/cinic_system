import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { ClockService } from '../clock/clock.service';
import { REMINDERS_QUEUE_TOKEN } from '../queue/queue.tokens';

export interface AdvanceResult {
  offsetMs: number;
  now: Date;
  /** จำนวนงานที่ถูกดันให้ทำงานทันทีเพราะถึงกำหนดตามเวลาใหม่ */
  promoted: number;
}

/**
 * ปุ่ม "ข้ามเวลา" ของเดโม
 *
 * ขยับ offset อย่างเดียวไม่พอ เพราะ BullMQ นับเวลาจากนาฬิกาจริงของเครื่อง งานเตือนนัด
 * ที่ตั้งไว้พรุ่งนี้จึงยังไม่ยิงแม้ระบบจะเชื่อว่าตอนนี้เป็นพรุ่งนี้แล้ว — ต้องเดินดูงานที่ค้างอยู่
 * แล้วดันตัวที่ถึงกำหนดตามเวลาใหม่ให้ทำงานทันที
 *
 * นี่คือท่อนที่ทำให้เดโมหน้าลูกค้าเป็นไปได้: สร้างนัดพรุ่งนี้ กดข้ามเวลา แล้ว LINE เด้งใน 5 วินาที
 */
@Injectable()
export class TimeMachineService {
  private readonly logger = new Logger(TimeMachineService.name);

  constructor(
    @Inject(REMINDERS_QUEUE_TOKEN) private readonly queue: Queue,
    private readonly clock: ClockService,
  ) {}

  async advance(ms: number): Promise<AdvanceResult> {
    // ClockService เป็นตัวกันไม่ให้ทำนอกโหมดเดโม จึงต้องเรียกก่อนแตะคิว
    const { offsetMs, now } = await this.clock.advance(ms);
    const promoted = await this.promoteDueJobs();

    this.logger.log(`ข้ามเวลาแล้วดันงานที่ถึงกำหนด ${promoted} ใบ`);

    return { offsetMs, now, promoted };
  }

  private async promoteDueJobs(): Promise<number> {
    const virtualNow = Date.now() + this.clock.offsetMs;
    const delayed = await this.queue.getDelayed();
    let promoted = 0;

    for (const job of delayed) {
      const scheduledFor = job.timestamp + (job.opts.delay ?? 0);
      if (scheduledFor > virtualNow) continue;

      try {
        await job.promote();
        promoted += 1;
      } catch (error) {
        // งานอาจถูกลบหรือถูกดันไปแล้วโดยอีกโปรเซส — ใบอื่นต้องไปต่อได้
        this.logger.warn(
          `ดันงาน ${job.id} ไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return promoted;
  }
}
