import type { webhook } from '@line/bot-sdk';

/**
 * ชนิดข้อมูลของ LINE ที่ระบบใช้ รวมไว้ที่เดียว
 *
 * ห่อชื่อจาก SDK ไว้ชั้นหนึ่งเพื่อให้โค้ดฝั่งเราอ่านรู้เรื่องว่าเป็นของ LINE
 * และถ้าวันหนึ่ง SDK เปลี่ยนชื่อ type จะแก้ที่ไฟล์เดียว
 */
export type LineWebhookEvent = webhook.Event;
export type LineMessageEvent = webhook.MessageEvent;
export type LinePostbackEvent = webhook.PostbackEvent;

/** body ที่ LINE ยิงเข้ามาที่ webhook */
export interface LineWebhookBody {
  destination?: string;
  events?: LineWebhookEvent[];
}

/** ดึง userId ของผู้ส่ง — event บางชนิดมาจากห้องกลุ่มซึ่งไม่มี userId */
export function eventUserId(event: LineWebhookEvent): string | undefined {
  return event.source?.type === 'user' ? event.source.userId : undefined;
}
