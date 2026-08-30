import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiErrorCode, ApptStatus, type PaginatedResponse, type Role } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import {
  AppointmentResponseDto,
  type AvailabilitySlotDto,
  type DayBoardDto,
} from './dto/appointment-response.dto';
import type {
  AvailabilityQueryDto,
  CancelAppointmentDto,
  CompleteAppointmentDto,
  CreateAppointmentDto,
  DayBoardQueryDto,
  FindAppointmentsQueryDto,
  RescheduleAppointmentDto,
} from './dto/appointment-request.dto';
import { ACTIVE_STATUSES, assertTransition } from './appointment-state-machine';
import { bangkokDayRange, formatBangkokDate, formatBangkokTime } from '../common/bangkok-time';
import type { Prisma } from '../generated/prisma/client';

/** include ชุดเดียวที่ทุก query ใช้ เพื่อให้ AppointmentResponseDto.from() มีข้อมูลครบเสมอ */
const APPT_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true, lineUserId: true } },
  provider: { select: { id: true, name: true } },
  service: { select: { id: true, name: true, durationMin: true, price: true } },
} satisfies Prisma.AppointmentInclude;

/** รหัส error ของ Postgres ตอนชน exclusion constraint (นัดซ้อนกัน) */
const PG_EXCLUSION_VIOLATION = '23P01';

