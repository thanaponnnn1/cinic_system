import { NextResponse } from 'next/server';
import { clearCustomerCookie } from '@/lib/customer-session';

/**
 * ออกจากระบบฝั่งลูกค้า
 *
 * customer JWT ไม่มีตัวเพิกถอนที่ backend การล้าง cookie จึงเป็นทั้งหมดที่ต้องทำ
 * ไฟล์นี้ชนะ [...path] เพราะ Next จับ path ที่ตรงตัวก่อน path แบบรับทุกอย่าง
 */
export function POST(): NextResponse {
  const response = NextResponse.json({ status: 'ok' });
  clearCustomerCookie(response);
  return response;
}
