import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_LABEL, type Role } from '@clinicq/shared';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth.types';

/** บังคับสิทธิ์ตามที่ @Roles() กำหนดไว้บน endpoint */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // ไม่ระบุสิทธิ์ = ผู้ใช้ที่ล็อกอินแล้วทุกระดับเข้าได้
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!user) throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึง');

    if (!required.includes(user.role)) {
      const allowed = required.map((r) => ROLE_LABEL[r]).join(' หรือ ');
      throw new ForbiddenException(`ต้องมีสิทธิ์ระดับ${allowed}จึงจะทำรายการนี้ได้`);
    }

    return true;
  }
}
