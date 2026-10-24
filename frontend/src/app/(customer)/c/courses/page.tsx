'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { CUSTOMER_KEYS, customerGet } from '@/lib/customer-api';
import { customerErrorMessage } from '@/lib/customer-errors';
import type { CourseStatus, CustomerCourseView } from '@/lib/customer-types';
import { thaiDateOf } from '@/lib/format';
import { PageHeader } from '@/components/customer/profile';
import { CustomerGate } from '@/components/customer/session';
import {
  PortalEmpty,
  PortalError,
  PortalLinkButton,
  PortalSkeleton,
} from '@/components/customer/ui';

/**
 * หน้าตาของแต่ละสถานะคอร์ส — สถานะมาจาก backend (กฎเดียวกับงานเตือนคอร์สใกล้หมดอายุ)
 * หน้านี้ไม่คำนวณวันหมดอายุเอง ป้ายในมือถือลูกค้ากับข้อความเตือนใน LINE จึงไม่มีวันขัดกัน
 */
const STATUS_VIEW: Record<
  CourseStatus,
  { label: string; badge: string; bookable: boolean; muted: boolean }
> = {
  ACTIVE: {
    label: 'ใช้งานได้',
    badge: 'border-emerald-700/25 bg-emerald-50 text-emerald-800',
    bookable: true,
    muted: false,
  },
  EXPIRING_SOON: {
    label: 'ใกล้หมดอายุ',
    badge: 'border-amber-700/30 bg-amber-50 text-amber-900',
    bookable: true,
    muted: false,
  },
  EXPIRED: {
    label: 'หมดอายุแล้ว',
    badge: 'border-navy-700/15 bg-ivory-100 text-navy-700',
    bookable: false,
    muted: true,
  },
  USED_UP: {
    label: 'ใช้ครบแล้ว',
    badge: 'border-navy-700/15 bg-ivory-100 text-navy-700',
    bookable: false,
    muted: true,
  },
};

export default function CoursesPage() {
  return (
    <div>
      <PageHeader title="คอร์สของฉัน" subtitle="ครั้งที่เหลือและวันหมดอายุของแต่ละคอร์ส" />
      <CustomerGate fallback={<CoursesSkeleton />}>{() => <Courses />}</CustomerGate>
    </div>
  );
}

function Courses() {
  const courses = useQuery({
    queryKey: CUSTOMER_KEYS.courses,
    queryFn: () => customerGet<CustomerCourseView[]>('courses'),
  });

  if (courses.isPending) return <CoursesSkeleton />;
  if (courses.isError) {
    return (
      <PortalError
        message={customerErrorMessage(courses.error)}
        onRetry={() => void courses.refetch()}
      />
    );
  }

  if (courses.data.length === 0) {
    return (
      <div className="mx-5 rounded-2xl border border-ivory-200 bg-white">
        <PortalEmpty
          title="ยังไม่มีคอร์ส"
          hint="เมื่อซื้อคอร์สที่ร้าน ครั้งที่เหลือและวันหมดอายุจะขึ้นที่นี่ให้ดูได้เอง"
        />
      </div>
    );
  }

  return (
    <ul className="space-y-4 px-5">
      {courses.data.map((course) => (
        <li key={course.id}>
          <CourseCard course={course} />
        </li>
      ))}
    </ul>
  );
}

function CourseCard({ course }: { course: CustomerCourseView }) {
  const view = STATUS_VIEW[course.status];
  const bookHref = `/c/book?course=${course.id}${course.serviceId ? `&service=${course.serviceId}` : ''}`;

  return (
    <article
      className={`rounded-2xl border p-4 ${
        view.muted
          ? 'border-ivory-200 bg-ivory-100'
          : 'border-ivory-200 bg-white shadow-[0_8px_24px_-16px_rgb(20_33_50/0.3)]'
      }`}
    >
      <div className="flex items-center gap-4">
        <SessionRing course={course} muted={view.muted} />
        <div className="min-w-0 flex-1">
          <span
            className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${view.badge}`}
          >
            {view.label}
          </span>
          <h2 className="mt-1.5 text-[17px] leading-snug font-medium text-navy-700">
            {course.name}
          </h2>
          <p className="mt-0.5 text-sm text-navy-400">
            {course.serviceName ?? 'ใช้ได้กับทุกบริการ'}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-ivory-50 px-3 py-2.5 text-sm">
        <div>
          <dt className="text-navy-400">ใช้ไปแล้ว</dt>
          <dd className="font-medium text-navy-700">
            {course.usedSessions} จาก {course.totalSessions} ครั้ง
          </dd>
        </div>
        <div>
          <dt className="text-navy-400">{course.daysToExpiry < 0 ? 'หมดอายุเมื่อ' : 'หมดอายุ'}</dt>
          <dd className="font-medium text-navy-700">{thaiDateOf(course.expiresAt)}</dd>
        </div>
      </dl>

      {course.status === 'EXPIRING_SOON' && (
        <p
          role="status"
          className="mt-3 flex items-start gap-2 rounded-xl border border-amber-700/25 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
        >
          <WarningIcon />
          <span>
            {course.daysToExpiry <= 0
              ? 'หมดอายุวันนี้'
              : `เหลืออีก ${course.daysToExpiry} วันจะหมดอายุ`}{' '}
            ยังเหลือ {course.remainingSessions} ครั้ง จองใช้ก่อนหมดอายุได้เลย
          </span>
        </p>
      )}

      {view.bookable && (
        <PortalLinkButton href={bookHref} className="mt-4 h-12 w-full">
          จองโดยใช้คอร์สนี้
        </PortalLinkButton>
      )}
    </article>
  );
}

const RING_SIZE = 76;
const RING_STROKE = 7;

/**
 * วงแหวนครั้งคงเหลือ — ส่วนทองคือครั้งที่ยังเหลือ ลูกค้าดูแวบเดียวรู้ว่าเหลือมากหรือน้อย
 * วาดด้วย pathLength ของ SVG ขนาดเล็ก ไม่ใช่ conic-gradient ที่ต้องวาดพื้นผิวใหม่ทั้งชิ้นทุกเฟรม
 */
function SessionRing({ course, muted }: { course: CustomerCourseView; muted: boolean }) {
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const fraction = course.totalSessions > 0 ? course.remainingSessions / course.totalSessions : 0;

  return (
    <div
      className="relative shrink-0"
      style={{ width: RING_SIZE, height: RING_SIZE }}
      role="img"
      aria-label={`เหลือ ${course.remainingSessions} จาก ${course.totalSessions} ครั้ง`}
    >
      <svg viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="-rotate-90">
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          fill="none"
          stroke="var(--color-ivory-200)"
          strokeWidth={RING_STROKE}
        />
        {fraction > 0 && (
          <motion.circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={radius}
            fill="none"
            stroke={muted ? 'var(--color-navy-400)' : 'var(--color-gold-500)'}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: fraction }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-display text-2xl text-navy-700">{course.remainingSessions}</span>
        <span className="mt-0.5 text-[11px] text-navy-400">ครั้ง</span>
      </div>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="none">
      <path
        d="M10 3.5 18 17H2z M10 8.5v4 M10 14.6v.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CoursesSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4 px-5">
      {[0, 1].map((index) => (
        <PortalSkeleton key={index} className="h-56 w-full rounded-2xl" />
      ))}
    </div>
  );
}
