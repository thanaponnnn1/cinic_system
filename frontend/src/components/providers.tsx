'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiError } from '@/lib/api';
import { ToastProvider } from '@/components/ui/toast';

/**
 * ตัวจัดการข้อมูลของทั้ง dashboard
 *
 * สร้าง QueryClient ใน state ไม่ใช่ที่ระดับโมดูล เพราะโมดูลถูกใช้ซ้ำข้ามคำขอบนเซิร์ฟเวอร์
 * แคชของผู้ใช้คนหนึ่งจะรั่วไปให้อีกคนเห็นได้ ซึ่งกับข้อมูลลูกค้าคลินิกคือเรื่องใหญ่
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // ข้อมูลตารางนัดเก่าเร็วมาก ถือว่าค้างได้ไม่เกิน 10 วินาที
            staleTime: 10_000,
            refetchOnWindowFocus: true,
            retry: (failureCount, error) => {
              // 4xx คือคำขอผิดหรือไม่มีสิทธิ์ ลองใหม่กี่ครั้งก็ได้ผลเดิม เสียเวลาเปล่า
              if (error instanceof ApiError && error.status < 500) return false;
              return failureCount < 2;
            },
          },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
