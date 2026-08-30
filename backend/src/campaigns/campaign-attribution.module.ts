import { Module } from '@nestjs/common';
import { CampaignAttributionService } from './campaign-attribution.service';

/**
 * ฝั่งบันทึกผลของแคมเปญ แยกออกมาให้เบาที่สุด
 *
 * โมดูลนัดหมาย import ตัวนี้เพื่อประทับ "กลับมาจอง" และ "รายได้" โดยไม่ต้องรู้จัก
 * ระบบส่งข้อความของแคมเปญเลย ซึ่งจะทำให้โมดูลอ้างวนกัน
 */
@Module({
  providers: [CampaignAttributionService],
  exports: [CampaignAttributionService],
})
export class CampaignAttributionModule {}
