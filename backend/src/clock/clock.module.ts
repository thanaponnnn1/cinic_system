import { Global, Module } from '@nestjs/common';
import type IORedis from 'ioredis';
import { QUEUE_CONNECTION } from '../queue/queue.tokens';
import { CLOCK_OFFSET_KEY, CLOCK_OFFSET_STORE, type ClockOffsetStore } from './clock-offset.store';
import { ClockService } from './clock.service';

/**
 * นาฬิกาของระบบ ใช้ Redis เป็นที่เก็บ offset
 *
 * เลือก Redis เพราะ API กับ worker เป็นคนละโปรเซส และ Redis มีอยู่แล้วสำหรับคิวงาน
 * ไม่ต้องเพิ่มของใหม่เข้าระบบเพื่อเก็บตัวเลขตัวเดียว
 */
@Global()
@Module({
  providers: [
    {
      provide: CLOCK_OFFSET_STORE,
      inject: [QUEUE_CONNECTION],
      useFactory: (redis: IORedis): ClockOffsetStore => ({
        async read(): Promise<number> {
          const raw = await redis.get(CLOCK_OFFSET_KEY);
          const value = Number(raw);

          return Number.isFinite(value) && value > 0 ? value : 0;
        },
        async write(offsetMs: number): Promise<void> {
          await redis.set(CLOCK_OFFSET_KEY, String(offsetMs));
        },
      }),
    },
    ClockService,
  ],
  exports: [ClockService],
})
export class ClockModule {}
