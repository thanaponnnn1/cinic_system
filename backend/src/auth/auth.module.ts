import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  // ไม่ตั้ง secret ตรงนี้ เพราะ access กับ refresh ใช้คนละ secret
  // แต่ละที่ที่เรียก sign/verify จะระบุ secret ของตัวเองเสมอ
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    // ปิดทุก endpoint ไว้ก่อนโดยปริยาย เปิดเฉพาะที่ทำเครื่องหมาย @Public()
    // ลำดับสำคัญ: ตรวจตัวตนก่อน แล้วค่อยตรวจสิทธิ์
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
