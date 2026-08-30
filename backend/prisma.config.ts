import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * ตั้งค่า Prisma CLI (generate / migrate / studio)
 *
 * ตั้งแต่ Prisma 7 เป็นต้นไป connection string ไม่อยู่ใน schema.prisma แล้ว
 * แต่มาอยู่ที่ไฟล์นี้ ส่วนตัว PrismaClient ตอน runtime ต่อผ่าน driver adapter แยกต่างหาก
 * (ดู src/prisma/prisma.service.ts)
 *
 * ที่ไม่ใช้ตัวช่วย `env()` ของ Prisma เพราะมันจะโยน error ทันทีเมื่อหาค่าไม่เจอ
 * ทำให้ `prisma generate` ตอน postinstall พังสำหรับคนที่เพิ่งโคลนโปรเจกต์มาและยังไม่ได้สร้าง .env
 * — ทั้งที่ generate ไม่ได้ต้องต่อฐานข้อมูลจริงเลย ส่วนคำสั่งที่ต้องต่อจริง (migrate/studio)
 * จะฟ้องเองอยู่แล้วว่าต่อไม่ได้
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
  migrations: {
    path: 'prisma/migrations',
  },
});
