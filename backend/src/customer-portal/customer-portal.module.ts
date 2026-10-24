import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LineModule } from '../line/line.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerPortalController } from './customer-portal.controller';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerPortalService } from './customer-portal.service';
import { CustomerAuthGuard } from './customer-auth.guard';
import { LineIdTokenVerifier } from './line-id-token.verifier';

/**
 * หน้าร้านฝั่งลูกค้าที่เปิดจาก LINE (LIFF) — ทุก endpoint อยู่ใต้ /api/customer/*
 *
 * แยกเป็นโมดูลของตัวเองเพราะผู้ใช้คนละกลุ่มกับหน้าจอร้าน: ยืนยันตัวตนคนละแบบ
 * เห็นข้อมูลได้แค่ของตัวเอง และทุกการจองต้องผ่านระบบนัดเดิมเพื่อไม่ให้คิวชนกัน
 */
@Module({
  // ไม่ตั้ง secret ตรงนี้ ทุกที่ที่ sign/verify ระบุ JWT_CUSTOMER_SECRET เอง เหมือน AuthModule
  imports: [JwtModule.register({}), LineModule, AppointmentsModule],
  controllers: [CustomerAuthController, CustomerPortalController],
  providers: [CustomerAuthService, CustomerPortalService, CustomerAuthGuard, LineIdTokenVerifier],
})
export class CustomerPortalModule {}
