'use client';

import type { Appointment } from '@/lib/api-types';
import { money, timeRange } from '@/lib/format';
import { StatusBadge, Tag } from '@/components/ui/primitives';
import { AppointmentActions } from './appointment-actions';

/**
 * การ์ดคิวหนึ่งใบ
 *
 * แถบสีด้านซ้ายใช้สีสถานะที่ API ส่งมา ไม่ใช่สีที่หน้าจอแมปเอง — สีเดียวกับที่ปรากฏใน
 * ข้อความ LINE ของลูกค้า พนักงานกับลูกค้าจึงเห็นภาษาสีชุดเดียวกัน
 */
export function AppointmentCard({
  appointment,
  showActions = true,
}: {
  appointment: Appointment;
  showActions?: boolean;
}) {
  return (
    <article
      className="rounded-lg border border-navy-600 bg-navy-900/70 p-3"
      style={{ borderLeft: `3px solid ${appointment.statusColor}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-sm text-gold-100">
            {timeRange(appointment.startsAt, appointment.endsAt)}
          </p>
          <p className="truncate text-sm text-gold-200">{appointment.customer.name}</p>
          <p className="truncate text-xs text-gold-300/60">{appointment.service.name}</p>
        </div>
        <StatusBadge label={appointment.statusLabel} color={appointment.statusColor} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gold-300/50">
        <span>{money(appointment.service.price)} บาท</span>
        {appointment.customer.phone && <span>· {appointment.customer.phone}</span>}
        {appointment.customer.hasLineLinked === false && <Tag tone="warn">ยังไม่ผูก LINE</Tag>}
        {appointment.customerCourseId && <Tag tone="good">ตัดจากคอร์ส</Tag>}
      </div>

      {appointment.cancelReason && (
        <p className="mt-2 text-xs text-gold-300/50">เหตุผล: {appointment.cancelReason}</p>
      )}

      {showActions && (
        <div className="mt-3">
          <AppointmentActions appointment={appointment} />
        </div>
      )}
    </article>
  );
}
