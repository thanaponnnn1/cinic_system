import type { NextResponse } from 'next/server';

/**
 * ที่เก็บ token ของ dashboard
 *
 * เก็บใน cookie แบบ httpOnly ไม่ใช่ localStorage โดยตั้งใจ — สคริปต์ในหน้าเว็บอ่าน cookie
 * แบบนี้ไม่ได้เลย ต่อให้มี XSS หลุดเข้ามาสักจุด token ก็ยังถูกขโมยออกไปไม่ได้
 * ราคาที่จ่ายคือทุกคำขอต้องวิ่งผ่าน route handler ของ Next เพื่อแนบ token ให้ (ดู lib/backend.ts)
 */
export const ACCESS_COOKIE = 'clinicq_access';
export const REFRESH_COOKIE = 'clinicq_refresh';

/**
 * อายุ cookie 7 วันเท่ากับอายุ refresh token
 *
 * ตัว access token ข้างในหมดอายุใน 15 นาทีตามที่ backend ตั้งไว้ แต่ cookie ต้องอยู่ยาวกว่านั้น
 * ไม่งั้นพอ access token หมดอายุ เราจะไม่เหลืออะไรให้เอาไปขอใบใหม่
 */
const COOKIE_MAX_AGE = 7 * 24 * 3600;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** ตั้ง cookie ทั้งคู่ลงบน response — ใช้ทั้งตอนเข้าสู่ระบบและตอนต่ออายุอัตโนมัติ */
export function setSessionCookies(response: NextResponse, tokens: TokenPair): void {
  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    // ตอน dev รันบน http ธรรมดา ถ้าบังคับ secure ตลอดจะเข้าสู่ระบบบนเครื่องตัวเองไม่ได้เลย
    secure: process.env.NODE_ENV === 'production',
  };

  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, options);
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, options);
}

/** ล้าง cookie ทั้งคู่ — ใช้ตอนออกจากระบบและตอนที่ refresh token ใช้ไม่ได้แล้ว */
export function clearSessionCookies(response: NextResponse): void {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
}
