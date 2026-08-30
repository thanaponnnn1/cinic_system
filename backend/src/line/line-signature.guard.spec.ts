import { createHmac } from 'node:crypto';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LineSignatureGuard } from './line-signature.guard';

const SECRET = 'channel-secret-for-tests';

function contextOf(rawBody: Buffer | undefined, signature?: string): ExecutionContext {
  const request = { rawBody, headers: { 'x-line-signature': signature } };

  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function guardWith(secret: string | undefined): LineSignatureGuard {
  const config = { get: () => secret } as unknown as ConfigService;
  return new LineSignatureGuard(config);
}

describe('LineSignatureGuard', () => {
  const body = Buffer.from(JSON.stringify({ events: [] }));
  const signature = createHmac('sha256', SECRET).update(body).digest('base64');

  it('ปล่อยผ่านเมื่อลายเซ็นตรงกับ raw body', () => {
    expect(guardWith(SECRET).canActivate(contextOf(body, signature))).toBe(true);
  });

  it('ปฏิเสธเมื่อลายเซ็นไม่ตรง', () => {
    expect(() => guardWith(SECRET).canActivate(contextOf(body, 'ลายเซ็นปลอม'))).toThrow(
      ForbiddenException,
    );
  });

  it('ปฏิเสธเมื่ออ่าน raw body ไม่ได้ — คำนวณลายเซ็นจาก body ที่ parse แล้วไม่ได้', () => {
    expect(() => guardWith(SECRET).canActivate(contextOf(undefined, signature))).toThrow(
      ForbiddenException,
    );
  });

  it('ปฏิเสธทุก request เมื่อยังไม่ได้ตั้ง LINE_CHANNEL_SECRET', () => {
    expect(() => guardWith(undefined).canActivate(contextOf(body, signature))).toThrow(
      ForbiddenException,
    );
  });
});
