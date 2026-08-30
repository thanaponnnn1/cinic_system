import { Module } from '@nestjs/common';
import { ClockModule } from '../clock/clock.module';
import { LineModule } from '../line/line.module';
import { DigestService } from './digest.service';

/** สรุปปิดร้านรายวันที่ส่งเข้า LINE เจ้าของร้าน — เรียกจากงาน cron ในฝั่ง worker */
@Module({
  imports: [LineModule, ClockModule],
  providers: [DigestService],
  exports: [DigestService],
})
export class DigestModule {}
