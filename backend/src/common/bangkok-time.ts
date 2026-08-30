/**
 * ตัวช่วยเรื่องเวลาไทย
 *
 * ตัวจริงย้ายไปอยู่ที่ shared/src/datetime.ts แล้วตั้งแต่ Phase 7 เพราะหน้าจอต้องแสดง
 * วันเวลาแบบเดียวกับที่ระบบส่งเข้า LINE เป๊ะ ๆ — เขียนสองที่แล้ววันหนึ่งจะเพี้ยนกันเงียบ ๆ
 *
 * ไฟล์นี้เหลือไว้เป็นทางเข้าเดิมของโค้ดฝั่ง backend ทั้งหมด จะได้ไม่ต้องแก้ import ทุกไฟล์
 */
export {
  bangkokDayRange,
  formatBangkokDate,
  formatBangkokDateTime,
  formatBangkokTime,
  formatThaiDate,
} from '@clinicq/shared';
