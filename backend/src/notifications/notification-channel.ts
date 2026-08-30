import type { messagingApi } from '@line/bot-sdk';

/**
 * ข้อความหนึ่งชิ้นที่ระบบอยากส่งออก
 *
 * มี text เสมอเพื่อให้ช่องทางที่ส่งภาพสวย ๆ ไม่ได้ (SMS, อีเมล) ยังส่งเนื้อความเดียวกันได้
 * ส่วน flex เป็นของแถมของ LINE — ช่องทางที่ไม่รองรับก็มองข้ามไป
 */
export interface OutboundMessage {
  text: string;
  flex?: messagingApi.FlexMessage;
}

/**
 * ช่องทางส่งข้อความหนึ่งช่องทาง (ตอนนี้มีแค่ LINE)
 *
 * แยกเป็น interface ตั้งแต่ตอนนี้เพราะลูกค้าจริงถามเรื่อง SMS สำรองบ่อย — วันที่ต้องเพิ่ม
 * จะได้เขียนคลาสใหม่คลาสเดียว ไม่ต้องรื้อ NotificationsService ที่ถือกฎ consent กับ log อยู่
 */
export interface NotificationChannel {
  readonly name: string;
  /** คืน true เมื่อส่งออกสำเร็จ — ห้ามโยน error ออกมา ผู้เรียกต้องบันทึก log ให้ครบทุกกรณี */
  send(to: string, message: OutboundMessage): Promise<boolean>;
}

/** token สำหรับ inject ช่องทางที่ระบบใช้อยู่ */
export const NOTIFICATION_CHANNEL = Symbol('NOTIFICATION_CHANNEL');
