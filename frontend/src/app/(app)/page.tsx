'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { APPT_STATUS_LABEL, ApptStatus, STATUS_COLOR, formatBangkokDate } from '@clinicq/shared';
import { apiGet } from '@/lib/api';
import type { DayBoard } from '@/lib/api-types';
import { money, thaiDateOf } from '@/lib/format';
import { AppointmentCard } from '@/components/appointments/appointment-card';
import { AppointmentFormModal } from '@/components/appointments/appointment-form';
import { WaitlistPanel } from '@/components/waitlist/waitlist-panel';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusBadge,
} from '@/components/ui/primitives';

/** ทุกกี่มิลลิวินาทีถึงจะดึงข้อมูลใหม่ — สิบวินาทีทำให้เดโม "กดใน LINE แล้วจอเปลี่ยน" เห็นสด */
const REFRESH_MS = 10_000;

/**
 * บอร์ดคิววันนี้ — หน้าที่เปิดค้างไว้ทั้งวันหน้าร้าน
 *
 * แยกคอลัมน์ตามช่างเพราะนั่นคือวิธีที่ร้านคิดจริง ๆ ("คิวของคุณแนนวันนี้เต็มไหม")
 * ไม่ใช่รายการยาวเรียงตามเวลาซึ่งต้องกวาดตาหาเองว่าใครว่าง
 */
export default function BoardPage() {
  const [date, setDate] = useState(formatBangkokDate(new Date()));
  const [formOpen, setFormOpen] = useState(false);

  const board = useQuery({
    queryKey: ['day-board', date],
    queryFn: () => apiGet<DayBoard>('appointments/day-board', { date }),
    refetchInterval: REFRESH_MS,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-gold-200">คิววันนี้</h1>
          <p className="mt-1 text-sm text-gold-300/60">
            {thaiDateOf(`${date}T00:00:00.000Z`)} · อัปเดตเองทุก 10 วินาที
          </p>
        </div>

        <div className="flex items-end gap-2">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label="เลือกวันที่"
            className="rounded-md border border-navy-600 bg-navy-950 px-3 py-2 text-sm text-gold-100 focus:border-gold-600 focus:outline-none"
          />
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            จองคิวใหม่
          </Button>
        </div>
      </header>

      {board.isPending && <BoardSkeleton />}

      {board.isError && (
        <Card>
          <ErrorState
            message={(board.error as Error).message}
            onRetry={() => void board.refetch()}
          />
        </Card>
      )}

      {board.data && (
        <>
          <SummaryStrip board={board.data} />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-2 xl:grid-cols-3">
              {board.data.providers.map((provider) => (
                <Card key={provider.id} className="flex flex-col">
                  <header className="flex items-center justify-between border-b border-navy-700/60 px-4 py-3">
                    <h2 className="font-display text-base text-gold-200">{provider.name}</h2>
                    <span className="text-xs text-gold-300/50">
                      {provider.appointments.length} คิว
                    </span>
                  </header>

                  {provider.appointments.length === 0 ? (
                    <EmptyState title="ยังไม่มีคิว" hint="ว่างทั้งวัน — เอาไปเสนอคนในคิวรอได้" />
                  ) : (
                    <div className="space-y-3 p-3">
                      {provider.appointments.map((appointment) => (
                        <AppointmentCard key={appointment.id} appointment={appointment} />
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <WaitlistPanel />
          </div>
        </>
      )}

      <AppointmentFormModal open={formOpen} onClose={() => setFormOpen(false)} defaultDate={date} />
    </div>
  );
}

/**
 * แถบตัวเลขบนสุด
 *
 * ส่วนต่างระหว่างรายได้ที่คาดว่าจะได้กับรายได้จริงคือ "เงินที่ยังไม่แน่นอนของวันนี้" —
 * ตัวเลขที่เจ้าของร้านดูแล้วรู้ทันทีว่าต้องไล่ตามใครก่อนปิดร้าน
 */
function SummaryStrip({ board }: { board: DayBoard }) {
  const statuses = Object.values(ApptStatus).filter((status) => board.counts[status] > 0);

  return (
    <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
      <div>
        <p className="text-xs text-gold-300/60">รายได้จริงวันนี้</p>
        <p className="font-display text-2xl text-status-confirmed">
          {money(board.actualRevenue)} <span className="text-sm text-gold-300/50">บาท</span>
        </p>
      </div>

      <div>
        <p className="text-xs text-gold-300/60">ถ้าคิวที่เหลือมาครบ</p>
        <p className="font-display text-2xl text-gold-200">
          {money(board.expectedRevenue)} <span className="text-sm text-gold-300/50">บาท</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <StatusBadge label={APPT_STATUS_LABEL[status]} color={STATUS_COLOR[status]} />
            <span className="text-sm text-gold-200">{board.counts[status]}</span>
          </span>
        ))}
      </div>
    </Card>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <Card key={index} className="space-y-3 p-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </Card>
      ))}
    </div>
  );
}
