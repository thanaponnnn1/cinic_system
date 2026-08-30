import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { REMINDERS_QUEUE_TOKEN } from '../queue/queue.tokens';
import { OFFER_TTL_MS, type OpenSlot } from './waitlist-engine.service';

export const WAITLIST_MATCH_JOB = 'waitlist-match';
export const WAITLIST_EXPIRE_JOB = 'waitlist-expire';

/** ข้อมูลงานเสนอคิวว่าง — เก็บเวลาเป็นสตริง เพราะ payload ของคิวเป็น JSON */
export interface WaitlistMatchJobData {
  providerId: string;
  serviceId: string;
  slotStart: string;
  slotEnd: string;
}

/**
 * ฝั่งตั้งงานของคิวรอ (producer)
 *
 * แยกจาก WaitlistEngineService เพื่อให้โมดูลนัดหมายสั่งงานได้โดยไม่ต้องลากระบบส่งข้อความ
 * เข้ามาด้วย ซึ่งจะทำให้โมดูลอ้างวนกัน — หลักการเดียวกับงานเตือนนัดใน Phase 4
 */
@Injectable()
export class WaitlistQueueService {
  private readonly logger = new Logger(WaitlistQueueService.name);

  constructor(@Inject(REMINDERS_QUEUE_TOKEN) private readonly queue: Queue) {}

  /**
   * ประกาศว่ามีคิวว่างเกิดขึ้น แล้วตั้งงานปิดข้อเสนอไว้ล่วงหน้าด้วย
   *
   * กลืน error ของคิวไว้เอง เพราะสิ่งที่เพิ่งเกิดคือการยกเลิกนัดซึ่งสำเร็จไปแล้ว
   * ถ้าโยนต่อ ผู้ใช้จะเห็นว่ายกเลิกไม่สำเร็จทั้งที่นัดถูกยกเลิกจริง
   */
  async publishOpenSlot(slot: OpenSlot): Promise<void> {
    const data: WaitlistMatchJobData = {
      providerId: slot.providerId,
      serviceId: slot.serviceId,
      slotStart: slot.slotStart.toISOString(),
      slotEnd: slot.slotEnd.toISOString(),
    };

    try {
      await this.queue.add(WAITLIST_MATCH_JOB, data as never, {
        removeOnComplete: { age: 7 * 24 * 3600 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
      });

      await this.queue.add(WAITLIST_EXPIRE_JOB, data as never, {
        // jobId ผูกกับช่างและเวลาของคิว — ยกเลิกนัดซ้ำช่องเดิมจะไม่ได้งานปิดข้อเสนอซ้อนกัน
        // ห้ามมีทวิภาคใน jobId (BullMQ ปฏิเสธ) จึงตัดออกจากเวลาที่เอามาต่อ
        jobId: `${WAITLIST_EXPIRE_JOB}-${slot.providerId}-${slot.slotStart.toISOString()}`.replace(
          /:/g,
          '',
        ),
        delay: OFFER_TTL_MS,
        removeOnComplete: { age: 24 * 3600 },
      });
    } catch (error) {
      this.logger.error(
        `ตั้งงานเสนอคิวว่างไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
