import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { WaitlistQueueService } from './waitlist-queue.service';

/**
 * ฝั่งตั้งงานของคิวรอ แยกออกมาให้เบาที่สุด
 *
 * โมดูลนัดหมาย import ตัวนี้เพื่อประกาศคิวว่างตอนยกเลิกนัด โดยไม่ต้องรู้จักระบบส่งข้อความ
 * หรือเครื่องยนต์แย่งคิวเลย — หลักการเดียวกับ RemindersModule ใน Phase 4
 */
@Module({
  imports: [QueueModule],
  providers: [WaitlistQueueService],
  exports: [WaitlistQueueService],
})
export class WaitlistQueueModule {}
