'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { BookingFlow, BookingSkeleton } from '@/components/customer/book/booking-flow';
import { CustomerGate } from '@/components/customer/session';

/**
 * จองคิว 4 ขั้น — รับของที่เลือกมาจากหน้าอื่นทาง query (?service= ?provider= ?course=)
 * เช่น แตะการ์ดบริการในหน้าร้าน หรือปุ่ม "จองกับช่างคนนี้" แล้วข้ามขั้นที่เลือกแล้วไปเลย
 * ?service= กับ ?provider= เป็นได้ทั้ง id (ลิงก์ในแอป) และ slug (ลิงก์จากเว็บร้าน)
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
    service: params.get('service'),
    provider: params.get('provider'),
    course: params.get('course'),
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
