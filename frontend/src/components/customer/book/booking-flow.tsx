'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useReducer, useState, type ReactNode } from 'react';
import { ApiErrorCode, formatBangkokDate } from '@clinicq/shared';
import {
  BOOKING_STEPS,
  bookingReducer,
  initialDraft,
  usableCourses,
  type BookingDraft,
  type BookingEvent,
} from '@/lib/booking';
import { CUSTOMER_KEYS, customerGet, customerPost } from '@/lib/customer-api';
import { customerErrorMessage, hasErrorCode } from '@/lib/customer-errors';
import { durationLabel, priceLabel } from '@/lib/customer-format';
import type {
  BookAppointmentInput,
  CustomerAppointment,
  CustomerCourseView,
  CustomerProfile,
  CustomerShop,
  ShopProvider,
  ShopService,
  TimeSlot,
} from '@/lib/customer-types';
import { thaiDateOf, timeOf, timeRange } from '@/lib/format';
import { ProfileButton } from '../profile';
import {
  GlowRing,
  Notice,
  PortalCard,
  PortalEmpty,
  PortalError,
  PortalSkeleton,
  StepHeading,
} from '../ui';
import { StepPath } from './step-path';
import { TimeStep } from './time-step';

interface Preset {
  serviceId: string | null;
  providerId: string | null;
  courseId: string | null;
}

export function BookingFlow({ preset, customer }: { preset: Preset; customer: CustomerProfile }) {
  const shop = useQuery({
    queryKey: CUSTOMER_KEYS.shop,
    queryFn: () => customerGet<CustomerShop>('shop'),
    staleTime: 5 * 60_000,
  });
  const courses = useQuery({
    queryKey: CUSTOMER_KEYS.courses,
    queryFn: () => customerGet<CustomerCourseView[]>('courses'),
  });

  if (shop.isPending || courses.isPending) return <BookingSkeleton />;
  if (shop.isError) {
    return (
      <div className="pt-24">
        <PortalError
          message={customerErrorMessage(shop.error)}
          onRetry={() => void shop.refetch()}
        />
      </div>
    );
  }

  return (
    <Booking
      shop={shop.data}
      // โหลดคอร์สไม่ได้ก็ยังจองได้ แค่ไม่มีตัวเลือก "ใช้คอร์ส" — ไม่ควรขวางการจองทั้งหน้า
      courses={courses.data ?? []}
      preset={preset}
      customer={customer}
    />
  );
}

/**
 * ตัดของที่เลือกมาทาง URL ที่ไม่มีอยู่จริงทิ้ง (บริการที่ร้านปิดไปแล้ว คอร์สที่ใช้ไม่ได้)
 * คอร์สที่ผูกบริการไว้เลือกบริการนั้นให้เลย ลูกค้ากด "จองโดยใช้คอร์สนี้" แล้วไม่ต้องหาบริการเอง
 */
function sanitizePreset(preset: Preset, shop: CustomerShop, courses: CustomerCourseView[]) {
  const course = courses.find((c) => c.id === preset.courseId) ?? null;
  const serviceId = preset.serviceId ?? course?.serviceId ?? null;
  const service = shop.services.find((s) => s.id === serviceId) ?? null;
  const provider = shop.providers.find((p) => p.id === preset.providerId) ?? null;
  const courseUsable =
    course !== null && service !== null && usableCourses([course], service.id).length > 0;

  return {
    serviceId: service?.id ?? null,
    providerId: provider?.id ?? null,
    courseId: courseUsable ? course.id : null,
  };
}

