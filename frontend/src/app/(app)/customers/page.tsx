'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Role, type PaginatedResponse } from '@clinicq/shared';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import type { Appointment, AuthUser, Customer } from '@/lib/api-types';
import { absenceLabel, money, thaiDateOf, timeOf } from '@/lib/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Skeleton,
  StatusBadge,
  Tag,
} from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

/**
 * หน้าลูกค้า
 *
 * สองอย่างที่หน้านี้ต้องตอบให้ได้ในสายตาเดียว: ใครหายไปนานแล้ว (เป้าหมายของแคมเปญ)
 * และใครยินยอมรับข้อความอะไรบ้าง (ข้อกำหนด PDPA ที่ต้องพิสูจน์ได้)
 */
export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const user = useQuery({ queryKey: ['auth', 'me'], queryFn: () => apiGet<AuthUser>('auth/me') });
  const canEdit = user.data?.role !== Role.VIEWER;

  const customers = useQuery({
    queryKey: ['customers', search, inactiveOnly],
    queryFn: () =>
      apiGet<PaginatedResponse<Customer>>('customers', {
        search: search || undefined,
        inactiveDays: inactiveOnly ? 90 : undefined,
        limit: 50,
      }),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-gold-200">ลูกค้า</h1>
          <p className="mt-1 text-sm text-gold-300/60">
            กรอง &ldquo;หายเกิน 90 วัน&rdquo; เพื่อดูกลุ่มเป้าหมายของแคมเปญดึงกลับ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นชื่อหรือเบอร์โทร"
            className="w-56"
            aria-label="ค้นหาลูกค้า"
          />
          <Button
            size="sm"
            variant={inactiveOnly ? 'primary' : 'secondary'}
            onClick={() => setInactiveOnly((value) => !value)}
          >
            หายเกิน 90 วัน
          </Button>
          {canEdit && (
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              เพิ่มลูกค้า
            </Button>
          )}
        </div>
      </header>

      <Card>
        {customers.isPending && (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        )}

        {customers.isError && (
          <ErrorState
            message={(customers.error as Error).message}
            onRetry={() => void customers.refetch()}
          />
        )}

        {customers.data && customers.data.data.length === 0 && (
          <EmptyState title="ไม่พบลูกค้าที่ตรงกับเงื่อนไข" />
        )}

        {customers.data && customers.data.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-700/60 text-xs text-gold-300/60">
                <tr>
                  <th className="px-4 py-3 font-normal">ชื่อ</th>
                  <th className="px-4 py-3 font-normal">เบอร์โทร</th>
                  <th className="px-4 py-3 font-normal">มาล่าสุด</th>
                  <th className="px-4 py-3 font-normal">ความยินยอม</th>
                  <th className="px-4 py-3 font-normal">LINE</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/40">
                {customers.data.data.map((customer) => (
                  <tr key={customer.id} className="hover:bg-navy-800/40">
                    <td className="px-4 py-3 text-gold-100">{customer.name}</td>
                    <td className="px-4 py-3 text-gold-300/70">{customer.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          (customer.daysSinceLastVisit ?? 999) > 90
                            ? 'text-status-noshow'
                            : 'text-gold-300/70'
                        }
                      >
                        {absenceLabel(customer.daysSinceLastVisit)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {customer.consentReminder && <Tag tone="good">เตือนนัด</Tag>}
                        {customer.consentMarketing && <Tag tone="good">การตลาด</Tag>}
                        {!customer.consentReminder && !customer.consentMarketing && (
                          <Tag tone="danger">ไม่ยินยอม</Tag>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {customer.hasLineLinked ? (
                        <Tag tone="good">ผูกแล้ว</Tag>
                      ) : (
                        <Tag tone="warn">ยังไม่ผูก</Tag>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(customer)}>
                        รายละเอียด
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CustomerDetailModal
        customer={selected}
        canEdit={canEdit}
        onClose={() => setSelected(null)}
      />
      <CreateCustomerModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

/**
 * รายละเอียดลูกค้าหนึ่งราย
 *
 * รวมสามอย่างที่พนักงานต้องใช้ตอนคุยกับลูกค้าอยู่ในที่เดียว: ประวัติการมา ความยินยอม
 * และรหัสเชื่อมบัญชี LINE ซึ่งเป็นสิ่งที่ต้องอ่านให้ลูกค้าฟังตรงหน้าเคาน์เตอร์
 */
function CustomerDetailModal({
  customer,
  canEdit,
  onClose,
}: {
  customer: Customer | null;
  canEdit: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [linkCode, setLinkCode] = useState<string | null>(null);

  const history = useQuery({
    queryKey: ['appointments', 'customer', customer?.id],
    queryFn: () =>
      apiGet<PaginatedResponse<Appointment>>('appointments', {
        customerId: customer?.id,
        order: 'desc',
        limit: 10,
      }),
    enabled: Boolean(customer),
  });

  const consent = useMutation({
    mutationFn: (patch: { consentReminder?: boolean; consentMarketing?: boolean }) =>
      apiPatch<Customer>(`customers/${customer?.id}/consent`, patch),
    onSuccess: () => {
      toast.success('บันทึกความยินยอมพร้อมเวลาที่ให้แล้ว');
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const issueCode = useMutation({
    mutationFn: () => apiPost<{ linkCode: string }>(`customers/${customer?.id}/link-code`),
    onSuccess: (result) => setLinkCode(result.linkCode),
    onError: (error: Error) => toast.error(error.message),
  });

  if (!customer) return null;

  return (
    <Modal
      open={Boolean(customer)}
      onClose={() => {
        setLinkCode(null);
        onClose();
      }}
      title={customer.name}
      description={`${customer.phone ?? 'ไม่มีเบอร์'} · ${absenceLabel(customer.daysSinceLastVisit)}`}
      footer={
        <Button
          variant="ghost"
          onClick={() => {
            setLinkCode(null);
            onClose();
          }}
        >
          ปิด
        </Button>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-xs tracking-wide text-gold-300/60">ความยินยอม (PDPA)</h3>
          <div className="space-y-2">
            <ConsentRow
              label="รับข้อความเตือนนัด"
              checked={customer.consentReminder ?? false}
              disabled={!canEdit || consent.isPending}
              onChange={(value) => consent.mutate({ consentReminder: value })}
            />
            <ConsentRow
              label="รับข้อความการตลาด (แคมเปญดึงกลับ)"
              checked={customer.consentMarketing ?? false}
              disabled={!canEdit || consent.isPending}
              onChange={(value) => consent.mutate({ consentMarketing: value })}
            />
            <p className="text-xs text-gold-300/50">
              ให้ความยินยอมล่าสุด:{' '}
              {customer.consentAt ? thaiDateOf(customer.consentAt) : 'ยังไม่เคยให้'}
            </p>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs tracking-wide text-gold-300/60">บัญชี LINE</h3>
          {customer.hasLineLinked ? (
            <Tag tone="good">ผูกบัญชีแล้ว — ได้รับข้อความเตือนนัดและข้อเสนอคิวว่าง</Tag>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gold-300/60">
                ออกรหัส 6 หลักให้ลูกค้าพิมพ์ในแชท LINE ของร้าน ใช้ได้ครั้งเดียว
              </p>
              {canEdit && (
                <Button size="sm" loading={issueCode.isPending} onClick={() => issueCode.mutate()}>
                  ออกรหัสเชื่อมบัญชี
                </Button>
              )}
              {linkCode && (
                <p className="font-display text-3xl tracking-[0.4em] text-gold-100">{linkCode}</p>
              )}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-xs tracking-wide text-gold-300/60">
            ประวัติการมา 10 ครั้งล่าสุด
          </h3>
          {history.isPending && <Skeleton className="h-16 w-full" />}
          {history.data?.data.length === 0 && (
            <p className="text-xs text-gold-300/50">ยังไม่เคยมีนัด</p>
          )}
          <ul className="space-y-1.5">
            {history.data?.data.map((appointment) => (
              <li key={appointment.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-gold-300/70">
                  {thaiDateOf(appointment.startsAt)} · {timeOf(appointment.startsAt)} น. ·{' '}
                  {appointment.service.name}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-gold-300/50">{money(appointment.service.price)}</span>
                  <StatusBadge label={appointment.statusLabel} color={appointment.statusColor} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Modal>
  );
}

function ConsentRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-navy-600 px-3 py-2">
      <span className="text-sm text-gold-200">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[var(--color-gold-400)]"
      />
    </label>
  );
}

function CreateCustomerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consentReminder, setConsentReminder] = useState(true);
  const [consentMarketing, setConsentMarketing] = useState(false);

  const create = useMutation({
    mutationFn: () =>
      apiPost<Customer>('customers', { name, phone, consentReminder, consentMarketing }),
    onSuccess: (customer) => {
      toast.success(`เพิ่ม ${customer.name} แล้ว`);
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      setName('');
      setPhone('');
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="เพิ่มลูกค้า"
      description="ความยินยอมที่ติ๊กตรงนี้จะถูกบันทึกพร้อมเวลาทันที ตามข้อกำหนด PDPA"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            ปิด
          </Button>
          <Button
            variant="primary"
            loading={create.isPending}
            disabled={!name || !phone}
            onClick={() => create.mutate()}
          >
            บันทึก
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="ชื่อ">
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="เบอร์โทร" hint="ตัวเลข 9–10 หลัก ขึ้นต้นด้วย 0">
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="numeric"
            placeholder="0812345678"
          />
        </Field>
        <ConsentRow
          label="รับข้อความเตือนนัด"
          checked={consentReminder}
          disabled={false}
          onChange={setConsentReminder}
        />
        <ConsentRow
          label="รับข้อความการตลาด"
          checked={consentMarketing}
          disabled={false}
          onChange={setConsentMarketing}
        />
      </div>
    </Modal>
  );
}
