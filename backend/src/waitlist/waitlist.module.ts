import { Module } from '@nestjs/common';
import { ClockModule } from '../clock/clock.module';
import { LineMessagingModule } from '../line/line-messaging.module';
import { CampaignAttributionModule } from '../campaigns/campaign-attribution.module';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';
import { WaitlistEngineService } from './waitlist-engine.service';

/**
 * คิวรอทั้งก้อน — ทั้งงานฝั่งพนักงานและเครื่องยนต์แย่งคิว
 *
 * ไม่ import LineModule (webhook) เพราะฝั่งนั้นเป็นคนเรียกใช้ตัวเรา ถ้า import กลับไป
 * จะกลายเป็นวงจร — จึงพึ่งแค่ LineMessagingModule ซึ่งเป็นชั้นส่งข้อความล้วน ๆ
 */
@Module({
  imports: [LineMessagingModule, ClockModule, CampaignAttributionModule],
  controllers: [WaitlistController],
  providers: [WaitlistService, WaitlistEngineService],
  exports: [WaitlistEngineService],
})
export class WaitlistModule {}
