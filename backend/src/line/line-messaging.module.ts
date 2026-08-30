import { Module } from '@nestjs/common';
import { LineMessagingService } from './line-messaging.service';

/**
 * ชั้นส่งข้อความออก LINE ล้วน ๆ ไม่มีตรรกะธุรกิจและไม่พึ่งโมดูลอื่นเลย
 *
 * แยกออกมาจาก LineModule เพราะโมดูลที่ต้องส่งข้อความ (เตือนนัด สรุปปิดร้าน คิวรอ)
 * ไม่ควรต้องลาก webhook กับระบบนัดหมายติดมาด้วย ซึ่งจะทำให้โมดูลอ้างวนกัน
 */
@Module({
  providers: [LineMessagingService],
  exports: [LineMessagingService],
})
export class LineMessagingModule {}
