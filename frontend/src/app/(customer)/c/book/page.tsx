'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { BookingFlow, BookingSkeleton } from '@/components/customer/book/booking-flow';
import { CustomerGate } from '@/components/customer/session';

/**
 * จองคิว 4 ขั้น — รับของที่เลือกมาจากหน้าอื่นทาง query (?service= ?provider= ?course=)
 * เช่น แตะการ์ดบริการในหน้าร้าน หรือปุ่ม "จองกับช่างคนนี้" แล้วข้ามขั้นที่เลือกแล้วไปเลย
 */
export default function BookPage() {
  return (
    <Suspense fallback={<BookingSkeleton />}>
      <BookWithPreset />
    </Suspense>
  );
}

function BookWithPreset() {
  const params = useSearchParams();
  const preset = {
    serviceId: params.get('service'),
    providerId: params.get('provider'),
    courseId: params.get('course'),
  };

  return (
    <CustomerGate fallback={<BookingSkeleton />}>
      {(customer) => (
        // key ตาม query — กดลิงก์จองจากหน้าอื่นขณะอยู่หน้านี้ต้องเริ่มขั้นตอนใหม่ตามของที่เลือกมา
        <BookingFlow key={params.toString()} preset={preset} customer={customer} />
      )}
    </CustomerGate>
  );
}
