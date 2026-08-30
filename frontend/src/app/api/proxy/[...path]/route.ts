import { NextResponse, type NextRequest } from 'next/server';
import { backendUrl, callBackend, refreshTokens } from '@/lib/backend';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} from '@/lib/session';

/**
 * ทางผ่านเดียวที่หน้าจอใช้คุยกับ backend
 *
 * มีอยู่สองเหตุผล:
 * 1. token อยู่ใน cookie แบบ httpOnly เบราว์เซอร์จึงแนบ Authorization เองไม่ได้ ต้องมีใครสักคน
 *    บนเซิร์ฟเวอร์อ่าน cookie แล้วแนบให้
 * 2. การต่ออายุ token เมื่อหมดอายุต้องอยู่ที่เดียว ไม่ใช่กระจายอยู่ในทุกหน้าจอ — ที่นี่คือที่นั้น
 *
 * เมื่อ backend ตอบ 401 จะขอ token ใบใหม่แล้วยิงซ้ำให้หนึ่งครั้ง ผู้ใช้ที่เปิดหน้าจอทิ้งไว้
 * ข้ามคืนจึงกดปุ่มต่อได้เลยโดยไม่ต้องเข้าสู่ระบบใหม่ และไม่มีหน้าไหนต้องรู้เรื่องนี้
 */
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  const url = backendUrl(path.join('/'), request.nextUrl.search);

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  // อ่าน body ครั้งเดียวเก็บไว้ เพราะถ้าต้องยิงซ้ำหลังต่ออายุ token จะอ่านจาก request เดิมไม่ได้อีก
  const body =
    request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
  const call = {
    method: request.method,
    body: body || undefined,
    contentType: request.headers.get('content-type'),
  };

  let response = await callBackend(url, accessToken, call);
  let renewed: { accessToken: string; refreshToken: string } | null = null;

  if (response.status === 401 && refreshToken) {
    renewed = await refreshTokens(refreshToken);

    if (!renewed) {
      // เซสชันหมดจริง — ล้าง cookie ทิ้งเพื่อให้ตัวกันทางส่งผู้ใช้ไปหน้าเข้าสู่ระบบในคำขอถัดไป
      const expired = NextResponse.json(
        { statusCode: 401, error: 'UNAUTHORIZED', message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' },
        { status: 401 },
      );
      clearSessionCookies(expired);
      return expired;
    }

    response = await callBackend(url, renewed.accessToken, call);
  }

  const payload = await response.text();
  const result = new NextResponse(payload || null, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    },
  });

  if (renewed) setSessionCookies(result, renewed);

  return result;
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
