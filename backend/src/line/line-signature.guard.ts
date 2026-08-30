import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { verifyLineSignature } from './line-signature';

/** request ที่ Nest เก็บ raw body ไว้ให้ (เปิดด้วย NestFactory.create(..., { rawBody: true })) */
type RawBodyRequest = Request & { rawBody?: Buffer };

/**
 * ด่านเดียวที่กั้น webhook ของ LINE
 *
 * endpoint นี้เปิดสาธารณะ (ไม่มี JWT) เพราะ LINE ยิงเข้ามาเอง ลายเซ็นจึงเป็นสิ่งเดียว
 * ที่พิสูจน์ตัวตน ถ้าตั้งค่าไม่ครบให้ปฏิเสธทั้งหมดไว้ก่อน ดีกว่าเผลอเปิดรับ event ปลอม
 */
@Injectable()
export class LineSignatureGuard implements CanActivate {
  private readonly logger = new Logger(LineSignatureGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest>();
    const channelSecret = this.config.get<string>('LINE_CHANNEL_SECRET');

    if (!channelSecret) {
      this.logger.error('ยังไม่ได้ตั้ง LINE_CHANNEL_SECRET — ปฏิเสธ webhook ทุก request');
      throw new ForbiddenException('ระบบยังไม่ได้เชื่อมต่อกับ LINE');
    }

    if (!request.rawBody) {
      this.logger.error('อ่าน raw body ไม่ได้ — ต้องเปิด rawBody ตอนสร้างแอป');
      throw new ForbiddenException('ตรวจสอบลายเซ็นไม่ได้');
    }

    const signature = request.headers['x-line-signature'];
    const ok = verifyLineSignature(
      request.rawBody,
      typeof signature === 'string' ? signature : undefined,
      channelSecret,
    );

    if (!ok) {
      this.logger.warn('ลายเซ็นไม่ถูกต้อง — ปฏิเสธ request ที่อ้างว่ามาจาก LINE');
      throw new ForbiddenException('ลายเซ็นไม่ถูกต้อง');
    }

    return true;
  }
}
