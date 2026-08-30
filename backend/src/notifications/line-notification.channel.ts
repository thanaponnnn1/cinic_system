import { Injectable } from '@nestjs/common';
import type { messagingApi } from '@line/bot-sdk';
import { LineMessagingService } from '../line/line-messaging.service';
import type { NotificationChannel, OutboundMessage } from './notification-channel';

/** ช่องทาง LINE — ช่องทางเดียวที่ MVP ใช้ (ดูเหตุผลใน docs/plan-clinic-demo.md ข้อ 2) */
@Injectable()
export class LineNotificationChannel implements NotificationChannel {
  readonly name = 'LINE';

  constructor(private readonly line: LineMessagingService) {}

  async send(to: string, message: OutboundMessage): Promise<boolean> {
    const payload: messagingApi.Message[] = message.flex
      ? [message.flex]
      : [{ type: 'text', text: message.text }];

    return this.line.push(to, payload);
  }
}
