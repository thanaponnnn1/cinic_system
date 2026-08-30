import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { MsgType } from '@clinicq/shared';
import { ClockService } from '../clock/clock.service';
import { REMINDERS_QUEUE_TOKEN } from '../queue/queue.tokens';
import { plannedReminders, reminderJobId } from './reminder-schedule';

/** ข้อมูลที่ worker ต้องใช้ตอนงานถึงกำหนด — เก็บให้น้อยที่สุด ของจริงอ่านจากฐานข้อมูลตอนนั้น */
export interface ReminderJobData {
  appointmentId: string;
  type: MsgType;
}

const REMINDER_TYPES = [MsgType.REMINDER_1D, MsgType.REMINDER_2H] as const;

/**
 * ผู้ตั้งงานเตือนนัด (ฝั่ง producer)
 *
 * อยู่คนละโมดูลกับตัวประมวลผลงาน เพื่อให้โมดูลนัดหมายตั้งงานได้โดยไม่ต้องรู้จัก
 * ระบบส่งข้อความเลย — ตัดวงจรพึ่งพากันระหว่างโมดูล
 *
 * ทุกเมธอดกลืน error ของคิวไว้เอง เพราะการจองนัดสำคัญกว่าข้อความเตือน:
 * Redis ล่มแล้วลูกค้าจองคิวไม่ได้คือความเสียหายที่หนักกว่าไม่ได้รับข้อความเตือน
 */
@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    @Inject(REMINDERS_QUEUE_TOKEN) private readonly queue: Queue<ReminderJobData>,
    private readonly clock: ClockService,
  ) {}

  /**
   * ตั้งงานเตือนของนัดหนึ่งใบให้ตรงกับเวลาปัจจุบันของนัด
   *
   * ลบของเก่าก่อนเสมอ เพราะ "เลื่อนนัด" คือการตั้งเวลาใหม่ ถ้าไม่ลบ งานของเวลาเดิม
   * จะยังค้างอยู่ในคิวและยิงข้อความที่บอกเวลาผิด
   */
  async sync(appointmentId: string, startsAt: Date): Promise<void> {
    await this.cancel(appointmentId);

    const jobs = plannedReminders(startsAt, this.clock.now());

    for (const job of jobs) {
      try {
        await this.queue.add(
          job.type,
          { appointmentId, type: job.type },
          {
            jobId: reminderJobId(appointmentId, job.type),
            delay: job.delayMs,
            removeOnComplete: { age: 7 * 24 * 3600 },
            removeOnFail: false,
            attempts: 3,
            backoff: { type: 'exponential', delay: 30_000 },
          },
        );
      } catch (error) {
        this.logger.error(
          `ตั้งงาน ${job.type} ของนัด ${appointmentId} ไม่สำเร็จ: ${describe(error)}`,
        );
      }
    }
  }

  /** ลบงานเตือนทั้งหมดของนัดนี้ — ใช้ตอนยกเลิก ปิดงาน หรือก่อนตั้งใหม่ */
  async cancel(appointmentId: string): Promise<void> {
    for (const type of REMINDER_TYPES) {
      try {
        await this.queue.remove(reminderJobId(appointmentId, type));
      } catch {
        // งานไม่อยู่ในคิวแล้ว (ยิงไปแล้วหรือไม่เคยตั้ง) ถือว่าเป้าหมายสำเร็จอยู่แล้ว
      }
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
