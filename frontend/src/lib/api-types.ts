import type { ApptStatus, DeliveryStatus, MsgType, Role, WaitlistStatus } from '@clinicq/shared';

/**
 * รูปร่างของข้อมูลที่ API ส่งกลับมา
 *
 * ประกาศไว้ที่นี่แทนที่จะดึงจาก backend โดยตรง เพราะ DTO ฝั่งนั้นผูกกับ decorator ของ NestJS
 * และ Prisma ซึ่งลากทั้งก้อนเข้ามาในบันเดิลของหน้าเว็บโดยไม่จำเป็น ส่วน enum กับรูปแบบ
 * ผลลัพธ์แบบแบ่งหน้าใช้ของจริงจาก @clinicq/shared ซึ่งมีเทสต์ฝั่ง backend คอยยืนยันว่าไม่หลุดจากกัน
 *
 * วันเวลาเป็นสตริง ISO เพราะผ่าน JSON มา ไม่ใช่ Date
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  roleLabel: string;
}

export interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: ApptStatus;
  statusLabel: string;
  statusColor: string;
  customer: { id: string; name: string; phone?: string; hasLineLinked?: boolean };
  provider: { id: string; name: string };
  service: { id: string; name: string; durationMin: number; price: number };
  cancelReason?: string | null;
  customerCourseId?: string | null;
}

export interface DayBoard {
  date: string;
  counts: Record<ApptStatus, number>;
  expectedRevenue: number;
  actualRevenue: number;
  providers: { id: string; name: string; appointments: Appointment[] }[];
}

export interface AvailabilitySlot {
  startsAt: string;
  endsAt: string;
}

export interface Customer {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  /** ระดับ VIEWER จะไม่ได้รับฟิลด์ตั้งแต่ตรงนี้ลงไป */
  phone?: string;
  hasLineLinked?: boolean;
  consentReminder?: boolean;
  consentMarketing?: boolean;
  consentAt?: string | null;
  lastVisitAt?: string | null;
  daysSinceLastVisit?: number | null;
  note?: string | null;
}

export interface Provider {
  id: string;
  name: string;
  title: string | null;
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  isActive: boolean;
}

export interface WaitlistEntry {
  id: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  status: WaitlistStatus;
  windowStart: string;
  windowEnd: string;
  offeredSlotAt: string | null;
  offerExpiresAt: string | null;
  lineLinked: boolean;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  message: string;
  inactiveDays: number;
  isActive: boolean;
  createdAt: string;
}

export interface CampaignResults {
  campaignId: string;
  name: string;
  sent: number;
  returned: number;
  returnRate: number;
  revenue: number;
}

export interface WinbackRunResult {
  campaignId: string;
  name: string;
  targeted: number;
  sent: number;
  failed: number;
}

export interface CoursePackage {
  id: string;
  name: string;
  serviceId: string | null;
  serviceName: string | null;
  totalSessions: number;
  validDays: number;
  price: number;
  isActive: boolean;
}

export interface CustomerCourse {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  packageId: string;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  purchasedAt: string;
  expiresAt: string;
  daysLeft: number;
}

export interface ProviderSummary {
  providerId: string;
  name: string;
  completed: number;
  booked: number;
  noShow: number;
  revenue: number;
}

export interface DailySummary {
  date: string;
  revenue: number;
  expectedRevenue: number;
  completed: number;
  noShow: number;
  cancelled: number;
  tomorrowCount: number;
  byProvider: ProviderSummary[];
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  completed: number;
}

export interface DashboardKpi {
  todayRevenue: number;
  yesterdayRevenue: number;
  todayCases: number;
  rescuedSlotsThisMonth: number;
  winbackReturnedThisMonth: number;
  winbackRevenueThisMonth: number;
  noShowThisMonth: number;
  expiringCourses: number;
  last7Days: RevenuePoint[];
}

export interface MessageLogRow {
  id: string;
  customerId: string;
  customerName: string;
  appointmentId: string | null;
  appointmentAt: string | null;
  type: MsgType;
  deliveryStatus: DeliveryStatus;
  deliveryLabel: string;
  errorMessage: string | null;
  sentAt: string;
}

export interface MessageStats {
  sent: number;
  failed: number;
  skippedNoConsent: number;
  skippedNoLine: number;
  skippedDuplicate: number;
}

export interface DemoClock {
  now: string;
  offsetMs: number;
  demoMode: boolean;
}
