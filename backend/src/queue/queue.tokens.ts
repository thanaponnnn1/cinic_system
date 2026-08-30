/**
 * token ของสิ่งที่เกี่ยวกับคิวงาน
 *
 * ต่อ BullMQ เข้ากับ Nest เอง ไม่ใช้ @nestjs/bullmq เพราะแพ็กเกจนั้นเป็น ESM อย่างเดียว
 * ซึ่งขัดกับการตัดสินใจที่ล็อกไว้ตั้งแต่ Phase 0 ว่าทั้งโปรเจกต์เป็น CommonJS
 * (ดู docs/plan-clinic-demo.md ข้อ 2) — ของที่ต้องเขียนเองมีแค่ provider ไม่กี่บรรทัด
 */
export const QUEUE_CONNECTION = Symbol('QUEUE_CONNECTION');
export const REMINDERS_QUEUE_TOKEN = Symbol('REMINDERS_QUEUE_TOKEN');
