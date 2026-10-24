import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { bearerToken } from '../auth/bearer-token';
import { isCustomerSession, type AuthenticatedCustomer } from './customer-session';

const SESSION_INVALID = 'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเปิดหน้านี้จาก LINE อีกครั้ง';

/**
 * ตรวจ session ของลูกค้าที่เข้าผ่าน LIFF
 *
 * controller ฝั่งลูกค้าติด @Public() เพื่อข้าม JwtAuthGuard ของพนักงาน แล้วใช้ guard นี้แทน
 * customerId ที่ endpoint ข้างในใช้มาจาก token ที่ผ่านตรงนี้เท่านั้น ไม่รับจาก body หรือ query
 */
@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { customer?: AuthenticatedCustomer }>();
    const token = bearerToken(request);

    if (!token) throw new UnauthorizedException('กรุณาเข้าสู่ระบบผ่าน LINE ก่อน');

    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_CUSTOMER_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(SESSION_INVALID);
    }

    if (!isCustomerSession(payload)) throw new UnauthorizedException(SESSION_INVALID);

    request.customer = { id: payload.sub };
    return true;
  }
}
