import { z } from 'zod';
import { SITE_MODES } from './content/schema.ts';

/**
 * ค่าตั้งค่าจาก environment ตรวจครั้งเดียวตอนโหลด ค่าผิดรูปแบบทำให้ build ล้มทันที
 * - SITE_MODE: demo = ข้อมูลสมมติ ใส่ noindex ทั้งเว็บ · live = เว็บจริง ห้ามมีของเดโมเหลือ
 */
const env = z
  .object({
    SITE_MODE: z.enum(SITE_MODES).default('demo'),
    NEXT_PUBLIC_BOOKING_URL: z.url().default('http://localhost:3000'),
    SITE_URL: z.url().default('http://localhost:3100'),
  })
  .parse({
    SITE_MODE: process.env.SITE_MODE || undefined,
    NEXT_PUBLIC_BOOKING_URL: process.env.NEXT_PUBLIC_BOOKING_URL || undefined,
    SITE_URL: process.env.SITE_URL || undefined,
  });

export const SITE_MODE = env.SITE_MODE;
export const SITE_URL = env.SITE_URL.replace(/\/$/, '');
const BOOKING_URL = env.NEXT_PUBLIC_BOOKING_URL.replace(/\/$/, '');

/** ลิงก์ไปหน้าจองที่เลือกบริการ (และช่าง) ไว้แล้ว หน้าจองรับ slug ได้ตามแผน S5 */
export function bookingHref(service?: string, provider?: string): string {
  const params = new URLSearchParams();
  if (service) params.set('service', service);
  if (provider) params.set('provider', provider);
  const query = params.toString();
  return `${BOOKING_URL}/c/book${query ? `?${query}` : ''}`;
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path === '/' ? '' : path}`;
}
