'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { formatBangkokDate, type PaginatedResponse } from '@clinicq/shared';
import { apiGet } from '@/lib/api';
import type { Appointment, Provider } from '@/lib/api-types';
import { money, timeRange } from '@/lib/format';
import { AppointmentFormModal } from '@/components/appointments/appointment-form';
import { AppointmentActions } from '@/components/appointments/appointment-actions';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Select,
  Skeleton,
  StatusBadge,
} from '@/components/ui/primitives';

const THAI_DAY = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'] as const;

/**
 * ปฏิทินรายสัปดาห์
 *
 * มองทีละสัปดาห์เพราะคำถามที่ร้านถามคือ "อาทิตย์นี้ยังรับคิวได้อีกไหม" ไม่ใช่ภาพรายเดือน
 * ซึ่งเล็กเกินกว่าจะเห็นเวลาแต่ละคิวได้จริง
 */
export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [providerId, setProviderId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [moving, setMoving] = useState<Appointment | undefined>();

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => new Date(weekStart.getTime() + index * 86_400_000)),
    [weekStart],
  );

  const providers = useQuery({
    queryKey: ['providers'],
    queryFn: () => apiGet<PaginatedResponse<Provider>>('providers', { limit: 100 }),
  });

  const appointments = useQuery({
    queryKey: ['appointments', 'week', formatBangkokDate(weekStart), providerId],
    queryFn: () =>
      apiGet<PaginatedResponse<Appointment>>('appointments', {
        from: weekStart.toISOString(),
        to: new Date(weekStart.getTime() + 7 * 86_400_000).toISOString(),
        providerId: providerId || undefined,
        limit: 100,
      }),
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const day of days) map.set(formatBangkokDate(day), []);

    for (const appointment of appointments.data?.data ?? []) {
      map.get(formatBangkokDate(new Date(appointment.startsAt)))?.push(appointment);
    }

    return map;
  }, [appointments.data, days]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-gold-200">ปฏิทินนัด</h1>
          <p className="mt-1 text-sm text-gold-300/60">
            {formatBangkokDate(weekStart)} ถึง {formatBangkokDate(days[6])}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setWeekStart(shiftWeek(weekStart, -1))}>
            สัปดาห์ก่อน
          </Button>
          <Button size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            สัปดาห์นี้
          </Button>
          <Button size="sm" onClick={() => setWeekStart(shiftWeek(weekStart, 1))}>
            สัปดาห์ถัดไป
          </Button>

          <Select
            value={providerId}
            onChange={(event) => setProviderId(event.target.value)}
            className="w-44"
            aria-label="กรองตามช่าง"
          >
            <option value="">ช่างทุกคน</option>
            {providers.data?.data.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </Select>

          <Button variant="primary" onClick={() => setFormOpen(true)}>
            จองคิวใหม่
          </Button>
        </div>
      </header>

      {appointments.isError && (
        <Card>
          <ErrorState
            message={(appointments.error as Error).message}
            onRetry={() => void appointments.refetch()}
          />
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
        {days.map((day) => {
          const key = formatBangkokDate(day);
          const list = byDay.get(key) ?? [];
          const isToday = key === formatBangkokDate(new Date());

          return (
            <Card key={key} className={isToday ? 'border-gold-700' : undefined}>
              <header className="border-b border-navy-700/60 px-3 py-2">
                {/* ตัว Date เก็บเที่ยงคืนของไทยซึ่งเป็น 17:00 UTC ของวันก่อนหน้า
                    ต้องเลื่อนกลับมาก่อนถามชื่อวัน ไม่งั้นจะได้ชื่อวันก่อนหน้าทั้งแถว */}
                <p className="text-xs text-gold-300/60">
                  {THAI_DAY[new Date(day.getTime() + 7 * 3600_000).getUTCDay()]}
                </p>
                <p
                  className={`font-display text-lg ${isToday ? 'text-gold-100' : 'text-gold-300'}`}
                >
                  {key.slice(8)}
                </p>
              </header>

              <div className="space-y-2 p-2">
                {appointments.isPending && <Skeleton className="h-16 w-full" />}

                {!appointments.isPending && list.length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-gold-300/40">ว่าง</p>
                )}

                {list.map((appointment) => (
                  <article
                    key={appointment.id}
                    className="rounded-md border border-navy-600 bg-navy-900/70 p-2"
                    style={{ borderLeft: `3px solid ${appointment.statusColor}` }}
                  >
                    <p className="text-xs text-gold-100">
                      {timeRange(appointment.startsAt, appointment.endsAt)}
                    </p>
                    <p className="truncate text-xs text-gold-200">{appointment.customer.name}</p>
                    <p className="truncate text-[11px] text-gold-300/50">
                      {appointment.provider.name} · {money(appointment.service.price)} บาท
                    </p>

                    <div className="mt-1.5 space-y-1.5">
                      <StatusBadge
                        label={appointment.statusLabel}
                        color={appointment.statusColor}
                      />
                      <AppointmentActions appointment={appointment} />
                      <Button size="sm" variant="ghost" onClick={() => setMoving(appointment)}>
                        ย้ายเวลา
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {appointments.data?.data.length === 0 && (
        <Card>
          <EmptyState
            title="สัปดาห์นี้ยังไม่มีคิวเลย"
            hint="กดจองคิวใหม่ หรือเลื่อนไปดูสัปดาห์อื่น"
          />
        </Card>
      )}

      <AppointmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        defaultDate={formatBangkokDate(weekStart)}
      />

      <AppointmentFormModal
        open={Boolean(moving)}
        onClose={() => setMoving(undefined)}
        reschedule={moving}
        defaultDate={moving ? formatBangkokDate(new Date(moving.startsAt)) : undefined}
      />
    </div>
  );
}

/**
 * ต้นสัปดาห์ (วันอาทิตย์) ตามเวลาไทย
 *
 * คิดบนเวลาที่ถูกเลื่อนไปแล้ว 7 ชั่วโมงเพื่อให้ "วัน" ตรงกับปฏิทินไทย ไม่ใช่ของ UTC
 * ซึ่งจะทำให้คิวหลังห้าโมงเย็นตกไปอยู่วันถัดไป
 */
function startOfWeek(date: Date): Date {
  const shifted = new Date(date.getTime() + 7 * 3600_000);
  const sunday = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()),
  );
  sunday.setUTCDate(sunday.getUTCDate() - shifted.getUTCDay());

  // แปลงกลับเป็นเวลาจริง: เที่ยงคืนของไทย = 17:00 UTC ของวันก่อนหน้า
  return new Date(sunday.getTime() - 7 * 3600_000);
}

function shiftWeek(weekStart: Date, direction: number): Date {
  return new Date(weekStart.getTime() + direction * 7 * 86_400_000);
}