function Booking({
  shop,
  courses,
  preset,
  customer,
}: {
  shop: CustomerShop;
  courses: CustomerCourseView[];
  preset: Preset;
  customer: CustomerProfile;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, dispatch] = useReducer(bookingReducer, null, () =>
    initialDraft(sanitizePreset(preset, shop, courses), formatBangkokDate(new Date())),
  );
  const [slotNotice, setSlotNotice] = useState<string | null>(null);

  const book = useMutation({
    mutationFn: (input: BookAppointmentInput) =>
      customerPost<CustomerAppointment>('appointments', input),
    onSuccess: async (appointment) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.appointments }),
        queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.courses }),
      ]);
      router.push(`/c/book/done?id=${appointment.id}`);
    },
    onError: (error, input) => {
      if (!hasErrorCode(error, ApiErrorCode.SLOT_TAKEN)) return;
      // เก็บบริการ ช่าง และวันไว้ตามเดิม ล้างแค่เวลาที่ถูกแย่งไป แล้วดึงช่องว่างใหม่ทันที
      setSlotNotice(`เวลา ${timeOf(input.startsAt)} น. เพิ่งมีคนจองไป เลือกเวลาอื่นได้เลย`);
      dispatch({ type: 'slotTaken' });
      void queryClient.invalidateQueries({ queryKey: ['customer', 'availability'] });
    },
  });

  function send(event: BookingEvent) {
    // ข้อความ error ของรอบก่อนไม่เกี่ยวกับสิ่งที่เพิ่งเลือกใหม่แล้ว
    if (book.isError) book.reset();
    if (event.type === 'pickSlot') setSlotNotice(null);
    dispatch(event);
  }

  const service = shop.services.find((s) => s.id === draft.serviceId) ?? null;
  const slot = draft.slot;
  const stepIndex = BOOKING_STEPS.indexOf(draft.step);

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-ivory-200 bg-ivory-50 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="mb-3 flex items-center gap-1 px-2">
          {stepIndex === 0 ? (
            <Link href="/c" aria-label="กลับหน้าร้าน" className={ICON_BUTTON}>
              <ChevronLeft />
            </Link>
          ) : (
            <button
              type="button"
              aria-label="ย้อนกลับ"
              className={ICON_BUTTON}
              onClick={() => send({ type: 'goTo', step: BOOKING_STEPS[stepIndex - 1] })}
            >
              <ChevronLeft />
            </button>
          )}
          <h1 className="flex-1 font-display text-xl text-navy-700">จองคิว</h1>
          <ProfileButton />
        </div>
        <StepPath draft={draft} onGo={(step) => send({ type: 'goTo', step })} />
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={draft.step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="pt-5"
        >
          {draft.step === 'service' && (
            <ServiceStep services={shop.services} draft={draft} send={send} />
          )}
          {draft.step === 'provider' && (
            <ProviderStep providers={shop.providers} draft={draft} send={send} />
          )}
          {draft.step === 'time' && service && (
            <TimeStep
              service={service}
              draft={draft}
              notice={slotNotice}
              providerName={providerName(draft, shop.providers)}
              send={send}
            />
          )}
          {draft.step === 'confirm' && service && slot && (
            <ConfirmStep
              service={service}
              slot={slot}
              draft={draft}
              courses={usableCourses(courses, service.id)}
              customer={customer}
              providerName={providerName(draft, shop.providers)}
              send={send}
              submitting={book.isPending}
              error={book.isError ? book.error : null}
              onConfirm={() =>
                book.mutate({
                  serviceId: service.id,
                  providerId: draft.provider?.kind === 'provider' ? draft.provider.id : undefined,
                  startsAt: slot.startsAt,
                  customerCourseId: draft.courseId ?? undefined,
                })
              }
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function providerName(draft: BookingDraft, providers: ShopProvider[]): string {
  if (draft.provider?.kind !== 'provider') return 'ช่างคนไหนก็ได้';
  const id = draft.provider.id;
  return providers.find((p) => p.id === id)?.name ?? 'ช่างคนไหนก็ได้';
}

const ICON_BUTTON =
  'grid size-11 place-items-center rounded-full text-navy-700 hover:bg-ivory-200 focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:outline-none';

/** การ์ดตัวเลือกหนึ่งแถว — ใช้ทั้งเลือกบริการและเลือกช่าง ตัวที่เลือกอยู่มีขอบทองและเครื่องหมายถูก */
function ChoiceCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center gap-4 rounded-2xl border bg-white p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:outline-none ${
        selected
          ? 'border-gold-500 ring-1 ring-gold-500'
          : 'border-ivory-200 hover:border-ivory-300'
      }`}
    >
      {children}
      <span
        aria-hidden
        className={`ml-auto grid size-6 shrink-0 place-items-center rounded-full border ${
          selected ? 'border-gold-500 bg-gold-400 text-navy-800' : 'border-ivory-300'
        }`}
      >
        {selected && (
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
            <path
              d="m3.5 8.5 3 3 6-7"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}

function ServiceStep({
  services,
  draft,
  send,
}: {
  services: ShopService[];
  draft: BookingDraft;
  send: (event: BookingEvent) => void;
}) {
  if (services.length === 0) {
    return (
      <PortalEmpty
        title="ร้านยังไม่ได้เปิดบริการให้จองออนไลน์"
        hint="ทักแชทร้านใน LINE เพื่อสอบถามคิวได้เลย"
      />
    );
  }

  return (
    <>
      <StepHeading title="เลือกบริการ" hint="ราคาและเวลาโดยประมาณต่อครั้ง" />
      <ul className="space-y-3 px-5">
        {services.map((service) => (
          <li key={service.id}>
            <ChoiceCard
              selected={draft.serviceId === service.id}
              onClick={() => send({ type: 'pickService', serviceId: service.id })}
            >
              <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-ivory-200">
                {service.imageUrl && (
                  <img
                    src={service.imageUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-medium text-navy-700">{service.name}</span>
                <span className="mt-0.5 block text-sm text-navy-400">
                  {durationLabel(service.durationMin)} · {priceLabel(service.price)}
                </span>
              </span>
            </ChoiceCard>
          </li>
        ))}
      </ul>
    </>
  );
}

function ProviderStep({
  providers,
  draft,
  send,
}: {
  providers: ShopProvider[];
  draft: BookingDraft;
  send: (event: BookingEvent) => void;
}) {
  const chosenId = draft.provider?.kind === 'provider' ? draft.provider.id : null;

  return (
    <>
      <StepHeading title="เลือกช่าง" hint="อยากได้ช่างคนเดิม หรือให้ร้านเลือกคนที่ว่างให้" />
      <ul className="space-y-3 px-5">
        <li>
          <ChoiceCard
            selected={draft.provider?.kind === 'any'}
            onClick={() => send({ type: 'pickProvider', provider: { kind: 'any' } })}
          >
            <span className="grid size-14 shrink-0 place-items-center rounded-full border border-gold-500/60 bg-ivory-100 text-gold-700">
              <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none">
                <path
                  d="M12 3.5 13.9 9l5.6.1-4.5 3.4 1.6 5.5L12 14.8 7.4 18l1.6-5.5L4.5 9.1 10.1 9z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-medium text-navy-700">ช่างคนไหนก็ได้</span>
              <span className="mt-0.5 block text-sm text-navy-400">
                เห็นเวลาว่างมากที่สุด ระบบเลือกช่างที่ว่างในเวลานั้นให้
              </span>
            </span>
          </ChoiceCard>
        </li>
        {providers.map((provider) => (
          <li key={provider.id}>
            <ChoiceCard
              selected={chosenId === provider.id}
              onClick={() =>
                send({ type: 'pickProvider', provider: { kind: 'provider', id: provider.id } })
              }
            >
              <span className="size-14 shrink-0 overflow-hidden rounded-full bg-ivory-200 ring-1 ring-gold-500/50">
                {provider.photoUrl && (
                  <img
                    src={provider.photoUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-medium text-navy-700">{provider.name}</span>
                {provider.title && (
                  <span className="mt-0.5 block text-sm text-navy-400">{provider.title}</span>
                )}
              </span>
            </ChoiceCard>
          </li>
        ))}
      </ul>
    </>
  );
}

function ConfirmStep({
  service,
  slot,
  draft,
  courses,
  customer,
  providerName,
  send,
  submitting,
  error,
  onConfirm,
}: {
  service: ShopService;
  slot: TimeSlot;
  draft: BookingDraft;
  courses: CustomerCourseView[];
  customer: CustomerProfile;
  providerName: string;
  send: (event: BookingEvent) => void;
  submitting: boolean;
  error: unknown;
  onConfirm: () => void;
}) {
  const usingCourse = courses.find((course) => course.id === draft.courseId) ?? null;

  return (
    <div>
      <StepHeading title="ตรวจสอบและยืนยัน" hint={`จองในชื่อ ${customer.name}`} />
      <div className="space-y-4 px-5">
        <PortalCard className="divide-y divide-ivory-200">
          <SummaryRow label="บริการ" value={service.name} />
          <SummaryRow label="ช่าง" value={providerName} />
          <SummaryRow label="วัน" value={thaiDateOf(slot.startsAt)} />
          <SummaryRow
            label="เวลา"
            value={`${timeRange(slot.startsAt, slot.endsAt)} น. (${durationLabel(service.durationMin)})`}
          />
          <SummaryRow
            label="ค่าบริการ"
            value={usingCourse ? `ตัดจาก${usingCourse.name}` : priceLabel(service.price)}
          />
        </PortalCard>

        {courses.length > 0 && (
          <CourseToggle courses={courses} selectedId={draft.courseId} send={send} />
        )}

        {error !== null && (
          <Notice tone="error">
            {customerErrorMessage(error)}
            {hasErrorCode(error, ApiErrorCode.BOOKING_LIMIT_REACHED) && (
              <Link href="/c/appointments" className="mt-2 block font-medium underline">
                ไปที่นัดของฉัน
              </Link>
            )}
          </Notice>
        )}

        <GlowRing className="mt-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            aria-busy={submitting}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-navy-700 text-[17px] font-medium text-ivory-50 focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:outline-none focus-visible:ring-inset disabled:opacity-80"
          >
            {submitting ? 'กำลังจอง…' : 'ยืนยันการจอง'}
          </button>
        </GlowRing>
        <p className="pb-4 text-center text-sm text-navy-400">
          ยกเลิกหรือขอเลื่อนได้เองในหน้า &quot;นัดของฉัน&quot;
        </p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-sm text-navy-400">{label}</span>
      <span className="text-right text-[15px] font-medium text-navy-700">{value}</span>
    </div>
  );
}

/**
 * ตัวเลือก "ใช้คอร์ส" — มีให้เห็นเฉพาะเมื่อลูกค้ามีคอร์สที่ใช้กับบริการนี้ได้
 * ครั้งของคอร์สถูกตัดตอนร้านปิดงานหลังรับบริการ ไม่ใช่ตอนกดจอง จึงบอกไว้ตรงนี้กันเข้าใจผิด
 */
function CourseToggle({
  courses,
  selectedId,
  send,
}: {
  courses: CustomerCourseView[];
  selectedId: string | null;
  send: (event: BookingEvent) => void;
}) {
  const on = selectedId !== null;

  return (
    <PortalCard className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p id="use-course-label" className="text-[15px] font-medium text-navy-700">
            ใช้คอร์ส
          </p>
          <p className="mt-0.5 text-sm text-navy-400">ตัด 1 ครั้งเมื่อรับบริการเสร็จ</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="use-course-label"
          onClick={() => send({ type: 'setCourse', courseId: on ? null : courses[0].id })}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:ring-offset-2 focus-visible:outline-none ${
            on ? 'bg-navy-700' : 'bg-ivory-300'
          }`}
        >
          <motion.span
            aria-hidden
            className="absolute top-1 left-1 size-6 rounded-full bg-white shadow"
            animate={{ x: on ? 24 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
          />
        </button>
      </div>

      {on && (
        <ul className="mt-3 space-y-2">
          {courses.map((course) => (
            <li key={course.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-ivory-100 px-3 py-2.5">
                <input
                  type="radio"
                  name="course"
                  checked={selectedId === course.id}
                  onChange={() => send({ type: 'setCourse', courseId: course.id })}
                  className="size-4 accent-navy-700"
                />
                <span className="min-w-0 text-sm text-navy-700">
                  <span className="block font-medium">{course.name}</span>
                  <span className="block text-navy-400">
                    เหลือ {course.remainingSessions} จาก {course.totalSessions} ครั้ง · หมดอายุ{' '}
                    {thaiDateOf(course.expiresAt)}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </PortalCard>
  );
}

export function BookingSkeleton() {
  return (
    <div aria-busy="true" aria-label="กำลังโหลดขั้นตอนจอง" className="space-y-4 px-5 pt-6">
      <PortalSkeleton className="h-7 w-28" />
      <PortalSkeleton className="h-12 w-full" />
      <PortalSkeleton className="mt-6 h-8 w-40" />
      {[0, 1, 2, 3].map((index) => (
        <PortalSkeleton key={index} className="h-[88px] w-full rounded-2xl" />
      ))}
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none">
      <path
        d="m14.5 6-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
