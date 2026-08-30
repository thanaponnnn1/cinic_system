'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  DELIVERY_STATUS_LABEL,
  DeliveryStatus,
  MsgType,
  type PaginatedResponse,
} from '@clinicq/shared';
import { apiGet } from '@/lib/api';
import type { MessageLogRow, MessageStats } from '@/lib/api-types';
import { thaiDateOf, timeOf } from '@/lib/format';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Select,
  Skeleton,
  StatTile,
  Tag,
} from '@/components/ui/primitives';

/** ป้ายภาษาไทยของชนิดข้อความ — ฝั่ง backend เก็บเป็น enum ล้วน หน้าจอเป็นคนแปล */
const TYPE_LABEL: Record<MsgType, string> = {
  REMINDER_1D: 'เตือนล่วงหน้า 1 วัน',
  REMINDER_2H: 'เตือนก่อน 2 ชั่วโมง',
  SLOT_OFFER: 'เสนอคิวว่าง',
  WINBACK: 'ดึงลูกค้ากลับ',
  COURSE_EXPIRY: 'คอร์สใกล้หมดอายุ',
  DAILY_DIGEST: 'สรุปปิดร้าน',
  LINK_CONFIRM: 'ยืนยันการผูกบัญชี',
};

const STATUS_TONE: Record<DeliveryStatus, 'good' | 'danger' | 'warn' | 'neutral'> = {
  SENT: 'good',
  FAILED: 'danger',
  SKIPPED_NO_CONSENT: 'warn',
  SKIPPED_NO_LINE: 'warn',
  SKIPPED_DUPLICATE: 'neutral',
};

/**
 * หน้าตรวจสอบการส่งข้อความ
 *
 * หน้านี้มีไว้ตอบคำถามข้อเดียวที่เจ้าของคลินิกต้องตอบให้ได้ตามกฎหมาย: พิสูจน์ได้ไหมว่า
 * ไม่ได้ส่งข้อความหาคนที่ไม่ได้ให้ความยินยอม — แถวสีเหลืองที่เขียนว่า "ไม่ส่ง" คือคำตอบนั้น
 * และมีค่ามากกว่าแถวที่ส่งสำเร็จเสียอีก
 */
export default function MessagesPage() {
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const feed = useQuery({
    queryKey: ['messages', type, status, page],
    queryFn: () =>
      apiGet<PaginatedResponse<MessageLogRow> & { stats: MessageStats }>('messages', {
        type: type || undefined,
        deliveryStatus: status || undefined,
        page,
        limit: 30,
      }),
  });

  const stats = feed.data?.stats;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl text-gold-200">ข้อความที่ส่ง</h1>
        <p className="mt-1 text-sm text-gold-300/60">
          ระบบบันทึกทุกครั้งที่ &ldquo;ตัดสินใจเกี่ยวกับการส่ง&rdquo; ไม่ใช่เฉพาะตอนส่งสำเร็จ —
          แถวที่ไม่ส่งคือหลักฐานตาม PDPA
        </p>
      </header>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="ส่งสำเร็จ" value={String(stats.sent)} unit="ฉบับ" tone="good" />
          <StatTile
            label="ไม่ส่ง — ไม่ได้ให้ความยินยอม"
            value={String(stats.skippedNoConsent)}
            unit="ครั้ง"
            note="ระบบเคารพความยินยอมโดยโครงสร้าง ไม่ใช่ด้วยวินัยของคนกรอก"
            tone="warn"
          />
          <StatTile
            label="ไม่ส่ง — ยังไม่ได้ผูก LINE"
            value={String(stats.skippedNoLine)}
            unit="ครั้ง"
            note="รายชื่อที่ควรชวนผูกบัญชีตอนมาหน้าร้าน"
            tone="warn"
          />
          <StatTile
            label="ส่งไม่สำเร็จ"
            value={String(stats.failed)}
            unit="ครั้ง"
            tone={stats.failed > 0 ? 'danger' : 'good'}
          />
        </div>
      )}

      <Card>
        <CardHeader
          title="ประวัติทั้งหมด"
          description="เรียงจากใหม่ไปเก่า"
          action={
            <div className="flex gap-2">
              <Select
                value={type}
                onChange={(event) => {
                  setType(event.target.value);
                  setPage(1);
                }}
                aria-label="กรองตามชนิดข้อความ"
                className="w-44"
              >
                <option value="">ทุกชนิด</option>
                {Object.values(MsgType).map((value) => (
                  <option key={value} value={value}>
                    {TYPE_LABEL[value]}
                  </option>
                ))}
              </Select>

              <Select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                aria-label="กรองตามผลการส่ง"
                className="w-52"
              >
                <option value="">ทุกผลลัพธ์</option>
                {Object.values(DeliveryStatus).map((value) => (
                  <option key={value} value={value}>
                    {DELIVERY_STATUS_LABEL[value]}
                  </option>
                ))}
              </Select>
            </div>
          }
        />

        {feed.isPending && <Skeleton className="m-5 h-32" />}
        {feed.isError && (
          <ErrorState message={(feed.error as Error).message} onRetry={() => void feed.refetch()} />
        )}
        {feed.data?.data.length === 0 && <EmptyState title="ไม่มีข้อความที่ตรงกับตัวกรอง" />}

        {feed.data && feed.data.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-navy-700/60 text-xs text-gold-300/60">
                  <tr>
                    <th className="px-5 py-3 font-normal">เวลา</th>
                    <th className="px-5 py-3 font-normal">ลูกค้า</th>
                    <th className="px-5 py-3 font-normal">ชนิด</th>
                    <th className="px-5 py-3 font-normal">ผล</th>
                    <th className="px-5 py-3 font-normal">นัดที่เกี่ยวข้อง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/40">
                  {feed.data.data.map((row) => (
                    <tr key={row.id}>
                      <td className="px-5 py-3 whitespace-nowrap text-gold-300/70">
                        {thaiDateOf(row.sentAt)} {timeOf(row.sentAt)}
                      </td>
                      <td className="px-5 py-3 text-gold-100">{row.customerName}</td>
                      <td className="px-5 py-3 text-gold-300/70">{TYPE_LABEL[row.type]}</td>
                      <td className="px-5 py-3">
                        <Tag tone={STATUS_TONE[row.deliveryStatus]}>{row.deliveryLabel}</Tag>
                        {row.errorMessage && (
                          <span className="mt-1 block text-xs text-gold-300/40">
                            {row.errorMessage}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gold-300/50">
                        {row.appointmentAt
                          ? `${thaiDateOf(row.appointmentAt)} ${timeOf(row.appointmentAt)} น.`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-navy-700/60 px-5 py-3 text-xs text-gold-300/60">
              <span>
                หน้า {feed.data.meta.page} จาก {feed.data.meta.totalPages} · ทั้งหมด{' '}
                {feed.data.meta.total} รายการ
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  ก่อนหน้า
                </Button>
                <Button
                  size="sm"
                  disabled={page >= feed.data.meta.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  ถัดไป
                </Button>
              </div>
            </footer>
          </>
        )}
      </Card>
    </div>
  );
}
