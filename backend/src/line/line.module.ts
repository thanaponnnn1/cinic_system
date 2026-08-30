import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { LineMessagingService } from './line-messaging.service';
import { LineWebhookService } from './line-webhook.service';
import { LineWebhookController } from './line-webhook.controller';

/**
 * ทุกอย่างที่คุยกับ LINE รวมอยู่ในโมดูลนี้
 *
 * export LineMessagingService ออกไปเพื่อให้โมดูลอื่น (เตือนนัด, คิวว่าง, สรุปรายวัน)
 * ส่งข้อความได้โดยไม่ต้องรู้จัก SDK หรือ token เอง
 */
@Module({
  imports: [AppointmentsModule],
  controllers: [LineWebhookController],
  providers: [LineMessagingService, LineWebhookService],
  exports: [LineMessagingService],
})
export class LineModule {}
