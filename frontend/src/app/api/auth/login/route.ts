import { NextResponse, type NextRequest } from 'next/server';
import { backendUrl } from '@/lib/backend';
import { setSessionCookies } from '@/lib/session';

/**
 * เข้าสู่ระบบ
 *
 * ตัว token ไม่เคยถูกส่งกลับไปให้เบราว์เซอร์ในเนื้อ response — ถูกยัดลง cookie แบบ httpOnly
 * ตรงนี้เลย หน้าจอได้กลับไปแค่ข้อมูลผู้ใช้ไว้แสดงชื่อกับสิทธิ์
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const credentials = (await request.json()) as { email?: string; password?: string };

  const response = await fetch(backendUrl('auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
    cache: 'no-store',
  });

  const payload = (await response.json()) as {
    accessToken?: string;
    refreshToken?: string;
    user?: unknown;
    message?: string;
  };

  if (!response.ok || !payload.accessToken || !payload.refreshToken) {
    return NextResponse.json(
      { message: payload.message ?? 'เข้าสู่ระบบไม่สำเร็จ' },
      { status: response.status === 200 ? 500 : response.status },
    );
  }

  const result = NextResponse.json({ user: payload.user });
  setSessionCookies(result, {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  });

  return result;
}
