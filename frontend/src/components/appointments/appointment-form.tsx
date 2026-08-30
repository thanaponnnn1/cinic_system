'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { formatBangkokDate } from '@clinicq/shared';
import { apiGet, apiPost } from '@/lib/api';
import type {
  Appointment,
  AvailabilitySlot,
  Customer,
  CustomerCourse,
  Provider,
  Service,
} from '@/lib/api-types';
import type { PaginatedResponse } from '@clinicq/shared';
import { money, timeOf } from '@/lib/format';
import { Button, Field, Select } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

/**
 * ฟอร์มสร้างนัดและย้ายเวลานัด
 *
 * เวลาให้เลือกมาจาก /appointments/availability ของ backend ไม่ใช่ช่องกรอกเวลาอิสระ —
 * ช่องว่างที่เห็นจึงเป็นช่องที่ว่างจริงตามคิวของช่างคนนั้นและยาวพอสำหรับบริการที่เลือก
 * การกันจองซ้อนของจริงยังอยู่ที่ backend (advisory lock + constraint) ตรงนี้แค่ทำให้
 * พนักงานไม่ต้องเดาแล้วโดนปฏิเสธทีหลัง
 */
export function AppointmentFormModal({
  open,
  onClose,
  /** ระบุเมื่อเป็นการย้ายเวลานัดใบเดิม */
  reschedule,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  reschedule?: Appointment;
  defaultDate?: string;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const today = defaultDate ?? formatBangkokDate(new Date());

  const [customerId, setCustomerId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(today);
  const [startsAt, setStartsAt] = useState('');
  const [courseId, setCourseId] = useState('');

  const customers = useQuery({
    queryKey: ['customers', 'options'],
    queryFn: () => apiGet<PaginatedResponse<Customer>>('customers', { limit: 100 }),
    enabled: open,
  });
  const providers = useQuery({
    queryKey: ['providers'],
    queryFn: () => apiGet<PaginatedResponse<Provider>>('providers', { limit: 100 }),
    enabled: open,
  });
  const services = useQuery({
    queryKey: ['services'],
    queryFn: () => apiGet<PaginatedResponse<Service>>('services', { limit: 100 }),
    enabled: open,
  });

  // คอร์สของลูกค้าคนที่เลือก — ใช้ตอนอยากตัดครั้งจากคอร์สแทนการเก็บเงินสด
  const courses = useQuery({
    queryKey: ['courses', 'purchases', customerId],
    queryFn: () =>
      apiGet<PaginatedResponse<CustomerCourse>>('courses/purchases', { customerId, limit: 50 }),
    enabled: open && Boolean(customerId),
  });

  const slots = useQuery({
    queryKey: ['availability', providerId, serviceId, date],
    queryFn: () =>
      apiGet<AvailabilitySlot[]>('appointments/availability', { providerId, serviceId, date }),
    enabled: open && Boolean(providerId && serviceId && date),
  });

  // ตั้งค่าเริ่มต้นจากนัดใบเดิมตอนเปิดโหมดย้ายเวลา
  useEffect(() => {
    if (!open) return;

    setCustomerId(reschedule?.customer.id ?? '');
    setProviderId(reschedule?.provider.id ?? '');
    setServiceId(reschedule?.service.id ?? '');
    setDate(defaultDate ?? formatBangkokDate(new Date()));
    setStartsAt('');
    setCourseId('');
  }, [open, reschedule, defaultDate]);

  const save = useMutation({
    mutationFn: () =>
      reschedule
        ? apiPost<Appointment>(`appointments/${reschedule.id}/reschedule`, { startsAt, providerId })
        : apiPost<Appointment>('appointments', {
            customerId,
            providerId,
            serviceId,
            startsAt,
            customerCourseId: courseId || undefined,
          }),
    onSuccess: (appointment) => {
      toast.success(
        reschedule
          ? `ย้ายนัดของ ${appointment.customer.name} ไป ${timeOf(appointment.startsAt)} น. แล้ว`
          : `จองคิวให้ ${appointment.customer.name} เรียบร้อย`,
      );
      void queryClient.invalidateQueries();
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const ready = Boolean(startsAt && providerId && serviceId && (reschedule || customerId));
  const usableCourses = (courses.data?.data ?? []).filter((course) => course.remainingSessions > 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={reschedule ? 'ย้ายเวลานัด' : 'จองคิวใหม่'}
      description={
        reschedule
          ? `ใบเดิมของ ${reschedule.customer.name} จะถูกยกเลิกและออกใบใหม่ให้ ประวัติจึงตอบได้ว่าย้ายมาจากเวลาไหน`
          : 'เลือกช่างและบริการก่อน ระบบจะแสดงเฉพาะช่วงเวลาที่ว่างจริง'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            ปิด
          </Button>
          <Button
            variant="primary"
            loading={save.isPending}
            disabled={!ready}
            onClick={() => save.mutate()}
          >
            {reschedule ? 'ย้ายเวลา' : 'จองคิว'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!reschedule && (
          <Field label="ลูกค้า">
            <Select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="">— เลือกลูกค้า —</option>
              {customers.data?.data.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.phone ? ` · ${customer.phone}` : ''}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ช่าง">
            <Select
              value={providerId}
              onChange={(event) => {
                setProviderId(event.target.value);
                setStartsAt('');
              }}
            >
              <option value="">— เลือกช่าง —</option>
              {providers.data?.data.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="บริการ">
            <Select
              value={serviceId}
              disabled={Boolean(reschedule)}
              onChange={(event) => {
                setServiceId(event.target.value);
                setStartsAt('');
              }}
            >
              <option value="">— เลือกบริการ —</option>
              {services.data?.data.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.durationMin} นาที · {money(service.price)} บาท
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="วันที่">
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setStartsAt('');
              }}
              className="w-full rounded-md border border-navy-600 bg-navy-950 px-3 py-2 text-sm text-gold-100 focus:border-gold-600 focus:outline-none"
            />
          </Field>

          <Field
            label="เวลาที่ว่าง"
            hint={
              slots.isFetching
                ? 'กำลังหาช่องว่าง…'
                : slots.data && slots.data.length === 0
                  ? 'วันนี้ช่างคนนี้ไม่มีช่องว่างที่ยาวพอแล้ว'
                  : undefined
            }
          >
            <Select
              value={startsAt}
              disabled={!slots.data?.length}
              onChange={(event) => setStartsAt(event.target.value)}
            >
              <option value="">— เลือกเวลา —</option>
              {slots.data?.map((slot) => (
                <option key={slot.startsAt} value={slot.startsAt}>
                  {timeOf(slot.startsAt)} น.
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {!reschedule && usableCourses.length > 0 && (
          <Field
            label="ตัดครั้งจากคอร์ส"
            hint="เลือกไว้ตั้งแต่ตอนจอง แล้วครั้งจะถูกตัดตอนกดปิดงาน ไม่ใช่ตอนนี้"
          >
            <Select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
              <option value="">— ไม่ใช้คอร์ส —</option>
              {usableCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.packageName} · เหลือ {course.remainingSessions} ครั้ง
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
