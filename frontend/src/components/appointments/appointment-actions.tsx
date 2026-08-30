'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApptStatus } from '@clinicq/shared';
import { apiPatch } from '@/lib/api';
import type { Appointment } from '@/lib/api-types';
import { Button, Field, Input } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

/**
 * ปุ่มด่วนบนการ์ดคิว
 *
 * สามปุ่มนี้คือสิ่งที่พนักงานหน้าร้านกดจริงทั้งวัน: ลูกค้ามาแล้ว ลูกค้าไม่มา และยกเลิก
 * ที่เหลือ (เลื่อนเวลา แก้ข้อมูล) อยู่ในหน้าปฏิทินซึ่งมีที่ให้เลือกเวลาใหม่ได้จริง
 *
 * ปุ่มไหนกดไม่ได้ก็ไม่แสดงเลย แทนที่จะแสดงแล้วให้ error กลับมา เพราะ state machine ฝั่ง
 * backend ปฏิเสธการข้ามขั้นอยู่แล้ว หน้าจอควรสะท้อนกฎเดียวกันตั้งแต่แรก
 */
export function AppointmentActions({
  appointment,
  onDone,
}: {
  appointment: Appointment;
  onDone?: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const refresh = () => {
    // เปลี่ยนสถานะนัดกระทบทั้งบอร์ดคิว ปฏิทิน และตัวเลขสรุป — ล้างทั้งชุดง่ายกว่าไล่จำว่าใครใช้อะไร
    void queryClient.invalidateQueries();
    onDone?.();
  };

  const act = useMutation({
    mutationFn: ({ action, body }: { action: string; body?: unknown }) =>
      apiPatch<Appointment>(`appointments/${appointment.id}/${action}`, body),
    onSuccess: (updated) => {
      toast.success(`${updated.customer.name} → ${updated.statusLabel}`);
      setCancelOpen(false);
      setReason('');
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const open =
    appointment.status === ApptStatus.BOOKED || appointment.status === ApptStatus.CONFIRMED;
  const pending = act.isPending;

  if (appointment.status === ApptStatus.RESCHEDULE_REQUESTED) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="danger" loading={pending} onClick={() => setCancelOpen(true)}>
          ยกเลิก
        </Button>
        <CancelDialog
          open={cancelOpen}
          reason={reason}
          setReason={setReason}
          pending={pending}
          onClose={() => setCancelOpen(false)}
          onConfirm={() => act.mutate({ action: 'cancel', body: { reason } })}
        />
      </div>
    );
  }

  if (!open) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {appointment.status === ApptStatus.BOOKED && (
        <Button size="sm" loading={pending} onClick={() => act.mutate({ action: 'confirm' })}>
          ยืนยันแทนลูกค้า
        </Button>
      )}

      <Button
        size="sm"
        variant="primary"
        loading={pending}
        onClick={() => act.mutate({ action: 'complete', body: {} })}
      >
        มาแล้ว
      </Button>

      <Button size="sm" loading={pending} onClick={() => act.mutate({ action: 'no-show' })}>
        ไม่มา
      </Button>

      <Button size="sm" variant="danger" loading={pending} onClick={() => setCancelOpen(true)}>
        ยกเลิก
      </Button>

      <CancelDialog
        open={cancelOpen}
        reason={reason}
        setReason={setReason}
        pending={pending}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => act.mutate({ action: 'cancel', body: { reason } })}
      />
    </div>
  );
}

function CancelDialog({
  open,
  reason,
  setReason,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  reason: string;
  setReason: (value: string) => void;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ยกเลิกนัดนี้"
      description="ช่วงเวลาที่ว่างขึ้นมาจะถูกส่งให้ทุกคนในคิวรอที่สะดวกช่วงนี้ทันที ใครกดก่อนได้ก่อน"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            ไม่ยกเลิกแล้ว
          </Button>
          <Button variant="danger" loading={pending} onClick={onConfirm}>
            ยืนยันการยกเลิก
          </Button>
        </>
      }
    >
      <Field label="เหตุผล" hint="เก็บไว้ดูว่าคิวหลุดเพราะอะไรบ่อยที่สุด">
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="ลูกค้าติดธุระ"
        />
      </Field>
    </Modal>
  );
}