/** ชื่อ constraint จาก migration 20260830070507_appointment_no_overlap */
const SLOT_CONSTRAINT_NAME = 'Appointment_provider_no_overlap';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── อ่าน ────────────────────────────────────────────────

  async findAll(
    query: FindAppointmentsQueryDto,
    viewerRole: Role,
  ): Promise<PaginatedResponse<AppointmentResponseDto>> {
    const where: Prisma.AppointmentWhereInput = {};

    if (query.date) {
      const { start, end } = bangkokDayRange(query.date);
      where.startsAt = { gte: start, lt: end };
    } else if (query.from || query.to) {
      where.startsAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lt: new Date(query.to) } : {}),
      };
    }

    if (query.providerId) where.providerId = query.providerId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.status?.length) where.status = { in: query.status };

    const [rows, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: APPT_INCLUDE,
        orderBy: { startsAt: query.order ?? 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return paginate(
      rows.map((row) => AppointmentResponseDto.from(row, viewerRole)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(id: string, viewerRole: Role): Promise<AppointmentResponseDto> {
    const appt = await this.prisma.appointment.findUnique({ where: { id }, include: APPT_INCLUDE });
    if (!appt) throw new NotFoundException('ไม่พบนัดหมายนี้');
    return AppointmentResponseDto.from(appt, viewerRole);
  }

  /**
   * คิวทั้งวันแยกตามช่าง — ข้อมูลของหน้าบอร์ดคิว
   *
   * รวมยอดสองตัวไว้ให้เลย: รายได้ที่คาดว่าจะได้ (คิวที่ยังไม่ถูกยกเลิก)
   * กับรายได้จริง (คิวที่รับบริการเสร็จแล้ว) — ส่วนต่างคือเงินที่ยังไม่แน่นอนของวันนั้น
   */
  async dayBoard(query: DayBoardQueryDto, viewerRole: Role): Promise<DayBoardDto> {
    const date = query.date ?? formatBangkokDate(new Date());
    const { start, end } = bangkokDayRange(date);

    const [providers, appointments] = await Promise.all([
      this.prisma.provider.findMany({
        where: { isActive: true, ...(query.providerId ? { id: query.providerId } : {}) },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.appointment.findMany({
        where: {
          startsAt: { gte: start, lt: end },
          ...(query.providerId ? { providerId: query.providerId } : {}),
        },
        include: APPT_INCLUDE,
        orderBy: { startsAt: 'asc' },
      }),
    ]);

    const counts = Object.fromEntries(Object.values(ApptStatus).map((s) => [s, 0])) as Record<
      ApptStatus,
      number
    >;

    let expectedRevenue = 0;
    let actualRevenue = 0;

    for (const appt of appointments) {
      counts[appt.status] += 1;
      const price = Number(appt.service.price.toString());

      if (appt.status !== ApptStatus.CANCELLED) expectedRevenue += price;
      if (appt.status === ApptStatus.COMPLETED) actualRevenue += price;
    }

    return {
      date,
      counts,
      expectedRevenue,
      actualRevenue,
      providers: providers.map((p) => ({
        id: p.id,
        name: p.name,
        appointments: appointments
          .filter((a) => a.providerId === p.id)
          .map((a) => AppointmentResponseDto.from(a, viewerRole)),
      })),
    };
  }

  /** ช่องเวลาว่างของช่างในวันนั้น ที่ยาวพอสำหรับบริการที่เลือก */
  async availability(query: AvailabilityQueryDto): Promise<AvailabilitySlotDto[]> {
    const service = await this.prisma.service.findUnique({ where: { id: query.serviceId } });
    if (!service) throw new NotFoundException('ไม่พบบริการนี้');

    const { start, end } = bangkokDayRange(query.date);
    const booked = await this.prisma.appointment.findMany({
      where: {
        providerId: query.providerId,
        status: { in: [...ACTIVE_STATUSES] },
        startsAt: { gte: start, lt: end },
      },
      select: { startsAt: true, endsAt: true },
      orderBy: { startsAt: 'asc' },
    });

    const stepMs = (query.slotMinutes ?? 15) * 60_000;
    const durationMs = service.durationMin * 60_000;
    const slots: AvailabilitySlotDto[] = [];

    for (let t = start.getTime(); t + durationMs <= end.getTime(); t += stepMs) {
      const slotStart = t;
      const slotEnd = t + durationMs;
      const clashes = booked.some(
        (b) => slotStart < b.endsAt.getTime() && slotEnd > b.startsAt.getTime(),
      );
      if (!clashes) slots.push({ startsAt: new Date(slotStart), endsAt: new Date(slotEnd) });
    }

    return slots;
  }

  // ── สร้างและย้ายนัด ─────────────────────────────────────

  async create(
    dto: CreateAppointmentDto,
    createdById: string,
    viewerRole: Role,
  ): Promise<AppointmentResponseDto> {
    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('เวลานัดไม่ถูกต้อง');
    }

    const appt = await this.guardSlotConflict(() =>
      this.prisma.$transaction(async (tx) => {
        const { service } = await this.loadAndValidateRefs(tx, dto);
        const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);

        await this.lockProvider(tx, dto.providerId);
        await this.assertSlotFree(tx, dto.providerId, startsAt, endsAt);

        return tx.appointment.create({
          data: {
            customerId: dto.customerId,
            providerId: dto.providerId,
            serviceId: dto.serviceId,
            customerCourseId: dto.customerCourseId,
            startsAt,
            endsAt,
            createdById,
          },
          include: APPT_INCLUDE,
        });
      }),
    );

    this.logger.log(`สร้างนัด ${appt.id} · ${formatBangkokTime(appt.startsAt)}`);
    return AppointmentResponseDto.from(appt, viewerRole);
  }

  /**
   * ย้ายนัดไปเวลาใหม่
   *
   * ทำเป็น "ยกเลิกใบเดิม + สร้างใบใหม่" ใน transaction เดียว ไม่ใช่แก้เวลาในใบเดิม
   * เพราะประวัติต้องตอบได้ว่านัดนี้เคยถูกย้ายมาจากเวลาไหน และงานเตือนนัดที่ตั้งไว้
   * กับใบเดิมต้องถูกยกเลิกไปพร้อมกัน (Phase 4) — ถ้าแก้ทับ ทั้งสองอย่างจะหายไปเงียบ ๆ
   */
  async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    createdById: string,
    viewerRole: Role,
  ): Promise<AppointmentResponseDto> {
    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('เวลานัดไม่ถูกต้อง');
    }

    const appt = await this.guardSlotConflict(() =>
      this.prisma.$transaction(async (tx) => {
        const current = await tx.appointment.findUnique({
          where: { id },
          include: { service: true },
        });
        if (!current) throw new NotFoundException('ไม่พบนัดหมายนี้');

        // ใบเดิมต้องยังยกเลิกได้ ไม่งั้นแปลว่านัดจบไปแล้ว ย้ายไม่ได้
        assertTransition(current.status, ApptStatus.CANCELLED);

        const providerId = dto.providerId ?? current.providerId;
        const endsAt = new Date(startsAt.getTime() + current.service.durationMin * 60_000);

        await this.lockProvider(tx, providerId);
        // ไม่นับใบเดิมเป็นตัวชน เพราะกำลังจะถูกยกเลิกใน transaction เดียวกันนี้
        await this.assertSlotFree(tx, providerId, startsAt, endsAt, current.id);

        await tx.appointment.update({
          where: { id },
          data: { status: ApptStatus.CANCELLED, cancelReason: 'ย้ายไปเวลาใหม่' },
        });

        return tx.appointment.create({
          data: {
            customerId: current.customerId,
            providerId,
            serviceId: current.serviceId,
            customerCourseId: current.customerCourseId,
            startsAt,
            endsAt,
            createdById,
          },
          include: APPT_INCLUDE,
        });
      }),
    );

    this.logger.log(`ย้ายนัด ${id} ไปเป็น ${appt.id} · ${formatBangkokTime(appt.startsAt)}`);
    return AppointmentResponseDto.from(appt, viewerRole);
  }

  // ── เปลี่ยนสถานะ ────────────────────────────────────────

  /** ลูกค้ายืนยันว่าจะมา (Phase 3 จะให้กดยืนยันเองผ่าน LINE) */
  confirm(id: string, viewerRole: Role): Promise<AppointmentResponseDto> {
    return this.changeStatus(id, ApptStatus.CONFIRMED, viewerRole);
  }

  /** ลูกค้าขอเลื่อน — รอพนักงานติดต่อกลับเพื่อนัดเวลาใหม่ */
  requestReschedule(id: string, viewerRole: Role): Promise<AppointmentResponseDto> {
    return this.changeStatus(id, ApptStatus.RESCHEDULE_REQUESTED, viewerRole);
  }

  async cancel(
    id: string,
    dto: CancelAppointmentDto,
    viewerRole: Role,
  ): Promise<AppointmentResponseDto> {
    return this.changeStatus(id, ApptStatus.CANCELLED, viewerRole, { cancelReason: dto.reason });
  }

  noShow(id: string, viewerRole: Role): Promise<AppointmentResponseDto> {
    return this.changeStatus(id, ApptStatus.NO_SHOW, viewerRole);
  }

  /**
   * ปิดงาน — จุดเดียวที่มีผลพ่วงหลายอย่าง จึงต้องอยู่ใน transaction เดียวกันทั้งหมด
   *
   * 1. เปลี่ยนสถานะเป็นรับบริการแล้ว
   * 2. อัปเดตวันที่มาล่าสุดของลูกค้า — ตัวนี้คือฐานของการตามลูกค้าที่หายไป (Phase 6)
   * 3. ตัดครั้งคอร์ส ถ้าเลือกใช้คอร์ส
   *
   * ถ้าแยกกันทำ แล้วขั้นใดขั้นหนึ่งพลาด จะได้นัดที่ปิดแล้วแต่คอร์สไม่ถูกตัด
   * ซึ่งเป็นข้อผิดพลาดที่ลูกค้าร้านจับได้ทันทีและเสียความเชื่อถือ
   */
  async complete(
    id: string,
    dto: CompleteAppointmentDto,
    viewerRole: Role,
  ): Promise<AppointmentResponseDto> {
    const appt = await this.prisma.$transaction(async (tx) => {
      const current = await tx.appointment.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('ไม่พบนัดหมายนี้');

      assertTransition(current.status, ApptStatus.COMPLETED);

      const courseId = dto.customerCourseId ?? current.customerCourseId;
      if (courseId) {
        await this.consumeCourseSession(tx, courseId, current.customerId);
      }

      await tx.customer.update({
        where: { id: current.customerId },
        data: { lastVisitAt: current.startsAt },
      });

      return tx.appointment.update({
        where: { id },
        data: { status: ApptStatus.COMPLETED, customerCourseId: courseId },
        include: APPT_INCLUDE,
      });
    });

    return AppointmentResponseDto.from(appt, viewerRole);
  }

  // ── ตัวช่วยภายใน ────────────────────────────────────────

  private async changeStatus(
    id: string,
    to: ApptStatus,
    viewerRole: Role,
    extra: Prisma.AppointmentUpdateInput = {},
  ): Promise<AppointmentResponseDto> {
    const appt = await this.prisma.$transaction(async (tx) => {
      const current = await tx.appointment.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('ไม่พบนัดหมายนี้');

      assertTransition(current.status, to);

      return tx.appointment.update({
        where: { id },
        data: { status: to, ...extra },
        include: APPT_INCLUDE,
      });
    });

    return AppointmentResponseDto.from(appt, viewerRole);
  }

  /**
   * ครอบการเขียนนัดไว้ เพื่อให้การชน exclusion constraint กลายเป็น 409 ไม่ใช่ 500
   *
   * ปกติ advisory lock กันไว้ก่อนแล้วและชั้นนี้จะไม่ทำงานเลย แต่ constraint ยังยิงได้
   * ถ้ามีใครเขียนนัดโดยไม่ผ่าน lockProvider เช่นสคริปต์นำเข้าข้อมูล หรือโค้ดใหม่ในอนาคต
   * — วันนั้นข้อความที่ได้ต้องยังบอกสาเหตุจริง ไม่ใช่ "เกิดข้อผิดพลาดภายในระบบ"
   */
  private async guardSlotConflict<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (isSlotExclusionViolation(error)) {
        throw new ConflictException({
          error: ApiErrorCode.SLOT_TAKEN,
          message: 'ช่วงเวลานี้ถูกจองไปแล้ว กรุณาเลือกเวลาอื่น',
        });
      }
      throw error;
    }
  }

  private async loadAndValidateRefs(tx: Prisma.TransactionClient, dto: CreateAppointmentDto) {
    const [customer, provider, service] = await Promise.all([
      tx.customer.findUnique({ where: { id: dto.customerId } }),
      tx.provider.findUnique({ where: { id: dto.providerId } }),
      tx.service.findUnique({ where: { id: dto.serviceId } }),
    ]);

    if (!customer) throw new NotFoundException('ไม่พบลูกค้ารายนี้');
    if (!provider) throw new NotFoundException('ไม่พบผู้ให้บริการรายนี้');
    if (!service) throw new NotFoundException('ไม่พบบริการนี้');

    if (!customer.isActive) throw new BadRequestException(`${customer.name} ถูกปิดการใช้งานอยู่`);
    if (!provider.isActive) throw new BadRequestException(`${provider.name} ไม่ได้เปิดรับคิวอยู่`);
    if (!service.isActive)
      throw new BadRequestException(`บริการ "${service.name}" ปิดให้บริการแล้ว`);

    if (dto.customerCourseId) {
      const course = await tx.customerCourse.findUnique({ where: { id: dto.customerCourseId } });
      if (!course || course.customerId !== dto.customerId) {
        throw new BadRequestException('ไม่พบคอร์สนี้ของลูกค้ารายนี้');
      }
    }

    return { customer, provider, service };
  }

  /**
   * ล็อกคิวของช่างคนนี้ไว้ตลอด transaction
   *
   * จำเป็นเพราะการเช็คว่า "ช่วงเวลานี้ว่างไหม" อ่านแถวที่ยังไม่มีอยู่ — SELECT FOR UPDATE
   * ล็อกได้เฉพาะแถวที่มีจริง สองคำขอที่เข้ามาพร้อมกันจึงเห็นว่าว่างทั้งคู่แล้วเขียนทับกัน
   * advisory lock ล็อกที่ตัว "ช่างคนนี้" แทน คำขอที่สองจึงต้องรอจนคำขอแรกเขียนเสร็จ
   */
  private async lockProvider(tx: Prisma.TransactionClient, providerId: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${providerId}))`;
  }

  private async assertSlotFree(
    tx: Prisma.TransactionClient,
    providerId: string,
    startsAt: Date,
    endsAt: Date,
    ignoreAppointmentId?: string,
  ): Promise<void> {
    const clash = await tx.appointment.findFirst({
      where: {
        providerId,
        status: { in: [...ACTIVE_STATUSES] },
        ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
        // ช่วงเวลาชนกันเมื่อ เริ่มก่อนที่อีกอันจบ และ จบหลังที่อีกอันเริ่ม
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      include: { customer: { select: { name: true } }, provider: { select: { name: true } } },
    });

    if (clash) {
      throw new ConflictException({
        error: ApiErrorCode.SLOT_TAKEN,
        message:
          `${clash.provider.name} มีคิวอยู่แล้วช่วง ${formatBangkokTime(clash.startsAt)}` +
          `–${formatBangkokTime(clash.endsAt)} (${clash.customer.name})`,
      });
    }
  }

  private async consumeCourseSession(
    tx: Prisma.TransactionClient,
    courseId: string,
    customerId: string,
  ): Promise<void> {
    const course = await tx.customerCourse.findUnique({
      where: { id: courseId },
      include: { package: { select: { name: true, totalSessions: true } } },
    });

    if (!course || course.customerId !== customerId) {
      throw new BadRequestException('ไม่พบคอร์สนี้ของลูกค้ารายนี้');
    }

    if (course.usedSessions >= course.package.totalSessions) {
      throw new BadRequestException(`คอร์ส "${course.package.name}" ใช้ครบทุกครั้งแล้ว`);
    }

    if (course.expiresAt < new Date()) {
      throw new BadRequestException(
        `คอร์ส "${course.package.name}" หมดอายุแล้วเมื่อ ${formatBangkokDate(course.expiresAt)}`,
      );
    }

    await tx.customerCourse.update({
      where: { id: courseId },
      data: { usedSessions: { increment: 1 } },
    });
  }
}

/**
 * ตรวจว่า error ที่ได้มาคือการชน exclusion constraint ของนัดซ้อนหรือไม่
 *
 * ต้องไล่ดูหลายชั้นเพราะ Prisma ห่อ error ของ driver ไว้ และรูปร่างของมัน
 * ต่างกันไปตามว่าคำสั่งวิ่งผ่านทางไหน — จึงเช็คทั้งรหัสตรง ๆ, ฟิลด์ meta
 * และชื่อ constraint ในข้อความ
 */
export function isSlotExclusionViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const e = error as { code?: unknown; meta?: { code?: unknown }; message?: unknown };

  if (e.code === PG_EXCLUSION_VIOLATION) return true;
  if (e.meta?.code === PG_EXCLUSION_VIOLATION) return true;

  return typeof e.message === 'string' && e.message.includes(SLOT_CONSTRAINT_NAME);
}
