import { Module } from '@nestjs/common';
import { ClockModule } from '../clock/clock.module';
import { QueueModule } from '../queue/queue.module';
import { ReminderSchedulerService } from './reminder-scheduler.service';

/**
 * ฝั่งตั้งงานเตือนนัด
 *
 * แยกจากฝั่งที่ทำงานจริง (RemindersWorkerModule) เพื่อให้โมดูลนัดหมายตั้งงานได้
 * โดยไม่ต้องลากระบบส่งข้อความเข้ามาด้วย ซึ่งจะทำให้โมดูลอ้างวนกัน
 */
@Module({
  imports: [QueueModule, ClockModule],
  providers: [ReminderSchedulerService],
  exports: [ReminderSchedulerService],
})
export class RemindersModule {}
