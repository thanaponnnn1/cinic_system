import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { formatBangkokDateTime } from '@clinicq/shared';
import { validateEnv } from '../config/env.validation';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { ClockModule } from '../clock/clock.module';
import { RemindersModule } from '../reminders/reminders.module';
import { DemoDataService } from './demo-data.service';

/**
 * `pnpm demo:reset` — รีเซ็ตข้อมูลเดโมจาก terminal ก่อนอัดคลิปหรือเข้าพบลูกค้า
 *
 * บูตเฉพาะโมดูลที่ต้องใช้ ไม่เปิดพอร์ต จึงรันได้ขณะที่ API ทำงานอยู่ และใช้ service ตัวเดียวกับ
 * POST /api/demo/reset ผลจากสองทางจึงเหมือนกันเสมอ
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    PrismaModule,
    QueueModule,
    ClockModule,
    RemindersModule,
  ],
  providers: [DemoDataService],
})
class DemoResetModule {}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(DemoResetModule, {
    logger: ['error', 'warn'],
  });

  try {
    const result = await app.get(DemoDataService).reset();
    const lines = [
      `รีเซ็ตข้อมูลเดโมแล้ว — เวลาระบบ ${formatBangkokDateTime(result.now)} น.`,
      `ลบ: นัด ${result.deleted.appointments} · คิวรอ ${result.deleted.waitlistEntries} · ` +
        `บันทึกข้อความของนัด ${result.deleted.messageLogs}`,
      `สร้างนัดใหม่ ${result.created.total} ใบ`,
      ...Object.entries(result.created.byStatus).map(
        ([status, count]) => `  ${status.padEnd(22)} ${count}`,
      ),
      `ตั้งงานเตือนนัดให้ ${result.remindersSynced} นัด`,
      `ขยับวันที่มาล่าสุดของลูกค้า ${result.lastVisitsAdvanced} คน`,
    ];

    process.stdout.write(`${lines.join('\n')}\n`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error('รีเซ็ตข้อมูลเดโมไม่สำเร็จ:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
