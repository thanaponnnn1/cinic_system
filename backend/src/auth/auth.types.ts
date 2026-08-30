import type { Role } from '@clinicq/shared';

/** ข้อมูลที่ฝังอยู่ใน access token */
export interface JwtPayload {
  /** user id */
  sub: string;
  email: string;
  role: Role;
}

/** ข้อมูลที่ฝังอยู่ใน refresh token — ตั้งใจให้มีน้อยที่สุด */
export interface RefreshPayload {
  sub: string;
  /** id ของแถวใน RefreshToken เพื่อให้เพิกถอนทีละใบได้ */
  jti: string;
}

/** ผู้ใช้ที่ผ่านการยืนยันตัวตนแล้ว — ตัวนี้จะถูกแนบไปกับ request */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}
