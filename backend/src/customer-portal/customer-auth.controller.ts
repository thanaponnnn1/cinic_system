import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerAuthGuard } from './customer-auth.guard';
import { CurrentCustomer } from './current-customer.decorator';
import type { AuthenticatedCustomer } from './customer-session';
import type {
  CustomerAuthResult,
  CustomerProfile,
  DemoCustomerOption,
} from './customer-portal.types';
import {
  DemoLoginDto,
  DemoRegisterDto,
  LiffLoginDto,
  LinkAccountDto,
  RegisterCustomerDto,
} from './dto/customer-auth.dto';

/**
 * ทางเข้าของลูกค้า — ติด @Public() ทั้ง controller เพื่อข้าม guard ของพนักงาน
 * endpoint ที่ต้องรู้ตัวลูกค้าใส่ CustomerAuthGuard เองทีละตัว
 */
@ApiTags('ลูกค้า (LIFF)')
@Public()
@Controller('customer')
export class CustomerAuthController {
  constructor(private readonly auth: CustomerAuthService) {}

  @Post('auth/liff')
  @HttpCode(200)
  @ApiOperation({
    summary: 'เข้าสู่ระบบด้วย ID token จาก LIFF',
    description: 'คืน token เมื่อบัญชี LINE นี้ผูกกับลูกค้าแล้ว ไม่งั้นคืน needs_link',
  })
  @ApiResponse({ status: 401, description: 'LINE ยืนยันตัวตนไม่ผ่าน' })
  @ApiResponse({ status: 503, description: 'ร้านยังไม่ได้ตั้ง LINE_LIFF_CHANNEL_ID' })
  loginWithLiff(@Body() dto: LiffLoginDto): Promise<CustomerAuthResult> {
    return this.auth.loginWithLiff(dto.idToken);
  }

  @Post('auth/link')
  @HttpCode(200)
  @ApiOperation({ summary: 'ลูกค้าเก่าผูกบัญชี LINE ด้วยรหัส 6 หลักจากร้าน' })
  linkWithCode(@Body() dto: LinkAccountDto): Promise<CustomerAuthResult> {
    return this.auth.linkWithCode(dto.idToken, dto.code);
  }

  @Post('auth/register')
  @HttpCode(200)
  @ApiOperation({ summary: 'ลูกค้าใหม่สมัครด้วยชื่อ เบอร์ และความยินยอม' })
  @ApiResponse({ status: 409, description: 'เบอร์นี้มีในร้านแล้ว ให้ใช้รหัสเชื่อมจากร้านแทน' })
  register(@Body() dto: RegisterCustomerDto): Promise<CustomerAuthResult> {
    return this.auth.register(dto);
  }

  @Get('me')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ข้อมูลของลูกค้าที่เข้าสู่ระบบอยู่' })
  me(@CurrentCustomer() customer: AuthenticatedCustomer): Promise<CustomerProfile> {
    return this.auth.me(customer.id);
  }

  // ── โหมดเดโม ────────────────────────────────────────────

  @Get('demo/customers')
  @ApiOperation({ summary: 'รายชื่อลูกค้าให้เลือกดูในมุมลูกค้า (เฉพาะโหมดเดโม)' })
  @ApiResponse({ status: 403, description: 'ไม่ได้เปิดโหมดเดโม' })
  demoCustomers(): Promise<DemoCustomerOption[]> {
    return this.auth.listDemoCustomers();
  }

  @Post('auth/demo')
  @HttpCode(200)
  @ApiOperation({ summary: 'เข้าเป็นลูกค้าที่เลือก (เฉพาะโหมดเดโม)' })
  @ApiResponse({ status: 403, description: 'ไม่ได้เปิดโหมดเดโม' })
  loginAsDemo(@Body() dto: DemoLoginDto): Promise<CustomerAuthResult> {
    return this.auth.loginAsDemo(dto.customerId);
  }

  @Post('auth/demo-register')
  @HttpCode(200)
  @ApiOperation({ summary: 'สมัครเป็นลูกค้าใหม่โดยไม่ต้องมี LINE (เฉพาะโหมดเดโม)' })
  @ApiResponse({ status: 403, description: 'ไม่ได้เปิดโหมดเดโม' })
  registerDemo(@Body() dto: DemoRegisterDto): Promise<CustomerAuthResult> {
    return this.auth.registerDemo(dto);
  }
}
