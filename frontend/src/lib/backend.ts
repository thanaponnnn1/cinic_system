/**
 * ที่อยู่ของ API
 *
 * อ่านตอนรัน ไม่ใช่ตอน build — ค่าที่ขึ้นต้นด้วย NEXT_PUBLIC_ จะถูกฝังลงในบันเดิลตั้งแต่ตอน build
 * ย้ายเซิร์ฟเวอร์ทีต้อง build ใหม่ทุกครั้ง ซึ่งเป็นกับดักตอนขึ้นคลาวด์ใน Phase 8
 *
 * มีแต่ฝั่งเซิร์ฟเวอร์ของ Next เท่านั้นที่ใช้ค่านี้ (route handler ใน app/api) เบราว์เซอร์
 * ของผู้ใช้ไม่เคยคุยกับ backend โดยตรงเลย จึงไม่ต้องรู้ว่า API อยู่ที่ไหนและไม่เคยเห็น token
 */
function apiUrl(): string {
  return process.env.CLINICQ_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
}

/** ประกอบ URL ของ backend จาก path ที่หน้าจอขอมา เช่น ['appointments','day-board'] */
export function backendUrl(path: string, search = ''): string {
  return `${apiUrl()}/api/${path}${search}`;
}

export interface BackendCall {
  method: string;
  body?: string;
  contentType?: string | null;
}

/** ยิงหา backend พร้อมแนบ access token ให้ — ตัวเรียกเป็นคนตัดสินใจว่าจะทำยังไงกับผลลัพธ์ */
export async function callBackend(
  url: string,
  accessToken: string | undefined,
  call: BackendCall,
): Promise<Response> {
  const headers: Record<string, string> = {};

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (call.contentType) headers['Content-Type'] = call.contentType;

  return fetch(url, {
    method: call.method,
    headers,
    body: call.body,
    // ข้อมูลตารางนัดเปลี่ยนตลอดเวลา แคชไว้เมื่อไหร่คือหน้าจอโกหกทันที
    cache: 'no-store',
  });
}

/**
 * ขอ access token ใบใหม่ด้วย refresh token
 *
 * คืน null เมื่อขอไม่ได้ ซึ่งแปลว่าเซสชันหมดจริง ๆ แล้ว (refresh token ถูกใช้ไปแล้ว
 * หรือถูกเพิกถอน) ตัวเรียกต้องล้าง cookie แล้วส่งผู้ใช้กลับไปหน้าเข้าสู่ระบบ
 */
export async function refreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const response = await fetch(backendUrl('auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });

  if (!response.ok) return null;

  return (await response.json()) as { accessToken: string; refreshToken: string };
}
