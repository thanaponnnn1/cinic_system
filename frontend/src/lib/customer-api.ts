import { parseApiResponse } from '@/lib/api';

/**
 * ตัวยิงคำขอของหน้าลูกค้า — วิ่งผ่าน /api/customer ของ Next เสมอ (ดู app/api/customer)
 *
 * error ที่โยนออกมาเป็น ApiError ตัวเดียวกับ dashboard ตัวจัดการ retry ใน providers.tsx
 * จึงรู้จักและไม่ลองซ้ำกับ 4xx ให้เสียเวลา
 */
function url(path: string, params?: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return `/api/customer/${path}${query ? `?${query}` : ''}`;
}

export async function customerGet<T>(
  path: string,
  params?: Record<string, string | undefined>,
): Promise<T> {
  return parseApiResponse<T>(await fetch(url(path, params), { cache: 'no-store' }));
}

async function send<T>(method: 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
  const response = await fetch(url(path), {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return parseApiResponse<T>(response);
}

export const customerPost = <T>(path: string, body?: unknown): Promise<T> =>
  send<T>('POST', path, body);
export const customerPatch = <T>(path: string, body?: unknown): Promise<T> =>
  send<T>('PATCH', path, body);

/** คีย์แคชของ react-query ฝั่งลูกค้า — รวมไว้ที่เดียว ตอนสลับลูกค้าจะได้ล้างครบทุกชุด */
export const CUSTOMER_KEYS = {
  all: ['customer'] as const,
  me: ['customer', 'me'] as const,
  shop: ['customer', 'shop'] as const,
  demoCustomers: ['customer', 'demo-customers'] as const,
  appointments: ['customer', 'appointments'] as const,
  courses: ['customer', 'courses'] as const,
  availability: (serviceId: string, providerId: string | null, date: string) =>
    ['customer', 'availability', serviceId, providerId ?? 'any', date] as const,
};
