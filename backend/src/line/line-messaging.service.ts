import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi } from '@line/bot-sdk';

/**
 * ชั้นบาง ๆ ที่คุยกับ LINE Messaging API
 *
 * แยกออกมาเพื่อสองอย่าง: โค้ดที่เหลือของระบบไม่ต้องรู้จัก SDK เลย
 * และเทสต์ของ flow ต่าง ๆ mock คลาสนี้ตัวเดียวจบ ไม่ต้องยิงเน็ตจริง
 *
 * ทุกเมธอดตั้งใจให้ "ไม่โยน error ออกไป" — ข้อความส่งไม่ออกไม่ควรทำให้
 * ธุรกรรมที่สำคัญกว่า (เช่น การเปลี่ยนสถานะนัด) ล้มตามไปด้วย ผู้เรียกดูค่าที่คืนมาแทน
 */
@Injectable()
export class LineMessagingService {
  private readonly logger = new Logger(LineMessagingService.name);
  private readonly client: messagingApi.MessagingApiClient;

  constructor(config: ConfigService) {
    this.client = new messagingApi.MessagingApiClient({
      channelAccessToken: config.get<string>('LINE_CHANNEL_ACCESS_TOKEN') ?? '',
    });
  }

  /** ตอบกลับในแชทเดิม — ฟรี ไม่กินโควตาข้อความของแพ็กเกจ */
  async replyText(replyToken: string, text: string): Promise<boolean> {
    return this.reply(replyToken, [{ type: 'text', text }]);
  }

  async reply(replyToken: string, messages: messagingApi.Message[]): Promise<boolean> {
    try {
      await this.client.replyMessage({ replyToken, messages });
      return true;
    } catch (error) {
      // reply token หมดอายุใน 1 นาที และใช้ได้ครั้งเดียว — พลาดแล้วพลาดเลย ไม่ retry
      this.logger.warn(`ตอบกลับข้อความไม่สำเร็จ: ${describeError(error)}`);
      return false;
    }
  }

  /** ส่งหาผู้ใช้โดยตรง — ใช้ตอนเตือนนัดและแจ้งแอดมิน กินโควตาของแพ็กเกจ */
  async pushText(to: string, text: string): Promise<boolean> {
    return this.push(to, [{ type: 'text', text }]);
  }

  async push(to: string, messages: messagingApi.Message[]): Promise<boolean> {
    try {
      await this.client.pushMessage({ to, messages });
      return true;
    } catch (error) {
      this.logger.error(`ส่งข้อความหา ${to} ไม่สำเร็จ: ${describeError(error)}`);
      return false;
    }
  }
}

/** ดึงข้อความสั้น ๆ จาก error ของ SDK — ห้ามให้ token หลุดลง log */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
