import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedCustomer } from './customer-session';

/** ดึงลูกค้าที่ล็อกอินอยู่จาก request (CustomerAuthGuard เป็นคนใส่ไว้) */
export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedCustomer =>
    ctx.switchToHttp().getRequest<{ customer: AuthenticatedCustomer }>().customer,
);
