import type { NextResponse } from 'next/server';

/**
 * session ของลูกค้าที่เข้าผ่าน LIFF หรือโหมดเดโม
 *
 * แยก cookie จากของพนักงาน (lib/session.ts) — เครื่องเดียวกันเปิดหน้าลูกค้ากับ dashboard
 * พร้อมกันได้ตอนเดโม และการออกจากระบบฝั่งหนึ่งไม่ลาก session อีกฝั่งหายไปด้วย
 */
export const CUSTOMER_COOKIE = 'clinicq_customer';

/** เท่ากับอายุ customer JWT ที่ backend ออกให้ */
const COOKIE_MAX_AGE = 7 * 24 * 3600;

/** ทางเข้าที่ backend ตอบ token กลับมา — ตัวอื่นไม่มีสิทธิ์ตั้ง cookie */
const SESSION_ISSUING_PATHS: ReadonlySet<string> = new Set([
  'auth/liff',
  'auth/link',
  'auth/register',
  'auth/demo',
  'auth/demo-register',
]);

/** หน้าร้านกับรายชื่อเดโมเปิดได้โดยไม่ต้องเข้าสู่ระบบ ไม่ต้องแนบ token ที่อาจหมดอายุไปด้วย */
export const PUBLIC_CUSTOMER_PATHS: ReadonlySet<string> = new Set(['shop', 'demo/customers']);

export interface IssuedSession {
  token: string;
  /** body ที่ส่งต่อให้เบราว์เซอร์ — ตัด token ออกแล้ว */
  body: string;
}

/**
 * แยก token ออกจากคำตอบของทางเข้า
 *
 * token ไม่เคยถึงมือเบราว์เซอร์ ถ้าหลุดไปอยู่ใน body สคริปต์ในหน้าเว็บก็อ่านได้ และ cookie
 * แบบ httpOnly ก็ไม่มีความหมายอีกต่อไป คืน null เมื่อคำตอบนี้ไม่ได้ออก session ใหม่
 */
export function splitIssuedSession(
  path: string,
  status: number,
  payload: string,
): IssuedSession | null {
  if (!SESSION_ISSUING_PATHS.has(path) || status !== 200) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }

  if (!isIssuedPayload(parsed)) return null;

  const { token, ...rest } = parsed;
  return { token, body: JSON.stringify(rest) };
}

function isIssuedPayload(value: unknown): value is { status: 'ok'; token: string } {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return record.status === 'ok' && typeof record.token === 'string' && record.token.length > 0;
}

export function setCustomerCookie(response: NextResponse, token: string): void {
  response.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    // ตอน dev รันบน http ธรรมดา ถ้าบังคับ secure ตลอดจะเข้าสู่ระบบบนเครื่องตัวเองไม่ได้
    secure: process.env.NODE_ENV === 'production',
  });
}

export function clearCustomerCookie(response: NextResponse): void {
  response.cookies.delete(CUSTOMER_COOKIE);
}
