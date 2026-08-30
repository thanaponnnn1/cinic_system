import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthenticatedUser, JwtPayload } from '../auth.types';

/**
 * ตรวจ access token ของทุก request
 *
 * ตั้งเป็น guard ระดับแอปใน AuthModule ทุก endpoint จึงถูกปิดไว้ก่อน
 * ยกเว้นตัวที่ทำเครื่องหมาย @Public() ไว้อย่างจงใจ
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('ต้องเข้าสู่ระบบก่อนใช้งาน');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      request.user = { id: payload.sub, email: payload.email, role: payload.role };
      return true;
    } catch {
      // ไม่ส่งรายละเอียดว่าโทเคนหมดอายุหรือผิดรูปแบบ — บอกแค่ว่าใช้ไม่ได้
      throw new UnauthorizedException('เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
    }
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;

    const [scheme, token] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' ? token : undefined;
  }
}
