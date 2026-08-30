import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../config/env.validation';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { ClockModule } from '../clock/clock.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DigestModule } from '../digest/digest.module';
import { ReminderProcessorService } from '../reminders/reminder-processor.service';
import { JobDispatcherService } from './job-dispatcher.service';
import { WorkerRunnerService } from './worker-runner.service';

/**
 * โมดูลรากของโปรเซส worker (ดู src/main.worker.ts)
 *
 * ไม่มี controller เลยตั้งใจ — โปรเซสนี้ไม่เปิดพอร์ต ไม่รับคำขอจากใคร
 * มีหน้าที่เดียวคือทำงานที่หลุดออกมาจากคิว
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    PrismaModule,
    QueueModule,
    ClockModule,
    NotificationsModule,
    DigestModule,
  ],
  providers: [ReminderProcessorService, JobDispatcherService, WorkerRunnerService],
})
export class WorkerModule {}
