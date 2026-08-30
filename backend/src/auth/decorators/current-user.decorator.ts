import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth.types';

/** ดึงผู้ใช้ที่ล็อกอินอยู่จาก request (JwtAuthGuard เป็นคนใส่ไว้) */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return data ? request.user[data] : request.user;
  },
);
