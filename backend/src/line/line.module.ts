import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { LineMessagingModule } from './line-messaging.module';
import { LineWebhookService } from './line-webhook.service';
import { LineWebhookController } from './line-webhook.controller';

/**
 * ทุกอย่างที่คุยกับ LINE รวมอยู่ในโมดูลนี้
 *
 * ตัวส่งข้อความอยู่ที่ LineMessagingModule ต่างหาก โมดูลนี้จึงเหลือแค่ฝั่งรับ webhook
 * และการแปลผลของ postback เป็นคำพูดที่ลูกค้าอ่าน
 */
@Module({
  imports: [LineMessagingModule, AppointmentsModule, WaitlistModule],
  controllers: [LineWebhookController],
  providers: [LineWebhookService],
  exports: [LineMessagingModule],
})
export class LineModule {}
