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
  ],
})
export class AppModule {}
