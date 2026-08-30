import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { ProvidersModule } from './providers/providers.module';
import { ServicesModule } from './services/services.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { LineModule } from './line/line.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QueueModule } from './queue/queue.module';
import { ClockModule } from './clock/clock.module';
import { RemindersModule } from './reminders/reminders.module';
import { DigestModule } from './digest/digest.module';
import { DemoModule } from './demo/demo.module';
import { WaitlistModule } from './waitlist/waitlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    // AuthModule ตั้ง guard ระดับแอปไว้ ทุกโมดูลที่ตามมาจึงถูกปิดไว้ก่อนโดยปริยาย
    AuthModule,
    HealthModule,
    CustomersModule,
    ProvidersModule,
    ServicesModule,
    AppointmentsModule,
    LineModule,
    NotificationsModule,
    QueueModule,
    ClockModule,
    RemindersModule,
    DigestModule,
    DemoModule,
    WaitlistModule,
  ],
})
export class AppModule {}
