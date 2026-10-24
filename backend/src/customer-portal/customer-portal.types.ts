import type { ApptStatus } from '@clinicq/shared';
import type { BusinessHours } from './bookable-slots';
import type { CustomerActions } from './customer-appointment';
import type { CourseStatus } from './course-status';

/**
 * รูปร่างข้อมูลที่ API ฝั่งลูกค้าส่งออก
 *
 * กฎร่วมของทุกตัว: ไม่มีเบอร์โทร ไม่มีโน้ตของร้าน และไม่มีข้อมูลของลูกค้าคนอื่นเลย
 * หน้า LIFF เปิดในมือถือลูกค้า ทุกฟิลด์ที่ส่งออกไปถือว่าเปิดเผยแล้ว
 */

/** ตัวตนของลูกค้าที่หน้าเว็บแสดง */
export interface CustomerProfile {
  id: string;
  name: string;
  hasLineLinked: boolean;
  consentReminder: boolean;
  consentMarketing: boolean;
}

export type CustomerAuthResult =
  | { status: 'ok'; token: string; customer: CustomerProfile }
  /** ยืนยัน LINE ผ่านแล้วแต่ยังไม่รู้ว่าเป็นลูกค้าคนไหน — หน้าเว็บพาไปผูกด้วยรหัสหรือสมัครใหม่ */
  | { status: 'needs_link' };

export interface DemoCustomerOption {
  id: string;
  name: string;
}

/** ข้อมูลหน้าร้าน — เปิดดูได้โดยไม่ต้องเข้าสู่ระบบ */
export interface CustomerShop {
  brand: { name: string; tagline: string };
  hours: BusinessHours;
  services: {
    id: string;
    name: string;
    durationMin: number;
    price: number;
    imageUrl: string | null;
    /** ชื่อในลิงก์จากเว็บร้าน หน้าจองรับ ?service= เป็น slug หรือ id ก็ได้ */
    slug: string | null;
  }[];
  providers: {
    id: string;
    name: string;
    title: string | null;
    photoUrl: string | null;
    slug: string | null;
  }[];
}

/** นัดในมุมลูกค้า — ปุ่มที่กดได้คำนวณมาให้แล้ว หน้าเว็บไม่ต้องรู้กฎการเปลี่ยนสถานะ */
export interface CustomerAppointment {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: ApptStatus;
  statusLabel: string;
  statusColor: string;
  serviceName: string;
  providerName: string;
  price: number;
  actions: CustomerActions;
}

export interface CustomerAppointmentList {
  /** ยังไม่ถึงเวลาและยังมีผล เรียงจากใกล้สุด */
  upcoming: CustomerAppointment[];
  /** ผ่านไปแล้ว หรือจบไปแล้ว (ยกเลิก ไม่มา รับบริการแล้ว) เรียงจากล่าสุด */
  past: CustomerAppointment[];
}

/** คอร์สของลูกค้าหนึ่งใบ — หน้าคอร์สของฉันวาดวงแหวนครั้งคงเหลือจากตัวนี้ */
export interface CustomerCourseView {
  id: string;
  name: string;
  /** null = ใช้กับบริการใดก็ได้ */
  serviceId: string | null;
  serviceName: string | null;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  expiresAt: Date;
  /** ติดลบ = หมดอายุไปแล้วกี่วัน */
  daysToExpiry: number;
  status: CourseStatus;
}
