import { NextResponse, type NextRequest } from 'next/server';
import { backendUrl, callBackend } from '@/lib/backend';
import {
  CUSTOMER_COOKIE,
  PUBLIC_CUSTOMER_PATHS,
  clearCustomerCookie,
  setCustomerCookie,
  splitIssuedSession,
} from '@/lib/customer-session';

/**
 * ทางผ่านเดียวที่หน้าลูกค้าใช้คุยกับ backend
 *
 * หน้าเว็บขึ้น Vercel แต่ backend อยู่หลัง ngrok บนเครื่อง เบราว์เซอร์ของลูกค้าจึงไม่เคยรู้ที่อยู่
 * backend และไม่เคยเห็น customer JWT — ตัวนี้อ่าน cookie แล้วแนบให้บนเซิร์ฟเวอร์
 *
 * จำกัดปลายทางไว้ใต้ /api/customer/* เท่านั้น ส่วน path ที่มี . หรือ .. ถูกปฏิเสธ
 * ไม่งั้น fetch จะตีความ ../ แล้วพาคำขอหลุดไปหา endpoint ของพนักงานได้
 */
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;

  if (path.some((segment) => segment === '.' || segment === '..')) {
    return NextResponse.json(
      { statusCode: 404, error: 'NOT_FOUND', message: 'ไม่พบหน้านี้' },
      { status: 404 },
    );
  }

  const joined = path.join('/');
  const url = backendUrl(
    `customer/${path.map(encodeURIComponent).join('/')}`,
    request.nextUrl.search,
  );
  const token = PUBLIC_CUSTOMER_PATHS.has(joined)
    ? undefined
    : request.cookies.get(CUSTOMER_COOKIE)?.value;

  const body =
    request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();

  let response: Response;
  try {
    response = await callBackend(url, token, {
      method: request.method,
      body: body || undefined,
      contentType: request.headers.get('content-type'),
    });
  } catch {
    // backend ปิดอยู่หรือ ngrok หลุด — ตอบเป็นรูปแบบ error เดียวกับของ backend หน้าเว็บจะได้แสดงผลเหมือนกัน
    return NextResponse.json(
      {
        statusCode: 502,
        error: 'BAD_GATEWAY',
        message: 'เชื่อมต่อร้านไม่ได้ในตอนนี้ ลองใหม่อีกครั้ง',
      },
      { status: 502 },
    );
  }

  const payload = await response.text();
  const issued = splitIssuedSession(joined, response.status, payload);

  const result = new NextResponse(issued ? issued.body : payload || null, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' },
  });

  if (issued) setCustomerCookie(result, issued.token);
  // token หมดอายุหรือลูกค้าถูกปิดบัญชี — ล้างทิ้ง คำขอถัดไปจะได้ไม่แนบของเสียไปอีก
  if (response.status === 401) clearCustomerCookie(result);

  return result;
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
