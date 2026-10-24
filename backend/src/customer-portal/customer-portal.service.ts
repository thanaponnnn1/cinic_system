import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiErrorCode, BRAND_INFO, BUSINESS_HOURS, Role } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ClockService } from '../clock/clock.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { ACTIVE_STATUSES, isFinal } from '../appointments/appointment-state-machine';
import type { LineActionResult } from '../appointments/line-action.types';
import { daysBetween } from '../courses/dto/course.dto';
import { bookableSlots, bookingViolation, type TimeSlot } from './bookable-slots';
import { CourseStatus, courseStatus } from './course-status';
import {
  CUSTOMER_ACTIONS,
  customerActions,
  toCustomerAppointment,
  type CustomerAction,
} from './customer-appointment';
import type {
  CustomerAppointment,
  CustomerAppointmentList,
  CustomerCourseView,
  CustomerShop,
} from './customer-portal.types';
import type { BookAppointmentDto, CustomerAvailabilityQueryDto } from './dto/customer-portal.dto';
import type { Prisma } from '../generated/prisma/client';

/**
 * นัดที่ยังไม่ถึงเวลาที่ลูกค้าหนึ่งคนถือไว้ได้พร้อมกัน
 *
 * หน้าสมัครเดโมเปิดให้ใครก็สมัครได้ ถ้าไม่จำกัด คนเดียวกดจองจนปฏิทินทั้งสัปดาห์เต็ม
 * สามนัดพอสำหรับลูกค้าจริงที่จองคอร์สต่อเนื่อง
 */
export const MAX_UPCOMING_BOOKINGS = 3;

const MINUTE_MS = 60_000;

/** ข้อความกลาง ๆ เมื่อช่องเต็ม — ข้อความของระบบนัดเดิมมีชื่อลูกค้าที่จองช่องนั้นอยู่ ห้ามส่งต่อ */
const SLOT_TAKEN_MESSAGE = 'ช่วงเวลานี้เพิ่งมีคนจองไป กรุณาเลือกเวลาอื่น';

/** ข้อความเดียวกันทั้งนัดที่ไม่มีอยู่และนัดของคนอื่น — ห้ามแยกให้เดาได้ว่า id ไหนมีอยู่จริง */
const APPOINTMENT_NOT_FOUND = 'ไม่พบนัดหมายนี้';

/** เก็บเหตุผลไว้ให้ร้านแยกได้ว่าคิวไหนลูกค้ายกเลิกเอง กับคิวที่พนักงานยกเลิกให้ */
const CUSTOMER_CANCEL_REASON = 'ลูกค้ายกเลิกเองผ่านหน้าเว็บ';

/** ประวัติย้อนหลังพอสำหรับหน้า "นัดของฉัน" — นัดที่ยังไม่ถึงเวลาอยู่ในชุดนี้เสมอเพราะเรียงจากล่าสุด */
const APPOINTMENT_HISTORY_LIMIT = 100;

/** ฟิลด์ของนัดที่หน้าลูกค้าใช้ — ไม่มีข้อมูลลูกค้า โน้ต หรือเหตุผลยกเลิก */
const OWN_APPOINTMENT_SELECT = {
  id: true,
  startsAt: true,
  endsAt: true,
  status: true,
  provider: { select: { name: true } },
  service: { select: { name: true, price: true } },
} satisfies Prisma.AppointmentSelect;

/** เหตุผลที่คอร์สเอาไปจองไม่ได้ ตามสถานะของคอร์ส — สถานะที่ไม่อยู่ในตารางนี้จองได้ */
const UNUSABLE_COURSE: Partial<Record<CourseStatus, (name: string) => string>> = {
  [CourseStatus.USED_UP]: (name) => `คอร์ส "${name}" ใช้ครบทุกครั้งแล้ว`,
  [CourseStatus.EXPIRED]: (name) => `คอร์ส "${name}" หมดอายุแล้ว`,
};

/**
 * หน้าร้านฝั่งลูกค้า: ดูร้าน หาเวลาว่าง จอง จัดการนัดของตัวเอง และดูคอร์ส
 *
 * ทุกเมธอดที่รับ customerId ได้ค่านั้นมาจาก token ที่ CustomerAuthGuard ตรวจแล้วเท่านั้น
 * การจองทุกครั้งวิ่งผ่าน AppointmentsService.create ตัวเดียวกับพนักงาน — lock ของช่าง
 * และ exclusion constraint จึงกันคิวชนระหว่างหน้าร้านกับหน้าลูกค้าให้เอง
 */
