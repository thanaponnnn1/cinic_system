'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { formatBangkokDate } from '@clinicq/shared';
import { apiGet } from '@/lib/api';
import type { DailySummary, DashboardKpi } from '@/lib/api-types';
import { money, thaiDateOf } from '@/lib/format';
import { RevenueBars } from '@/components/dashboard/revenue-bars';
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Skeleton,
  StatTile,
} from '@/components/ui/primitives';

/**
 * หน้าสรุปรายวัน
 *
 * การ์ดสี่ใบบนสุดตั้งใจให้ตอบคำถามของเจ้าของร้านเรียงตามลำดับที่เขาคิด: วันนี้ได้เท่าไหร่
 * เดือนนี้ระบบช่วยกู้เงินคืนมาได้เท่าไหร่ (คิวที่หลุดแล้วขายต่อได้ + ลูกค้าที่ดึงกลับมาได้)
 * และมีอะไรที่ต้องรีบทำก่อนมันกลายเป็นปัญหา (คอร์สใกล้หมดอายุ)
 */
export default function SummaryPage() {
  const [date, setDate] = useState(formatBangkokDate(new Date()));

  const kpi = useQuery({
    queryKey: ['dashboard', 'kpi'],
    queryFn: () => apiGet<DashboardKpi>('dashboard/kpi'),
    refetchInterval: 60_000,
  });

  const summary = useQuery({
    queryKey: ['dashboard', 'summary', date],
    queryFn: () => apiGet<DailySummary>('dashboard/summary', { date }),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-gold-200">สรุปรายวัน</h1>
          <p className="mt-1 text-sm text-gold-300/60">
            ทุกตัวเลขนับสดจากตารางนัดและผลแคมเปญ ไม่มีตารางสรุปแยกให้ข้อมูลเพี้ยนกัน
          </p>
        </div>

        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          aria-label="เลือกวันที่ของสรุป"
          className="rounded-md border border-navy-600 bg-navy-950 px-3 py-2 text-sm text-gold-100 focus:border-gold-600 focus:outline-none"
        />
      </header>

      {kpi.isPending && <Skeleton className="h-28 w-full" />}
      {kpi.isError && (
        <Card>
          <ErrorState message={(kpi.error as Error).message} onRetry={() => void kpi.refetch()} />
        </Card>
      )}

      {kpi.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="รายได้วันนี้"
              value={money(kpi.data.todayRevenue)}
              unit="บาท"
              note={`เมื่อวาน ${money(kpi.data.yesterdayRevenue)} บาท · วันนี้ ${kpi.data.todayCases} คิว`}
            />
            <StatTile
              label="คิวที่หลุดแล้วขายต่อได้ (เดือนนี้)"
              value={String(kpi.data.rescuedSlotsThisMonth)}
              unit="คิว"
              note="คนในคิวรอกดรับแทนคนที่ยกเลิก"
              tone="good"
            />
            <StatTile
              label="ลูกค้าที่ดึงกลับมาได้ (เดือนนี้)"
              value={String(kpi.data.winbackReturnedThisMonth)}
              unit="คน"
              note={`ทำรายได้ ${money(kpi.data.winbackRevenueThisMonth)} บาท`}
              tone="good"
            />
            <StatTile
              label="ไม่มาตามนัด (เดือนนี้)"
              value={String(kpi.data.noShowThisMonth)}
              unit="ครั้ง"
              note={`คอร์สใกล้หมดอายุที่ควรโทรตาม ${kpi.data.expiringCourses} ราย`}
              tone={kpi.data.noShowThisMonth > 0 ? 'warn' : 'good'}
            />
          </div>

          <Card>
            <CardHeader title="รายได้ 7 วันล่าสุด" description="นับเฉพาะคิวที่ปิดงานแล้ว" />
            <div className="p-5">
              <RevenueBars points={kpi.data.last7Days} />
            </div>
          </Card>
        </>
      )}

      <Card>
        <CardHeader
          title={`สรุปของ ${thaiDateOf(`${date}T00:00:00+07:00`)}`}
          description="แยกตามช่าง เรียงจากคนที่ทำรายได้มากที่สุด"
        />

        {summary.isPending && <Skeleton className="m-5 h-24" />}
        {summary.isError && (
          <ErrorState
            message={(summary.error as Error).message}
            onRetry={() => void summary.refetch()}
          />
        )}

        {summary.data && (
          <>
            <div className="grid gap-x-6 gap-y-3 border-b border-navy-700/60 px-5 py-4 sm:grid-cols-2 lg:grid-cols-5">
              <Figure label="รายได้จริง" value={`${money(summary.data.revenue)} บาท`} />
              <Figure
                label="ถ้าคิวที่เหลือมาครบ"
                value={`${money(summary.data.expectedRevenue)} บาท`}
              />
              <Figure label="ปิดงานแล้ว" value={`${summary.data.completed} เคส`} />
              <Figure
                label="ไม่มา / ยกเลิก"
                value={`${summary.data.noShow} / ${summary.data.cancelled}`}
              />
              <Figure label="คิวพรุ่งนี้" value={`${summary.data.tomorrowCount} คิว`} />
            </div>

            {summary.data.byProvider.length === 0 ? (
              <EmptyState title="วันนี้ยังไม่มีคิวของใครเลย" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-navy-700/60 text-xs text-gold-300/60">
                    <tr>
                      <th className="px-5 py-3 font-normal">ช่าง</th>
                      <th className="px-5 py-3 font-normal">คิวทั้งหมด</th>
                      <th className="px-5 py-3 font-normal">ปิดงาน</th>
                      <th className="px-5 py-3 font-normal">ไม่มา</th>
                      <th className="px-5 py-3 text-right font-normal">รายได้</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-700/40">
                    {summary.data.byProvider.map((row) => (
                      <tr key={row.providerId}>
                        <td className="px-5 py-3 text-gold-100">{row.name}</td>
                        <td className="px-5 py-3 text-gold-300/70">{row.booked}</td>
                        <td className="px-5 py-3 text-gold-300/70">{row.completed}</td>
                        <td
                          className={`px-5 py-3 ${row.noShow > 0 ? 'text-status-noshow' : 'text-gold-300/70'}`}
                        >
                          {row.noShow}
                        </td>
                        <td className="px-5 py-3 text-right text-gold-200">{money(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gold-300/60">{label}</p>
      <p className="mt-0.5 text-lg text-gold-100">{value}</p>
    </div>
  );
}
