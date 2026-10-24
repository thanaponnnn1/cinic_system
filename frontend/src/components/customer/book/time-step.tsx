'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  PERIOD_LABEL,
  groupSlotsByPeriod,
  upcomingDays,
  type BookingDraft,
  type BookingEvent,
} from '@/lib/booking';
import { CUSTOMER_KEYS, customerGet } from '@/lib/customer-api';
import { customerErrorMessage } from '@/lib/customer-errors';
import type { ShopService, TimeSlot } from '@/lib/customer-types';
import { timeOf } from '@/lib/format';
import { Notice, PortalButton, PortalError, PortalSkeleton, StepHeading } from '../ui';

/** แถบวันที่ยาวสองสัปดาห์ — ไกลกว่านี้ลูกค้าส่วนใหญ่ยังไม่รู้ตารางตัวเอง ส่วนวันไกลกว่านั้นจองที่ร้านได้ */
const DAYS_SHOWN = 14;

export function TimeStep({
  service,
  draft,
  notice,
  providerName,
  send,
}: {
  service: ShopService;
  draft: BookingDraft;
  notice: string | null;
  providerName: string;
  send: (event: BookingEvent) => void;
}) {
  const [days] = useState(() => upcomingDays(new Date(), DAYS_SHOWN));
  const providerId = draft.provider?.kind === 'provider' ? draft.provider.id : null;
  const dayIndex = days.findIndex((day) => day.date === draft.date);
  const nextDay = dayIndex >= 0 ? days[dayIndex + 1] : undefined;

  const slots = useQuery({
    queryKey: CUSTOMER_KEYS.availability(service.id, providerId, draft.date),
    queryFn: () =>
      customerGet<TimeSlot[]>('availability', {
        serviceId: service.id,
        providerId: providerId ?? undefined,
        date: draft.date,
      }),
    // ช่องว่างเปลี่ยนตลอดเวลาที่มีคนจอง แคชไว้นานคือพาลูกค้าไปกดช่องที่เต็มแล้ว
    staleTime: 0,
  });

  return (
    <div>
      <StepHeading
        title="เลือกวันและเวลา"
        hint={`${service.name} · ${providerName} · แสดงเฉพาะเวลาที่ว่างจริง`}
      />

      {notice && (
        <div className="mb-4 px-5">
          <Notice tone="warn">{notice}</Notice>
        </div>
      )}

      <div
        role="listbox"
        aria-label="เลือกวัน"
        className="no-scrollbar flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pb-2"
      >
        {days.map((day) => {
          const selected = day.date === draft.date;
          return (
            <button
              key={day.date}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => send({ type: 'pickDate', date: day.date })}
              className={`flex w-[60px] shrink-0 snap-start flex-col items-center rounded-2xl border py-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:outline-none ${
                selected
                  ? 'border-navy-700 bg-navy-700 text-ivory-50'
                  : 'border-ivory-200 bg-white text-navy-700'
              }`}
            >
              <span className={`text-xs ${selected ? 'text-ivory-100' : 'text-navy-400'}`}>
                {day.isToday ? 'วันนี้' : day.weekday}
              </span>
              <span className="font-display text-xl leading-tight">{day.day}</span>
              <span className={`text-xs ${selected ? 'text-ivory-100' : 'text-navy-400'}`}>
                {day.month}
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-5 pt-5 pb-6">
        {slots.isPending && (
          <div aria-busy="true" className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }, (_, index) => (
              <PortalSkeleton key={index} className="h-11 rounded-full" />
            ))}
          </div>
        )}

        {slots.isError && (
          <PortalError
            message={customerErrorMessage(slots.error)}
            onRetry={() => void slots.refetch()}
          />
        )}

        {slots.data && slots.data.length === 0 && (
          <div className="rounded-2xl border border-ivory-200 bg-white px-5 py-6 text-center">
            <p className="text-[15px] font-medium text-navy-700">ไม่มีเวลาว่างในวันนี้</p>
            <p className="mt-1 text-sm text-navy-400">
              {dayIndex === 0
                ? 'วันนี้อาจเลยเวลารับจองล่วงหน้าแล้ว หรือคิวเต็ม ลองเลือกวันอื่น'
                : providerId
                  ? `คิวของ${providerName}เต็มทั้งวัน ลองวันอื่น หรือย้อนไปเลือก "ช่างคนไหนก็ได้"`
                  : 'คิวของทุกช่างเต็มทั้งวัน ลองเลือกวันอื่น'}
            </p>
            {nextDay && (
              <PortalButton
                variant="outline"
                className="mt-4"
                onClick={() => send({ type: 'pickDate', date: nextDay.date })}
              >
                ดูวันถัดไป
              </PortalButton>
            )}
          </div>
        )}

        {slots.data && slots.data.length > 0 && (
          <div className="space-y-5">
            {groupSlotsByPeriod(slots.data).map(([period, list]) => (
              <section key={period}>
                <h3 className="mb-2 text-sm font-medium text-navy-700">
                  {PERIOD_LABEL[period]}{' '}
                  <span className="font-normal text-navy-400">· ว่าง {list.length} ช่วง</span>
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {list.map((slot) => {
                    const selected = draft.slot?.startsAt === slot.startsAt;
                    return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => send({ type: 'pickSlot', slot })}
                        className={`h-11 rounded-full border text-[15px] transition-colors focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:outline-none ${
                          selected
                            ? 'border-navy-700 bg-navy-700 font-medium text-ivory-50'
                            : 'border-ivory-300 bg-white text-navy-700 hover:border-gold-500'
                        }`}
                      >
                        {timeOf(slot.startsAt)}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
