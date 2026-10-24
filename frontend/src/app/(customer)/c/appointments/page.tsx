'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CUSTOMER_KEYS, customerGet, customerPatch } from '@/lib/customer-api';
import { customerErrorMessage } from '@/lib/customer-errors';
import type {
  CustomerAction,
  CustomerAppointment,
  CustomerAppointmentList,
} from '@/lib/customer-types';
import { thaiDateOf, timeRange } from '@/lib/format';
import { AppointmentTicket } from '@/components/customer/appointment-ticket';
import { PageHeader } from '@/components/customer/profile';
import { CustomerGate } from '@/components/customer/session';
import { Sheet } from '@/components/customer/sheet';
import {
  Notice,
  PortalButton,
  PortalEmpty,
  PortalError,
  PortalLinkButton,
  PortalSkeleton,
} from '@/components/customer/ui';

/**
 * ปุ่มของนัดหนึ่งใบ — กดได้หรือไม่ได้มาจาก actions ที่ API คำนวณจาก state machine ของนัด
 * หน้านี้ไม่ตัดสินเองว่าสถานะไหนกดอะไรได้ ตารางนี้บอกแค่ว่าแต่ละปุ่มหน้าตาและคำถามยืนยันเป็นยังไง
 *
 * ขอเลื่อนกับยกเลิกต้องยืนยันก่อน เพราะย้อนกลับเองไม่ได้ ส่วนยืนยันนัดกดซ้ำก็ได้ผลเดิม
 */
const ACTIONS: Record<
  CustomerAction,
  {
    path: string;
    label: string;
    variant: 'primary' | 'outline' | 'danger';
    done: string;
    ask?: { title: string; body: string; confirmLabel: string };
  }
> = {
  confirm: {
    path: 'confirm',
    label: 'ยืนยันว่าจะมา',
    variant: 'primary',
    done: 'ยืนยันนัดแล้ว ร้านเห็นทันที',
  },
  requestReschedule: {
    path: 'request-reschedule',
    label: 'ขอเลื่อนนัด',
    variant: 'outline',
    done: 'ส่งคำขอเลื่อนแล้ว ร้านจะติดต่อกลับเพื่อนัดเวลาใหม่',
    ask: {
      title: 'ขอเลื่อนนัดนี้?',
      body: 'ร้านจะเห็นคำขอบนบอร์ดคิวแล้วติดต่อกลับทาง LINE หรือโทรศัพท์ เพื่อนัดเวลาใหม่ที่สะดวก',
      confirmLabel: 'ส่งคำขอเลื่อน',
    },
  },
  cancel: {
    path: 'cancel',
    label: 'ยกเลิกนัด',
    variant: 'danger',
    done: 'ยกเลิกนัดแล้ว',
    ask: {
      title: 'ยกเลิกนัดนี้?',
      body: 'เวลานี้จะถูกเปิดให้ลูกค้าคนอื่นจองทันที ถ้าเปลี่ยนใจต้องจองใหม่ตามเวลาที่ยังว่าง',
      confirmLabel: 'ยืนยันยกเลิก',
    },
  },
};

const ACTION_ORDER: CustomerAction[] = ['confirm', 'requestReschedule', 'cancel'];

export default function AppointmentsPage() {
  return (
    <div>
      <PageHeader title="นัดของฉัน" />
      <CustomerGate fallback={<ListSkeleton />}>{() => <Appointments />}</CustomerGate>
    </div>
  );
}

