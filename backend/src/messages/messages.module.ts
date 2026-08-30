import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

/** หน้าตรวจสอบการส่งข้อความ — อ่านอย่างเดียว ไม่มีใครแก้ MessageLog ได้ผ่าน API */
@Module({
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
