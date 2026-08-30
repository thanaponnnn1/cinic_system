import { Module } from '@nestjs/common';
import { ClockModule } from '../clock/clock.module';
import { LineMessagingModule } from '../line/line-messaging.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { WinbackService } from './winback.service';

/**
 * แคมเปญดึงลูกค้ากลับทั้งก้อน — ทั้งการตั้งค่าจากหน้าจอและตัวยิงข้อความตามรอบเวลา
 *
 * ฝั่งที่บันทึกผลกลับ (CampaignAttributionModule) แยกออกไปต่างหาก เพราะโมดูลนัดหมาย
 * ต้องเรียกใช้ได้โดยไม่ต้องลากระบบส่งข้อความเข้ามาด้วย
 */
@Module({
  imports: [LineMessagingModule, ClockModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, WinbackService],
  exports: [WinbackService],
})
export class CampaignsModule {}
