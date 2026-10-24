'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, type ReactNode } from 'react';
import { ApiError } from '@/lib/api';
import { CUSTOMER_KEYS, customerGet } from '@/lib/customer-api';
import type { CustomerProfile } from '@/lib/customer-types';
import { customerErrorMessage } from '@/lib/customer-errors';
import { PortalError } from './ui';

export type CustomerSession =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'signed_in'; customer: CustomerProfile }
  | { status: 'error'; message: string; retry: () => void };

/**
 * ใครเข้าสู่ระบบอยู่ — ถามจาก GET /me เพราะ token อยู่ใน cookie แบบ httpOnly ที่หน้าเว็บอ่านไม่ได้
 * 401 แปลว่ายังไม่ได้เข้าสู่ระบบ ไม่ใช่ error ที่ต้องโชว์
 */
export function useCustomerSession(): CustomerSession {
  const me = useQuery({
    queryKey: CUSTOMER_KEYS.me,
    queryFn: () => customerGet<CustomerProfile>('me'),
    staleTime: 60_000,
  });

  if (me.isPending) return { status: 'loading' };
  if (me.isError) {
    if (me.error instanceof ApiError && me.error.status === 401) return { status: 'signed_out' };
    return {
      status: 'error',
      message: customerErrorMessage(me.error),
      retry: () => void me.refetch(),
    };
  }
  return { status: 'signed_in', customer: me.data };
}

/** ที่ที่ควรกลับไปหลังเข้าสู่ระบบ — รับเฉพาะ path ในหน้าลูกค้า กันลิงก์หลอกพาออกไปเว็บอื่น */
export function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/c') || raw.startsWith('//')) return '/c';
  return raw;
}

/**
 * หน้าที่ต้องรู้ตัวลูกค้า — ยังไม่เข้าสู่ระบบก็พาไปหน้า welcome พร้อมจำหน้าที่ตั้งใจจะมา
 */
export function CustomerGate({
  fallback,
  children,
}: {
  fallback: ReactNode;
  children: (customer: CustomerProfile) => ReactNode;
}) {
  const session = useCustomerSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (session.status !== 'signed_out') return;
    const next = `${pathname}${window.location.search}`;
    router.replace(`/c/welcome?next=${encodeURIComponent(next)}`);
  }, [session.status, pathname, router]);

  if (session.status === 'signed_in') return children(session.customer);
  if (session.status === 'error') {
    return <PortalError message={session.message} onRetry={session.retry} />;
  }
  return fallback;
}

/**
 * ออกจากระบบ — ล้าง cookie ที่ server แล้วทิ้งข้อมูลส่วนตัวของคนก่อนออกจากแคช
 * หน้าร้านเก็บไว้ได้ เพราะเหมือนกันทุกคน
 */
export function useSignOut(): () => Promise<void> {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await fetch('/api/customer/logout', { method: 'POST' });
    queryClient.removeQueries({
      predicate: (query) =>
        query.queryKey[0] === CUSTOMER_KEYS.all[0] && query.queryKey[1] !== CUSTOMER_KEYS.shop[1],
    });
  }, [queryClient]);
}
