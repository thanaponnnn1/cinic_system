import { Module } from '@nestjs/common';
import { ClockModule } from '../clock/clock.module';
import { LineMessagingModule } from '../line/line-messaging.module';
import { DigestService } from './digest.service';

/** สรุปปิดร้านรายวันที่ส่งเข้า LINE เจ้าของร้าน — เรียกจากงาน cron ในฝั่ง worker */
@Module({
  imports: [LineMessagingModule, ClockModule],
  providers: [DigestService],
  exports: [DigestService],
})
export class DigestModule {}
