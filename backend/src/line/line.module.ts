import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { LineMessagingModule } from './line-messaging.module';
import { LineWebhookService } from './line-webhook.service';
import { LineWebhookController } from './line-webhook.controller';
import { LineAccountLinkService } from './line-account-link.service';

/**
 * ทุกอย่างที่คุยกับ LINE รวมอยู่ในโมดูลนี้
 *
 * ตัวส่งข้อความอยู่ที่ LineMessagingModule ต่างหาก โมดูลนี้จึงเหลือแค่ฝั่งรับ webhook
 * การแปลผลของ postback เป็นคำพูดที่ลูกค้าอ่าน และกฎการผูกบัญชีที่หน้าเว็บลูกค้าใช้ร่วมด้วย
 */
@Module({
  imports: [LineMessagingModule, AppointmentsModule, WaitlistModule],
  controllers: [LineWebhookController],
  providers: [LineWebhookService, LineAccountLinkService],
  exports: [LineMessagingModule, LineAccountLinkService],
})
export class LineModule {}
