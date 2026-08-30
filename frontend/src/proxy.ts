import { NextResponse, type NextRequest } from 'next/server';
import { REFRESH_COOKIE } from '@/lib/session';

/**
 * ตัวกันทางหน้า dashboard
 *
 * (ไฟล์นี้คือ middleware ของ Next รุ่นก่อน — Next 16 เปลี่ยนชื่อ convention เป็น proxy)
 *
 * ตรวจแค่ว่ามี refresh token อยู่ไหม ไม่ได้ตรวจว่า token ใช้ได้จริง เพราะการยิงถาม backend
 * ทุกคำขอจะทำให้ทุกหน้าช้าลงโดยไม่ได้ปลอดภัยขึ้นเลย — ของจริงถูกตรวจที่ backend ทุกครั้งอยู่แล้ว
 * ที่นี่มีหน้าที่เดียวคือไม่ให้ผู้ใช้ที่ยังไม่เข้าสู่ระบบเห็นโครงหน้าจอเปล่า ๆ แล้วงง
 */
export function proxy(request: NextRequest): NextResponse {
  const hasSession = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);
  const { pathname, search } = request.nextUrl;
  const isLoginPage = pathname === '/login';

  if (!hasSession && !isLoginPage) {
    const login = new URL('/login', request.url);
    // จำหน้าที่ตั้งใจจะไปไว้ เข้าสู่ระบบเสร็จจะได้พากลับไปที่เดิม ไม่ใช่โยนไปหน้าแรกทุกครั้ง
    if (pathname !== '/') login.searchParams.set('next', `${pathname}${search}`);

    return NextResponse.redirect(login);
  }

  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  /**
   * ไม่ครอบ /api/* เพราะ route handler พวกนั้นต้องทำงานได้แม้ตอนยังไม่มีเซสชัน
   * (หน้าเข้าสู่ระบบเรียก /api/auth/login) และไม่ครอบไฟล์สาธารณะกับรูปภาพ
   */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|brand).*)'],
};
