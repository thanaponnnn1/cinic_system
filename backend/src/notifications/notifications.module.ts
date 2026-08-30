import { Module } from '@nestjs/common';
import { LineMessagingModule } from '../line/line-messaging.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { LineNotificationChannel } from './line-notification.channel';
import { NOTIFICATION_CHANNEL } from './notification-channel';

/**
 * โมดูลส่งข้อความออกนอกระบบ
 *
 * ผูก NOTIFICATION_CHANNEL ไว้กับ LINE ที่จุดเดียว — วันที่เพิ่ม SMS สำรอง
 * แก้บรรทัด useClass บรรทัดเดียว ไม่ต้องแตะโค้ดที่เรียกใช้เลย
 */
@Module({
  imports: [LineMessagingModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    { provide: NOTIFICATION_CHANNEL, useClass: LineNotificationChannel },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
