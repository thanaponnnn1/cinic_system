'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { WaitlistStatus, formatBangkokDate, type PaginatedResponse } from '@clinicq/shared';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
import type { Customer, Service, WaitlistEntry } from '@/lib/api-types';
import { thaiDateOf, timeOf } from '@/lib/format';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Select,
  Tag,
} from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

/**
 * คิวรอ — คนที่จองไม่ได้เพราะคิวเต็ม
 *
 * อยู่ข้างบอร์ดคิววันนี้โดยตั้งใจ เพราะสองอย่างนี้ทำงานคู่กัน: พอกดยกเลิกนัดบนบอร์ด
 * ระบบจะส่งช่องที่ว่างให้ทุกคนในแผงนี้ที่สะดวกช่วงนั้นทันที ใครกดก่อนได้ก่อน
 */
export function WaitlistPanel() {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const waitlist = useQuery({
    queryKey: ['waitlist'],
    queryFn: () => apiGet<PaginatedResponse<WaitlistEntry>>('waitlist', { limit: 50 }),
    refetchInterval: 15_000,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`waitlist/${id}`),
    onSuccess: () => {
      toast.success('ถอนชื่อออกจากคิวรอแล้ว');
      void queryClient.invalidateQueries({ queryKey: ['waitlist'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const entries = waitlist.data?.data ?? [];

  return (
    <Card className="flex h-fit flex-col">
      <CardHeader
        title="คิวรอ"
        description="ยกเลิกนัดเมื่อไหร่ คนกลุ่มนี้ได้รับข้อเสนอทันที"
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            เพิ่มชื่อ
          </Button>
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          title="ยังไม่มีใครรอคิว"
          hint="ลูกค้าที่จองไม่ได้เพราะเต็ม ให้ลงชื่อไว้ตรงนี้"
        />
      ) : (
        <ul className="divide-y divide-navy-700/60">
          {entries.map((entry) => (
            <li key={entry.id} className="space-y-1.5 px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-gold-200">{entry.customerName}</p>
                  <p className="truncate text-xs text-gold-300/60">{entry.serviceName}</p>
                </div>
                {entry.status === WaitlistStatus.OFFERED ? (
                  <Tag tone="warn">เสนอคิวแล้ว</Tag>
                ) : (
                  <Tag>รออยู่</Tag>
                )}
              </div>

              <p className="text-xs text-gold-300/50">
                สะดวก {thaiDateOf(entry.windowStart)} {timeOf(entry.windowStart)}–
                {timeOf(entry.windowEnd)} น.
              </p>

              {!entry.lineLinked && <Tag tone="danger">ยังไม่ผูก LINE — ส่งข้อเสนอไม่ได้</Tag>}

              {entry.offeredSlotAt && (
                <p className="text-xs text-status-booked">
                  เสนอคิว {timeOf(entry.offeredSlotAt)} น. · กดรับได้ถึง{' '}
                  {entry.offerExpiresAt ? `${timeOf(entry.offerExpiresAt)} น.` : '—'}
                </p>
              )}

              <Button
                size="sm"
                variant="ghost"
                loading={remove.isPending}
                onClick={() => remove.mutate(entry.id)}
              >
                ถอนชื่อ
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AddToWaitlistModal open={open} onClose={() => setOpen(false)} />
    </Card>
  );
}

function AddToWaitlistModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(formatBangkokDate(new Date()));
  const [from, setFrom] = useState('09:00');
  const [to, setTo] = useState('18:00');

  const customers = useQuery({
    queryKey: ['customers', 'options'],
    queryFn: () => apiGet<PaginatedResponse<Customer>>('customers', { limit: 100 }),
    enabled: open,
  });
  const services = useQuery({
    queryKey: ['services'],
    queryFn: () => apiGet<PaginatedResponse<Service>>('services', { limit: 100 }),
    enabled: open,
  });

  const add = useMutation({
    mutationFn: () =>
      apiPost<WaitlistEntry>('waitlist', {
        customerId,
        serviceId,
        // ส่งเป็นเวลาไทยพร้อม offset ให้ชัด backend จะได้ไม่ต้องเดาว่าหมายถึงโซนไหน
        windowStart: `${date}T${from}:00+07:00`,
        windowEnd: `${date}T${to}:00+07:00`,
      }),
    onSuccess: (entry) => {
      toast.success(`เพิ่ม ${entry.customerName} เข้าคิวรอแล้ว`);
      void queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="เพิ่มลูกค้าเข้าคิวรอ"
      description="บอกช่วงเวลาที่ลูกค้าสะดวก ระบบจะเสนอเฉพาะคิวว่างที่อยู่ในช่วงนี้ทั้งช่อง"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            ปิด
          </Button>
          <Button
            variant="primary"
            loading={add.isPending}
            disabled={!customerId || !serviceId}
            onClick={() => add.mutate()}
          >
            เพิ่มเข้าคิวรอ
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="ลูกค้า">
          <Select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            <option value="">— เลือกลูกค้า —</option>
            {customers.data?.data.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="บริการที่ต้องการ">
          <Select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
            <option value="">— เลือกบริการ —</option>
            {services.data?.data.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="วันที่สะดวก">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-md border border-navy-600 bg-navy-950 px-3 py-2 text-sm text-gold-100 focus:border-gold-600 focus:outline-none"
            />
          </Field>
          <Field label="ตั้งแต่">
            <input
              type="time"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="w-full rounded-md border border-navy-600 bg-navy-950 px-3 py-2 text-sm text-gold-100 focus:border-gold-600 focus:outline-none"
            />
          </Field>
          <Field label="ถึง">
            <input
              type="time"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-full rounded-md border border-navy-600 bg-navy-950 px-3 py-2 text-sm text-gold-100 focus:border-gold-600 focus:outline-none"
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
