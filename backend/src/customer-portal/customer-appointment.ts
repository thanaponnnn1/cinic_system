import { APPT_STATUS_LABEL, ApptStatus, STATUS_COLOR } from '@clinicq/shared';
import { canTransition } from '../appointments/appointment-state-machine';
import type { CustomerAppointment } from './customer-portal.types';

/**
 * ปุ่มที่ลูกค้ากดเองได้ในหน้า "นัดของฉัน" กับสถานะปลายทางของแต่ละปุ่ม
 *
 * กดได้หรือไม่ได้มาจาก state machine ของนัดตัวเดียวกับที่พนักงานใช้ ไม่มี if/else
 * ตามสถานะซ้ำอีกชุด — วันที่กฎการเปลี่ยนสถานะเปลี่ยน ปุ่มในหน้าลูกค้าเปลี่ยนตามเอง
 */
export const CUSTOMER_ACTIONS = {
  confirm: ApptStatus.CONFIRMED,
  requestReschedule: ApptStatus.RESCHEDULE_REQUESTED,
  cancel: ApptStatus.CANCELLED,
} as const satisfies Record<string, ApptStatus>;

export type CustomerAction = keyof typeof CUSTOMER_ACTIONS;
export type CustomerActions = Record<CustomerAction, boolean>;

/** ข้อมูลนัดเท่าที่ต้องใช้ประกอบมุมมองของลูกค้า — ตั้งใจไม่มีข้อมูลของลูกค้าอยู่เลย */
export interface CustomerAppointmentSource {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: ApptStatus;
  provider: { name: string };
  // Prisma คืน Decimal ส่วน AppointmentResponseDto คืน number — ทั้งคู่แปลงผ่าน toString ได้
  service: { name: string; price: { toString(): string } };
}

/**
 * ปุ่มไหนกดได้บ้าง
 *
 * นัดที่ถึงเวลาแล้วกดอะไรไม่ได้เลย แม้ state machine จะยอม — ยกเลิกนัดที่ผ่านไปแล้ว
 * จะประกาศคิวว่างย้อนหลังให้คนในคิวรอ และยืนยันนัดที่ผ่านไปแล้วไม่มีความหมาย
 */
export function customerActions(
  appt: Pick<CustomerAppointmentSource, 'status' | 'startsAt'>,
  now: Date,
): CustomerActions {
  const upcoming = appt.startsAt.getTime() > now.getTime();
  const entries = Object.entries(CUSTOMER_ACTIONS) as [CustomerAction, ApptStatus][];

  return Object.fromEntries(
    entries.map(([action, to]) => [action, upcoming && canTransition(appt.status, to)]),
  ) as CustomerActions;
}

export function toCustomerAppointment(
  appt: CustomerAppointmentSource,
  now: Date,
): CustomerAppointment {
  return {
    id: appt.id,
    startsAt: appt.startsAt,
    endsAt: appt.endsAt,
    status: appt.status,
    statusLabel: APPT_STATUS_LABEL[appt.status],
    statusColor: STATUS_COLOR[appt.status],
    serviceName: appt.service.name,
    providerName: appt.provider.name,
    price: Number(appt.service.price.toString()),
    actions: customerActions(appt, now),
  };
}
