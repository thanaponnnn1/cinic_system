import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BRAND_INFO } from '@clinicq/shared';
import { WorkerModule } from './worker/worker.module';
import { APP_VERSION } from './common/app-version';

/**
 * โปรเซส worker — รันคู่กับ API เสมอ ไม่ใช่ทางเลือก
 *
 * ถ้าโปรเซสนี้ไม่ได้รัน ระบบจะดูปกติทุกอย่าง กดจองนัดได้ หน้าจอไม่มีอะไรผิด
 * แต่ข้อความเตือนนัดจะไม่ออกเลย — เป็นความพังแบบเงียบที่กว่าจะรู้ก็คือลูกค้าไม่มาตามนัดแล้ว
 * ดังนั้นตอน deploy ต้องมี process นี้คู่กันเสมอ (ดู Phase 8 เรื่อง dead-man switch)
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  const logger = new Logger('Worker');

  // createApplicationContext ไม่มี listen() มาปล่อย log ที่ค้างใน buffer ให้ ต้องสั่งเอง
  app.flushLogs();
  app.enableShutdownHooks();

  logger.log(`${BRAND_INFO.productName} worker v${APP_VERSION} เริ่มทำงาน`);
  logger.log(`   เขตเวลา → ${process.env.TZ ?? 'ไม่ได้ตั้งค่า'} (${new Date().toString()})`);
}

void bootstrap();
