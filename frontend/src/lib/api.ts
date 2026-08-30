import type { ApiErrorResponse } from '@clinicq/shared';

/**
 * ตัวยิงคำขอของหน้าจอ
 *
 * ทุกอย่างวิ่งผ่าน /api/proxy ของ Next ไม่ยิงหา backend ตรง ๆ เพราะ token อยู่ใน cookie
 * แบบ httpOnly ที่ JavaScript ในหน้าเว็บแตะไม่ได้ (ดู lib/session.ts)
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function url(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return `/api/proxy/${path}${query ? `?${query}` : ''}`;
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const error = payload as ApiErrorResponse | null;
    // ข้อความจาก backend เป็นภาษาไทยและอธิบายสาเหตุจริงอยู่แล้ว เอามาแสดงตรง ๆ ดีกว่าเขียนใหม่
    const message = Array.isArray(error?.message)
      ? error.message.join(' · ')
      : (error?.message ?? `คำขอไม่สำเร็จ (${response.status})`);

    throw new ApiError(message, response.status, error?.error);
  }

  return payload as T;
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  return parse<T>(await fetch(url(path, params), { cache: 'no-store' }));
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(url(path), {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return parse<T>(response);
}

export const apiPost = <T>(path: string, body?: unknown): Promise<T> => send<T>('POST', path, body);
export const apiPatch = <T>(path: string, body?: unknown): Promise<T> =>
  send<T>('PATCH', path, body);
export const apiDelete = <T>(path: string): Promise<T> => send<T>('DELETE', path);
