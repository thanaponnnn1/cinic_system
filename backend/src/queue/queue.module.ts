import { Global, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { REMINDERS_QUEUE } from '../reminders/reminder-schedule';
import { QUEUE_CONNECTION, REMINDERS_QUEUE_TOKEN } from './queue.tokens';

/**
 * การเชื่อมต่อ Redis และคิวงานของทั้งระบบ
 *
 * ประกาศเป็น Global เพราะทั้ง API และ worker ต้องใช้ตัวเดียวกัน และการเปิดหลาย
 * connection โดยไม่จำเป็นคือทางลัดไปสู่การใช้ connection จนเต็มโควตาบนคลาวด์
 *
 * maxRetriesPerRequest: null เป็นข้อบังคับของ BullMQ — ถ้าไม่ตั้ง คำสั่งที่รอคิวอยู่
 * จะถูกยกเลิกตอน Redis สะดุด แล้วงานที่กำลังทำอยู่จะหลุดหายไปเงียบ ๆ
 */
@Global()
@Module({
  providers: [
    {
      provide: QUEUE_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService): IORedis => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';

        return new IORedis(url, { maxRetriesPerRequest: null });
      },
    },
    {
      provide: REMINDERS_QUEUE_TOKEN,
      inject: [QUEUE_CONNECTION],
      useFactory: (connection: IORedis): Queue =>
        new Queue(REMINDERS_QUEUE, { connection: connection.duplicate() }),
    },
  ],
  exports: [QUEUE_CONNECTION, REMINDERS_QUEUE_TOKEN],
})
export class QueueModule implements OnApplicationShutdown {
  private readonly logger = new Logger(QueueModule.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown(): Promise<void> {
    const queue = this.moduleRef.get<Queue>(REMINDERS_QUEUE_TOKEN, { strict: false });
    const connection = this.moduleRef.get<IORedis>(QUEUE_CONNECTION, { strict: false });

    await queue.close();
    connection.disconnect();
    this.logger.log('ปิดการเชื่อมต่อคิวงานเรียบร้อย');
  }
}
