'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { PaginatedResponse } from '@clinicq/shared';
import { apiGet, apiPost } from '@/lib/api';
import type { Customer, CoursePackage, CustomerCourse, Service } from '@/lib/api-types';
import { expiryTone, money, thaiDateOf } from '@/lib/format';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
  Skeleton,
  Tag,
} from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

/**
 * หน้าคอร์ส
 *
 * ลิสต์ "ใกล้หมดอายุ" อยู่บนสุดเพราะนั่นคือสิ่งที่ต้องลงมือทำวันนี้ — คอร์สที่หมดอายุ
 * โดยยังใช้ไม่ครบคือเงินที่ร้านรับมาแล้วแต่กลายเป็นข้อร้องเรียนและรีวิวแย่ในภายหลัง
 */
export default function CoursesPage() {
  const [sellOpen, setSellOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);

  const expiring = useQuery({
    queryKey: ['courses', 'expiring'],
    queryFn: () => apiGet<CustomerCourse[]>('courses/expiring', { days: 30 }),
  });

  const packages = useQuery({
    queryKey: ['courses', 'packages'],
    queryFn: () => apiGet<PaginatedResponse<CoursePackage>>('courses/packages', { limit: 50 }),
  });

  const purchases = useQuery({
    queryKey: ['courses', 'purchases', 'all'],
    queryFn: () => apiGet<PaginatedResponse<CustomerCourse>>('courses/purchases', { limit: 50 }),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-gold-200">คอร์ส</h1>
          <p className="mt-1 text-sm text-gold-300/60">
            ระบบเตือนลูกค้าเองทุกเช้าเมื่อคอร์สเหลืออายุไม่เกิน 30 วันและยังมีครั้งเหลือ
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setPackageOpen(true)}>เพิ่มคอร์สที่ขาย</Button>
          <Button variant="primary" onClick={() => setSellOpen(true)}>
            บันทึกการซื้อคอร์ส
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader
          title="ใกล้หมดอายุใน 30 วัน"
          description="รายชื่อที่ควรโทรตาม เรียงตามวันหมดอายุ"
        />

        {expiring.isPending && <Skeleton className="m-4 h-20" />}
        {expiring.isError && (
          <ErrorState
            message={(expiring.error as Error).message}
            onRetry={() => void expiring.refetch()}
          />
        )}
        {expiring.data?.length === 0 && (
          <EmptyState title="ไม่มีคอร์สที่ใกล้หมดอายุ" hint="ทุกคนยังมีเวลาเหลือเกิน 30 วัน" />
        )}

        {expiring.data && expiring.data.length > 0 && (
          <ul className="divide-y divide-navy-700/40">
            {expiring.data.map((course) => (
              <li key={course.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gold-100">{course.customerName}</p>
                  <p className="truncate text-xs text-gold-300/60">
                    {course.packageName} · {course.customerPhone ?? 'ไม่มีเบอร์'}
                  </p>
                </div>

                <SessionBar used={course.usedSessions} total={course.totalSessions} />

                <div className="text-right">
                  <p
                    className={`text-sm ${
                      expiryTone(course.daysLeft) === 'urgent'
                        ? 'text-status-noshow'
                        : 'text-status-booked'
                    }`}
                  >
                    เหลือ {course.daysLeft} วัน
                  </p>
                  <p className="text-xs text-gold-300/50">{thaiDateOf(course.expiresAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="คอร์สที่ร้านขาย" />
          {packages.isPending && <Skeleton className="m-4 h-20" />}
          {packages.data?.data.length === 0 && <EmptyState title="ยังไม่มีคอร์สที่ขาย" />}

          <ul className="divide-y divide-navy-700/40">
            {packages.data?.data.map((pkg) => (
              <li key={pkg.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-gold-100">{pkg.name}</p>
                  <p className="text-xs text-gold-300/60">
                    {pkg.totalSessions} ครั้ง · อายุ {pkg.validDays} วัน
                    {pkg.serviceName ? ` · ${pkg.serviceName}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gold-200">{money(pkg.price)} บาท</p>
                  {!pkg.isActive && <Tag>เลิกขายแล้ว</Tag>}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="คอร์สที่ลูกค้าถืออยู่" description="เฉพาะใบที่ยังไม่หมดอายุ" />
          {purchases.isPending && <Skeleton className="m-4 h-20" />}
          {purchases.data?.data.length === 0 && <EmptyState title="ยังไม่มีใครซื้อคอร์ส" />}

          <ul className="divide-y divide-navy-700/40">
            {purchases.data?.data.map((course) => (
              <li key={course.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-gold-100">{course.customerName}</p>
                  <p className="truncate text-xs text-gold-300/60">{course.packageName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <SessionBar used={course.usedSessions} total={course.totalSessions} />
                  <span className="w-20 text-right text-xs text-gold-300/50">
                    หมด {thaiDateOf(course.expiresAt).slice(-11)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <SellCourseModal open={sellOpen} onClose={() => setSellOpen(false)} />
      <PackageModal open={packageOpen} onClose={() => setPackageOpen(false)} />
    </div>
  );
}

/** แถบครั้งคงเหลือ — เห็นปุ๊บรู้ทันทีว่าเหลือให้ใช้อีกเท่าไหร่ก่อนหมดอายุ */
function SessionBar({ used, total }: { used: number; total: number }) {
  const remaining = Math.max(0, total - used);
  const percent = total === 0 ? 0 : (used / total) * 100;

  return (
    <div className="w-28">
      <div className="flex justify-between text-[11px] text-gold-300/60">
        <span>เหลือ {remaining}</span>
        <span>/ {total}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy-700">
        <div
          className="h-full rounded-full bg-gold-400"
          style={{ width: `${percent}%` }}
          role="presentation"
        />
      </div>
    </div>
  );
}

function SellCourseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState('');
  const [packageId, setPackageId] = useState('');

  const customers = useQuery({
    queryKey: ['customers', 'options'],
    queryFn: () => apiGet<PaginatedResponse<Customer>>('customers', { limit: 100 }),
    enabled: open,
  });
  const packages = useQuery({
    queryKey: ['courses', 'packages'],
    queryFn: () => apiGet<PaginatedResponse<CoursePackage>>('courses/packages', { limit: 50 }),
    enabled: open,
  });

  const sell = useMutation({
    mutationFn: () => apiPost<CustomerCourse>('courses/purchases', { customerId, packageId }),
    onSuccess: (course) => {
      toast.success(
        `${course.customerName} ซื้อ ${course.packageName} · หมดอายุ ${thaiDateOf(course.expiresAt)}`,
      );
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="บันทึกการซื้อคอร์ส"
      description="วันหมดอายุคำนวณจากวันที่ซื้อบวกอายุคอร์ส แล้วล็อกไว้ — แก้อายุคอร์สทีหลังไม่กระทบใบที่ขายไปแล้ว"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            ปิด
          </Button>
          <Button
            variant="primary"
            loading={sell.isPending}
            disabled={!customerId || !packageId}
            onClick={() => sell.mutate()}
          >
            บันทึก
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

        <Field label="คอร์ส">
          <Select value={packageId} onChange={(event) => setPackageId(event.target.value)}>
            <option value="">— เลือกคอร์ส —</option>
            {packages.data?.data
              .filter((pkg) => pkg.isActive)
              .map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} · {pkg.totalSessions} ครั้ง · {money(pkg.price)} บาท
                </option>
              ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function PackageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [totalSessions, setTotalSessions] = useState('10');
  const [validDays, setValidDays] = useState('180');
  const [price, setPrice] = useState('');

  const services = useQuery({
    queryKey: ['services'],
    queryFn: () => apiGet<PaginatedResponse<Service>>('services', { limit: 100 }),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () =>
      apiPost<CoursePackage>('courses/packages', {
        name,
        serviceId: serviceId || undefined,
        totalSessions: Number(totalSessions),
        validDays: Number(validDays),
        price: Number(price),
      }),
    onSuccess: () => {
      toast.success('เพิ่มคอร์สที่ขายแล้ว');
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="เพิ่มคอร์สที่ขาย"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            ปิด
          </Button>
          <Button
            variant="primary"
            loading={create.isPending}
            disabled={!name || !price}
            onClick={() => create.mutate()}
          >
            บันทึก
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="ชื่อคอร์ส">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="คอร์สทรีตเมนต์ผิวหน้า 10 ครั้ง"
          />
        </Field>

        <Field label="ผูกกับบริการ" hint="ไม่เลือกก็ได้ ถ้าคอร์สนี้ใช้กับบริการใดก็ได้">
          <Select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
            <option value="">— ไม่ผูกกับบริการใด —</option>
            {services.data?.data.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="จำนวนครั้ง">
            <Input
              type="number"
              min={1}
              value={totalSessions}
              onChange={(event) => setTotalSessions(event.target.value)}
            />
          </Field>
          <Field label="อายุ (วัน)">
            <Input
              type="number"
              min={1}
              value={validDays}
              onChange={(event) => setValidDays(event.target.value)}
            />
          </Field>
          <Field label="ราคา (บาท)">
            <Input
              type="number"
              min={0}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
