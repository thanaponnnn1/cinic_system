'use client';

import { useQuery } from '@tanstack/react-query';
import { CUSTOMER_KEYS, customerGet } from '@/lib/customer-api';
import type { DemoCustomerOption } from '@/lib/customer-types';

/**
 * รายชื่อลูกค้าเดโม — backend ตอบ 403 เมื่อปิดโหมดเดโม แล้ว data เป็น undefined
 * ทุกที่ที่เกี่ยวกับเดโม (ตัวเลือกลูกค้า ปุ่มสลับลูกค้า) ซ่อนตัวเองจากค่านี้ค่าเดียว
 */
export function useDemoCustomers() {
  return useQuery({
    queryKey: CUSTOMER_KEYS.demoCustomers,
    queryFn: () => customerGet<DemoCustomerOption[]>('demo/customers'),
    staleTime: 5 * 60_000,
  });
}
