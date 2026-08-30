import { NextResponse, type NextRequest } from 'next/server';
import { backendUrl } from '@/lib/backend';
import { REFRESH_COOKIE, clearSessionCookies } from '@/lib/session';

/**
 * ออกจากระบบ
 *
 * บอก backend ให้เพิกถอน refresh token ใบนี้ด้วย ไม่ใช่แค่ลบ cookie ทิ้งฝั่งเบราว์เซอร์
 * ไม่งั้นใบที่หลุดออกไปแล้วจะยังใช้ขอ access token ใบใหม่ได้อีกเจ็ดวัน
 *
 * ถ้า backend ล่มก็ยังล้าง cookie ให้อยู่ดี เพราะสิ่งที่ผู้ใช้ขอคือ "ออกจากระบบ"
 * การค้างอยู่ในระบบเพราะเซิร์ฟเวอร์ไม่ตอบคือผลลัพธ์ที่แย่กว่า
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    try {
      await fetch(backendUrl('auth/logout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      });
    } catch {
      // ตั้งใจกลืนไว้ — เหตุผลอยู่ในคำอธิบายด้านบน
    }
  }

  const result = NextResponse.json({ ok: true });
  clearSessionCookies(result);

  return result;
}