function Appointments() {
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState<{
    appointment: CustomerAppointment;
    action: CustomerAction;
  } | null>(null);
  // แยก open จาก asking — ตอนแผ่นกำลังเลื่อนลงปิด เนื้อหาเดิมยังต้องอยู่ ไม่ใช่หายวับไปก่อน
  const [sheetOpen, setSheetOpen] = useState(false);
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);

  const list = useQuery({
    queryKey: CUSTOMER_KEYS.appointments,
    queryFn: () => customerGet<CustomerAppointmentList>('appointments'),
  });

  const act = useMutation({
    mutationFn: ({
      appointment,
      action,
    }: {
      appointment: CustomerAppointment;
      action: CustomerAction;
    }) =>
      customerPatch<CustomerAppointment>(`appointments/${appointment.id}/${ACTIONS[action].path}`),
    onSuccess: (_, { action }) => {
      setMessage({ tone: 'info', text: ACTIONS[action].done });
      setSheetOpen(false);
      void queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.appointments });
    },
    onError: (error) => {
      setMessage({ tone: 'error', text: customerErrorMessage(error) });
      setSheetOpen(false);
      // สถานะอาจถูกพนักงานเปลี่ยนไปก่อน ดึงใหม่ให้ปุ่มตรงกับความจริง
      void queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.appointments });
    },
  });

  function press(appointment: CustomerAppointment, action: CustomerAction) {
    setMessage(null);
    if (ACTIONS[action].ask) {
      setAsking({ appointment, action });
      setSheetOpen(true);
    } else act.mutate({ appointment, action });
  }

  if (list.isPending) return <ListSkeleton />;
  if (list.isError) {
    return (
      <PortalError message={customerErrorMessage(list.error)} onRetry={() => void list.refetch()} />
    );
  }

  const { upcoming, past } = list.data;
  const ask = asking ? ACTIONS[asking.action].ask : undefined;

  return (
    <div className="space-y-8 px-5">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <section>
        <h2 className="mb-3 text-sm font-medium text-navy-700">นัดที่จะถึง</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-ivory-200 bg-white">
            <PortalEmpty
              title="ยังไม่มีนัดที่จะถึง"
              hint="เลือกบริการและเวลาที่สะดวกได้เลย ใช้เวลาไม่ถึงนาที"
              action={<PortalLinkButton href="/c/book">จองคิว</PortalLinkButton>}
            />
          </div>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((appointment) => {
              const allowed = ACTION_ORDER.filter((action) => appointment.actions[action]);
              return (
                <li key={appointment.id}>
                  <AppointmentTicket appointment={appointment}>
                    {allowed.length > 0 ? (
                      // ปุ่มยืนยันกินเต็มแถวเพราะเป็นสิ่งที่ร้านอยากให้กดที่สุด ปุ่มรองแบ่งแถวล่างกัน
                      // ข้อความไทยยาวกว่าที่คิด ถ้าวางสามปุ่มในแถวเดียวจะถูกตัดขึ้นบรรทัดใหม่บนจอ 360px
                      <div className="grid grid-cols-2 gap-2">
                        {allowed.map((action) => (
                          <PortalButton
                            key={action}
                            variant={ACTIONS[action].variant}
                            className={`min-h-11 px-3 text-sm whitespace-nowrap ${
                              action === 'confirm' ||
                              allowed.filter((a) => a !== 'confirm').length === 1
                                ? 'col-span-2'
                                : ''
                            }`}
                            loading={
                              act.isPending &&
                              act.variables?.appointment.id === appointment.id &&
                              act.variables.action === action
                            }
                            onClick={() => press(appointment, action)}
                          >
                            {ACTIONS[action].label}
                          </PortalButton>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-navy-400">
                        ต้องการเปลี่ยนแปลงนัดนี้ กรุณาทักแชทร้าน
                      </p>
                    )}
                  </AppointmentTicket>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-navy-700">ประวัติ</h2>
        {past.length === 0 ? (
          <p className="text-sm text-navy-400">ยังไม่มีประวัติการใช้บริการ</p>
        ) : (
          <ul className="space-y-3">
            {past.map((appointment) => (
              <li key={appointment.id}>
                <AppointmentTicket appointment={appointment} muted />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={ask?.title ?? ''}>
        {asking && ask && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-ivory-100 px-4 py-3 text-[15px] text-navy-700">
              <p className="font-medium">{asking.appointment.serviceName}</p>
              <p className="text-sm text-navy-400">
                {thaiDateOf(asking.appointment.startsAt)} ·{' '}
                {timeRange(asking.appointment.startsAt, asking.appointment.endsAt)} น.
              </p>
            </div>
            <p className="text-[15px] text-navy-700">{ask.body}</p>
            <div className="grid gap-2">
              <PortalButton
                variant={asking.action === 'cancel' ? 'danger' : 'primary'}
                loading={act.isPending}
                onClick={() => act.mutate(asking)}
                className="h-12"
              >
                {ask.confirmLabel}
              </PortalButton>
              <PortalButton variant="ghost" onClick={() => setSheetOpen(false)}>
                ไม่ใช่ตอนนี้
              </PortalButton>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" className="space-y-3 px-5">
      <PortalSkeleton className="h-4 w-24" />
      <PortalSkeleton className="h-44 w-full rounded-2xl" />
      <PortalSkeleton className="h-44 w-full rounded-2xl" />
    </div>
  );
}
