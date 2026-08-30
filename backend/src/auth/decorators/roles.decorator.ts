import { SetMetadata } from '@nestjs/common';
import type { Role } from '@clinicq/shared';

export const ROLES_KEY = 'roles';

/**
 * จำกัดว่า endpoint นี้เรียกได้เฉพาะสิทธิ์ที่ระบุ
 *
 * ถ้าไม่ใส่ = ผู้ใช้ที่ล็อกอินแล้วทุกระดับเรียกได้
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
