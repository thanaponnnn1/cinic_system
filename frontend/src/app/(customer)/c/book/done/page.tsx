'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { BRAND_INFO, formatBangkokDate } from '@clinicq/shared';
import { CUSTOMER_KEYS, customerGet } from '@/lib/customer-api';
import { customerErrorMessage } from '@/lib/customer-errors';
import type {
  CustomerAppointment,
  CustomerAppointmentList,
  CustomerProfile,
} from '@/lib/customer-types';
import { buildIcs } from '@/lib/ics';
import { AppointmentTicket } from '@/components/customer/appointment-ticket';
import { CustomerGate } from '@/components/customer/session';
import {
  PortalButton,
  PortalEmpty,
  PortalError,
  PortalLinkButton,
  PortalSkeleton,
} from '@/components/customer/ui';

/**
 * จองสำเร็จ — ดึงนัดจากรายการนัดของลูกค้าเองด้วย id ใน URL แทนการส่งข้อมูลข้ามหน้า
 * รีเฟรชหน้านี้หรือเปิดซ้ำทีหลังก็ยังเห็นนัดเดิม และไม่มีทางเห็นนัดของคนอื่น
 */
export default function BookingDonePage() {
  return (
    <Suspense fallback={<DoneSkeleton />}>
      <Done />
    </Suspense>
  );
}

function Done() {
  const id = useSearchParams().get('id');

  return (
    <CustomerGate fallback={<DoneSkeleton />}>
      {(customer) => <DoneContent id={id} customer={customer} />}
    </CustomerGate>
  );
}

function DoneContent({ id, customer }: { id: string | null; customer: CustomerProfile }) {
  const list = useQuery({
    queryKey: CUSTOMER_KEYS.appointments,
    queryFn: () => customerGet<CustomerAppointmentList>('appointments'),
  });

  if (list.isPending) return <DoneSkeleton />;
  if (list.isError) {
    return (
      <div className="pt-24">
        <PortalError
          message={customerErrorMessage(list.error)}
          onRetry={() => void list.refetch()}
        />
      </div>
    );
  }

  const appointment = [...list.data.upcoming, ...list.data.past].find((a) => a.id === id);
  if (!appointment) {
    return (
      <div className="pt-24">
        <PortalEmpty
          title="ไม่พบนัดนี้"
          hint="ดูนัดทั้งหมดของคุณได้ในหน้านัดของฉัน"
          action={<PortalLinkButton href="/c/appointments">ไปที่นัดของฉัน</PortalLinkButton>}
        />
      </div>
    );
  }

  return (
    <div className="px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-6">
      <div className="flex flex-col items-center text-center">
        <AnimatedCheck />
        <h1 className="mt-5 font-display text-3xl text-navy-700">จองเรียบร้อยแล้ว</h1>
        <p className="mt-2 max-w-[19rem] text-[15px] text-navy-700">{reminderText(customer)}</p>
      </div>

      <div className="mt-8">
        <AppointmentTicket appointment={appointment} />
      </div>

      <div className="mt-6 grid gap-2">
        <PortalButton onClick={() => downloadIcs(appointment)} className="h-12">
          <CalendarIcon />
          เพิ่มลงปฏิทิน
        </PortalButton>
        <PortalLinkButton href="/c/appointments" variant="outline" className="h-12">
          ดูนัดของฉัน
        </PortalLinkButton>
        <PortalLinkButton href="/c" variant="ghost">
          กลับหน้าร้าน
        </PortalLinkButton>
      </div>
    </div>
  );
}

/**
 * ข้อความปลอบใจหลังจอง — บอกตามจริงตามความยินยอมของลูกค้า ไม่สัญญาว่าจะเตือน
 * กับคนที่ไม่ได้เปิดรับข้อความเตือน หรือยังไม่ได้เชื่อม LINE ซึ่งระบบส่งหาไม่ได้
 */
function reminderText(customer: CustomerProfile): string {
  if (!customer.consentReminder) {
    return 'คุณไม่ได้เปิดรับข้อความเตือนนัด กดเพิ่มลงปฏิทินไว้ จะได้ไม่ลืม';
  }
  if (!customer.hasLineLinked) {
    return 'เราจะเตือนทาง LINE ก่อนถึงนัด 1 วัน เมื่อบัญชีของคุณเชื่อมกับ LINE ของร้านแล้ว';
  }
  return 'เราจะส่งข้อความเตือนทาง LINE ก่อนถึงนัด 1 วัน พร้อมปุ่มยืนยันนัด';
}

function downloadIcs(appointment: CustomerAppointment) {
  const ics = buildIcs({
    uid: `${appointment.id}@clinicq`,
    title: `${appointment.serviceName} · ${BRAND_INFO.name}`,
    description: `ช่าง: ${appointment.providerName}`,
    location: BRAND_INFO.name,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    createdAt: new Date(),
  });

  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `nad-${formatBangkokDate(new Date(appointment.startsAt))}.ics`;
  link.click();
  // ปล่อยให้เบราว์เซอร์เริ่มดาวน์โหลดก่อนแล้วค่อยคืนหน่วยความจำ
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** เครื่องหมายถูกที่วาดตัวเอง — ขยับแค่ scale/opacity และความยาวเส้นของ SVG ขนาดเล็ก */
function AnimatedCheck() {
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="grid size-24 place-items-center rounded-full bg-navy-700 ring-8 ring-gold-200/60"
    >
      <svg aria-hidden viewBox="0 0 48 48" className="size-12" fill="none">
        <motion.path
          d="M13 25.5 21 33l14-17"
          stroke="var(--color-gold-300)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.2, duration: 0.45, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none">
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 3.5v4M16 3.5v4M4 10h16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DoneSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col items-center space-y-4 px-5 pt-16">
      <PortalSkeleton className="size-24 rounded-full" />
      <PortalSkeleton className="h-8 w-48" />
      <PortalSkeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
