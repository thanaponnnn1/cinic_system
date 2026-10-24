'use client';

import type { ReactNode } from 'react';
import { priceLabel } from '@/lib/customer-format';
import type { CustomerAppointment } from '@/lib/customer-types';
import { thaiDateOf, timeRange } from '@/lib/format';
import { StatusPill } from './ui';

/**
 * การ์ดนัดหนึ่งใบในมุมลูกค้า — แถบซ้ายใช้ statusColor จาก API สีเดียวกับบอร์ดคิวของร้าน
 * และข้อความ LINE ลูกค้ากับพนักงานจึงพูดภาษาสีเดียวกัน
 */
export function AppointmentTicket({
  appointment,
  muted = false,
  children,
}: {
  appointment: CustomerAppointment;
  muted?: boolean;
  children?: ReactNode;
}) {
  return (
    <article
      className={`overflow-hidden rounded-2xl border border-ivory-200 bg-white ${muted ? 'bg-ivory-50' : 'shadow-[0_8px_24px_-16px_rgb(20_33_50/0.3)]'}`}
      style={{ borderLeft: `4px solid ${appointment.statusColor}` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-navy-400">{thaiDateOf(appointment.startsAt)}</p>
            <p className="mt-0.5 font-display text-2xl leading-tight text-navy-700">
              {timeRange(appointment.startsAt, appointment.endsAt)}
              <span className="ml-1 font-sans text-sm">น.</span>
            </p>
          </div>
          <StatusPill label={appointment.statusLabel} color={appointment.statusColor} />
        </div>
        <p className="mt-3 text-[15px] font-medium text-navy-700">{appointment.serviceName}</p>
        <p className="mt-0.5 text-sm text-navy-400">
          {appointment.providerName} · {priceLabel(appointment.price)}
        </p>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </article>
  );
}
