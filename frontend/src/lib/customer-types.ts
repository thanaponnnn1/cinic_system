import type { ApptStatus } from '@clinicq/shared';

/**
 * รูปร่างข้อมูลของ API ฝั่งลูกค้า (backend/src/customer-portal/customer-portal.types.ts)
 *
 * ประกาศซ้ำที่นี่ด้วยเหตุผลเดียวกับ lib/api-types.ts — ไม่ลาก NestJS กับ Prisma เข้าบันเดิลหน้าเว็บ
 * วันเวลาเป็นสตริง ISO เพราะผ่าน JSON มา
 */

export interface CustomerProfile {
  id: string;
  name: string;
  hasLineLinked: boolean;
  consentReminder: boolean;
  consentMarketing: boolean;
}

/**
 * ผลของทางเข้าทุกทางตามที่เบราว์เซอร์เห็น — route handler ดึง token ออกไปใส่ cookie ก่อนส่งต่อ
 * จึงไม่มีฟิลด์ token ในชนิดนี้ หน้าเว็บจะได้ไม่มีทางเผลอเก็บไว้เอง
 */
export type CustomerAuthResult =
  { status: 'ok'; customer: CustomerProfile } | { status: 'needs_link' };

export interface DemoCustomerOption {
  id: string;
  name: string;
}

export interface BusinessHours {
  open: string;
  close: string;
  slotMinutes: number;
  minLeadMinutes: number;
  maxAdvanceDays: number;
}

export interface ShopService {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  imageUrl: string | null;
  slug: string | null;
}

export interface ShopProvider {
  id: string;
  name: string;
  title: string | null;
  photoUrl: string | null;
  slug: string | null;
}

export interface CustomerShop {
  brand: { name: string; tagline: string };
  hours: BusinessHours;
  services: ShopService[];
  providers: ShopProvider[];
}

export interface TimeSlot {
  startsAt: string;
  endsAt: string;
}

export interface CustomerActions {
  confirm: boolean;
  requestReschedule: boolean;
  cancel: boolean;
}

export type CustomerAction = keyof CustomerActions;

export interface CustomerAppointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: ApptStatus;
  statusLabel: string;
  statusColor: string;
  serviceName: string;
  providerName: string;
  price: number;
  actions: CustomerActions;
}

export interface CustomerAppointmentList {
  upcoming: CustomerAppointment[];
  past: CustomerAppointment[];
}

export type CourseStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'USED_UP';

export interface CustomerCourseView {
  id: string;
  name: string;
  /** null = ใช้กับบริการใดก็ได้ */
  serviceId: string | null;
  serviceName: string | null;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  expiresAt: string;
  daysToExpiry: number;
  status: CourseStatus;
}

export interface BookAppointmentInput {
  serviceId: string;
  providerId?: string;
  startsAt: string;
  customerCourseId?: string;
}

export interface RegisterInput {
  name: string;
  phone: string;
  consentReminder: boolean;
  consentMarketing: boolean;
}