@Injectable()
export class CustomerPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentsService,
    private readonly clock: ClockService,
  ) {}

  // ── หน้าร้าน ────────────────────────────────────────────

  async shop(): Promise<CustomerShop> {
    const [services, providers] = await Promise.all([
      this.prisma.service.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          durationMin: true,
          price: true,
          imageUrl: true,
          slug: true,
        },
      }),
      this.prisma.provider.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, title: true, photoUrl: true, slug: true },
      }),
    ]);

    return {
      brand: { name: BRAND_INFO.name, tagline: BRAND_INFO.tagline },
      hours: BUSINESS_HOURS,
      services: services.map((s) => ({ ...s, price: Number(s.price.toString()) })),
      providers,
    };
  }

  // ── หาเวลาว่างและจอง ────────────────────────────────────

  /**
   * ช่องที่ลูกค้าจองเองได้ในวันนั้น
   *
   * ไม่ระบุช่าง = รวมช่องว่างของช่างทุกคนที่เปิดรับคิว ช่องที่ว่างหลายคนแสดงครั้งเดียว
   * ลูกค้าไม่ต้องรู้ว่าช่างคนไหนว่าง ตอนจองระบบเลือกให้เอง
   */
  async availability(query: CustomerAvailabilityQueryDto): Promise<TimeSlot[]> {
    await this.loadBookableService(query.serviceId);

    const providerIds = query.providerId
      ? [await this.loadActiveProviderId(query.providerId)]
      : await this.activeProviderIds();

    const perProvider = await Promise.all(
      providerIds.map((providerId) =>
        this.appointments.availability({
          serviceId: query.serviceId,
          providerId,
          date: query.date,
          slotMinutes: BUSINESS_HOURS.slotMinutes,
        }),
      ),
    );

    const now = this.clock.now();
    const byStart = new Map<number, TimeSlot>();

    for (const slots of perProvider) {
      for (const slot of bookableSlots(slots, now, BUSINESS_HOURS)) {
        byStart.set(slot.startsAt.getTime(), { startsAt: slot.startsAt, endsAt: slot.endsAt });
      }
    }

    return [...byStart.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }

  /**
   * จองคิว
   *
   * ตรวจกฎเวลาซ้ำที่นี่แม้หน้าจอจะแสดงเฉพาะช่องที่จองได้ — ใครก็ยิง startsAt อะไรมาก็ได้
   * ไม่ระบุช่าง = ลองช่างที่เปิดรับคิวทีละคนตามลำดับที่คงที่ ชนคิวก็ไปคนถัดไป
   */
  async book(customerId: string, dto: BookAppointmentDto): Promise<CustomerAppointment> {
    const now = this.clock.now();
    const service = await this.loadBookableService(dto.serviceId);

    const startsAt = new Date(dto.startsAt);
    const slot = {
      startsAt,
      endsAt: new Date(startsAt.getTime() + service.durationMin * MINUTE_MS),
    };
    const violation = bookingViolation(slot, now, BUSINESS_HOURS);
    if (violation) throw new BadRequestException(violation);

    await this.assertBelowBookingLimit(customerId, now);

    if (dto.customerCourseId) {
      await this.assertCourseBookable(customerId, dto.customerCourseId, service.id, now);
    }

    const providerIds = dto.providerId ? [dto.providerId] : await this.activeProviderIds();

    for (const providerId of providerIds) {
      try {
        const appt = await this.appointments.create(
          {
            customerId,
            providerId,
            serviceId: service.id,
            startsAt: dto.startsAt,
            customerCourseId: dto.customerCourseId,
          },
          null,
          Role.VIEWER,
        );
        return toCustomerAppointment(appt, now);
      } catch (error) {
        if (!isSlotTaken(error)) throw error;
      }
    }

    throw new ConflictException({ error: ApiErrorCode.SLOT_TAKEN, message: SLOT_TAKEN_MESSAGE });
  }

  // ── นัดของฉัน ───────────────────────────────────────────

  async listAppointments(customerId: string): Promise<CustomerAppointmentList> {
    const now = this.clock.now();
    const rows = await this.prisma.appointment.findMany({
      where: { customerId },
      select: OWN_APPOINTMENT_SELECT,
      orderBy: { startsAt: 'desc' },
      take: APPOINTMENT_HISTORY_LIMIT,
    });

    const isUpcoming = (row: (typeof rows)[number]) =>
      row.startsAt.getTime() > now.getTime() && !isFinal(row.status);

    return {
      upcoming: rows
        .filter(isUpcoming)
        .reverse()
        .map((row) => toCustomerAppointment(row, now)),
      past: rows.filter((row) => !isUpcoming(row)).map((row) => toCustomerAppointment(row, now)),
    };
  }

  /**
   * ลูกค้ากดปุ่มในหน้า "นัดของฉัน"
   *
   * นัดของคนอื่นกับนัดที่ไม่มีอยู่จริงได้ 404 ข้อความเดียวกัน ไม่ใช่ 403 — id ของนัดเดาได้
   * และ 403 คือการยืนยันว่านัดนั้นมีอยู่จริง
   *
   * ยกเลิกต้องผ่าน cancel() ของระบบนัด เพราะตรงนั้นคือจุดที่ประกาศคิวว่างให้คนในคิวรอ
   * ลูกค้าที่ยกเลิกเองในมือถือต้องคืนช่องให้คนอื่นได้เหมือนยกเลิกที่หน้าร้าน
   */
  async act(
    customerId: string,
    appointmentId: string,
    action: CustomerAction,
  ): Promise<CustomerAppointment> {
    const now = this.clock.now();
    const appt = await this.findOwnAppointment(customerId, appointmentId);

    // กดซ้ำจากการแตะสองทีหรือเน็ตช้า ได้ผลเท่ากดครั้งเดียว
    if (appt.status === CUSTOMER_ACTIONS[action]) return toCustomerAppointment(appt, now);

    if (!customerActions(appt, now)[action]) {
      throw new BadRequestException({
        error: ApiErrorCode.INVALID_TRANSITION,
        message: 'นัดนี้ทำรายการนี้ไม่ได้แล้ว หากต้องการเปลี่ยนแปลง กรุณาติดต่อทางร้าน',
      });
    }

    switch (action) {
      case 'confirm':
        assertOwnerActionApplied(
          await this.appointments.confirmAsCustomer(appointmentId, customerId),
        );
        break;
      case 'requestReschedule':
        assertOwnerActionApplied(
          await this.appointments.requestRescheduleAsCustomer(appointmentId, customerId),
        );
        break;
      case 'cancel':
        await this.appointments.cancel(
          appointmentId,
          { reason: CUSTOMER_CANCEL_REASON },
          Role.VIEWER,
        );
        break;
    }

    return toCustomerAppointment(await this.findOwnAppointment(customerId, appointmentId), now);
  }

  // ── คอร์สของฉัน ─────────────────────────────────────────

  async courses(customerId: string): Promise<CustomerCourseView[]> {
    const now = this.clock.now();
    const rows = await this.prisma.customerCourse.findMany({
      where: { customerId },
      include: {
        package: {
          select: {
            name: true,
            totalSessions: true,
            serviceId: true,
            service: { select: { name: true } },
          },
        },
      },
      orderBy: { expiresAt: 'asc' },
    });

    return rows.map((row) => {
      const { totalSessions } = row.package;

      return {
        id: row.id,
        name: row.package.name,
        serviceId: row.package.serviceId,
        serviceName: row.package.service?.name ?? null,
        totalSessions,
        usedSessions: row.usedSessions,
        remainingSessions: Math.max(0, totalSessions - row.usedSessions),
        expiresAt: row.expiresAt,
        daysToExpiry: daysBetween(now, row.expiresAt),
        status: courseStatus({ ...row, totalSessions }, now),
      };
    });
  }

  // ── ตัวช่วยภายใน ────────────────────────────────────────

  /** หาเฉพาะในนัดของลูกค้าคนนี้ — นัดของคนอื่นจึงหน้าตาเหมือนไม่มีอยู่จริง */
  private async findOwnAppointment(customerId: string, appointmentId: string) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, customerId },
      select: OWN_APPOINTMENT_SELECT,
    });
    if (!appt) throw new NotFoundException(APPOINTMENT_NOT_FOUND);
    return appt;
  }

  private async loadBookableService(serviceId: string) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service?.isActive) throw new NotFoundException('ไม่พบบริการนี้');
    return service;
  }

  private async loadActiveProviderId(providerId: string): Promise<string> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { id: true, isActive: true },
    });
    if (!provider?.isActive) throw new NotFoundException('ไม่พบช่างคนนี้');
    return provider.id;
  }

  /** เรียงตามชื่อแล้วตาม id — "ช่างคนไหนก็ได้" ต้องลองตามลำดับเดิมทุกครั้ง ผลจึงคาดเดาได้ */
  private async activeProviderIds(): Promise<string[]> {
    const providers = await this.prisma.provider.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    return providers.map((p) => p.id);
  }

  private async assertBelowBookingLimit(customerId: string, now: Date): Promise<void> {
    const upcoming = await this.prisma.appointment.count({
      where: { customerId, status: { in: [...ACTIVE_STATUSES] }, startsAt: { gt: now } },
    });

    if (upcoming >= MAX_UPCOMING_BOOKINGS) {
      throw new ConflictException({
        error: ApiErrorCode.BOOKING_LIMIT_REACHED,
        message: `จองล่วงหน้าไว้ได้สูงสุด ${MAX_UPCOMING_BOOKINGS} นัด กรุณารอให้ถึงนัดที่มีอยู่ หรือยกเลิกนัดที่ไม่สะดวกก่อน`,
      });
    }
  }

  /**
   * คอร์สที่จะใช้จองต้องเป็นของลูกค้าคนนี้ ยังใช้ได้ ใช้กับบริการนี้ได้ และยังมีครั้งเหลือ
   * หลังหักนัดที่จองด้วยคอร์สนี้ไว้แล้ว
   *
   * ครั้งของคอร์สถูกตัดตอนปิดงาน ไม่ใช่ตอนจอง ถ้าไม่นับนัดที่ค้างอยู่ คอร์สเหลือหนึ่งครั้ง
   * จะจองได้สามนัด แล้วไปพังที่เคาน์เตอร์ตอนปิดงานนัดที่สอง
   *
   * คอร์สที่แม่แบบไม่ผูกบริการ (serviceId เป็น null) ใช้กับบริการใดก็ได้ ตามที่ร้านตั้งไว้
   */
  private async assertCourseBookable(
    customerId: string,
    courseId: string,
    serviceId: string,
    now: Date,
  ): Promise<void> {
    const course = await this.prisma.customerCourse.findUnique({
      where: { id: courseId },
      include: { package: { select: { name: true, totalSessions: true, serviceId: true } } },
    });

    if (!course || course.customerId !== customerId) {
      throw new BadRequestException('ไม่พบคอร์สนี้ในบัญชีของคุณ');
    }

    const { name, totalSessions } = course.package;
    const unusable = UNUSABLE_COURSE[courseStatus({ ...course, totalSessions }, now)];
    if (unusable) throw new BadRequestException(unusable(name));

    if (course.package.serviceId !== null && course.package.serviceId !== serviceId) {
      throw new BadRequestException(`คอร์ส "${name}" ใช้กับบริการนี้ไม่ได้`);
    }

    const pending = await this.prisma.appointment.count({
      where: { customerCourseId: courseId, status: { in: [...ACTIVE_STATUSES] } },
    });

    if (course.usedSessions + pending >= totalSessions) {
      throw new BadRequestException(
        `ครั้งที่เหลือของคอร์ส "${name}" ถูกจองไว้ครบแล้ว กรุณาจองแบบไม่ใช้คอร์ส`,
      );
    }
  }
}

/**
 * ผลจากระบบนัดหลังตรวจเจ้าของซ้ำในจังหวะเขียน
 *
 * act() ตรวจเจ้าของและปุ่มไว้ก่อนแล้ว ผลที่ไม่ใช่ ok จึงมาจากการแก้แทรกระหว่างทางเท่านั้น
 * — กดพร้อมกันสองเครื่อง (unchanged ถือว่าสำเร็จ) หรือพนักงานเปลี่ยนสถานะไปก่อน (invalid)
 */
function assertOwnerActionApplied(result: LineActionResult): void {
  switch (result.status) {
    case 'ok':
    case 'unchanged':
      return;
    case 'invalid':
      throw new BadRequestException({
        error: ApiErrorCode.INVALID_TRANSITION,
        message: 'สถานะนัดเพิ่งถูกเปลี่ยน กรุณาดูนัดล่าสุดอีกครั้ง',
      });
    case 'forbidden':
    case 'not_found':
      throw new NotFoundException(APPOINTMENT_NOT_FOUND);
  }
}

function isSlotTaken(error: unknown): boolean {
  if (!(error instanceof ConflictException)) return false;

  const body = error.getResponse() as { error?: unknown };
  return body.error === ApiErrorCode.SLOT_TAKEN;
}
